import { Router } from "express";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/db";
import { users, forumPosts, forumComments, forumFlags } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

// ─── List posts ─────────────────────────────────────────────────────────────
router.get("/posts", async (req, res, next) => {
  try {
    const db = getDb();
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let query = db.select({
      id: forumPosts.id, authorId: forumPosts.authorId, title: forumPosts.title,
      content: forumPosts.content, category: forumPosts.category,
      isPinned: forumPosts.isPinned, isLocked: forumPosts.isLocked,
      createdAt: forumPosts.createdAt, updatedAt: forumPosts.updatedAt,
      authorName: users.fullName, authorUsername: users.username, authorImage: users.profileImage,
    }).from(forumPosts).innerJoin(users, eq(forumPosts.authorId, users.id));

    if (category) query = query.where(eq(forumPosts.category, category)) as any;
    const posts = await (query as any).orderBy(desc(forumPosts.isPinned), desc(forumPosts.createdAt)).limit(limit).offset(offset);

    // Compute comment counts
    const postIds = posts.map((p: any) => p.id);
    let commentCounts: Record<number, number> = {};
    if (postIds.length > 0) {
      const counts = await db.select({ postId: forumComments.postId, count: count() })
        .from(forumComments).where(sql`${forumComments.postId} = ANY(${postIds})`)
        .groupBy(forumComments.postId);
      for (const c of counts) commentCounts[c.postId] = Number(c.count);
    }

    res.json(posts.map((p: any) => ({ ...p, commentCount: commentCounts[p.id] ?? 0 })));
  } catch (err) { next(err); }
});

// ─── Single post ────────────────────────────────────────────────────────────
router.get("/posts/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    const [post] = await db.select({
      id: forumPosts.id, authorId: forumPosts.authorId, title: forumPosts.title,
      content: forumPosts.content, category: forumPosts.category,
      isPinned: forumPosts.isPinned, isLocked: forumPosts.isLocked,
      createdAt: forumPosts.createdAt, updatedAt: forumPosts.updatedAt,
      authorName: users.fullName, authorUsername: users.username, authorImage: users.profileImage,
    }).from(forumPosts).innerJoin(users, eq(forumPosts.authorId, users.id)).where(eq(forumPosts.id, postId));
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }

    const comments = await db.select({
      id: forumComments.id, authorId: forumComments.authorId, content: forumComments.content,
      createdAt: forumComments.createdAt, authorName: users.fullName, authorUsername: users.username, authorImage: users.profileImage,
    }).from(forumComments).innerJoin(users, eq(forumComments.authorId, users.id)).where(eq(forumComments.postId, postId)).orderBy(forumComments.createdAt);

    const [commentCount] = await db.select({ count: count() }).from(forumComments).where(eq(forumComments.postId, postId));
    res.json({ ...post, commentCount: Number(commentCount?.count ?? 0), comments });
  } catch (err) { next(err); }
});

// ─── Create post ────────────────────────────────────────────────────────────
const createPostSchema = z.object({ title: z.string().min(1).max(255), content: z.string().min(1).max(10000), category: z.string().max(100).default("General") });

router.post("/posts", requireAuth, validateBody(createPostSchema), async (req, res, next) => {
  try {
    const db = getDb();
    // Announcements category: only admins can create posts (section 10.2)
    if (req.body.category === "Announcements" && req.user!.role !== "admin") {
      res.status(403).json({ error: "Only admins can post in the Announcements category" });
      return;
    }
    const [post] = await db.insert(forumPosts).values({
      authorId: req.user!.id, title: req.body.title, content: req.body.content, category: req.body.category,
    }).returning();
    res.status(201).json(post);
  } catch (err) { next(err); }
});

// ─── Create comment ─────────────────────────────────────────────────────────
const createCommentSchema = z.object({ content: z.string().min(1).max(5000) });

router.post("/posts/:id/comments", requireAuth, validateBody(createCommentSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    const [post] = await db.select({ id: forumPosts.id, isLocked: forumPosts.isLocked }).from(forumPosts).where(eq(forumPosts.id, postId));
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    if (post.isLocked) { res.status(403).json({ error: "Post is locked" }); return; }
    const [comment] = await db.insert(forumComments).values({ postId, authorId: req.user!.id, content: req.body.content }).returning();
    res.status(201).json(comment);
  } catch (err) { next(err); }
});

// ─── Flag post — POST /api/forum/posts/:id/flag ─────────────────────────────
const flagPostSchema = z.object({ reason: z.string().min(1).max(1000) });

router.post("/posts/:id/flag", requireAuth, validateBody(flagPostSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const postId = parseInt(req.params.id!, 10);
    if (isNaN(postId)) { res.status(400).json({ error: "Invalid post ID" }); return; }

    const [post] = await db.select({ id: forumPosts.id }).from(forumPosts).where(eq(forumPosts.id, postId));
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }

    const [flag] = await db.insert(forumFlags).values({
      reporterId: req.user!.id, postId, reason: req.body.reason,
    }).returning();

    // Increment flag count on the post
    await db.update(forumPosts).set({
      flagCount: sql`${forumPosts.flagCount} + 1`,
      updatedAt: new Date(),
    }).where(eq(forumPosts.id, postId));

    res.status(201).json(flag);
  } catch (err) { next(err); }
});

// ─── Flag comment — POST /api/forum/comments/:id/flag ───────────────────────
router.post("/comments/:id/flag", requireAuth, validateBody(flagPostSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const commentId = parseInt(req.params.id!, 10);
    if (isNaN(commentId)) { res.status(400).json({ error: "Invalid comment ID" }); return; }

    const [comment] = await db.select({ id: forumComments.id }).from(forumComments).where(eq(forumComments.id, commentId));
    if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }

    const [flag] = await db.insert(forumFlags).values({
      reporterId: req.user!.id, commentId, reason: req.body.reason,
    }).returning();

    // Increment flag count on the comment
    await db.update(forumComments).set({
      flagCount: sql`${forumComments.flagCount} + 1`,
      updatedAt: new Date(),
    }).where(eq(forumComments.id, commentId));

    res.status(201).json(flag);
  } catch (err) { next(err); }
});

// ─── Legacy flag endpoint (backward compat) ─────────────────────────────────
const flagSchema = z.object({ postId: z.number().int().optional(), commentId: z.number().int().optional(), reason: z.string().min(1).max(1000) });

router.post("/flags", requireAuth, validateBody(flagSchema), async (req, res, next) => {
  try {
    const db = getDb();
    if (!req.body.postId && !req.body.commentId) { res.status(400).json({ error: "Provide postId or commentId" }); return; }
    const [flag] = await db.insert(forumFlags).values({
      reporterId: req.user!.id, postId: req.body.postId ?? null, commentId: req.body.commentId ?? null, reason: req.body.reason,
    }).returning();
    res.status(201).json(flag);
  } catch (err) { next(err); }
});

export default router;
