import Stripe from 'stripe';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/db';
import { users, transactions } from '../db/schema';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error-handler';

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2024-12-18.acacia' as any });

const MIN_TOPUP_CENTS = 500;
const MIN_PAYOUT_CENTS = 1500;

// ─── PaymentIntent ──────────────────────────────────────────────────────────

export async function createPaymentIntent(
  userId: number,
  amountCents: number,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  if (amountCents < MIN_TOPUP_CENTS) {
    throw new AppError(400, `Minimum top-up is $${(MIN_TOPUP_CENTS / 100).toFixed(2)}`);
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError(404, 'User not found');

  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: String(userId), auth0Id: user.auth0Id },
    });
    stripeCustomerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: stripeCustomerId,
    metadata: { userId: String(userId), type: 'balance_topup' },
    automatic_payment_methods: { enabled: true },
  });

  logger.info({ userId, amountCents, paymentIntentId: paymentIntent.id }, 'PaymentIntent created');

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

// ─── Webhook ────────────────────────────────────────────────────────────────

export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  } catch (err) {
    logger.error({ err }, 'Stripe webhook signature verification failed');
    throw new AppError(400, 'Invalid webhook signature');
  }

  logger.info({ eventType: event.type, eventId: event.id }, 'Stripe webhook received');

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const userId = parseInt(pi.metadata.userId ?? '0', 10);
    const amount = pi.amount;

    if (!userId) {
      logger.warn({ paymentIntentId: pi.id }, 'No userId in PaymentIntent metadata');
      return;
    }

    // Get current balance before update
    const [currentUser] = await db
      .select({ accountBalance: users.accountBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const balanceBefore = currentUser?.accountBalance ?? 0;

    // Credit balance atomically
    await db
      .update(users)
      .set({
        accountBalance: sql`${users.accountBalance} + ${amount}`,
        totalSpent: sql`${users.totalSpent} + ${amount}`,
      })
      .where(eq(users.id, userId));

    // Record transaction with full audit trail
    await db.insert(transactions).values({
      userId,
      type: 'top_up',
      amount,
      balanceBefore,
      balanceAfter: balanceBefore + amount,
      stripePaymentId: pi.id,
      description: `Balance top-up: $${(amount / 100).toFixed(2)}`,
    });

    logger.info({ userId, amount, paymentIntentId: pi.id }, 'Balance credited via webhook');
  }
}

// ─── Connect Account ────────────────────────────────────────────────────────

export async function createConnectAccount(
  userId: number,
  email: string,
): Promise<{ accountId: string; onboardingUrl: string }> {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    metadata: { userId: String(userId) },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  await db
    .update(users)
    .set({ stripeAccountId: account.id })
    .where(eq(users.id, userId));

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${config.corsOrigin}/reader/settings?stripe=refresh`,
    return_url: `${config.corsOrigin}/reader/settings?stripe=complete`,
    type: 'account_onboarding',
  });

  logger.info({ userId, accountId: account.id }, 'Stripe Connect account created');

  return { accountId: account.id, onboardingUrl: accountLink.url };
}

// ─── Payout ─────────────────────────────────────────────────────────────────

export async function createPayout(
  readerId: number,
): Promise<{ transferId: string; amount: number }> {
  const [reader] = await db.select().from(users).where(eq(users.id, readerId)).limit(1);
  if (!reader) throw new AppError(404, 'Reader not found');
  if (reader.role !== 'reader') throw new AppError(400, 'User is not a reader');
  if (!reader.stripeAccountId) throw new AppError(400, 'Reader has no Stripe Connect account');
  if (reader.accountBalance < MIN_PAYOUT_CENTS) {
    throw new AppError(400, `Minimum payout is $${(MIN_PAYOUT_CENTS / 100).toFixed(2)}`);
  }

  const payoutAmount = reader.accountBalance;
  const balanceBefore = reader.accountBalance;

  // Deduct balance atomically — only succeeds if balance hasn't changed
  const result = await db
    .update(users)
    .set({ accountBalance: 0 })
    .where(sql`${users.id} = ${readerId} AND ${users.accountBalance} = ${payoutAmount}`)
    .returning({ id: users.id });

  if (result.length === 0) throw new AppError(409, 'Balance changed during payout, please retry');

  const transfer = await stripe.transfers.create({
    amount: payoutAmount,
    currency: 'usd',
    destination: reader.stripeAccountId,
    metadata: { readerId: String(readerId), type: 'reader_payout' },
  });

  await db.insert(transactions).values({
    userId: readerId,
    type: 'payout',
    amount: -payoutAmount,
    balanceBefore,
    balanceAfter: 0,
    stripePaymentId: transfer.id,
    description: `Payout: $${(payoutAmount / 100).toFixed(2)}`,
  });

  logger.info({ readerId, amount: payoutAmount, transferId: transfer.id }, 'Payout processed');

  return { transferId: transfer.id, amount: payoutAmount };
}

// ─── Refund ─────────────────────────────────────────────────────────────────

export async function refundReading(
  readingId: number,
  clientId: number,
  amount: number,
): Promise<void> {
  const [currentUser] = await db
    .select({ accountBalance: users.accountBalance })
    .from(users)
    .where(eq(users.id, clientId))
    .limit(1);

  const balanceBefore = currentUser?.accountBalance ?? 0;

  // Credit client balance back
  await db
    .update(users)
    .set({ accountBalance: sql`${users.accountBalance} + ${amount}` })
    .where(eq(users.id, clientId));

  await db.insert(transactions).values({
    userId: clientId,
    type: 'refund',
    amount,
    balanceBefore,
    balanceAfter: balanceBefore + amount,
    readingId,
    description: `Refund for reading #${readingId}: $${(amount / 100).toFixed(2)}`,
  });

  logger.info({ readingId, clientId, amount }, 'Reading refunded');
}
