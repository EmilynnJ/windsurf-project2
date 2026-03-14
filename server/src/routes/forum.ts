import { Router } from 'express';
import { z } from 'zod';
import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../db/db';
import { forumPosts, forumComments, forumFlags, users } from '../db/schema';
import { checkJwt } from '../middleware/auth';
import { resolveUser, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  category: z.enum([
    'general',
    'readings',
    'spiritual_growth',
    'ask_a_reader',
    'announcements',
  ]),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

const flagSchema = z.object({
  reason: z.string().min(1).max(500),
});

// GET /api/forum/posts — list posts with pagination (Public)
router.get('/posts', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const offset = (page - 1) * limit;
    const category = req.query.category as string | undefined;

    const conditions = category
      ? and(eq(forumPosts.isDeleted, false), eq(forumPosts.category, category as any))
      : eq(forumPosts.isDeleted, false);

    const posts = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        userId: forumPosts.userId,
        userName: users.fullName,
        authorUsername: users.username,
        userAvatar: users.avatarUrl,
        commentCount: forumPosts.commentCount,
        flagCount: forumPosts.flagCount,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.userId, users.id))
      .where(conditions)
      .orderBy(desc(forumPosts.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumPosts)
      .where(conditions);

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/forum/posts/:id — single post with comments (Public)
router.get('/posts/:id', async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id!, 10);
    if (isNaN(postId)) throw new AppError(400, 'Invalid post ID');

    const [post] = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        userId: forumPosts.userId,
        userName: users.fullName,
        authorUsername: users.username,
        userAvatar: users.avatarUrl,
        commentCount: forumPosts.commentCount,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.userId, users.id))
      .where(and(eq(forumPosts.id, postId), eq(forumPosts.isDeleted, false)))
      .limit(1);

    if (!post) throw new AppError(404, 'Post not found');

    const comments = await db
      .select({
        id: forumComments.id,
        content: forumComments.content,
        userId: forumComments.userId,
        userName: users.fullName,
        authorUsername: users.username,
        userAvatar: users.avatarUrl,
        createdAt: forumComments.createdAt,
      })
      .from(forumComments)
      .leftJoin(users, eq(forumComments.userId, users.id))
      .where(
        and(eq(forumComments.postId, postId), eq(forumComments.isDeleted, false)),
      )
      .orderBy(forumComments.createdAt);

    res.json({ ...post, comments });
  } catch (err) {
    next(err);
  }
});

// POST /api/forum/posts — create post (Auth, Announcements admin-only)
router.post(
  '/posts',
  checkJwt,
  resolveUser,
  validate(createPostSchema),
  async (req, res, next) => {
    try {
      const { title, content, category } = req.body as z.infer<
        typeof createPostSchema
      >;

      // Only admins can post in announcements
      if (category === 'announcements' && req.user!.role !== 'admin') {
        throw new AppError(
          403,
          'Only administrators can post in Announcements',
        );
      }

      const [post] = await db
        .insert(forumPosts)
        .values({
          title,
          content,
          category,
          userId: req.user!.id,
        })
        .returning();

      logger.info(
        { postId: post!.id, userId: req.user!.id, category },
        'Forum post created',
      );
      res.status(201).json(post);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/forum/posts/:id/comments — add comment (Auth)
router.post(
  '/posts/:id/comments',
  checkJwt,
  resolveUser,
  validate(createCommentSchema),
  async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id!, 10);
      if (isNaN(postId)) throw new AppError(400, 'Invalid post ID');

      const [post] = await db
        .select({ id: forumPosts.id })
        .from(forumPosts)
        .where(and(eq(forumPosts.id, postId), eq(forumPosts.isDeleted, false)))
        .limit(1);
      if (!post) throw new AppError(404, 'Post not found');

      const { content } = req.body as z.infer<typeof createCommentSchema>;
      const [comment] = await db
        .insert(forumComments)
        .values({
          postId,
          content,
          userId: req.user!.id,
        })
        .returning();

      // Increment comment count
      await db
        .update(forumPosts)
        .set({ commentCount: sql`${forumPosts.commentCount} + 1` })
        .where(eq(forumPosts.id, postId));

      logger.info(
        { commentId: comment!.id, postId, userId: req.user!.id },
        'Forum comment created',
      );
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/forum/posts/:id/flag — flag post (Auth)
router.post(
  '/posts/:id/flag',
  checkJwt,
  resolveUser,
  validate(flagSchema),
  async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id!, 10);
      if (isNaN(postId)) throw new AppError(400, 'Invalid post ID');
      const { reason } = req.body as z.infer<typeof flagSchema>;

      await db.insert(forumFlags).values({
        postId,
        reason,
        reporterId: req.user!.id,
      });

      // Increment flag count
      await db
        .update(forumPosts)
        .set({ flagCount: sql`${forumPosts.flagCount} + 1` })
        .where(eq(forumPosts.id, postId));

      res.json({ message: 'Post flagged for review' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/forum/comments/:id/flag — flag comment (Auth)
router.post(
  '/comments/:id/flag',
  checkJwt,
  resolveUser,
  validate(flagSchema),
  async (req, res, next) => {
    try {
      const commentId = parseInt(req.params.id!, 10);
      if (isNaN(commentId)) throw new AppError(400, 'Invalid comment ID');
      const { reason } = req.body as z.infer<typeof flagSchema>;

      await db.insert(forumFlags).values({
        commentId,
        reason,
        reporterId: req.user!.id,
      });

      // Increment flag count on comment
      await db
        .update(forumComments)
        .set({ flagCount: sql`${forumComments.flagCount} + 1` })
        .where(eq(forumComments.id, commentId));

      res.json({ message: 'Comment flagged for review' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
