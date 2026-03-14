import { eq } from "drizzle-orm";
import { readings, users, transactions } from "@soulseer/shared/schema";
import { getDb } from "../db/db";
import { logger } from "../utils/logger";

/**
 * Server-side per-minute billing engine.
 *
 * For every active reading a setInterval fires every 60 s.
 * Each tick:
 *   1. Deduct pricePerMinute from client
 *   2. Credit 70 % to reader, platform keeps 30 %
 *   3. If client balance < pricePerMinute → end session immediately
 *
 * All balance mutations run inside a DB transaction.
 */

// Active billing intervals keyed by readingId
const activeTimers = new Map<number, NodeJS.Timeout>();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start the per-minute billing timer for a reading.
 */
export function startBillingTimer(readingId: number, pricePerMinute: number, clientId: number, readerId: number): void {
  if (activeTimers.has(readingId)) {
    logger.warn({ readingId }, "Billing timer already running");
    return;
  }

  logger.info({ readingId, pricePerMinute }, "Starting billing timer");

  const timer = setInterval(async () => {
    try {
      await billOneMinute(readingId, pricePerMinute, clientId, readerId);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "INSUFFICIENT_BALANCE") {
        logger.warn({ readingId }, "Billing stopped — insufficient balance");
      } else {
        logger.error({ err, readingId }, "Billing tick failed");
      }
      stopBillingTimer(readingId);
    }
  }, 60_000); // every 60 seconds

  activeTimers.set(readingId, timer);
}

/**
 * Stop the billing timer for a reading.
 */
export function stopBillingTimer(readingId: number): void {
  const timer = activeTimers.get(readingId);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(readingId);
    logger.info({ readingId }, "Billing timer stopped");
  }
}

/**
 * Stop all billing timers (graceful shutdown).
 */
export function stopAllBillingTimers(): void {
  for (const [readingId, timer] of activeTimers) {
    clearInterval(timer);
    logger.info({ readingId }, "Billing timer stopped (shutdown)");
  }
  activeTimers.clear();
}

/**
 * Whether a billing timer is active for this reading.
 */
export function isBillingActive(readingId: number): boolean {
  return activeTimers.has(readingId);
}

// ─── Internal ────────────────────────────────────────────────────────────────

async function billOneMinute(
  readingId: number,
  pricePerMinute: number,
  clientId: number,
  readerId: number,
): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    // 1. Load current balances
    const clientRows = await tx
      .select({ accountBalance: users.accountBalance })
      .from(users)
      .where(eq(users.id, clientId))
      .limit(1);

    const readerRows = await tx
      .select({ accountBalance: users.accountBalance })
      .from(users)
      .where(eq(users.id, readerId))
      .limit(1);

    const client = clientRows[0];
    const reader = readerRows[0];
    if (!client || !reader) throw new Error("Participant not found");

    // 2. Check sufficient balance
    if (client.accountBalance < pricePerMinute) {
      logger.warn(
        { readingId, clientId, balance: client.accountBalance, pricePerMinute },
        "Insufficient balance — ending reading",
      );
      // Mark the reading as completed
      await tx
        .update(readings)
        .set({ status: "completed", completedAt: new Date(), paymentStatus: "paid" })
        .where(eq(readings.id, readingId));
      throw new Error("INSUFFICIENT_BALANCE");
    }

    // 3. Compute split — 70 % reader, 30 % platform (integer math)
    const readerShare = Math.floor(pricePerMinute * 0.70);

    const clientBalanceBefore = client.accountBalance;
    const clientBalanceAfter = clientBalanceBefore - pricePerMinute;

    const readerBalanceBefore = reader.accountBalance;
    const readerBalanceAfter = readerBalanceBefore + readerShare;

    // 4. Update balances
    await tx.update(users).set({ accountBalance: clientBalanceAfter }).where(eq(users.id, clientId));
    await tx.update(users).set({ accountBalance: readerBalanceAfter }).where(eq(users.id, readerId));

    // 5. Record transactions
    await tx.insert(transactions).values({
      userId: clientId,
      type: "reading_charge",
      amount: -pricePerMinute,
      balanceBefore: clientBalanceBefore,
      balanceAfter: clientBalanceAfter,
      readingId,
      note: `Reading ${readingId} — 1 min charge`,
    });

    await tx.insert(transactions).values({
      userId: readerId,
      type: "reading_charge",
      amount: readerShare,
      balanceBefore: readerBalanceBefore,
      balanceAfter: readerBalanceAfter,
      readingId,
      note: `Reading ${readingId} — 1 min earning (70%)`,
    });

    // 6. Increment billed minutes & totalPrice on reading
    const readingRows = await tx
      .select({ billedMinutes: readings.billedMinutes, totalPrice: readings.totalPrice })
      .from(readings)
      .where(eq(readings.id, readingId))
      .limit(1);

    const currentReading = readingRows[0];
    if (currentReading) {
      await tx
        .update(readings)
        .set({
          billedMinutes: currentReading.billedMinutes + 1,
          totalPrice: currentReading.totalPrice + pricePerMinute,
        })
        .where(eq(readings.id, readingId));
    }
  });

  logger.debug({ readingId, pricePerMinute }, "Billed 1 minute");
}
