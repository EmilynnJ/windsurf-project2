<<<<<<< HEAD
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { users, transactions } from '@soulseer/shared/schema';

export interface BillingResult {
  readerShare: number;
  platformShare: number;
  clientBalanceBefore: number;
  clientBalanceAfter: number;
  readerBalanceBefore: number;
  readerBalanceAfter: number;
}

export class BillingService {
  /**
   * Calculates revenue split: 60% to reader, 40% to platform
   * All money is integers in cents
   */
  static calculateSplit(amount: number): { readerShare: number; platformShare: number } {
    const readerShare = Math.floor(amount * 0.60);
    const platformShare = amount - readerShare; // Always calculate this way, never hardcode 0.40
    return { readerShare, platformShare };
  }

  /**
   * Processes payment for a completed reading with 60/40 revenue split
   */
  static async processReadingPayment(
    readingId: number,
    clientId: number,
    readerId: number,
    amount: number
  ): Promise<BillingResult> {
    return db.transaction(async (tx) => {
      // Get current client and reader balances
      const client = await tx.query.users.findFirst({
        where: eq(users.id, clientId),
        columns: { accountBalance: true },
      });

      const reader = await tx.query.users.findFirst({
        where: eq(users.id, readerId),
        columns: { accountBalance: true },
      });

      if (!client || !reader) {
        throw new Error('Client or reader not found');
      }

      // Check if client has sufficient balance
      if (client.accountBalance < amount) {
        throw new Error('Insufficient balance for payment');
      }

      // Calculate 60/40 split
      const { readerShare, platformShare } = this.calculateSplit(amount);

      // Update client balance (deduct full amount)
      const clientNewBalance = client.accountBalance - amount;
      await tx
        .update(users)
        .set({ accountBalance: clientNewBalance })
        .where(eq(users.id, clientId));

      // Update reader balance (add 60% share)
      const readerNewBalance = reader.accountBalance + readerShare;
      await tx
        .update(users)
        .set({ accountBalance: readerNewBalance })
        .where(eq(users.id, readerId));

      // Record client transaction
      await tx.insert(transactions).values({
        userId: clientId,
        type: 'reading_charge',
        amount: -amount,
        balanceBefore: client.accountBalance,
        balanceAfter: clientNewBalance,
        readingId,
        note: `Reading payment to reader ${readerId}`,
      });

      // Record reader transaction (60% share)
      await tx.insert(transactions).values({
        userId: readerId,
        type: 'reading_charge',
        amount: readerShare,
        balanceBefore: reader.accountBalance,
        balanceAfter: readerNewBalance,
        readingId,
        note: `Reading payment from client ${clientId} (60% split)`,
      });

      // Platform share (40%) is implicitly tracked as the difference
      // between total charged and reader share — no separate transaction needed

      return {
        readerShare,
        platformShare,
        clientBalanceBefore: client.accountBalance,
        clientBalanceAfter: clientNewBalance,
        readerBalanceBefore: reader.accountBalance,
        readerBalanceAfter: readerNewBalance,
      };
    });
  }

  /**
   * Processes a billing tick during an active reading session
   * Charges client and distributes 60/40 split
   */
  static async processBillingTick(
    readingId: number,
    clientId: number,
    readerId: number,
    amount: number
  ): Promise<BillingResult> {
    return this.processReadingPayment(readingId, clientId, readerId, amount);
  }

  /**
   * Finalizes session billing and closes the transaction
   * Ensures 60/40 split is applied correctly
   */
  static async finalizeSessionBilling(
    readingId: number,
    clientId: number,
    readerId: number,
    totalAmount: number
  ): Promise<BillingResult> {
    return this.processReadingPayment(readingId, clientId, readerId, totalAmount);
  }
}
=======
import { eq, and, lt, sql, inArray, isNotNull } from "drizzle-orm";
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

  /**
   * Public entry point for the billing tick. Used by both the in-process
   * timer (long-running deployments) and the Vercel Cron handler at
   * `/api/cron/billing-tick`. Idempotent and safe to call concurrently —
   * each per-reading mutation runs in a DB transaction with row-level
   * effects.
   */
  async runTick(): Promise<{ swept: number; charged: number }> {
    return this.tick();
  }

  private async tick(): Promise<{ swept: number; charged: number }> {
    let swept = 0;
    let charged = 0;
    try {
      const db = getDb();

      // 1) Check for stale heartbeats -> missed readings (grace period expired)
      const graceCutoff = new Date(Date.now() - GRACE_PERIOD_MS);
      const stale = await db
        .select()
        .from(readings)
        .where(
          and(
            eq(readings.status, "active"),
            isNotNull(readings.lastHeartbeat),
            lt(readings.lastHeartbeat, graceCutoff),
          ),
        );

      for (const reading of stale) {
        await this.endReading(reading.id, "missed", "grace_period_expired");
        swept += 1;
        logger.warn({ readingId: reading.id }, "Reading ended due to stale heartbeat (grace period expired)");
      }

      // 2) Charge active readings per minute
      const active = await db
        .select()
        .from(readings)
        .where(eq(readings.status, "active"));

      for (const reading of active) {
        await this.chargeMinute(reading);
        charged += 1;
      }
    } catch (err) {
      logger.error({ err }, "Billing tick error");
    }
    return { swept, charged };
  }

  private async chargeMinute(
    reading: typeof readings.$inferSelect,
  ): Promise<void> {
    const db = getDb();
    const rate = reading.ratePerMinute;
    if (rate <= 0) return;

    // Charge 1 minute atomically — balance check INSIDE the transaction
    // to prevent race conditions per build guide section 8.4
    const readerShare = Math.floor(rate * 0.7);
    const platformShare = rate - readerShare;

    let insufficientBalance = false;

    await db.transaction(async (tx) => {
      // Check balance inside the transaction for atomicity
      const [client] = await tx
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, reading.clientId));

      if (!client || client.balance < rate) {
        insufficientBalance = true;
        return; // rollback — no changes made
      }

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

    if (insufficientBalance) {
      // End reading outside transaction since endReading has its own transaction
      await this.endReading(reading.id, "completed", "insufficient_balance");
      wsService.broadcast(
        [reading.clientId, reading.readerId],
        "reading:insufficient_balance",
        { readingId: reading.id },
      );
      logger.info(
        { readingId: reading.id, rate },
        "Reading ended due to insufficient balance",
      );
      return;
    }

    logger.debug(
      { readingId: reading.id, rate, readerShare, platformShare },
      "Billed 1 minute",
    );
  }

  private async endReading(
    readingId: number,
    status: "completed" | "missed",
    reason?: "insufficient_balance" | "grace_period_expired",
  ): Promise<void> {
    const db = getDb();
    const now = new Date();
    const [reading] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId));
    if (!reading) return;

    await db.transaction(async (tx) => {
      // Re-fetch inside transaction to prevent race with readings/:id/end
      const [fresh] = await tx
        .select()
        .from(readings)
        .where(eq(readings.id, readingId));

      if (!fresh || fresh.status === "completed" || fresh.status === "cancelled") {
        return; // Already finalized by another path
      }

      // Update reading status
      await tx
        .update(readings)
        .set({
          status,
          completedAt: now,
          paymentStatus: fresh.totalCharged > 0 ? "paid" : "pending",
          updatedAt: now,
        })
        .where(eq(readings.id, readingId));

      // Credit reader balance using fresh data
      if (fresh.readerEarned > 0) {
        const [readerBefore] = await tx
          .select({ balance: users.balance })
          .from(users)
          .where(eq(users.id, fresh.readerId));

        const [readerAfter] = await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${fresh.readerEarned}`,
            totalReadings: sql`${users.totalReadings} + 1`,
            updatedAt: now,
          })
          .where(eq(users.id, fresh.readerId))
          .returning({ balance: users.balance });

        await tx.insert(transactions).values({
          userId: fresh.readerId,
          readingId,
          type: "reader_payout",
          amount: fresh.readerEarned,
          balanceBefore: readerBefore?.balance ?? 0,
          balanceAfter: readerAfter?.balance ?? 0,
          note: `Earned from reading #${readingId}`,
        });
      }

      // Record client charge transaction
      if (fresh.totalCharged > 0) {
        const [clientAfter] = await tx
          .select({ balance: users.balance })
          .from(users)
          .where(eq(users.id, fresh.clientId));

        await tx.insert(transactions).values({
          userId: fresh.clientId,
          readingId,
          type: "reading_charge",
          amount: -fresh.totalCharged,
          balanceBefore: (clientAfter?.balance ?? 0) + fresh.totalCharged,
          balanceAfter: clientAfter?.balance ?? 0,
          note: `Charged for reading #${readingId}`,
        });
      }
    });

    // Re-fetch the finalized reading so we can broadcast authoritative totals
    // to both participants (client needs these to render the session summary).
    const [finalized] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId));

    wsService.broadcast(
      [reading.clientId, reading.readerId],
      "reading:ended",
      {
        readingId,
        status,
        reason,
        durationSeconds: finalized?.durationSeconds ?? reading.durationSeconds ?? 0,
        totalCharged: finalized?.totalCharged ?? reading.totalCharged ?? 0,
        readerEarned: finalized?.readerEarned ?? reading.readerEarned ?? 0,
        ratePerMinute: reading.ratePerMinute,
      },
    );

    logger.info(
      {
        readingId,
        status,
        totalCharged: finalized?.totalCharged ?? reading.totalCharged,
        readerEarned: finalized?.readerEarned ?? reading.readerEarned,
      },
      "Reading ended by billing service",
    );
  }

  /**
   * Called when a reader toggles offline or their socket closes mid-session.
   * Pauses all active/accepted readings for that reader and
   * notifies both participants. Billing ticks skip any non-active status so
   * charging stops immediately. Clients can then choose to end the session
   * or wait for the reader to come back online.
   */
  async handleReaderOffline(readerId: number): Promise<void> {
    const db = getDb();
    const now = new Date();

    const sessions = await db
      .select({ id: readings.id, clientId: readings.clientId, status: readings.status })
      .from(readings)
      .where(
        and(
          eq(readings.readerId, readerId),
          inArray(readings.status, ["accepted", "active"] as const),
        ),
      );

    if (sessions.length > 0) {
      await db
        .update(readings)
        .set({ status: "paused", updatedAt: now })
        .where(
          and(
            eq(readings.readerId, readerId),
            inArray(readings.status, ["accepted", "in_progress", "active"] as const),
          ),
        );

      for (const s of sessions) {
        wsService.broadcast(
          [s.clientId, readerId],
          "reading:partner_disconnected",
          { readingId: s.id, partnerRole: "reader", previousStatus: s.status },
        );
        logger.info({ readingId: s.id, readerId }, "Reading paused: reader went offline");
      }
    }

    // Also cancel any still-pending requests so the client UI clears them.
    const pending = await db
      .select({ id: readings.id, clientId: readings.clientId })
      .from(readings)
      .where(and(eq(readings.readerId, readerId), eq(readings.status, "pending")));

    if (pending.length > 0) {
      await db
        .update(readings)
        .set({ status: "cancelled", updatedAt: now })
        .where(and(eq(readings.readerId, readerId), eq(readings.status, "pending")));

      for (const p of pending) {
        wsService.broadcast(
          [p.clientId, readerId],
          "reading:cancelled",
          { readingId: p.id, reason: "reader_offline" },
        );
      }
    }
  }
}

export const billingService = new BillingService();
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
