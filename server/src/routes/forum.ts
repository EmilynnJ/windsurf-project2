import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import {
  forumPosts,
  forumComments,
  forumFlags,
  users,
} from "@soulseer/shared/schema";
import { getDb } from "../db/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.enum(["General", "Readings", "Spiritual Growth", "Ask a Reader", "Announcements"]),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const flagSchema = z.object({
  reason: z.string().min(1).max(500),
});

// ─── GET /api/forum/posts — Public ──────────────────────────────────────────

router.get("/posts", async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const category = req.query.category as string | undefined;

    const db = getDb();

    // Build where clause
    const conditions = category
      ? eq(forumPosts.category, category as any)
      : undefined;

    const posts = await db
      .select({
        id: forumPosts.id,
        userId: forumPosts.userId,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        flagCount: forumPosts.flagCount,
        createdAt: forumPosts.createdAt,
        authorUsername: users.username,
        authorFullName: users.fullName,
        authorProfileImage: users.profileImage,
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.userId, users.id))
      .where(conditions)
      .orderBy(desc(forumPosts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(forumPosts)
      .where(conditions);

    const total = countResult[0]?.count ?? 0;

    return res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error({ err }, "Error fetching forum posts");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/forum/posts — Authenticated ─────────────────────────────────

router.post("/posts", ...requireAuth, async (req: Request, res: Response) => {
  try {
    const body = createPostSchema.parse(req.body);

    // Only admins can post in Announcements
    if (body.category === "Announcements" && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Only admins can post in Announcements" });
    }

    const db = getDb();
    const inserted = await db
      .insert(forumPosts)
      .values({
        userId: req.user!.id,
        title: body.title,
        content: body.content,
        category: body.category,
      })
      .returning();

    return res.status(201).json({ post: inserted[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Error creating forum post");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/forum/posts/:id — Public (with comments) ─────────────────────

router.get("/posts/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid post ID" });

    const db = getDb();

    // Get post with author
    const postRows = await db
      .select({
        id: forumPosts.id,
        userId: forumPosts.userId,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        flagCount: forumPosts.flagCount,
        createdAt: forumPosts.createdAt,
        authorUsername: users.username,
        authorFullName: users.fullName,
        authorProfileImage: users.profileImage,
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.userId, users.id))
      .where(eq(forumPosts.id, id))
      .limit(1);

    if (!postRows[0]) return res.status(404).json({ error: "Post not found" });

    // Get comments with authors
    const comments = await db
      .select({
        id: forumComments.id,
        postId: forumComments.postId,
        userId: forumComments.userId,
        content: forumComments.content,
        flagCount: forumComments.flagCount,
        createdAt: forumComments.createdAt,
        authorUsername: users.username,
        authorFullName: users.fullName,
        authorProfileImage: users.profileImage,
      })
      .from(forumComments)
      .leftJoin(users, eq(forumComments.userId, users.id))
      .where(eq(forumComments.postId, id))
      .orderBy(forumComments.createdAt);

    return res.json({ post: postRows[0], comments });
  } catch (err) {
    logger.error({ err }, "Error fetching forum post");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/forum/posts/:id/comments — Authenticated ────────────────────

router.post("/posts/:id/comments", ...requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: "Invalid post ID" });

    const body = createCommentSchema.parse(req.body);
    const db = getDb();

    // Verify post exists
    const postRows = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);
    if (!postRows[0]) return res.status(404).json({ error: "Post not found" });

    const inserted = await db
      .insert(forumComments)
      .values({
        postId,
        userId: req.user!.id,
        content: body.content,
      })
      .returning();

    return res.status(201).json({ comment: inserted[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Error creating comment");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/forum/posts/:id/flag — Authenticated ────────────────────────

router.post("/posts/:id/flag", ...requireAuth, async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: "Invalid post ID" });

    const body = flagSchema.parse(req.body);
    const db = getDb();

    // Verify post exists
    const postRows = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);
    if (!postRows[0]) return res.status(404).json({ error: "Post not found" });

    // Insert flag
    await db.insert(forumFlags).values({
      postId,
      reporterId: req.user!.id,
      reason: body.reason,
    });

    // Increment flag count
    await db
      .update(forumPosts)
      .set({ flagCount: sql`${forumPosts.flagCount} + 1` })
      .where(eq(forumPosts.id, postId));

    return res.json({ message: "Post flagged" });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.issues });
    logger.error({ err }, "Error flagging post");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/forum/posts/:id — Admin only ──────────────────────────────

router.delete("/posts/:id", ...requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: "Invalid post ID" });

    const db = getDb();
    const deleted = await db.delete(forumPosts).where(eq(forumPosts.id, postId)).returning();
    if (!deleted[0]) return res.status(404).json({ error: "Post not found" });

    logger.info({ postId, adminId: req.user!.id }, "Admin deleted forum post");
    return res.json({ message: "Post deleted" });
  } catch (err) {
    logger.error({ err }, "Error deleting post");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/forum/comments/:id — Admin only ───────────────────────────

router.delete("/comments/:id", ...requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const commentId = Number(req.params.id);
    if (isNaN(commentId)) return res.status(400).json({ error: "Invalid comment ID" });

    const db = getDb();
    const deleted = await db.delete(forumComments).where(eq(forumComments.id, commentId)).returning();
    if (!deleted[0]) return res.status(404).json({ error: "Comment not found" });

    logger.info({ commentId, adminId: req.user!.id }, "Admin deleted forum comment");
    return res.json({ message: "Comment deleted" });
  } catch (err) {
    logger.error({ err }, "Error deleting comment");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
