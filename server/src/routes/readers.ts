import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, and, or, ilike } from 'drizzle-orm';
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
const updateReaderProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  specialties: z.string().optional(),
  profileImage: z.string().url().optional(),
  pricingChat: z.number().int().nonnegative().optional(),
  pricingVoice: z.number().int().nonnegative().optional(),
  pricingVideo: z.number().int().nonnegative().optional(),
  isOnline: z.boolean().optional(),
});

const searchReadersSchema = z.object({
  q: z.string().optional(),
  specialties: z.string().optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  isOnline: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

// Get all readers with filters
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate query parameters
    const validatedParams = searchReadersSchema.parse(req.query);

    const db = getDb();
    
    // Build query for readers only
    let query = db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      bio: users.bio,
      specialties: users.specialties,
      profileImage: users.profileImage,
      pricingChat: users.pricingChat,
      pricingVoice: users.pricingVoice,
      pricingVideo: users.pricingVideo,
      isOnline: users.isOnline,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.role, 'reader'));

    // Apply filters
    const conditions = [];

    if (validatedParams.q) {
      conditions.push(ilike(users.username, `%${validatedParams.q}%`));
    }

    if (validatedParams.specialties) {
      conditions.push(ilike(users.specialties, `%${validatedParams.specialties}%`));
    }

    if (typeof validatedParams.minPrice === 'number') {
      conditions.push(
        or(
          users.pricingChat >= validatedParams.minPrice,
          users.pricingVoice >= validatedParams.minPrice,
          users.pricingVideo >= validatedParams.minPrice
        )
      );
    }

    if (typeof validatedParams.maxPrice === 'number') {
      conditions.push(
        or(
          users.pricingChat <= validatedParams.maxPrice,
          users.pricingVoice <= validatedParams.maxPrice,
          users.pricingVideo <= validatedParams.maxPrice
        )
      );
    }

    if (typeof validatedParams.isOnline === 'boolean') {
      conditions.push(eq(users.isOnline, validatedParams.isOnline));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply pagination
    const readers = await query
      .limit(validatedParams.limit)
      .offset(validatedParams.offset);

    res.json({
      readers,
      count: readers.length,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters', details: error.issues });
    }
    
    console.error('Error searching readers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reader by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const readerId = parseInt(req.params.id);
    if (isNaN(readerId)) {
      return res.status(400).json({ error: 'Invalid reader ID' });
    }

    const db = getDb();
    
    const readerResult = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, readerId), eq(users.role, 'reader')))
      .limit(1);

    if (readerResult.length === 0) {
      return res.status(404).json({ error: 'Reader not found' });
    }

    res.json(readerResult[0]);
  } catch (error) {
    console.error('Error fetching reader profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update authenticated reader's profile
router.put('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only allow readers to update their profiles
    if (req.user.role !== 'reader') {
      return res.status(403).json({ error: 'Only readers can update reader profiles' });
    }

    // Validate request body
    const validatedData = updateReaderProfileSchema.parse(req.body);

    const db = getDb();
    
    // Check if user exists and is a reader
    const existingReader = await db
      .select()
      .from(users)
      .where(and(eq(users.id, req.user.id), eq(users.role, 'reader')))
      .limit(1);

    if (existingReader.length === 0) {
      return res.status(404).json({ error: 'Reader not found' });
    }

    // Update reader profile in database
    const [updatedReader] = await db
      .update(users)
      .set(validatedData)
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        bio: users.bio,
        specialties: users.specialties,
        profileImage: users.profileImage,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
        isOnline: users.isOnline,
        createdAt: users.createdAt,
      });

    res.json({ message: 'Reader profile updated successfully', reader: updatedReader });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error updating reader profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle reader's online status
router.patch('/me/online', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only allow readers to toggle their online status
    if (req.user.role !== 'reader') {
      return res.status(403).json({ error: 'Only readers can update their online status' });
    }

    const { isOnline } = req.body;
    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'isOnline must be a boolean' });
    }

    const db = getDb();
    
    const [updatedReader] = await db
      .update(users)
      .set({ isOnline })
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        isOnline: users.isOnline,
      });

    res.json({ message: `Reader is now ${isOnline ? 'online' : 'offline'}`, reader: updatedReader });
  } catch (error) {
    console.error('Error toggling reader online status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update reader pricing
router.patch('/me/pricing', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only allow readers to update their pricing
    if (req.user.role !== 'reader') {
      return res.status(403).json({ error: 'Only readers can update their pricing' });
    }

    // Validate request body
    const pricingUpdate = z.object({
      pricingChat: z.number().int().nonnegative().optional(),
      pricingVoice: z.number().int().nonnegative().optional(),
      pricingVideo: z.number().int().nonnegative().optional(),
    }).parse(req.body);

    // At least one pricing field must be provided
    if (
      typeof pricingUpdate.pricingChat === 'undefined' &&
      typeof pricingUpdate.pricingVoice === 'undefined' &&
      typeof pricingUpdate.pricingVideo === 'undefined'
    ) {
      return res.status(400).json({ error: 'At least one pricing field must be provided' });
    }

    const db = getDb();
    
    // Check if user exists and is a reader
    const existingReader = await db
      .select()
      .from(users)
      .where(and(eq(users.id, req.user.id), eq(users.role, 'reader')))
      .limit(1);

    if (existingReader.length === 0) {
      return res.status(404).json({ error: 'Reader not found' });
    }

    // Update reader pricing in database
    const [updatedReader] = await db
      .update(users)
      .set(pricingUpdate)
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        pricingChat: users.pricingChat,
        pricingVoice: users.pricingVoice,
        pricingVideo: users.pricingVideo,
      });

    res.json({ message: 'Reader pricing updated successfully', pricing: updatedReader });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error updating reader pricing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;