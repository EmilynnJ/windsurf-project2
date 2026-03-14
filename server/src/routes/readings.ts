import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ReadingService } from '../services/reading-service';
import { z } from 'zod';
import { db } from '../db/db';
import { readings, users } from '@soulseer/shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = express.Router();

// Extend Express Request type to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// Validation schemas
const CreateReadingSchema = z.object({
  readerId: z.number().int().positive(),
  type: z.enum(['chat', 'voice', 'video']),
});

const MessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

// Create a new reading request
router.post('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const { readerId, type } = CreateReadingSchema.parse(req.body);
    const clientId = req.user!.id;

    // Get reader's pricing based on type
    const reader = await db.query.users.findFirst({
      where: eq(users.id, readerId),
      columns: { pricingChat: true, pricingVoice: true, pricingVideo: true },
    });

    if (!reader) {
      return res.status(404).json({ error: 'Reader not found' });
    }

    let pricePerMinute = 0;
    if (type === 'chat') pricePerMinute = reader.pricingChat;
    if (type === 'voice') pricePerMinute = reader.pricingVoice;
    if (type === 'video') pricePerMinute = reader.pricingVideo;

    const reading = await ReadingService.createReading({
      readerId,
      clientId,
      type,
      pricePerMinute,
    });

    res.status(201).json(reading);
    } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Error creating reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reading by ID
router.get('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.getReadingById(id);

    if (!reading) {
      return res.status(404).json({ error: 'Reading not found' });
    }

    // Check if user is authorized to view this reading
    if (req.user!.id !== reading.clientId && req.user!.id !== reading.readerId) {
      return res.status(403).json({ error: 'Unauthorized to view this reading' });
    }

    res.json(reading);
  } catch (error) {
    console.error('Error getting reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept a reading request (reader only)
router.patch('/:id/accept', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.acceptReading(id, req.user!.id);

    res.json(reading);
  } catch (error) {
    console.error('Error accepting reading:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a reading session
router.patch('/:id/start', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.startReading(id, req.user!.id);

    res.json(reading);
  } catch (error) {
    console.error('Error starting reading:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End a reading session
router.patch('/:id/end', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.endReading(id, req.user!.id);

    res.json(reading);
  } catch (error) {
    console.error('Error ending reading:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel a reading request
router.patch('/:id/cancel', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const reading = await ReadingService.cancelReading(id, req.user!.id);

    res.json(reading);
  } catch (error) {
    console.error('Error cancelling reading:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a message to a chat reading
router.post('/:id/messages', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const { content } = MessageSchema.parse(req.body);
    const senderId = req.user!.id;

    await ReadingService.addMessage(id, senderId, content);

    res.status(201).json({ message: 'Message added successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Error adding message:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's readings
router.get('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;
    const userId = req.user!.id;

    // Validate query parameters
    const parsedLimit = parseInt(limit as string) || 20;
    const parsedOffset = parseInt(offset as string) || 0;
    
    let parsedStatus: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | undefined;
    if (status && typeof status === 'string' && 
        ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      parsedStatus = status as 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    }

    const readings = await ReadingService.getUserReadings(userId, parsedLimit, parsedOffset);

    // Filter by status if provided
    const filteredReadings = parsedStatus 
      ? readings.filter(r => r.status === parsedStatus)
      : readings;

    res.json(filteredReadings);
  } catch (error) {
    console.error('Error getting user readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get readings for a specific reader
router.get('/reader/:readerId', authMiddleware, async (req: any, res: Response) => {
  try {
    const readerId = parseInt(req.params.readerId);
    if (isNaN(readerId)) {
      return res.status(400).json({ error: 'Invalid reader ID' });
    }

    const { status } = req.query;
    let parsedStatus: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | undefined;
    if (status && typeof status === 'string' && 
        ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      parsedStatus = status as 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    }

    const readings = await ReadingService.getReaderReadings(readerId, parsedStatus);

    res.json(readings);
  } catch (error) {
    console.error('Error getting reader readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get readings for a specific client
router.get('/client/:clientId', authMiddleware, async (req: any, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const { status } = req.query;
    let parsedStatus: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | undefined;
    if (status && typeof status === 'string' && 
        ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      parsedStatus = status as 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    }

    const readings = await ReadingService.getClientReadings(clientId, parsedStatus);

    res.json(readings);
  } catch (error) {
    console.error('Error getting client readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate Agora token for a reading
router.post('/:id/token', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    const { role = 'publisher' } = req.body;
    const validRoles = ['publisher', 'subscriber'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be publisher or subscriber' });
    }

    const token = await ReadingService.generateAgoraToken(id, req.user!.id, role);

    res.json({ token });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle disconnection
router.post('/:id/disconnect', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    await ReadingService.handleDisconnection(id, req.user!.id);

    res.json({ message: 'Disconnection handled' });
  } catch (error) {
    console.error('Error handling disconnection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle reconnection
router.post('/:id/reconnect', authMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid reading ID' });
    }

    await ReadingService.handleReconnection(id, req.user!.id);

    res.json({ message: 'Reconnection handled' });
  } catch (error) {
    console.error('Error handling reconnection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;