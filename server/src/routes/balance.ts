import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from '../db/db';
import { users, transactions, transactionTypeEnum } from '@soulseer/shared/schema';
import { authMiddleware } from '../middleware/auth';

// Extend the Express Request type to include auth property
interface AuthenticatedRequest extends Request {
  auth?: {
    sub?: string;
    role?: string;
    [key: string]: any;
  };
  user?: {
    id: number;
    role: string;
  };
}

const router = Router();

// Zod schemas for validation
const topUpBalanceSchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

const adjustBalanceSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int(), // Can be positive or negative
  note: z.string().max(500).optional(),
});

// Get current user's balance
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const db = getDb();
    
    const userResult = await db
      .select({
        id: users.id,
        accountBalance: users.accountBalance,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ balance: userResult[0]!.accountBalance });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Top up user balance
router.post('/top-up', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const validatedData = topUpBalanceSchema.parse(req.body);

    const db = getDb();
    
    // Check if user exists
    const existingUser = await db
      .select({
        id: users.id,
        accountBalance: users.accountBalance,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = existingUser[0]!;

    // Update user balance and create transaction record using atomic database update
    const transaction = await db.transaction(async (tx) => {
      // Update user balance atomically in the database
      await tx
        .update(users)
        .set({ accountBalance: sql`${users.accountBalance} + ${validatedData.amount}` })
        .where(eq(users.id, req.user!.id));

      // Get the updated balance for the transaction record
      const updatedUserResult = await tx
        .select({ accountBalance: users.accountBalance })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!updatedUserResult.length) {
        throw new Error('User not found after balance update');
      }

      const updatedUser = updatedUserResult[0]!;

      // Create transaction record
      const [newTransaction] = await tx
        .insert(transactions)
        .values({
          userId: req.user!.id,
          type: 'top_up',
          amount: validatedData.amount,
          balanceBefore: currentUser.accountBalance,
          balanceAfter: updatedUser.accountBalance,
          note: validatedData.note || `Top-up of ${validatedData.amount}`,
          createdAt: new Date(),
        })
        .returning();

      return newTransaction;
    });

    res.json({
      message: 'Balance topped up successfully',
      transaction,
      newBalance: currentUser.accountBalance + validatedData.amount
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error topping up balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint: Adjust any user's balance
router.patch('/adjust', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow admins to adjust balances
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can adjust balances' });
    }

    // Validate request body
    const validatedData = adjustBalanceSchema.parse(req.body);

    const db = getDb();
    
    // Check if user exists
    const existingUser = await db
      .select({
        id: users.id,
        accountBalance: users.accountBalance,
      })
      .from(users)
      .where(eq(users.id, validatedData.userId))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = existingUser[0]!;
    const newBalance = currentUser.accountBalance + validatedData.amount;

    // Prevent negative balances unless explicitly allowed for adjustments
    if (newBalance < 0) {
      return res.status(400).json({ error: 'Balance cannot be negative' });
    }

    // Update user balance and create transaction record
    const transaction = await db.transaction(async (tx) => {
      // Update user balance
      await tx
        .update(users)
        .set({ accountBalance: newBalance })
        .where(eq(users.id, validatedData.userId));

      // Create transaction record
      const [newTransaction] = await tx
        .insert(transactions)
        .values({
          userId: validatedData.userId,
          type: 'adjustment',
          amount: validatedData.amount,
          balanceBefore: currentUser.accountBalance,
          balanceAfter: newBalance,
          note: validatedData.note || `Balance adjustment of ${validatedData.amount}`,
          createdAt: new Date(),
        })
        .returning();

      return newTransaction;
    });

    res.json({ 
      message: 'Balance adjusted successfully', 
      transaction,
      newBalance 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error adjusting balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's transaction history
router.get('/transactions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { limit = 20, offset = 0 } = req.query;

    const db = getDb();
    
    // Get user's transaction history
    const userTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        balanceBefore: transactions.balanceBefore,
        balanceAfter: transactions.balanceAfter,
        note: transactions.note,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, req.user.id))
      .orderBy(desc(transactions.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json({
      transactions: userTransactions,
      count: userTransactions.length,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint: Get any user's transaction history
router.get('/transactions/:userId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow admins to view other users' transactions
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view other users\' transactions' });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { limit = 20, offset = 0 } = req.query;

    const db = getDb();
    
    // Get user's transaction history
    const userTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        balanceBefore: transactions.balanceBefore,
        balanceAfter: transactions.balanceAfter,
        note: transactions.note,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json({
      transactions: userTransactions,
      count: userTransactions.length,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error fetching user transaction history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;