// ============================================================
// Forum Routes — Public posts, comments, flagging
//
// Business rules:
//   - Anyone can read posts (no login required)
//   - Login required to post/comment
//   - One-level-deep comments (replies to posts, not to comments)
//   - Categories: General, Readings, Spiritual Growth, Ask a Reader, Announcements
//   - Announcements: only admins can create
//   - 10 posts per page, newest first
// ============================================================

import { Router } from "express";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "../db/db";
import { users, forumPosts, forumComments, forumFlags } from "../db/schema";
import { checkJwt } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { AppError } from "../middleware/error-handler";

const POSTS_PER_PAGE = 10;
const VALID_CATEGORIES = ["General", "Readings", "Spiritual Growth", "Ask a Reader", "Announcements"];

const router = Router();

// ── GET /api/forum/posts — List forum posts (public) ────────────────────
router.get("/posts", async (req, res, next) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const category = req.query.category as string | undefined;
    const offset = (page - 1) * POSTS_PER_PAGE;

    const conditions = category && VALID_CATEGORIES.includes(category)
      ? eq(forumPosts.category, category)
      : undefined;

    // Get posts with author info and comment count
    const posts = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        isPinned: forumPosts.isPinned,
        isLocked: forumPosts.isLocked,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        authorId: forumPosts.authorId,
        authorName: users.fullName,
        authorUsername: users.username,
        authorImage: users.profileImage,
        authorRole: users.role,
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.authorId, users.id))
      .where(conditions)
      .orderBy(desc(forumPosts.isPinned), desc(forumPosts.createdAt))
      .limit(POSTS_PER_PAGE)
      .offset(offset);

    // Get comment counts per post in one query
    const postIds = posts.map((p) => p.id);
    let commentCounts: Record<number, number> = {};
    if (postIds.length > 0) {
      const counts = await db
        .select({
          postId: forumComments.postId,
          count: count(),
        })
        .from(forumComments)
        .where(sql`${forumComments.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(forumComments.postId);

      for (const c of counts) {
        commentCounts[c.postId] = Number(c.count);
      }
    }

    // Get total count for pagination
    const [totalResult] = await db
      .select({ total: count() })
      .from(forumPosts)
      .where(conditions);

    const postsWithCounts = posts.map((p) => ({
      ...p,
      commentCount: commentCounts[p.id] ?? 0,
    }));

    res.json({
      posts: postsWithCounts,
      pagination: {
        page,
        perPage: POSTS_PER_PAGE,
        total: Number(totalResult?.total ?? 0),
        totalPages: Math.ceil(Number(totalResult?.total ?? 0) / POSTS_PER_PAGE),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/forum/posts/:id — Single post with comments (public) ───────
router.get("/posts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    if (isNaN(postId)) {
      res.status(400).json({ error: "Invalid post ID" });
      return;
    }

    // Get post
    const [post] = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        isPinned: forumPosts.isPinned,
        isLocked: forumPosts.isLocked,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        authorId: forumPosts.authorId,
        authorName: users.fullName,
        authorUsername: users.username,
        authorImage: users.profileImage,
        authorRole: users.role,
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.authorId, users.id))
      .where(eq(forumPosts.id, postId));

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    // Get comments with author info
    const comments = await db
      .select({
        id: forumComments.id,
        content: forumComments.content,
        createdAt: forumComments.createdAt,
        authorId: forumComments.authorId,
        authorName: users.fullName,
        authorUsername: users.username,
        authorImage: users.profileImage,
        authorRole: users.role,
      })
      .from(forumComments)
      .innerJoin(users, eq(forumComments.authorId, users.id))
      .where(eq(forumComments.postId, postId))
      .orderBy(forumComments.createdAt);

    // Comment count
    const [commentCount] = await db
      .select({ count: count() })
      .from(forumComments)
      .where(eq(forumComments.postId, postId));

    res.json({
      ...post,
      commentCount: Number(commentCount?.count ?? 0),
      comments,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/forum/posts — Create new post ─────────────────────────────
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  category: z.string().refine((c) => VALID_CATEGORIES.includes(c), {
    message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
  }),
});

router.post(
  "/posts",
  checkJwt,
  validate(createPostSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const author = req.user!;
      const { title, content, category } = req.body;

      // Announcements: admin only
      if (category === "Announcements" && author.role !== "admin") {
        throw new AppError(403, "Only admins can post announcements");
      }

      const [post] = await db
        .insert(forumPosts)
        .values({
          authorId: author.id,
          title,
          content,
          category,
        })
        .returning();

      res.status(201).json(post);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/forum/posts/:id/comments — Add comment to post ───────────
const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

router.post(
  "/posts/:id/comments",
  checkJwt,
  validate(createCommentSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const postId = parseInt(req.params.id!, 10);
      const author = req.user!;

      // Check post exists and isn't locked
      const [post] = await db
        .select({ id: forumPosts.id, isLocked: forumPosts.isLocked })
        .from(forumPosts)
        .where(eq(forumPosts.id, postId));

      if (!post) throw new AppError(404, "Post not found");
      if (post.isLocked) throw new AppError(403, "This post is locked");

      const [comment] = await db
        .insert(forumComments)
        .values({
          postId,
          authorId: author.id,
          content: req.body.content,
        })
        .returning();

      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/forum/flag — Flag a post or comment ───────────────────────
const flagSchema = z.object({
  postId: z.number().int().positive().optional(),
  commentId: z.number().int().positive().optional(),
  reason: z.string().min(1).max(500),
}).refine(
  (data) => data.postId || data.commentId,
  { message: "Must flag either a post or a comment" },
);

router.post(
  "/flag",
  checkJwt,
  validate(flagSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const reporter = req.user!;

      const [flag] = await db
        .insert(forumFlags)
        .values({
          reporterId: reporter.id,
          postId: req.body.postId ?? null,
          commentId: req.body.commentId ?? null,
          reason: req.body.reason,
        })
        .returning();

      res.status(201).json({ flagged: true, flagId: flag!.id });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
