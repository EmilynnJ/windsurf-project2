import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { users } from '../db/schema';
import { checkJwt } from '../middleware/auth';
import { resolveUser } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { strictLimiter } from '../middleware/rate-limit';
import { logger } from '../utils/logger';

const router = Router();

const syncSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().max(100).optional(),
  username: z.string().max(50).optional(),
  avatarUrl: z.string().url().optional(),
});

// POST /api/auth/sync — sync Auth0 user to DB (create if new)
router.post('/sync', strictLimiter, checkJwt, validate(syncSchema), async (req, res, next) => {
  try {
    const auth0Id = req.auth?.payload?.sub;
    if (!auth0Id) {
      res.status(401).json({ error: 'Missing auth0 subject' });
      return;
    }

    const body = req.body as z.infer<typeof syncSchema>;

    // Check if user exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.auth0Id, auth0Id))
      .limit(1);

    if (existing) {
      // Update fields that may have changed
      const updates: Record<string, any> = {};
      if (body.email && body.email !== existing.email) updates.email = body.email;
      if (body.fullName && body.fullName !== existing.fullName) updates.fullName = body.fullName;
      if (body.avatarUrl && body.avatarUrl !== existing.avatarUrl) updates.avatarUrl = body.avatarUrl;

      if (Object.keys(updates).length > 0) {
        const [updated] = await db
          .update(users)
          .set(updates)
          .where(eq(users.id, existing.id))
          .returning();
        res.json(updated);
      } else {
        res.json(existing);
      }
      return;
    }

    // Create new user
    const email = body.email ?? (req.auth?.payload as any)?.email ?? `${auth0Id}@soulseer.app`;
    const [newUser] = await db
      .insert(users)
      .values({
        auth0Id,
        email,
        fullName: body.fullName ?? null,
        username: body.username ?? null,
        avatarUrl: body.avatarUrl ?? null,
        role: 'client',
        accountBalance: 0,
        totalEarnings: 0,
        totalSpent: 0,
        isOnline: false,
        pricingChat: 0,
        pricingVoice: 0,
        pricingVideo: 0,
      })
      .returning();

    logger.info({ userId: newUser!.id, auth0Id }, 'New user created via sync');
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — get current user profile
router.get('/me', checkJwt, resolveUser, async (req, res) => {
  res.json(req.user);
});

export default router;
