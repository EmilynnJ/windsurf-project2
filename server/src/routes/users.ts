<<<<<<< HEAD
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, ilike, and, count, sql, desc } from 'drizzle-orm';
import { getDb } from '../db/db';
import { users } from '@soulseer/shared/schema';
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
const updateUserSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  fullName: z.string().min(1).max(255).optional(),
  bio: z.string().max(1000).optional(),
  specialties: z.string().optional(),
  profileImage: z.string().url().optional(),
  pricingChat: z.number().int().nonnegative().optional(),
  pricingVoice: z.number().int().nonnegative().optional(),
  pricingVideo: z.number().int().nonnegative().optional(),
  role: z.enum(['client', 'reader', 'admin']).optional(),
  isOnline: z.boolean().optional(),
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

const searchUsersSchema = z.object({
  q: z.string().optional(),
  role: z.enum(['client', 'reader', 'admin']).optional(),
  isOnline: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

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

// Get user profile by ID
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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
=======
import { Router } from "express";
import { eq, and, desc, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/db";
import { users, readings } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { auth0ManagementService } from "../services/auth0-management";
import { logger } from "../utils/logger";

const router = Router();

// ─── GET /api/readers — All reader profiles (public) ────────────────────────
router.get("/readers", async (_req, res, next) => {
  try {
    const db = getDb();
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
<<<<<<< HEAD
        accountBalance: users.accountBalance,
        isOnline: users.isOnline,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult[0]!;
    
    // Only return sensitive information to the user themselves or admins
    if (req.user?.id !== user.id && req.user?.role !== 'admin') {
      // Omit sensitive information for other users
      const { email, ...publicProfile } = user;
      return res.json(publicProfile);
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const validatedData = updateUserSchema.parse(req.body);

    const db = getDb();
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent unauthorized role changes
    if (validatedData.role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change user roles' });
    }

    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set({
        ...validatedData,
        // Prevent users from changing their own role unless they're admin
        role: validatedData.role && req.user.role === 'admin' ? validatedData.role : existingUser[0]!.role,
      })
      .where(eq(users.id, req.user.id))
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
      });

    res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle online status
router.patch('/me/online', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { isOnline } = req.body;
    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'isOnline must be a boolean' });
    }

    const db = getDb();
    
    const [updatedUser] = await db
      .update(users)
      .set({ isOnline })
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        isOnline: users.isOnline,
      });

    res.json({ message: `User is now ${isOnline ? 'online' : 'offline'}`, user: updatedUser });
  } catch (error) {
    console.error('Error toggling online status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users with filters
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate query parameters
    const validatedParams = searchUsersSchema.parse(req.query);

    const db = getDb();
    
    // Build query with filters
    let query = db.select({
      id: users.id,
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
    }).from(users);

    // Apply filters
    const conditions = [];
    if (validatedParams.q) {
      conditions.push(ilike(users.username, `%${validatedParams.q}%`));
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
      .limit(validatedParams.limit)
      .offset(validatedParams.offset);

    // For non-admins, only return public information
    if (req.user?.role !== 'admin') {
      const publicUsers = usersList.map(({ email, ...user }) => user);
      return res.json({
        users: publicUsers,
        count: usersList.length,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
      });
    }

    res.json({
      users: usersList,
      count: usersList.length,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters', details: error.issues });
    }
    
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint: Create user
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow admins to create users
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

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

// Admin endpoint: Update any user
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow admins to update other users
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update other users' });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Validate request body
    const validatedData = updateUserSchema.parse(req.body);

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

// Admin endpoint: Delete user
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow admins to delete users
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Don't allow deleting the admin user themselves
    if (userId === req.user.id) {
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

    // Delete user
    await db.delete(users).where(eq(users.id, userId));

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint: Get all users with filters
router.get('/all/:role?', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow admins to access all users
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can access all users' });
    }

    const { role } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const db = getDb();
    
    const usersList = await db.select({
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
    }).from(users)
      .where(role ? eq(users.role, role as 'client' | 'reader' | 'admin') : undefined)
      .limit(Number(limit))
      .offset(Number(offset));

    res.json({
      users: usersList,
      count: usersList.length,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
=======
        isOnline: users.isOnline,
        totalReadings: users.totalReadings,
      })
      .from(users)
      .where(and(eq(users.role, "reader"), isNull(users.deletedAt)))
      .orderBy(desc(users.isOnline));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/readers/online — Online readers only (public) ─────────────────
router.get("/readers/online", async (_req, res, next) => {
  try {
    const db = getDb();
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        totalReadings: users.totalReadings,
      })
      .from(users)
      .where(and(eq(users.role, "reader"), eq(users.isOnline, true), isNull(users.deletedAt)));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/readers/:id — Single reader profile (public) ──────────────────
router.get("/readers/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const readerId = parseInt(req.params.id!, 10);

    if (isNaN(readerId)) {
      res.status(400).json({ error: "Invalid reader ID" });
      return;
    }

    const [reader] = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        totalReadings: users.totalReadings,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, readerId), eq(users.role, "reader"), isNull(users.deletedAt)));

    if (!reader) {
      res.status(404).json({ error: "Reader not found" });
      return;
    }

    // Get reviews
    const readerReviews = await db
      .select({
        id: readings.id,
        rating: readings.rating,
        review: readings.review,
        completedAt: readings.completedAt,
        clientName: users.fullName,
        clientUsername: users.username,
      })
      .from(readings)
      .innerJoin(users, eq(readings.clientId, users.id))
      .where(
        and(eq(readings.readerId, readerId), eq(readings.status, "completed")),
      )
      .orderBy(desc(readings.completedAt))
      .limit(20);

    const rated = readerReviews.filter((r) => r.rating != null);
    const avgRating =
      rated.length > 0
        ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length
        : 0;

    res.json({
      ...reader,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: rated.length,
      reviews: rated,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/user/balance — Current user balance (authenticated) ───────────
router.get("/user/balance", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const [u] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, req.user!.id));
    res.json({ balance: u?.balance ?? 0 });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/me — Current user profile ─────────────────────────────────────
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const { auth0Id, stripeAccountId, stripeCustomerId, ...safe } = req.user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/me — Update own profile ─────────────────────────────────────
const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  username: z.string().min(3).max(50).optional(),
  bio: z.string().max(2000).optional(),
  profileImage: z.string().url().max(512).optional(),
});

router.patch(
  "/me",
  requireAuth,
  validateBody(updateProfileSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const allowed = ["fullName", "username", "bio", "profileImage"];
      const updates: Record<string, any> = {};
      for (const f of allowed) {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      }
      if (!Object.keys(updates).length) {
        res.status(400).json({ error: "No valid fields" });
        return;
      }
      updates.updatedAt = new Date();

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.user!.id))
        .returning();

      const { auth0Id, stripeAccountId, stripeCustomerId, ...safe } = updated!;
      res.json(safe);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /api/readers/status — Toggle online/offline (reader only) ────────
router.patch("/readers/status", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader") {
      res.status(403).json({ error: "Only readers" });
      return;
    }
    const isOnline = req.body.isOnline === true;
    const [u] = await db
      .update(users)
      .set({ isOnline, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning({ isOnline: users.isOnline });

    // If the reader has just gone offline, notify any partners on active/pending
    // readings and mark accepted/in-progress sessions as paused so billing
    // stops. The client can then end the session cleanly.
    if (!isOnline) {
      const { billingService } = await import("../services/billing-service");
      await billingService.handleReaderOffline(req.user!.id);
    }

    res.json({ isOnline: u!.isOnline });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/readers/pricing — Update per-type rates (reader only) ───────
const pricingSchema = z.object({
  pricingChat: z.number().int().min(0).max(100_000).optional(),
  pricingVoice: z.number().int().min(0).max(100_000).optional(),
  pricingVideo: z.number().int().min(0).max(100_000).optional(),
});

router.patch(
  "/readers/pricing",
  requireAuth,
  validateBody(pricingSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      if (req.user!.role !== "reader") {
        res.status(403).json({ error: "Only readers" });
        return;
      }
      const updates: Record<string, any> = {};
      if (req.body.pricingChat !== undefined) updates.pricingChat = req.body.pricingChat;
      if (req.body.pricingVoice !== undefined) updates.pricingVoice = req.body.pricingVoice;
      if (req.body.pricingVideo !== undefined) updates.pricingVideo = req.body.pricingVideo;

      if (!Object.keys(updates).length) {
        res.status(400).json({ error: "No pricing fields" });
        return;
      }
      updates.updatedAt = new Date();

      const [u] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.user!.id))
        .returning();

      res.json({
        pricingChat: u!.pricingChat,
        pricingVoice: u!.pricingVoice,
        pricingVideo: u!.pricingVideo,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /api/readers/profile — Update bio and specialties (reader only) ──
const readerProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  specialties: z.string().max(500).optional(),
});

router.patch(
  "/readers/profile",
  requireAuth,
  validateBody(readerProfileSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      if (req.user!.role !== "reader") {
        res.status(403).json({ error: "Only readers" });
        return;
      }
      const updates: Record<string, any> = {};
      if (req.body.bio !== undefined) updates.bio = req.body.bio;
      if (req.body.specialties !== undefined) updates.specialties = req.body.specialties;

      if (!Object.keys(updates).length) {
        res.status(400).json({ error: "No valid fields" });
        return;
      }
      updates.updatedAt = new Date();

      const [u] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.user!.id))
        .returning();

      const { auth0Id, stripeAccountId, stripeCustomerId, ...safe } = u!;
      res.json(safe);
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/me — Delete own account ────────────────────────────────────
// Soft-deletes the user by setting deletedAt, scrubbing PII, forcing offline,
// and clearing Stripe/Auth0 references. Historical readings/transactions are
// retained for compliance and accounting.
router.delete("/me", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user!.id;

    // Block deletion if the user has an active reading in progress.
    const active = await db
      .select({ id: readings.id })
      .from(readings)
      .where(
        and(
          or(eq(readings.clientId, userId), eq(readings.readerId, userId)),
          inArray(readings.status, ["pending", "accepted", "active", "paused"] as const),
        ),
      )
      .limit(1);

    if (active.length > 0) {
      res.status(409).json({
        error: "You have an active reading. End it before deleting your account.",
      });
      return;
    }

    // Admins cannot self-delete — prevents locking platform out of admin access.
    if (req.user!.role === "admin") {
      res.status(403).json({
        error: "Admins cannot delete their own account. Ask another admin.",
      });
      return;
    }

    // Try to delete the Auth0 user first (best effort). If it fails we still
    // want to scrub local data so the user is effectively logged out.
    const auth0Id = req.user!.auth0Id;
    let auth0Deleted = false;
    try {
      auth0Deleted = await auth0ManagementService.deleteUser(auth0Id);
    } catch (err) {
      logger.error({ err, userId }, "Auth0 deletion failed during account delete — continuing with local scrub");
    }

    const now = new Date();
    const scrubbedEmail = `deleted-${userId}-${now.getTime()}@deleted.soulseer.invalid`;
    const scrubbedAuth0Id = `deleted|${userId}|${now.getTime()}`;

    await db
      .update(users)
      .set({
        email: scrubbedEmail,
        auth0Id: scrubbedAuth0Id,
        username: null,
        fullName: "Deleted User",
        profileImage: null,
        bio: null,
        specialties: null,
        isOnline: false,
        stripeAccountId: null,
        stripeCustomerId: null,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    logger.info({ userId, auth0Deleted }, "Account deleted");
    res.json({ ok: true, auth0Deleted });
  } catch (err) {
    next(err);
  }
});

// ─── Backward compatible routes ─────────────────────────────────────────────
router.patch("/me/online", requireAuth, async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader") {
      res.status(403).json({ error: "Only readers" });
      return;
    }
    const isOnline = req.body.isOnline === true;
    const [u] = await db
      .update(users)
      .set({ isOnline, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning({ isOnline: users.isOnline });

    if (!isOnline) {
      const { billingService } = await import("../services/billing-service");
      await billingService.handleReaderOffline(req.user!.id);
    }

    res.json({ isOnline: u!.isOnline });
  } catch (err) {
    next(err);
  }
});

router.patch("/me/pricing", requireAuth, validateBody(pricingSchema), async (req, res, next) => {
  try {
    const db = getDb();
    if (req.user!.role !== "reader") {
      res.status(403).json({ error: "Only readers" });
      return;
    }
    const updates: Record<string, any> = {};
    if (req.body.pricingChat !== undefined) updates.pricingChat = req.body.pricingChat;
    if (req.body.pricingVoice !== undefined) updates.pricingVoice = req.body.pricingVoice;
    if (req.body.pricingVideo !== undefined) updates.pricingVideo = req.body.pricingVideo;

    if (!Object.keys(updates).length) {
      res.status(400).json({ error: "No pricing fields" });
      return;
    }
    updates.updatedAt = new Date();

    const [u] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.id))
      .returning();

    res.json({
      pricingChat: u!.pricingChat,
      pricingVoice: u!.pricingVoice,
      pricingVideo: u!.pricingVideo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
