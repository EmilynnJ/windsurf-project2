import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/db';
import { users } from '@soulseer/shared/schema';

// Extend the Express Request type to include auth property
interface AuthenticatedRequest extends Request {
  auth?: {
    sub?: string;
    [key: string]: any;
  };
}

const router = Router();

// Zod schema for validating request bodies
const syncUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(50),
  fullName: z.string().min(1).max(255),
});

// Sync Auth0 user to internal DB on first login
router.post('/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = syncUserSchema.parse(req.body);

    const db = getDb();
    
    // Check if user already exists by auth0Id (sub from JWT)
    const auth0Id = req.auth?.sub;
    if (!auth0Id) {
      return res.status(401).json({ error: 'Missing authentication' });
    }

    // Check if user already exists in our database
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.auth0Id, auth0Id))
      .limit(1);

    if (existingUser.length > 0) {
      // User already exists, return existing user
      const user = existingUser[0];
      return res.json({ 
        message: 'User already synced', 
        user: { 
          id: user.id, 
          email: user.email,
          role: user.role,
          isOnline: user.isOnline
        } 
      });
    }

    // Create new user in our database
    const [newUser] = await db
      .insert(users)
      .values({
        auth0Id: auth0Id,
        email: validatedData.email,
        username: validatedData.username,
        fullName: validatedData.fullName,
        role: 'client', // Default to client role
        accountBalance: 0, // Default balance
        isOnline: false, // Default to offline
        createdAt: new Date(),
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        isOnline: users.isOnline,
      });

    res.json({ 
      message: 'User synced successfully', 
      user: newUser 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth0Id = req.auth?.sub;
    if (!auth0Id) {
      return res.status(401).json({ error: 'Missing authentication' });
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
      .where(eq(users.auth0Id, auth0Id))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userResult[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;