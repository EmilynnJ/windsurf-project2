// ============================================================
// BillingService — Server-side per-minute billing engine
//
// Business rules (from build guide):
//   - Bill every 60 seconds
//   - 70% reader / 30% platform split: Math.floor(amount * 0.70)
//   - Atomic DB transactions for all balance operations
//   - 2-minute grace period for disconnection
//   - Min $5 balance to start, end session if insufficient balance
// ============================================================

import { eq, sql } from "drizzle-orm";
import { db } from "../db/db";
import { users, readings, transactions } from "../db/schema";
import { wsService } from "./websocket-service";
import { logger } from "../utils/logger";

const BILLING_INTERVAL_MS = 60_000; // 60 seconds
const PLATFORM_FEE_RATE = 0.30;
const GRACE_PERIOD_MS = 120_000; // 2 minutes

interface ActiveSession {
  readingId: number;
  clientId: number;
  readerId: number;
  ratePerMinute: number;
  intervalId: ReturnType<typeof setInterval>;
  startedAt: Date;
  totalBilled: number; // cents billed so far
  tickCount: number;
  paused: boolean;
  pausedAt?: Date;
  graceTimeoutId?: ReturnType<typeof setTimeout>;
}

class BillingService {
  private sessions = new Map<number, ActiveSession>();

  /** Start billing for a reading session */
  startBilling(
    readingId: number,
    clientId: number,
    readerId: number,
    ratePerMinute: number,
  ): void {
    if (this.sessions.has(readingId)) {
      logger.warn({ readingId }, "Billing already active for reading");
      return;
    }

    const intervalId = setInterval(() => {
      this.tick(readingId).catch((err) => {
        logger.error({ err, readingId }, "Billing tick failed");
      });
    }, BILLING_INTERVAL_MS);

    const session: ActiveSession = {
      readingId,
      clientId,
      readerId,
      ratePerMinute,
      intervalId,
      startedAt: new Date(),
      totalBilled: 0,
      tickCount: 0,
      paused: false,
    };

    this.sessions.set(readingId, session);
    logger.info(
      { readingId, clientId, readerId, ratePerMinute },
      "Billing started",
    );
  }

  /** Pause billing (disconnection — starts grace period) */
  pauseBilling(readingId: number): void {
    const session = this.sessions.get(readingId);
    if (!session || session.paused) return;

    session.paused = true;
    session.pausedAt = new Date();
    clearInterval(session.intervalId);

    // Start grace period
    session.graceTimeoutId = setTimeout(() => {
      logger.info({ readingId }, "Grace period expired, ending session");
      this.endBilling(readingId).catch((err) => {
        logger.error({ err, readingId }, "Failed to end billing after grace period");
      });
    }, GRACE_PERIOD_MS);

    wsService.send(session.clientId, "billing:paused", { readingId });
    wsService.send(session.readerId, "billing:paused", { readingId });
    logger.info({ readingId }, "Billing paused, grace period started");
  }

  /** Resume billing after reconnection */
  resumeBilling(readingId: number): void {
    const session = this.sessions.get(readingId);
    if (!session || !session.paused) return;

    session.paused = false;
    session.pausedAt = undefined;

    if (session.graceTimeoutId) {
      clearTimeout(session.graceTimeoutId);
      session.graceTimeoutId = undefined;
    }

    session.intervalId = setInterval(() => {
      this.tick(readingId).catch((err) => {
        logger.error({ err, readingId }, "Billing tick failed");
      });
    }, BILLING_INTERVAL_MS);

    wsService.send(session.clientId, "billing:resumed", { readingId });
    wsService.send(session.readerId, "billing:resumed", { readingId });
    logger.info({ readingId }, "Billing resumed");
  }

  /** End billing and finalize the reading */
  async endBilling(readingId: number): Promise<void> {
    const session = this.sessions.get(readingId);
    if (!session) return;

    // Clean up timers
    clearInterval(session.intervalId);
    if (session.graceTimeoutId) {
      clearTimeout(session.graceTimeoutId);
    }
    this.sessions.delete(readingId);

    // Calculate final totals
    const now = new Date();
    const durationMs = now.getTime() - session.startedAt.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const totalCharged = durationMinutes * session.ratePerMinute;
    const readerEarned = Math.floor(totalCharged * (1 - PLATFORM_FEE_RATE));
    const platformEarned = totalCharged - readerEarned;

    try {
      // Using imported db instance
      await db.transaction(async (tx) => {
        // Finalize reading record
        await tx
          .update(readings)
          .set({
            status: "completed",
            completedAt: now,
            durationSeconds,
            totalCharged,
            readerEarned,
            platformEarned,
            updatedAt: now,
          })
          .where(eq(readings.id, readingId));

        // Credit reader balance
        await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${readerEarned}`,
            totalReadings: sql`${users.totalReadings} + 1`,
            updatedAt: now,
          })
          .where(eq(users.id, session.readerId));

        // Log transaction for reader
        const [readerUser] = await tx
          .select({ balance: users.balance })
          .from(users)
          .where(eq(users.id, session.readerId));
        await tx.insert(transactions).values({
          userId: session.readerId,
          readingId,
          type: "reading_charge",
          amount: readerEarned,
          balanceAfter: readerUser?.balance ?? 0,
          note: `Reading #${readingId} earnings (${durationMinutes} min)`,
        });
      });

      // Notify both parties
      const summary = {
        readingId,
        durationSeconds,
        totalCharged,
        readerEarned,
        platformEarned,
      };
      wsService.send(session.clientId, "billing:ended", summary);
      wsService.send(session.readerId, "billing:ended", summary);
      logger.info(summary, "Billing finalized");
    } catch (err) {
      logger.error(
        { err, readingId, durationSeconds, totalCharged },
        "Failed to finalize billing",
      );
    }
  }

  /** Per-minute billing tick */
  private async tick(readingId: number): Promise<void> {
    const session = this.sessions.get(readingId);
    if (!session || session.paused) return;

    const { clientId, readerId, ratePerMinute } = session;
    const readerShare = Math.floor(ratePerMinute * (1 - PLATFORM_FEE_RATE));
    const platformShare = ratePerMinute - readerShare;

    try {
      // Using imported db instance
      await db.transaction(async (tx) => {
        // Deduct from client — with balance check
        const [updated] = await tx
          .update(users)
          .set({
            balance: sql`${users.balance} - ${ratePerMinute}`,
            updatedAt: new Date(),
          })
          .where(
            sql`${users.id} = ${clientId} AND ${users.balance} >= ${ratePerMinute}`,
          )
          .returning({ id: users.id, balance: users.balance });

        if (!updated) {
          // Insufficient balance — end session
          logger.info({ readingId, clientId }, "Insufficient balance, ending session");
          wsService.send(clientId, "billing:insufficient_balance", { readingId });
          wsService.send(readerId, "billing:insufficient_balance", { readingId });
          await this.endBilling(readingId);
          return;
        }

        // Log client transaction
        await tx.insert(transactions).values({
          userId: clientId,
          readingId,
          type: "reading_charge",
          amount: -ratePerMinute,
          balanceAfter: updated.balance,
          note: `Reading #${readingId} minute charge`,
        });

        // Credit reader
        const [readerUpdated] = await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${readerShare}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, readerId))
          .returning({ balance: users.balance });

        // Update reading totals
        await tx
          .update(readings)
          .set({
            totalCharged: sql`${readings.totalCharged} + ${ratePerMinute}`,
            readerEarned: sql`${readings.readerEarned} + ${readerShare}`,
            platformEarned: sql`${readings.platformEarned} + ${platformShare}`,
            durationSeconds: sql`${readings.durationSeconds} + 60`,
            lastHeartbeat: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(readings.id, readingId));
      });

      session.totalBilled += ratePerMinute;
      session.tickCount += 1;

      // Notify both parties of tick
      wsService.send(clientId, "billing:tick", {
        readingId,
        charged: ratePerMinute,
        totalBilled: session.totalBilled,
      });
      wsService.send(readerId, "billing:tick", {
        readingId,
        earned: readerShare,
      });

      logger.debug(
        { readingId, tick: session.tickCount, totalBilled: session.totalBilled },
        "Billing tick processed",
      );
    } catch (err) {
      logger.error({ err, readingId }, "Billing tick error");
    }
  }

  /** Check if a reading has active billing */
  isActive(readingId: number): boolean {
    return this.sessions.has(readingId);
  }

  /** Shutdown all active sessions */
  shutdown(): void {
    for (const [readingId, session] of this.sessions) {
      clearInterval(session.intervalId);
      if (session.graceTimeoutId) clearTimeout(session.graceTimeoutId);
      logger.warn({ readingId }, "Billing session terminated by shutdown");
    }
    this.sessions.clear();
  }
}

export const billingService = new BillingService();
