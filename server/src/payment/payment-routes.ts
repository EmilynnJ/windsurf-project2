import express from 'express';
import { createPaymentIntent, getUserTransactionHistory, getCurrentBalance } from './stripe-service';
import { handleStripeWebhook } from './webhook-handler';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const topUpSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

const transactionHistorySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

// Route to create a payment intent for balance top-up
router.post('/create-payment-intent', authMiddleware, async (req, res) => {
  try {
    // Validate request body
    const { amount } = topUpSchema.parse(req.body);

    // Ensure amount is reasonable (e.g., max $1000)
    if (amount > 1000) {
      return res.status(400).json({ error: 'Maximum top-up amount is $1000' });
    }
    
    // Minimum amount validation
    if (amount < 1) {
      return res.status(400).json({ error: 'Minimum top-up amount is $1' });
    }

    const userId = req.user!.id;

    // Validate that Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    // Create payment intent
    const { clientSecret, paymentIntentId } = await createPaymentIntent(userId, amount);

    res.json({
      clientSecret,
      paymentIntentId,
      amount,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get user's current balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const balance = await getCurrentBalance(userId);
    
    res.json({
      balance,
    });
  } catch (error) {
    console.error('Error retrieving balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get user's transaction history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate query parameters
    const { limit, offset } = transactionHistorySchema.parse(req.query);
    
    const transactions = await getUserTransactionHistory(userId, limit, offset);
    
    res.json({
      transactions,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error retrieving transaction history:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid parameters', details: error.errors });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook endpoint for Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Health check endpoint to verify payment system is operational
router.get('/health', (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        status: 'error',
        message: 'STRIPE_SECRET_KEY not configured'
      });
    }
    
    res.json({
      status: 'ok',
      message: 'Payment system is configured and operational',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Payment system health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Payment system check failed',
      error: (error as Error).message
    });
  }
});

export default router;