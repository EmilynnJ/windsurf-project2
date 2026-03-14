import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, ilike, and } from 'drizzle-orm';
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
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
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