// Stripe Service -- reusable helpers (payments.ts route handles most inline)
import Stripe from 'stripe';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db/db';
import { users, transactions } from '../db/schema';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error-handler';

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2024-06-20' as any });

export async function createPaymentIntent(userId: number, amountCents: number) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError(404, 'User not found');
  if (amountCents < 500) throw new AppError(400, 'Min top-up $5.00');
  const pi = await stripe.paymentIntents.create({
    amount: amountCents, currency: 'usd',
    metadata: { userId: String(userId), type: 'balance_topup' },
    automatic_payment_methods: { enabled: true },
  });
  return { clientSecret: pi.client_secret!, paymentIntentId: pi.id };
}

export async function createConnectAccount(userId: number, email: string) {
  const db = getDb();
  const account = await stripe.accounts.create({
    type: 'express', email,
    metadata: { userId: String(userId) },
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
  });
  await db.update(users).set({ stripeAccountId: account.id, updatedAt: new Date() }).where(eq(users.id, userId));
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${config.corsOrigin}/dashboard`,
    return_url: `${config.corsOrigin}/dashboard`,
    type: 'account_onboarding',
  });
  return { accountId: account.id, onboardingUrl: link.url };
}

export async function createPayout(readerId: number) {
  const db = getDb();
  const [reader] = await db.select().from(users).where(eq(users.id, readerId));
  if (!reader) throw new AppError(404, 'Reader not found');
  if (!reader.stripeAccountId) throw new AppError(400, 'No Stripe Connect');
  if (reader.balance < 1500) throw new AppError(400, 'Min payout $15.00');
  const amount = reader.balance;
  const balanceBefore = reader.balance;
  const result = await db.update(users).set({ balance: 0, updatedAt: new Date() })
    .where(sql`${users.id} = ${readerId} AND ${users.balance} = ${amount}`).returning({ id: users.id });
  if (!result.length) throw new AppError(409, 'Balance changed, retry');
  const transfer = await stripe.transfers.create({ amount, currency: 'usd', destination: reader.stripeAccountId });
  await db.insert(transactions).values({
    userId: readerId, type: 'reader_payout', amount: -amount,
    balanceBefore, balanceAfter: 0,
    stripePaymentIntentId: transfer.id, note: `Payout $${(amount / 100).toFixed(2)}`,
  });
  return { transferId: transfer.id, amount };
}
