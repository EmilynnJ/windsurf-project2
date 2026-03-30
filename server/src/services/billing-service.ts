import { eq, and, lt, sql } from "drizzle-orm";
import { getDb } from "../db/db";
import { users, readings, transactions } from "../db/schema";
import { wsService } from "./websocket-service";
import { logger } from "../utils/logger";

const TICK_INTERVAL_MS = 60_000; // 1 minute
const GRACE_PERIOD_MS = 120_000; // 2 minutes

class BillingService {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    logger.info("Billing service started");
  }

  shutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info("Billing service stopped");
  }

  private async tick(): Promise<void> {
    try {
      const db = getDb();

      // 1) Check for stale heartbeats -> missed readings (grace period expired)
      const graceCutoff = new Date(Date.now() - GRACE_PERIOD_MS);
      const stale = await db
        .select()
        .from(readings)
        .where(
          and(eq(readings.status, "active"), lt(readings.lastHeartbeat, graceCutoff)),
        );

      for (const reading of stale) {
        await this.endReading(reading.id, "missed");
        logger.warn({ readingId: reading.id }, "Reading ended due to stale heartbeat (grace period expired)");
      }

      // 2) Charge active readings per minute
      const active = await db
        .select()
        .from(readings)
        .where(eq(readings.status, "active"));

      for (const reading of active) {
        await this.chargeMinute(reading);
      }
    } catch (err) {
      logger.error({ err }, "Billing tick error");
    }
  }

  private async chargeMinute(
    reading: typeof readings.$inferSelect,
  ): Promise<void> {
    const db = getDb();
    const rate = reading.ratePerMinute;
    if (rate <= 0) return;

    const [client] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, reading.clientId));

    if (!client || client.balance < rate) {
      // Insufficient balance -- end reading
      await this.endReading(reading.id, "completed");
      wsService.broadcast(
        [reading.clientId, reading.readerId],
        "reading:insufficient_balance",
        { readingId: reading.id },
      );
      logger.info(
        { readingId: reading.id, clientBalance: client?.balance, rate },
        "Reading ended due to insufficient balance",
      );
      return;
    }

    // Charge 1 minute atomically
    const readerShare = Math.floor(rate * 0.7);
    const platformShare = rate - readerShare;

    await db.transaction(async (tx) => {
      await tx
        .update(readings)
        .set({
          durationSeconds: sql`${readings.durationSeconds} + 60`,
          totalCharged: sql`${readings.totalCharged} + ${rate}`,
          readerEarned: sql`${readings.readerEarned} + ${readerShare}`,
          platformEarned: sql`${readings.platformEarned} + ${platformShare}`,
          updatedAt: new Date(),
        })
        .where(eq(readings.id, reading.id));

      await tx
        .update(users)
        .set({
          balance: sql`${users.balance} - ${rate}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, reading.clientId));
    });

    logger.debug(
      { readingId: reading.id, rate, readerShare, platformShare },
      "Billed 1 minute",
    );
  }

  private async endReading(
    readingId: number,
    status: "completed" | "missed",
  ): Promise<void> {
    const db = getDb();
    const now = new Date();
    const [reading] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId));
    if (!reading) return;

    await db.transaction(async (tx) => {
      // Update reading status
      await tx
        .update(readings)
        .set({
          status,
          completedAt: now,
          paymentStatus: reading.totalCharged > 0 ? "paid" : "pending",
          updatedAt: now,
        })
        .where(eq(readings.id, readingId));

      // Credit reader balance
      if (reading.readerEarned > 0) {
        const [readerBefore] = await tx
          .select({ balance: users.balance })
          .from(users)
          .where(eq(users.id, reading.readerId));

        const [readerAfter] = await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${reading.readerEarned}`,
            totalReadings: sql`${users.totalReadings} + 1`,
            updatedAt: now,
          })
          .where(eq(users.id, reading.readerId))
          .returning({ balance: users.balance });

        await tx.insert(transactions).values({
          userId: reading.readerId,
          readingId,
          type: "reader_payout",
          amount: reading.readerEarned,
          balanceBefore: readerBefore?.balance ?? 0,
          balanceAfter: readerAfter?.balance ?? 0,
          note: `Earned from reading #${readingId}`,
        });
      }

      // Record client charge transaction
      if (reading.totalCharged > 0) {
        const [clientAfter] = await tx
          .select({ balance: users.balance })
          .from(users)
          .where(eq(users.id, reading.clientId));

        await tx.insert(transactions).values({
          userId: reading.clientId,
          readingId,
          type: "reading_charge",
          amount: -reading.totalCharged,
          balanceBefore: (clientAfter?.balance ?? 0) + reading.totalCharged,
          balanceAfter: clientAfter?.balance ?? 0,
          note: `Charged for reading #${readingId}`,
        });
      }
    });

    wsService.broadcast(
      [reading.clientId, reading.readerId],
      "reading:ended",
      { readingId, status },
    );

    logger.info(
      {
        readingId,
        status,
        totalCharged: reading.totalCharged,
        readerEarned: reading.readerEarned,
      },
      "Reading ended by billing service",
    );
  }
}

export const billingService = new BillingService();
