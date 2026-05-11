<<<<<<< HEAD
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eq, ilike, and, or, count, sql, desc, asc } from 'drizzle-orm';
import { getDb } from '../db/db';
import { users, readings, transactions, forumPosts, forumComments, forumFlags, messages } from '@soulseer/shared/schema';
import { authMiddleware as rawAuthMiddleware } from '../middleware/auth';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
  : null;

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

// Cast auth middleware to RequestHandler type for compatibility
const authMiddleware = rawAuthMiddleware as unknown as ((req: AuthenticatedRequest, res: Response, next: NextFunction) => void)[];

// Admin-only middleware
const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Zod schemas for validation
const bulkUpdateSchema = z.object({
  userIds: z.array(z.number().int().positive()),
  updates: z.object({
    role: z.enum(['client', 'reader', 'admin']).optional(),
    isOnline: z.boolean().optional(),
    accountBalance: z.number().int().nonnegative().optional(),
  }),
});

const bulkDeleteSchema = z.object({
  userIds: z.array(z.number().int().positive()),
  reason: z.string().min(1).max(500),
});

const searchUsersSchema = z.object({
  q: z.string().optional(),
  role: z.enum(['client', 'reader', 'admin']).optional(),
  isOnline: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(50),
  fullName: z.string().min(1).max(255),
  role: z.enum(['client', 'reader', 'admin']).optional().default('client'),
  bio: z.string().max(1000).optional(),
  specialties: z.string().optional(),
  pricingChat: z.number().int().nonnegative().optional().default(0),
  pricingVoice: z.number().int().nonnegative().optional().default(0),
  pricingVideo: z.number().int().nonnegative().optional().default(0),
  accountBalance: z.number().int().nonnegative().optional().default(0),
  isOnline: z.boolean().optional().default(false),
});

const balanceAdjustmentSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
  note: z.string().max(1000).optional(),
});

const forumModerationSchema = z.object({
  action: z.enum(['approve', 'remove', 'ban_user']),
  postId: z.number().int().positive().optional(),
  commentId: z.number().int().positive().optional(),
  userId: z.number().int().positive().optional(),
  reason: z.string().min(1).max(500),
});

// Admin: Get comprehensive user statistics
router.get('/stats', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    
    // Get user counts by role
    const roleStats = await db.select({
      role: users.role,
      count: count(users.id),
    }).from(users).groupBy(users.role);
    
    // Get online users count
    const onlineStats = await db.select({
      count: count(users.id),
    }).from(users).where(eq(users.isOnline, true));
    
    // Get total balance stats
    const balanceStats = await db.select({
      totalBalance: sql<number>`SUM(${users.accountBalance})`,
      avgBalance: sql<number>`AVG(${users.accountBalance})`,
      minBalance: sql<number>`MIN(${users.accountBalance})`,
      maxBalance: sql<number>`MAX(${users.accountBalance})`,
    }).from(users);
    
    // Get recent registrations
    const recentRegistrations = await db.select({
      date: sql<string>`DATE(${users.createdAt})`,
      count: count(users.id),
    }).from(users)
    .where(sql`DATE(${users.createdAt}) >= CURRENT_DATE - INTERVAL '7 days'`)
    .groupBy(sql`DATE(${users.createdAt})`)
    .orderBy(sql`DATE(${users.createdAt})`);
    
    // Get reading stats
    const readingStats = await db.select({
      status: readings.status,
      count: count(readings.id),
    }).from(readings).groupBy(readings.status);
    
    // Get financial stats
    const financialStats = await db.select({
      totalRevenue: sql<number>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`,
      totalPayouts: sql<number>`SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END)`,
      totalTransactions: count(transactions.id),
    }).from(transactions);
    
    res.json({
      totalUsers: roleStats.reduce((sum, stat) => sum + Number(stat.count), 0),
      roleBreakdown: roleStats.reduce((acc, stat) => {
        acc[stat.role] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>),
      onlineUsers: Number(onlineStats[0]?.count || 0),
      balanceStats: {
        total: Number(balanceStats[0]?.totalBalance || 0),
        average: Math.round(Number(balanceStats[0]?.avgBalance || 0)),
        min: Number(balanceStats[0]?.minBalance || 0),
        max: Number(balanceStats[0]?.maxBalance || 0),
      },
      recentRegistrations: recentRegistrations.map(r => ({
        date: r.date,
        count: Number(r.count),
      })),
      readingStats: readingStats.reduce((acc, stat) => {
        acc[stat.status] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>),
      financialStats: {
        totalRevenue: Number(financialStats[0]?.totalRevenue || 0),
        totalPayouts: Number(financialStats[0]?.totalPayouts || 0),
        totalTransactions: Number(financialStats[0]?.totalTransactions || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Bulk update users
router.patch('/users/bulk-update', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = bulkUpdateSchema.parse(req.body);
    
    const db = getDb();
    
    // Update users in transaction
    await db.transaction(async (tx) => {
      for (const userId of validatedData.userIds) {
        await tx.update(users)
          .set(validatedData.updates)
          .where(eq(users.id, userId));
      }
    });
    
    res.json({ message: `Successfully updated ${validatedData.userIds.length} users` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error bulk updating users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Bulk delete users
router.delete('/users/bulk-delete', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = bulkDeleteSchema.parse(req.body);
    
    const db = getDb();
    
    // Check if any of the users are admins (prevent deleting other admins)
    const adminUsers = await db.select()
      .from(users)
      .where(and(
        eq(users.role, 'admin'),
        sql`${users.id} = ANY(${validatedData.userIds})`
      ));
    
    if (adminUsers.length > 0) {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }
    
    // Delete users in transaction
    await db.transaction(async (tx) => {
      // Delete associated data first (foreign key constraints)
      await tx.delete(users).where(
        sql`${users.id} = ANY(${validatedData.userIds})`
      );
    });
    
    res.json({ message: `Successfully deleted ${validatedData.userIds.length} users` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error bulk deleting users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Search users with advanced filters
router.get('/users/search', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedParams = searchUsersSchema.parse(req.query);
    
    const db = getDb();
    
    // Build query with filters
    let query = db.select({
      id: users.id,
      auth0Id: users.auth0Id,
      email: users.email,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      bio: users.bio,
      specialties: users.specialties,
      profileImage: users.profileImage,
      pricingChat: users.pricingChat,
      pricingVoice: users.pricingVoice,
      pricingVideo: users.pricingVideo,
      accountBalance: users.accountBalance,
      isOnline: users.isOnline,
      createdAt: users.createdAt,
      stripeAccountId: users.stripeAccountId,
      stripeCustomerId: users.stripeCustomerId,
    }).from(users);
    
    // Apply filters
    const conditions = [];
    if (validatedParams.q) {
      conditions.push(or(
        ilike(users.username, `%${validatedParams.q}%`),
        ilike(users.fullName, `%${validatedParams.q}%`),
        ilike(users.email, `%${validatedParams.q}%`)
      ));
    }
    
    if (validatedParams.role) {
      conditions.push(eq(users.role, validatedParams.role));
    }
    if (typeof validatedParams.isOnline === 'boolean') {
      conditions.push(eq(users.isOnline, validatedParams.isOnline));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply pagination
    const usersList = await query
      .orderBy(desc(users.createdAt))
      .limit(validatedParams.limit)
      .offset(validatedParams.offset);
    
    // Get total count for pagination
    const totalResult = await db.select({ count: count() }).from(users);
    const total = totalResult[0]?.count || 0;
    
    res.json({
      users: usersList,
      pagination: {
        page: Math.floor(validatedParams.offset / validatedParams.limit) + 1,
        limit: validatedParams.limit,
        total,
        totalPages: Math.ceil(total / validatedParams.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters', details: error.issues });
    }
    
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get user details with full information
router.get('/users/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const db = getDb();
    
    const userResult = await db
      .select({
        id: users.id,
        auth0Id: users.auth0Id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        accountBalance: users.accountBalance,
        isOnline: users.isOnline,
        createdAt: users.createdAt,
        stripeAccountId: users.stripeAccountId,
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(userResult[0]);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Create user with full control
router.post('/users', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = createUserSchema.parse(req.body);
    
    const db = getDb();
    
    // Check if user with email already exists
    const existingEmailUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);
    
    if (existingEmailUser.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    
    // Check if username already exists
    const existingUsernameUser = await db
      .select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1);
    
    if (existingUsernameUser.length > 0) {
      return res.status(409).json({ error: 'A user with this username already exists' });
    }
    
    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        ...validatedData,
        auth0Id: null, // This will be set when the user logs in via Auth0
      })
      .returning({
        id: users.id,
        auth0Id: users.auth0Id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        accountBalance: users.accountBalance,
        isOnline: users.isOnline,
        createdAt: users.createdAt,
        stripeAccountId: users.stripeAccountId,
        stripeCustomerId: users.stripeCustomerId,
      });
    
    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Update any user with full control
router.put('/users/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Validate request body
    const validatedData = createUserSchema.partial().parse(req.body);
    
    const db = getDb();
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow changing admin's own role
    if (userId === req.user?.id && validatedData.role && validatedData.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own admin role' });
    }
    
    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set(validatedData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        auth0Id: users.auth0Id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        accountBalance: users.accountBalance,
        isOnline: users.isOnline,
        createdAt: users.createdAt,
        stripeAccountId: users.stripeAccountId,
        stripeCustomerId: users.stripeCustomerId,
      });
    
    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Delete user
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Don't allow deleting the admin user themselves
    if (userId === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account as admin' });
    }
    
    const db = getDb();
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow deleting other admins
    if (existingUser[0]?.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }
    
    // Delete user
    await db.delete(users).where(eq(users.id, userId));
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all readings with filters
router.get('/readings', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20, offset = 0, status, type, readerId, clientId } = req.query;
    
    const db = getDb();
    
    // Build query with filters
    let query = db.select({
      id: readings.id,
      readerId: readings.readerId,
      clientId: readings.clientId,
      type: readings.type,
      status: readings.status,
      pricePerMinute: readings.pricePerMinute,
      channelName: readings.channelName,
      createdAt: readings.createdAt,
      startedAt: readings.startedAt,
      completedAt: readings.completedAt,
      duration: readings.duration,
      totalPrice: readings.totalPrice,
      paymentStatus: readings.paymentStatus,
      billedMinutes: readings.billedMinutes,
      rating: readings.rating,
      review: readings.review,
      reader: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
      },
      client: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
      },
    })
    .from(readings)
    .leftJoin(users, eq(readings.readerId, users.id))
    .leftJoin(users, eq(readings.clientId, users.id));
    
    // Apply filters
    const conditions = [];
    if (status) {
      conditions.push(eq(readings.status, status as string));
    }
    if (type) {
      conditions.push(eq(readings.type, type as string));
    }
    if (readerId) {
      conditions.push(eq(readings.readerId, Number(readerId)));
    }
    if (clientId) {
      conditions.push(eq(readings.clientId, Number(clientId)));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply pagination
    const readingsList = await query
      .orderBy(desc(readings.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));
    
    // Get total count for pagination
    const totalResult = await db.select({ count: count() }).from(readings);
    const total = totalResult[0]?.count || 0;
    
    res.json({
      readings: readingsList,
      pagination: {
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all transactions with filters
router.get('/transactions', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, type, userId, startDate, endDate } = req.query;
    
    const db = getDb();
    
    // Build query with filters
    let query = db.select({
      id: transactions.id,
      userId: transactions.userId,
      type: transactions.type,
      amount: transactions.amount,
      balanceBefore: transactions.balanceBefore,
      balanceAfter: transactions.balanceAfter,
      readingId: transactions.readingId,
      messageId: transactions.messageId,
      stripeId: transactions.stripeId,
      note: transactions.note,
      createdAt: transactions.createdAt,
      user: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
      },
    })
    .from(transactions)
    .leftJoin(users, eq(transactions.userId, users.id));
    
    // Apply filters
    const conditions = [];
    if (type) {
      conditions.push(eq(transactions.type, type as string));
    }
    if (userId) {
      conditions.push(eq(transactions.userId, Number(userId)));
    }
    if (startDate) {
      conditions.push(sql`${transactions.createdAt} >= ${new Date(startDate as string)}`);
    }
    if (endDate) {
      conditions.push(sql`${transactions.createdAt} <= ${new Date(endDate as string)}`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply pagination
    const transactionsList = await query
      .orderBy(desc(transactions.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));
    
    // Get total count for pagination
    const totalResult = await db.select({ count: count() }).from(transactions);
    const total = totalResult[0]?.count || 0;
    
    res.json({
      transactions: transactionsList,
      pagination: {
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Manual balance adjustment
router.post('/balance/adjust', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = balanceAdjustmentSchema.parse(req.body);
    
    const db = getDb();
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.userId))
      .limit(1);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = existingUser[0];
    
    // Calculate new balance
    const newBalance = user.accountBalance + validatedData.amount;
    if (newBalance < 0) {
      return res.status(400).json({ error: 'Balance cannot be negative' });
    }
    
    // Update user balance
    await db.transaction(async (tx) => {
      // Update user balance
      await tx.update(users)
        .set({ accountBalance: newBalance })
        .where(eq(users.id, validatedData.userId));
      
      // Record transaction
      await tx.insert(transactions).values({
        userId: validatedData.userId,
        type: 'adjustment',
        amount: validatedData.amount,
        balanceBefore: user.accountBalance,
        balanceAfter: newBalance,
        note: `Admin adjustment: ${validatedData.reason}${validatedData.note ? ` - ${validatedData.note}` : ''}`,
      });
    });
    
    res.json({ 
      message: 'Balance adjusted successfully',
      userId: validatedData.userId,
      previousBalance: user.accountBalance,
      newBalance: newBalance,
      adjustment: validatedData.amount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error adjusting balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get forum flags for moderation
router.get('/forum/flags', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reviewed, limit = 50, offset = 0 } = req.query;
    
    const db = getDb();
    
    // Build where conditions
    const conditions = [];
    
    if (reviewed === 'true') {
      conditions.push(sql`${forumFlags.reviewedAt} IS NOT NULL`);
    } else if (reviewed === 'false') {
      conditions.push(sql`${forumFlags.reviewedAt} IS NULL`);
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get flags with reporter info
    const flags = await db.select({
      flag: forumFlags,
      reporter: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
      },
    })
    .from(forumFlags)
    .leftJoin(users, eq(forumFlags.reporterId, users.id))
    .where(whereClause)
    .orderBy(asc(forumFlags.reviewedAt), desc(sql`CASE WHEN ${forumFlags.reviewedAt} IS NULL THEN 1 ELSE 0 END`))
    .limit(Number(limit))
    .offset(Number(offset));
    
    // Get total count for pagination
    const totalResult = await db.select({ count: count() }).from(forumFlags).where(whereClause);
    const total = totalResult[0]?.count || 0;
    
    // Enrich flags with post/comment details
    const enrichedFlags = await Promise.all(
      flags.map(async ({ flag, reporter }) => {
        let post = null;
        let comment = null;
        
        if (flag.postId) {
          const [postData] = await db.select().from(forumPosts).where(eq(forumPosts.id, flag.postId));
          if (postData) {
            post = {
              id: postData.id,
              title: postData.title,
              content: postData.content.substring(0, 200) + '...',
              userId: postData.userId,
              createdAt: postData.createdAt,
            };
          }
        }
        
        if (flag.commentId) {
          const [commentData] = await db.select().from(forumComments).where(eq(forumComments.id, flag.commentId));
          if (commentData) {
            comment = {
              id: commentData.id,
              content: commentData.content.substring(0, 200) + '...',
              userId: commentData.userId,
              createdAt: commentData.createdAt,
            };
          }
        }
        
        return {
          ...flag,
          reporter,
          post,
          comment,
        };
      })
    );
    
    res.json({
      flags: enrichedFlags,
      pagination: {
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching forum flags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Forum moderation actions
router.post('/forum/moderate', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = forumModerationSchema.parse(req.body);
    
    const db = getDb();
    
    if (validatedData.action === 'approve') {
      // Mark flag as reviewed
      if (validatedData.postId) {
        await db.update(forumFlags)
          .set({ reviewedAt: new Date() })
          .where(eq(forumFlags.postId, validatedData.postId));
      }
      if (validatedData.commentId) {
        await db.update(forumFlags)
          .set({ reviewedAt: new Date() })
          .where(eq(forumFlags.commentId, validatedData.commentId));
      }
      
      res.json({ message: 'Flag marked as reviewed' });
    } else if (validatedData.action === 'remove') {
      // Remove post or comment
      if (validatedData.postId) {
        await db.delete(forumPosts).where(eq(forumPosts.id, validatedData.postId));
        res.json({ message: 'Post removed successfully' });
      } else if (validatedData.commentId) {
        await db.delete(forumComments).where(eq(forumComments.id, validatedData.commentId));
        res.json({ message: 'Comment removed successfully' });
      } else {
        return res.status(400).json({ error: 'Post ID or Comment ID required for removal' });
      }
    } else if (validatedData.action === 'ban_user') {
      // Ban user (set role to banned or similar)
      if (validatedData.userId) {
        await db.update(users)
          .set({ role: 'banned' as any })
          .where(eq(users.id, validatedData.userId));
        res.json({ message: 'User banned successfully' });
      } else {
        return res.status(400).json({ error: 'User ID required for banning' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid moderation action' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error in forum moderation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get active reading sessions
router.get('/sessions/active', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    
    const activeSessions = await db.select({
      id: readings.id,
      readerId: readings.readerId,
      clientId: readings.clientId,
      type: readings.type,
      status: readings.status,
      channelName: readings.channelName,
      startedAt: readings.startedAt,
      duration: readings.duration,
      reader: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        isOnline: users.isOnline,
      },
      client: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        isOnline: users.isOnline,
      },
    })
    .from(readings)
    .leftJoin(users, eq(readings.readerId, users.id))
    .leftJoin(users, eq(readings.clientId, users.id))
    .where(eq(readings.status, 'in_progress'));
    
    res.json({ sessions: activeSessions });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Process reader payout (60/40 split already applied, $15 minimum)
router.post('/payouts/:readerId', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const readerId = parseInt(req.params.readerId);
    if (isNaN(readerId)) {
      return res.status(400).json({ error: 'Invalid reader ID' });
    }

    const db = getDb();

    // Fetch reader's current accountBalance from DB
    const readerResult = await db
      .select({
        id: users.id,
        accountBalance: users.accountBalance,
        stripeAccountId: users.stripeAccountId,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, readerId))
      .limit(1);

    if (readerResult.length === 0) {
      return res.status(404).json({ error: 'Reader not found' });
    }

    const reader = readerResult[0];
    if (!reader) {
      return res.status(404).json({ error: 'Reader not found' });
    }

    if (reader.role !== 'reader') {
      return res.status(400).json({ error: 'User is not a reader' });
    }

    // Minimum payout is $15.00 (1500 cents)
    if (reader.accountBalance < 1500) {
      return res.status(400).json({ error: 'Minimum payout is $15.00' });
    }

    const paidOut = reader.accountBalance;

    // Transfer to reader's Stripe Connect account if configured
    if (stripe && reader.stripeAccountId) {
      try {
        await stripe.transfers.create({
          amount: paidOut,
          currency: 'usd',
          destination: reader.stripeAccountId,
        });
      } catch (stripeError) {
        console.error('Stripe transfer failed:', stripeError);
        return res.status(500).json({ error: 'Stripe transfer failed' });
      }
    }

    // On success: set accountBalance = 0 and log transaction record
    await db.transaction(async (tx) => {
      // Update reader balance to 0
      await tx
        .update(users)
        .set({ accountBalance: 0 })
        .where(eq(users.id, readerId));

      // Log payout transaction
      await tx.insert(transactions).values({
        userId: readerId,
        type: 'payout',
        amount: -paidOut,
        balanceBefore: paidOut,
        balanceAfter: 0,
        note: `Admin payout of $${(paidOut / 100).toFixed(2)}`,
      });
    });

    res.status(200).json({
      success: true,
      amount: paidOut,
    });
  } catch (error) {
    console.error('Error processing payout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
=======
import { Router } from "express";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";
import multer from "multer";
import { getDb } from "../db/db";
import {
  users,
  readings,
  transactions,
  forumPosts,
  forumComments,
  forumFlags,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { config } from "../config";
import { logger } from "../utils/logger";
import { auth0ManagementService } from "../services/auth0-management";
import { cloudinaryService } from "../services/cloudinary-service";

const router = Router();
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: "2024-06-20" as any,
});

// ─── Multer: 5 MB in-memory, jpeg|png|webp only (build guide §14.2) ─────────
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_IMAGE_TYPE"));
    }
  },
});

router.use(requireAuth);
router.use(requireRole("admin"));

// ─── GET /api/admin/stats — Dashboard stats ─────────────────────────────────
router.get("/stats", async (_req, res, next) => {
  try {
    const db = getDb();
    const [userCount] = await db.select({ count: count() }).from(users);
    const [readingCount] = await db.select({ count: count() }).from(readings);
    const [activeCount] = await db
      .select({ count: count() })
      .from(readings)
      .where(eq(readings.status, "active"));
    const [revenue] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${readings.platformEarned}), 0)`,
      })
      .from(readings)
      .where(eq(readings.status, "completed"));
    res.json({
      totalUsers: Number(userCount?.count ?? 0),
      totalReadings: Number(readingCount?.count ?? 0),
      activeReadings: Number(activeCount?.count ?? 0),
      totalRevenue: Number(revenue?.total ?? 0),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/users — All users ────────────────────────────────────────
router.get("/users", async (req, res, next) => {
  try {
    const db = getDb();
    const role = req.query.role as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    let q = db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)
      .$dynamic();

    if (role === "reader" || role === "client" || role === "admin") {
      q = q.where(eq(users.role, role));
    }

    res.json(await q);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/readers — Create reader account ─────────────────────────
// Admin provides profile details; server creates the Auth0 user automatically
// (using the Management API), creates a Stripe Connect Express account,
// inserts the reader into the DB, and returns a one-time generated password
// plus a Stripe Connect onboarding URL for the admin to hand to the reader.
const createReaderSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  username: z.string().min(3).max(50).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.string().max(500).optional(),
  profileImage: z.string().url().max(512).optional(),
  pricingChat: z.number().int().min(0).max(100_000).default(0),
  pricingVoice: z.number().int().min(0).max(100_000).default(0),
  pricingVideo: z.number().int().min(0).max(100_000).default(0),
});

router.post("/readers", validateBody(createReaderSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body;

    if (!auth0ManagementService.enabled) {
      res.status(503).json({
        error:
          "Auth0 Management API is not configured. Set AUTH0_MGMT_CLIENT_ID and AUTH0_MGMT_CLIENT_SECRET.",
        code: "AUTH0_MGMT_DISABLED",
      });
      return;
    }

    // Reject duplicates by email up front — Auth0 would also 409 but we want a
    // clean error before we create any Stripe state.
    const [existingByEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email));
    if (existingByEmail) {
      res.status(409).json({ error: `A user with email ${body.email} already exists` });
      return;
    }

    // 1) Create the Auth0 user (generates a secure initial password).
    let auth0Result: { auth0Id: string; password: string };
    try {
      auth0Result = await auth0ManagementService.createUserWithPassword({
        email: body.email,
        fullName: body.fullName,
        username: body.username ?? null,
      });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message, code: "AUTH0_CREATE_FAILED" });
      return;
    }

    // 2) Create a Stripe Connect Express account for payouts.
    let account: Stripe.Account;
    try {
      account = await stripe.accounts.create({
        type: "express",
        email: body.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { auth0Id: auth0Result.auth0Id, source: "admin-provisioned" },
      });
    } catch (err) {
      logger.error(
        { err, auth0Id: auth0Result.auth0Id },
        "Stripe Connect account creation failed after Auth0 user was created",
      );
      res.status(502).json({
        error:
          "Auth0 user was created but Stripe Connect account creation failed. Please retry or remove the Auth0 user manually.",
        code: "STRIPE_ACCOUNT_FAILED",
      });
      return;
    }

    // 3) Insert the reader into our DB.
    const [reader] = await db
      .insert(users)
      .values({
        auth0Id: auth0Result.auth0Id,
        email: body.email,
        fullName: body.fullName,
        username: body.username ?? null,
        role: "reader",
        bio: body.bio ?? null,
        specialties: body.specialties ?? null,
        profileImage: body.profileImage ?? null,
        pricingChat: body.pricingChat,
        pricingVoice: body.pricingVoice,
        pricingVideo: body.pricingVideo,
        stripeAccountId: account.id,
      })
      .returning();

    // 4) Generate a Stripe Connect onboarding link.
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${config.corsOrigin}/dashboard`,
      return_url: `${config.corsOrigin}/dashboard`,
      type: "account_onboarding",
    });

    logger.info(
      { readerId: reader!.id, email: body.email, adminId: req.user!.id },
      "Reader created by admin (Auth0 + Stripe Connect provisioned)",
    );

    // NOTE: The generated password is returned ONCE to the admin. The admin is
    // responsible for delivering it securely to the reader. We do not persist
    // the password anywhere.
    res.status(201).json({
      reader,
      credentials: {
        email: body.email,
        initialPassword: auth0Result.password,
      },
      stripeOnboardingUrl: accountLink.url,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/upload/image — Upload a profile image to Cloudinary ─────
// Accepts multipart/form-data with a single `file` field. Returns `{ url }`.
router.post(
  "/upload/image",
  (req, res, next) => {
    imageUpload.single("file")(req, res, (err?: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: "Image must be 5 MB or smaller" });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      if ((err as Error).message === "INVALID_IMAGE_TYPE") {
        res.status(415).json({ error: "Only JPEG, PNG, and WebP images are allowed" });
        return;
      }
      next(err as Error);
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded (expected field name: file)" });
        return;
      }
      if (!cloudinaryService.enabled) {
        res.status(503).json({
          error: "Image uploads are not configured. Set CLOUDINARY_* env vars.",
          code: "CLOUDINARY_DISABLED",
        });
        return;
      }

      const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, {
        folder: "soulseer/readers",
      });

      logger.info(
        { adminId: req.user!.id, size: req.file.size, mime: req.file.mimetype },
        "Reader profile image uploaded",
      );

      res.json({ url });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /api/admin/readers/:id — Edit reader profile ─────────────────────
const editReaderSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  username: z.string().min(3).max(50).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.string().max(500).optional(),
  profileImage: z.string().url().max(512).nullable().optional(),
  pricingChat: z.number().int().min(0).max(100_000).optional(),
  pricingVoice: z.number().int().min(0).max(100_000).optional(),
  pricingVideo: z.number().int().min(0).max(100_000).optional(),
});

router.patch(
  "/readers/:id",
  validateBody(editReaderSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const readerId = parseInt(req.params.id!, 10);

      if (isNaN(readerId)) {
        res.status(400).json({ error: "Invalid reader ID" });
        return;
      }

      // Verify reader exists
      const [reader] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, readerId), eq(users.role, "reader")));

      if (!reader) {
        res.status(404).json({ error: "Reader not found" });
        return;
      }

      const updates: Record<string, any> = {};
      const allowedFields = [
        "fullName",
        "username",
        "bio",
        "specialties",
        "profileImage",
        "pricingChat",
        "pricingVoice",
        "pricingVideo",
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (!Object.keys(updates).length) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      updates.updatedAt = new Date();

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, readerId))
        .returning();

      logger.info(
        { readerId, adminId: req.user!.id, fields: Object.keys(updates) },
        "Reader updated by admin",
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /api/admin/users/:id/role — Update user role ─────────────────────
router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const db = getDb();
    const userId = parseInt(req.params.id!, 10);
    const role = req.body.role;

    if (!["client", "reader", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    // Prevent admins from demoting themselves. A single admin account changing
    // its own role to client/reader could lock the platform out of admin access.
    if (userId === req.user!.id && role !== "admin") {
      res.status(403).json({
        error: "You cannot demote your own admin account. Ask another admin to change your role.",
      });
      return;
    }

    const [u] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!u) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(u);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/balance-adjust — Manual balance adjustment ──────────────
const adjustSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int(),
  note: z.string().min(1).max(500),
});

router.post("/balance-adjust", validateBody(adjustSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const { userId, amount, note } = req.body;

    await db.transaction(async (tx) => {
      const [before] = await tx
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, userId));

      if (!before) throw new Error("User not found");

      const balanceBefore = before.balance;

      const [u] = await tx
        .update(users)
        .set({
          balance: sql`${users.balance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ balance: users.balance });

      if (!u) throw new Error("User not found");

      await tx.insert(transactions).values({
        userId,
        type: "admin_adjustment",
        amount,
        balanceBefore,
        balanceAfter: u.balance,
        note,
      });
    });

    logger.info(
      { userId, amount, note, adminId: req.user!.id },
      "Admin balance adjustment",
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/readings — All readings platform-wide ───────────────────
router.get("/readings", async (req, res, next) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    let q = db
      .select()
      .from(readings)
      .orderBy(desc(readings.createdAt))
      .limit(limit)
      .offset(offset)
      .$dynamic();

    if (status) {
      q = q.where(eq(readings.status, status as any));
    }

    res.json(await q);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/transactions — Full transaction ledger ──────────────────
router.get("/transactions", async (req, res, next) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const list = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(list);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/payouts/:readerId — Trigger reader payout ──────────────
router.post("/payouts/:readerId", async (req, res, next) => {
  try {
    const db = getDb();
    const readerId = parseInt(req.params.readerId!, 10);

    if (isNaN(readerId)) {
      res.status(400).json({ error: "Invalid reader ID" });
      return;
    }

    const [reader] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, readerId), eq(users.role, "reader")));

    if (!reader) {
      res.status(404).json({ error: "Reader not found" });
      return;
    }

    if (!reader.stripeAccountId) {
      res.status(400).json({ error: "No Stripe Connect account" });
      return;
    }

    if (reader.balance < 1500) {
      res.status(400).json({ error: "Minimum payout balance is $15.00" });
      return;
    }

    const amount = reader.balance;
    const balanceBefore = reader.balance;

    // CRITICAL: Do the Stripe transfer FIRST, before zeroing balance.
    // If Stripe fails, the reader's balance remains untouched.
    let transfer: any;
    try {
      transfer = await stripe.transfers.create({
        amount,
        currency: "usd",
        destination: reader.stripeAccountId,
        metadata: { readerId: String(readerId), adminId: String(req.user!.id) },
      });
    } catch (stripeErr) {
      logger.error(
        { readerId, amount, err: stripeErr },
        "Stripe transfer failed -- reader balance NOT zeroed",
      );
      res.status(502).json({ error: "Stripe transfer failed. Reader balance unchanged." });
      return;
    }

    // Stripe succeeded -- now zero the balance with optimistic lock
    const result = await db
      .update(users)
      .set({ balance: 0, updatedAt: new Date() })
      .where(
        sql`${users.id} = ${readerId} AND ${users.balance} = ${amount}`,
      )
      .returning({ id: users.id });

    if (!result.length) {
      // Balance changed between check and update -- log for manual reconciliation
      logger.error(
        { readerId, amount, transferId: transfer.id },
        "Balance changed after Stripe transfer -- needs manual reconciliation",
      );
      res.status(409).json({ error: "Balance changed during payout. Stripe transfer succeeded -- manual reconciliation needed." });
      return;
    }

    await db.insert(transactions).values({
      userId: readerId,
      type: "reader_payout",
      amount: -amount,
      balanceBefore,
      balanceAfter: 0,
      stripePaymentIntentId: transfer.id,
      note: `Payout $${(amount / 100).toFixed(2)} by admin`,
    });

    logger.info(
      { readerId, amount, transferId: transfer.id, adminId: req.user!.id },
      "Reader payout processed by admin",
    );

    res.json({ transferId: transfer.id, amount });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/readings/:id/refund — Refund a reading ────────────────
router.post("/readings/:id/refund", async (req, res, next) => {
  try {
    const db = getDb();
    const readingId = parseInt(req.params.id!, 10);

    const [reading] = await db
      .select()
      .from(readings)
      .where(and(eq(readings.id, readingId), eq(readings.status, "completed")));

    if (!reading) {
      res.status(404).json({ error: "Completed reading not found" });
      return;
    }

    if (reading.totalCharged === 0) {
      res.status(400).json({ error: "Nothing to refund" });
      return;
    }

    const amount = reading.totalCharged;

    await db.transaction(async (tx) => {
      const [before] = await tx
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, reading.clientId));
      const balanceBefore = before?.balance ?? 0;

      const [u] = await tx
        .update(users)
        .set({
          balance: sql`${users.balance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, reading.clientId))
        .returning({ balance: users.balance });

      await tx.insert(transactions).values({
        userId: reading.clientId,
        readingId,
        type: "refund",
        amount,
        balanceBefore,
        balanceAfter: u!.balance,
        note: `Admin refund for reading #${readingId}`,
      });

      // Update payment status
      await tx
        .update(readings)
        .set({ paymentStatus: "refunded", updatedAt: new Date() })
        .where(eq(readings.id, readingId));
    });

    logger.info(
      { readingId, amount, adminId: req.user!.id },
      "Reading refunded by admin",
    );

    res.json({ ok: true, amount });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/forum/posts — All forum posts for moderation ─────────────
router.get("/forum/posts", async (req, res, next) => {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await db
      .select({
        id: forumPosts.id,
        authorId: forumPosts.authorId,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        isPinned: forumPosts.isPinned,
        isLocked: forumPosts.isLocked,
        flagCount: forumPosts.flagCount,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        authorName: users.fullName,
        authorEmail: users.email,
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.authorId, users.id))
      .orderBy(desc(forumPosts.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/forum/flagged — Flagged content queue ───────────────────
router.get("/forum/flagged", async (_req, res, next) => {
  try {
    const db = getDb();
    const flags = await db
      .select()
      .from(forumFlags)
      .where(eq(forumFlags.resolved, false))
      .orderBy(desc(forumFlags.createdAt))
      .limit(50);

    res.json(flags);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/admin/flags/:id/resolve — Resolve a flag ────────────────────
router.patch("/flags/:id/resolve", async (req, res, next) => {
  try {
    const db = getDb();
    const flagId = parseInt(req.params.id!, 10);

    const [f] = await db
      .update(forumFlags)
      .set({ resolved: true })
      .where(eq(forumFlags.id, flagId))
      .returning();

    if (!f) {
      res.status(404).json({ error: "Flag not found" });
      return;
    }

    res.json(f);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/admin/posts/:id — Delete forum post ────────────────────────
router.delete("/posts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    await db.delete(forumPosts).where(eq(forumPosts.id, postId));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/admin/comments/:id — Delete forum comment ──────────────────
router.delete("/comments/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const commentId = parseInt(req.params.id!, 10);
    await db.delete(forumComments).where(eq(forumComments.id, commentId));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/admin/posts/:id/lock — Lock/unlock forum post ───────────────
router.patch("/posts/:id/lock", async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    const isLocked = req.body.isLocked !== false;

    const [p] = await db
      .update(forumPosts)
      .set({ isLocked, updatedAt: new Date() })
      .where(eq(forumPosts.id, postId))
      .returning();

    if (!p) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json(p);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/provision-test-accounts ────────────────────────────────
// Idempotent QA helper that creates (or repoints) the three known test
// accounts — admin, reader, client — with caller-supplied passwords. Useful
// for getting a clean slate after Auth0/DB resets without needing local CLI
// access. Admin-only (router-level requireRole already enforces this).
const provisionSchema = z.object({
  adminPassword: z.string().min(8).max(128),
  readerPassword: z.string().min(8).max(128),
  clientPassword: z.string().min(8).max(128),
});

const TEST_ACCOUNTS = [
  {
    role: "admin" as const,
    email: "emilynnj14@gmail.com",
    fullName: "Emilynn (Admin)",
    username: "emilynn-admin",
  },
  {
    role: "reader" as const,
    email: "emilynn992@gmail.com",
    fullName: "Emilynn",
    username: "emilynn",
    pricingChat: 299,
    pricingVoice: 399,
    pricingVideo: 499,
    bio: "Test reader account for QA.",
    specialties: "Tarot, Clairvoyance, Mediumship",
  },
  {
    role: "client" as const,
    email: "emily81292@gmail.com",
    fullName: "Emily",
    username: "emily",
    startingBalanceCents: 5000,
  },
];

router.post(
  "/provision-test-accounts",
  validateBody(provisionSchema),
  async (req, res, next) => {
    try {
      if (!auth0ManagementService.enabled) {
        res.status(503).json({
          error:
            "Auth0 Management API is not configured. Set AUTH0_MGMT_CLIENT_ID and AUTH0_MGMT_CLIENT_SECRET (or AUTH0_APP_ID/AUTH0_CLIENT_SECRET).",
          code: "AUTH0_MGMT_DISABLED",
        });
        return;
      }

      const db = getDb();
      const passwordByRole: Record<string, string> = {
        admin: req.body.adminPassword,
        reader: req.body.readerPassword,
        client: req.body.clientPassword,
      };

      const results: Array<{
        email: string;
        role: string;
        auth0Created: boolean;
        dbAction: "inserted" | "updated";
      }> = [];

      for (const spec of TEST_ACCOUNTS) {
        const upsert = await auth0ManagementService.upsertUserWithPassword({
          email: spec.email,
          password: passwordByRole[spec.role]!,
          fullName: spec.fullName,
          role: spec.role,
          username: spec.username ?? null,
        });

        const patch = {
          email: spec.email,
          username: spec.username ?? null,
          fullName: spec.fullName,
          role: spec.role,
          bio: "bio" in spec ? spec.bio ?? null : null,
          specialties: "specialties" in spec ? spec.specialties ?? null : null,
          pricingChat: "pricingChat" in spec ? spec.pricingChat ?? 0 : 0,
          pricingVoice: "pricingVoice" in spec ? spec.pricingVoice ?? 0 : 0,
          pricingVideo: "pricingVideo" in spec ? spec.pricingVideo ?? 0 : 0,
          balance: "startingBalanceCents" in spec ? spec.startingBalanceCents ?? 0 : 0,
          updatedAt: new Date(),
        };

        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.auth0Id, upsert.auth0Id));

        if (existing) {
          await db.update(users).set(patch).where(eq(users.id, existing.id));
          results.push({
            email: spec.email,
            role: spec.role,
            auth0Created: upsert.created,
            dbAction: "updated",
          });
        } else {
          await db
            .insert(users)
            .values({ auth0Id: upsert.auth0Id, ...patch })
            .returning({ id: users.id });
          results.push({
            email: spec.email,
            role: spec.role,
            auth0Created: upsert.created,
            dbAction: "inserted",
          });
        }
      }

      logger.info(
        { adminId: req.user!.id, results },
        "Provisioned test accounts via admin endpoint",
      );
      res.json({ ok: true, accounts: results });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
