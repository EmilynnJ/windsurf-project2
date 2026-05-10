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