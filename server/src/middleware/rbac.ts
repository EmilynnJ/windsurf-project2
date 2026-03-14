import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { users, readings } from '@soulseer/shared/schema';
import { logger } from '../utils/logger';
import '../types';

export async function resolveUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth0Id = req.auth?.payload?.sub ?? (req.auth as any)?.sub;
    if (!auth0Id) {
      res.status(401).json({ error: 'Missing authentication subject' });
      return;
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.auth0Id, auth0Id as string))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: 'User not found. Please sync your account first.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    logger.error({ err }, 'Error resolving user from JWT');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireRole(...allowedRoles: Array<'client' | 'reader' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export async function requireParticipant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const readingId = parseInt(req.params.id ?? '', 10);
    if (isNaN(readingId)) {
      res.status(400).json({ error: 'Invalid reading ID' });
      return;
    }
    const [reading] = await db
      .select()
      .from(readings)
      .where(eq(readings.id, readingId))
      .limit(1);
    if (!reading) {
      res.status(404).json({ error: 'Reading not found' });
      return;
    }
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (reading.clientId !== req.user.id && reading.readerId !== req.user.id) {
      res.status(403).json({ error: 'You are not a participant in this reading' });
      return;
    }
    req.reading = reading;
    next();
  } catch (err) {
    logger.error({ err }, 'Error checking reading participation');
    res.status(500).json({ error: 'Internal server error' });
  }
}
