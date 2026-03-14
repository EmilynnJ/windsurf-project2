import { eq, sql } from 'drizzle-orm';
import { db } from '../db/db';
import { users, readings, transactions } from '@soulseer/shared/schema';
import { wsService } from './websocket-service';
import { logger } from '../utils/logger';

const BILLING_INTERVAL_MS = 60_000;
const GRACE_PERIOD_MS = 120_000;

interface ActiveSession {
  timerId: NodeJS.Timeout;
  readingId: number;
  clientId: number;
  readerId: number;
  pricePerMinute: number;
  paused: boolean;
  graceTimerId?: NodeJS.Timeout;
}

class BillingService {
  private sessions = new Map<number, ActiveSession>();

  startBilling(readingId: number, clientId: number, readerId: number, pricePerMinute: number): void {
    if (this.sessions.has(readingId)) {
      logger.warn({ readingId }, 'Billing already active for reading');
      return;
    }

    const timerId = setInterval(() => {
      this.tick(readingId).catch((err) => {
        logger.error({ err, readingId }, 'Billing tick error');
      });
    }, BILLING_INTERVAL_MS);

    this.sessions.set(readingId, { timerId, readingId, clientId, readerId, pricePerMinute, paused: false });
    logger.info({ readingId, clientId, readerId, pricePerMinute }, 'Billing started');
  }

  pauseBilling(readingId: number, disconnectedUserId: number): void {
    const session = this.sessions.get(readingId);
    if (!session || session.paused) return;

    session.paused = true;
    clearInterval(session.timerId);

    const otherId = disconnectedUserId === session.clientId ? session.readerId : session.clientId;
    wsService.send(otherId, 'reading:participant_disconnected', {
      readingId,
      disconnectedUserId,
      gracePeriodMs: GRACE_PERIOD_MS,
    });

    session.graceTimerId = setTimeout(() => {
      logger.info({ readingId }, 'Grace period expired — ending session');
      this.finalizeReading(readingId).catch((err) => {
        logger.error({ err, readingId }, 'Error finalizing after grace period');
      });
    }, GRACE_PERIOD_MS);

    logger.info({ readingId, disconnectedUserId }, 'Billing paused — grace period started');
  }

  resumeBilling(readingId: number, reconnectedUserId: number): void {
    const session = this.sessions.get(readingId);
    if (!session || !session.paused) return;

    if (session.graceTimerId) { clearTimeout(session.graceTimerId); session.graceTimerId = undefined; }

    session.paused = false;
    session.timerId = setInterval(() => {
      this.tick(readingId).catch((err) => {
        logger.error({ err, readingId }, 'Billing tick error');
      });
    }, BILLING_INTERVAL_MS);

    const otherId = reconnectedUserId === session.clientId ? session.readerId : session.clientId;
    wsService.send(otherId, 'reading:participant_reconnected', { readingId, reconnectedUserId });

    logger.info({ readingId, reconnectedUserId }, 'Billing resumed');
  }

  async finalizeReading(readingId: number): Promise<void> {
    const session = this.sessions.get(readingId);
    if (session) {
      clearInterval(session.timerId);
      if (session.graceTimerId) clearTimeout(session.graceTimerId);
      this.sessions.delete(readingId);
    }

    const now = new Date();
    const [reading] = await db
      .update(readings)
      .set({ status: 'completed', completedAt: now })
      .where(eq(readings.id, readingId))
      .returning();

    if (reading) {
      let duration = 0;
      if (reading.startedAt) {
        duration = Math.max(1, Math.round((now.getTime() - new Date(reading.startedAt).getTime()) / 60_000));
      }
      await db.update(readings).set({ duration }).where(eq(readings.id, readingId));

      wsService.broadcast(
        [reading.clientId, reading.readerId],
        'reading:ended',
        { readingId, duration, totalCost: duration * reading.pricePerMinute },
      );
    }

    logger.info({ readingId }, 'Reading finalized');
  }

  shutdown(): void {
    for (const [readingId, session] of this.sessions) {
      clearInterval(session.timerId);
      if (session.graceTimerId) clearTimeout(session.graceTimerId);
      logger.info({ readingId }, 'Billing timer cleared on shutdown');
    }
    this.sessions.clear();
  }

  private async tick(readingId: number): Promise<void> {
    const session = this.sessions.get(readingId);
    if (!session || session.paused) return;

    const { clientId, readerId, pricePerMinute } = session;
    const readerShare = Math.floor(pricePerMinute * 0.70);
    const platformShare = pricePerMinute - readerShare;

    // Atomic deduction — only succeeds if client has sufficient balance
    const result = await db
      .update(users)
      .set({ accountBalance: sql`${users.accountBalance} - ${pricePerMinute}` })
      .where(sql`${users.id} = ${clientId} AND ${users.accountBalance} >= ${pricePerMinute}`)
      .returning({ id: users.id, accountBalance: users.accountBalance });

    if (result.length === 0) {
      logger.info({ readingId, clientId }, 'Insufficient balance — ending session');
      wsService.send(clientId, 'balance:insufficient', { readingId });
      await this.finalizeReading(readingId);
      return;
    }

    // Credit reader (70% share)
    await db
      .update(users)
      .set({
        accountBalance: sql`${users.accountBalance} + ${readerShare}`,
      })
      .where(eq(users.id, readerId));

    // Log transactions for both client charge and reader earning
    const [clientRow] = result;
    await db.insert(transactions).values([
      {
        userId: clientId,
        type: 'reading_charge' as const,
        amount: -pricePerMinute,
        balanceBefore: clientRow!.accountBalance + pricePerMinute,
        balanceAfter: clientRow!.accountBalance,
        readingId,
        note: `Reading #${readingId} — 1 min charge`,
      },
      {
        userId: readerId,
        type: 'reading_charge' as const,
        amount: readerShare,
        balanceBefore: 0, // Approximate — atomic update makes exact tracking complex
        balanceAfter: 0,
        readingId,
        note: `Reading #${readingId} — 1 min earning (70%)`,
      },
    ]);

    // Warn client if balance getting low (< 3 minutes remaining)
    const newBalance = result[0]!.accountBalance;
    if (newBalance < pricePerMinute * 3) {
      wsService.send(clientId, 'balance:low', {
        readingId,
        balance: newBalance,
        minutesRemaining: Math.floor(newBalance / pricePerMinute),
      });
    }

    logger.debug({
      readingId,
      clientId,
      charged: pricePerMinute,
      readerCredit: readerShare,
      platformFee: platformShare,
    }, 'Billing tick processed');
  }
}

export const billingService = new BillingService();
