import { db } from '../db/db';
import { users, transactions, eq, desc } from '@soulseer/shared';
import { randomUUID } from 'crypto';

// Initialize real Stripe instance
async function initializeStripe() {
  // Import the real Stripe library
  const stripeModule = await import('stripe');
  const StripeConstructor = stripeModule.default || stripeModule.Stripe || stripeModule;
  
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  
  const stripeInstance = new StripeConstructor(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    typescript: true,
  });
  
  console.log('Stripe initialized successfully');
  return stripeInstance;
}

// Initialize stripe instance
const stripePromise = initializeStripe();


/**
 * Creates a Stripe payment intent for balance top-up
 */
export const createPaymentIntent = async (
  userId: number,
  amount: number,
  currency: string = 'usd'
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  try {
    // Get the stripe instance
    const stripeInstance = await stripePromise;
    
    // Fetch user to get their Stripe customer ID
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length) {
      throw new Error('User not found');
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Create customer if they don't have one yet
    let stripeCustomerId = user[0].stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripeInstance.customers.create({
        email: user[0].email,
        metadata: {
          userId: userId.toString(),
        },
      });
      stripeCustomerId = customer.id;

      // Update user with new customer ID
      await db
        .update(users)
        .set({ stripeCustomerId })
        .where(eq(users.id, userId));
    }

    // Create payment intent
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
      // Add additional security and compliance fields
      statement_descriptor: 'SoulSeer Balance Top-up',
      description: `Balance top-up for user ${userId}`,
      metadata: {
        userId: userId.toString(),
        type: 'balance_top_up',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Handles successful payment webhook from Stripe
 */
export const handleSuccessfulPayment = async (
  paymentIntentId: string,
  userId: number,
  amount: number
): Promise<void> => {
  try {
    // Get user's current balance
    const userResult = await db.select({ accountBalance: users.accountBalance }).from(users).where(eq(users.id, userId)).limit(1);
    
    if (!userResult.length) {
      throw new Error('User not found');
    }

    const currentBalance = userResult[0].accountBalance;
    const newBalance = currentBalance + amount;

    // Update user's balance
    await db
      .update(users)
      .set({ accountBalance: newBalance })
      .where(eq(users.id, userId));

    // Log the transaction
    await db.insert(transactions).values({
      userId,
      type: 'top_up',
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      stripeId: paymentIntentId,
      note: 'Balance top-up via Stripe',
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
};

/**
 * Verifies a webhook signature from Stripe
 */
export const verifyWebhookSignature = async (
  payload: Buffer,
  signature: string,
  endpointSecret: string
): Promise<any> => {
  try {
    const stripeInstance = await stripePromise;
    return stripeInstance.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err);
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
};

/**
 * Retrieves transaction history for a user
 */
export const getUserTransactionHistory = async (
  userId: number,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> => {
  try {
    const results = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  } catch (error) {
    console.error('Error retrieving transaction history:', error);
    throw error;
  }
};

/**
 * Gets the current user balance
 */
export const getCurrentBalance = async (userId: number): Promise<number> => {
  try {
    const userResult = await db
      .select({ accountBalance: users.accountBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult.length) {
      throw new Error('User not found');
    }

    return userResult[0].accountBalance;
  } catch (error) {
    console.error('Error retrieving balance:', error);
    throw error;
  }
};