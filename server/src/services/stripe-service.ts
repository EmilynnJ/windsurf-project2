import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { users, transactions } from "@soulseer/shared/schema";
import { getDb } from "../db/db";
import { config } from "../config";
import { logger } from "../utils/logger";

// ─── Stripe instance ────────────────────────────────────────────────────────

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!config.stripe.secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripe = new Stripe(config.stripe.secretKey, { apiVersion: "2025-02-24.acacia" });
  }
  return stripe;
}

// ─── Payment Intent (top-up) ─────────────────────────────────────────────────

/**
 * Create a Stripe PaymentIntent for a balance top-up.
 * @param userId  Internal user ID
 * @param amountCents  Amount in cents (min 500 = $5)
 */
export async function createPaymentIntent(
  userId: number,
  amountCents: number,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const s = getStripe();
  const db = getDb();

  // Get user
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) throw new Error("User not found");

  // Ensure Stripe customer exists
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await s.customers.create({
      email: user.email,
      metadata: { userId: userId.toString() },
    });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
  }

  const paymentIntent = await s.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    statement_descriptor: "SoulSeer TopUp",
    metadata: { userId: userId.toString(), type: "balance_top_up" },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

// ─── Webhook: payment_intent.succeeded ───────────────────────────────────────

/**
 * Credit a user's account after successful Stripe payment.
 * Called from the webhook handler after signature verification.
 */
export async function handlePaymentSucceeded(
  paymentIntentId: string,
  userId: number,
  amountCents: number,
): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    const userRows = await tx
      .select({ accountBalance: users.accountBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userRows[0];
    if (!user) throw new Error("User not found during payment processing");

    const balanceBefore = user.accountBalance;
    const balanceAfter = balanceBefore + amountCents;

    await tx.update(users).set({ accountBalance: balanceAfter }).where(eq(users.id, userId));

    await tx.insert(transactions).values({
      userId,
      type: "top_up",
      amount: amountCents,
      balanceBefore,
      balanceAfter,
      stripeId: paymentIntentId,
      note: `Balance top-up via Stripe ($${(amountCents / 100).toFixed(2)})`,
    });
  });

  logger.info({ userId, amountCents, paymentIntentId }, "Payment succeeded — balance credited");
}

// ─── Stripe Signature Verification ──────────────────────────────────────────

export function verifyWebhookSignature(
  payload: Buffer,
  signature: string,
): Stripe.Event {
  const s = getStripe();
  if (!config.stripe.webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return s.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
}

// ─── Stripe Connect (readers) ───────────────────────────────────────────────

/**
 * Create a Stripe Connect Express account for a reader.
 */
export async function createConnectAccount(
  readerId: number,
  email: string,
): Promise<{ accountId: string; onboardingUrl: string }> {
  const s = getStripe();
  const db = getDb();

  const account = await s.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { readerId: readerId.toString() },
  });

  await db
    .update(users)
    .set({ stripeAccountId: account.id })
    .where(eq(users.id, readerId));

  const accountLink = await s.accountLinks.create({
    account: account.id,
    refresh_url: `${config.corsOrigin}/reader/onboarding?refresh=true`,
    return_url: `${config.corsOrigin}/reader/dashboard`,
    type: "account_onboarding",
  });

  logger.info({ readerId, accountId: account.id }, "Created Stripe Connect account");

  return { accountId: account.id, onboardingUrl: accountLink.url };
}

/**
 * Trigger a payout to a reader's connected Stripe account.
 * Admin-initiated.
 */
export async function triggerPayout(
  readerId: number,
  amountCents: number,
): Promise<{ transferId: string }> {
  const s = getStripe();
  const db = getDb();

  const readerRows = await db.select().from(users).where(eq(users.id, readerId)).limit(1);
  const reader = readerRows[0];
  if (!reader) throw new Error("Reader not found");
  if (!reader.stripeAccountId) throw new Error("Reader has no Stripe Connect account");
  if (reader.accountBalance < amountCents) throw new Error("Insufficient reader balance for payout");

  // Create transfer to connected account
  const transfer = await s.transfers.create({
    amount: amountCents,
    currency: "usd",
    destination: reader.stripeAccountId,
    metadata: { readerId: readerId.toString(), type: "reader_payout" },
  });

  // Update balance inside a DB transaction
  await db.transaction(async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    const currentRows = await tx
      .select({ accountBalance: users.accountBalance })
      .from(users)
      .where(eq(users.id, readerId))
      .limit(1);

    const current = currentRows[0];
    if (!current) throw new Error("Reader not found");

    const balanceBefore = current.accountBalance;
    const balanceAfter = balanceBefore - amountCents;

    await tx.update(users).set({ accountBalance: balanceAfter }).where(eq(users.id, readerId));

    await tx.insert(transactions).values({
      userId: readerId,
      type: "payout",
      amount: -amountCents,
      balanceBefore,
      balanceAfter,
      stripeId: transfer.id,
      note: `Payout to Stripe Connect ($${(amountCents / 100).toFixed(2)})`,
    });
  });

  logger.info({ readerId, amountCents, transferId: transfer.id }, "Payout transfer created");

  return { transferId: transfer.id };
}
