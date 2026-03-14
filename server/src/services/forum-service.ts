import { eq, and, or, desc, asc, like, sql, count } from 'drizzle-orm';
import { db } from '../db/db';
import { forumPosts, forumComments, forumFlags, users, forumCategoryEnum } from '@soulseer/shared/schema';
import { z } from 'zod';

// Define Zod schemas for validation
const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(['General', 'Readings', 'Spiritual Growth', 'Ask a Reader', 'Announcements']),
});

const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(['General', 'Readings', 'Spiritual Growth', 'Ask a Reader', 'Announcements']).optional(),
});

const CreateCommentSchema = z.object({
  content: z.string().min(1),
});

const CreateFlagSchema = z.object({
  reason: z.string().min(1),
  postId: z.number().int().positive().optional(),
  commentId: z.number().int().positive().optional(),
});

const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().min(1).max(100).default(20),
});

const PostFilterSchema = z.object({
  category: z.enum(['General', 'Readings', 'Spiritual Growth', 'Ask a Reader', 'Announcements']).optional(),
  userId: z.number().int().positive().optional(),
  search: z.string().optional(),
});

export interface ForumPost {
  id: number;
  userId: number;
  title: string;
  content: string;
  category: 'General' | 'Readings' | 'Spiritual Growth' | 'Ask a Reader' | 'Announcements';
  flagCount: number;
  createdAt: Date;
  user?: {
    id: number;
    username: string | null;
    fullName: string | null;
    profileImage: string | null;
    role: 'client' | 'reader' | 'admin';
  };
  commentCount?: number;
}

export interface ForumComment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  flagCount: number;
  createdAt: Date;
  user?: {
    id: number;
    username: string | null;
    fullName: string | null;
    profileImage: string | null;
    role: 'client' | 'reader' | 'admin';
  };
}

export interface ForumFlag {
  id: number;
  postId: number | null;
  commentId: number | null;
  reporterId: number;
  reason: string;
  reviewedAt: Date | null;
  reporter?: {
    id: number;
    username: string | null;
    fullName: string | null;
  };
  post?: ForumPost | null;
  comment?: ForumComment | null;
}

export class ForumService {
  // Post operations
  async createPost(userId: number, data: z.infer<typeof CreatePostSchema>): Promise<ForumPost> {
    const validatedData = CreatePostSchema.parse(data);
    
    const result = await db.insert(forumPosts).values({
      userId,
      title: validatedData.title,
      content: validatedData.content,
      category: validatedData.category,
    }).returning();
    
    const post = result[0];
    if (!post) {
      throw new Error('Failed to create post');
    }
    
    return this.enrichPost(post);
  }

  async getPost(id: number): Promise<ForumPost | null> {
    const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, id));
    
    if (!post) {
      return null;
    }
    
    return this.enrichPost(post);
  }

  async updatePost(id: number, userId: number, data: z.infer<typeof UpdatePostSchema>): Promise<ForumPost | null> {
    const validatedData = UpdatePostSchema.parse(data);
    
    // Check if post exists and belongs to user
    const [existingPost] = await db.select().from(forumPosts).where(
      and(eq(forumPosts.id, id), eq(forumPosts.userId, userId))
    );
    
    if (!existingPost) {
      return null;
    }
    
    const result = await db.update(forumPosts)
      .set({
        ...(validatedData.title !== undefined && { title: validatedData.title }),
        ...(validatedData.content !== undefined && { content: validatedData.content }),
        ...(validatedData.category !== undefined && { category: validatedData.category }),
      })
      .where(eq(forumPosts.id, id))
      .returning();
    
    const updatedPost = result[0];
    if (!updatedPost) {
      throw new Error('Failed to update post');
    }
    
    return this.enrichPost(updatedPost);
  }

  async deletePost(id: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
    // Check if post exists
    const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, id));
    
    if (!post) {
      return false;
    }
    
    // Check if user owns the post or is admin
    if (post.userId !== userId && !isAdmin) {
      return false;
    }
    
    // Delete associated comments first
    await db.delete(forumComments).where(eq(forumComments.postId, id));
    
    // Delete associated flags
    await db.delete(forumFlags).where(eq(forumFlags.postId, id));
    
    // Delete the post
    await db.delete(forumPosts).where(eq(forumPosts.id, id));
    
    return true;
  }

  async getPosts(filters: z.infer<typeof PostFilterSchema> = {}, pagination: z.infer<typeof PaginationSchema> = { page: 1, limit: 20 }) {
    const validatedFilters = PostFilterSchema.parse(filters);
    const validatedPagination = PaginationSchema.parse(pagination);
    
    const offset = (validatedPagination.page - 1) * validatedPagination.limit;
    
    // Build where conditions
    const conditions = [];
    
    if (validatedFilters.category) {
      conditions.push(eq(forumPosts.category, validatedFilters.category));
    }
    
    if (validatedFilters.userId) {
      conditions.push(eq(forumPosts.userId, validatedFilters.userId));
    }
    
    if (validatedFilters.search) {
      conditions.push(
        or(
          like(forumPosts.title, `%${validatedFilters.search}%`),
          like(forumPosts.content, `%${validatedFilters.search}%`)
        )
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get posts with user info
    const posts = await db.select({
      post: forumPosts,
      user: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        profileImage: users.profileImage,
        role: users.role,
      },
      commentCount: sql<number>`(SELECT COUNT(*) FROM ${forumComments} WHERE ${forumComments.postId} = ${forumPosts.id})`,
    })
    .from(forumPosts)
    .leftJoin(users, eq(forumPosts.userId, users.id))
    .where(whereClause)
    .orderBy(desc(forumPosts.createdAt))
    .limit(validatedPagination.limit)
    .offset(offset);
    
    // Get total count for pagination
    const totalResult = await db.select({ count: count() }).from(forumPosts).where(whereClause);
    const total = totalResult[0]?.count || 0;
    
    const enrichedPosts = posts.map(({ post, user, commentCount }) => ({
      ...post,
      user,
      commentCount: Number(commentCount),
    }));
    
    return {
      posts: enrichedPosts,
      pagination: {
        page: validatedPagination.page,
        limit: validatedPagination.limit,
        total,
        totalPages: Math.ceil(total / validatedPagination.limit),
      },
    };
  }

  // Comment operations
  async createComment(postId: number, userId: number, data: z.infer<typeof CreateCommentSchema>): Promise<ForumComment | null> {
    const validatedData = CreateCommentSchema.parse(data);
    
    // Check if post exists
    const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, postId));
    
    if (!post) {
      return null;
    }
    
    const result = await db.insert(forumComments).values({
      postId,
      userId,
      content: validatedData.content,
    }).returning();
    
    const comment = result[0];
    if (!comment) {
      throw new Error('Failed to create comment');
    }
    
    return this.enrichComment(comment);
  }

  async getComments(postId: number, pagination: z.infer<typeof PaginationSchema> = { page: 1, limit: 50 }) {
    const validatedPagination = PaginationSchema.parse(pagination);
    const offset = (validatedPagination.page - 1) * validatedPagination.limit;
    
    // Get comments with user info
    const comments = await db.select({
      comment: forumComments,
      user: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        profileImage: users.profileImage,
        role: users.role,
      },
    })
    .from(forumComments)
    .leftJoin(users, eq(forumComments.userId, users.id))
    .where(eq(forumComments.postId, postId))
    .orderBy(asc(forumComments.createdAt))
    .limit(validatedPagination.limit)
    .offset(offset);
    
    // Get total count for pagination
    const totalResult = await db.select({ count: count() }).from(forumComments).where(eq(forumComments.postId, postId));
    const total = totalResult[0]?.count || 0;
    
    const enrichedComments = comments.map(({ comment, user }) => ({
      ...comment,
      user,
    }));
    
    return {
      comments: enrichedComments,
      pagination: {
        page: validatedPagination.page,
        limit: validatedPagination.limit,
        total,
        totalPages: Math.ceil(total / validatedPagination.limit),
      },
    };
  }

  async updateComment(id: number, userId: number, data: z.infer<typeof CreateCommentSchema>): Promise<ForumComment | null> {
    const validatedData = CreateCommentSchema.parse(data);
    
    // Check if comment exists and belongs to user
    const [existingComment] = await db.select().from(forumComments).where(
      and(eq(forumComments.id, id), eq(forumComments.userId, userId))
    );
    
    if (!existingComment) {
      return null;
    }
    
    const result = await db.update(forumComments)
      .set({
        content: validatedData.content,
      })
      .where(eq(forumComments.id, id))
      .returning();
    
    const updatedComment = result[0];
    if (!updatedComment) {
      throw new Error('Failed to update comment');
    }
    
    return this.enrichComment(updatedComment);
  }

  async deleteComment(id: number, userId: number, isAdmin: boolean = false): Promise<boolean> {
    // Check if comment exists
    const [comment] = await db.select().from(forumComments).where(eq(forumComments.id, id));
    
    if (!comment) {
      return false;
    }
    
    // Check if user owns the comment or is admin
    if (comment.userId !== userId && !isAdmin) {
      return false;
    }
    
    // Delete associated flags
    await db.delete(forumFlags).where(eq(forumFlags.commentId, id));
    
    // Delete the comment
    await db.delete(forumComments).where(eq(forumComments.id, id));
    
    return true;
  }

  // Flag operations
  async createFlag(reporterId: number, data: { postId?: number; commentId?: number; reason: string }): Promise<ForumFlag | null> {
    const validatedData = CreateFlagSchema.parse(data);
    
    // Validate that either postId or commentId is provided, but not both
    if (!validatedData.postId && !validatedData.commentId) {
      throw new Error('Either postId or commentId must be provided');
    }
    
    if (validatedData.postId && validatedData.commentId) {
      throw new Error('Only one of postId or commentId can be provided');
    }
    
    // Check if the post/comment exists
    if (validatedData.postId) {
      const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, validatedData.postId));
      if (!post) {
        return null;
      }
      
      // Increment flag count on the post
      await db.update(forumPosts)
        .set({ flagCount: sql`${forumPosts.flagCount} + 1` })
        .where(eq(forumPosts.id, validatedData.postId));
    }
    
    if (validatedData.commentId) {
      const [comment] = await db.select().from(forumComments).where(eq(forumComments.id, validatedData.commentId));
      if (!comment) {
        return null;
      }
      
      // Increment flag count on the comment
      await db.update(forumComments)
        .set({ flagCount: sql`${forumComments.flagCount} + 1` })
        .where(eq(forumComments.id, validatedData.commentId));
    }
    
    const result = await db.insert(forumFlags).values({
      postId: validatedData.postId || null,
      commentId: validatedData.commentId || null,
      reporterId,
      reason: validatedData.reason,
    }).returning();
    
    const flag = result[0];
    if (!flag) {
      throw new Error('Failed to create flag');
    }
    
    return this.enrichFlag(flag);
  }

  async getFlags(reviewed: boolean | null = null, pagination: z.infer<typeof PaginationSchema> = { page: 1, limit: 50 }) {
    const validatedPagination = PaginationSchema.parse(pagination);
    const offset = (validatedPagination.page - 1) * validatedPagination.limit;
    
    // Build where conditions
    const conditions = [];
    
    if (reviewed === true) {
      conditions.push(sql`${forumFlags.reviewedAt} IS NOT NULL`);
    } else if (reviewed === false) {
      conditions.push(sql`${forumFlags.reviewedAt} IS NULL`);
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get flags with reporter info
    const flags = await db.select({
      flag: forumFlags,
      reporter: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
      },
    })
    .from(forumFlags)
    .leftJoin(users, eq(forumFlags.reporterId, users.id))
    .where(whereClause)
    .orderBy(asc(forumFlags.reviewedAt), desc(sql`CASE WHEN ${forumFlags.reviewedAt} IS NULL THEN 1 ELSE 0 END`))
    .limit(validatedPagination.limit)
    .offset(offset);
    
    // Get total count for pagination
    const totalResult = await db.select({ count: count() }).from(forumFlags).where(whereClause);
    const total = totalResult[0]?.count || 0;
    
    // Enrich flags with post/comment details
    const enrichedFlags = await Promise.all(
      flags.map(async ({ flag, reporter }) => {
        let post = null;
        let comment = null;
        
        if (flag.postId) {
          const [postData] = await db.select().from(forumPosts).where(eq(forumPosts.id, flag.postId));
          if (postData) {
            post = await this.enrichPost(postData);
          }
        }
        
        if (flag.commentId) {
          const [commentData] = await db.select().from(forumComments).where(eq(forumComments.id, flag.commentId));
          if (commentData) {
            comment = await this.enrichComment(commentData);
          }
        }
        
        return {
          ...flag,
          reporter,
          post,
          comment,
        };
      })
    );
    
    return {
      flags: enrichedFlags,
      pagination: {
        page: validatedPagination.page,
        limit: validatedPagination.limit,
        total,
        totalPages: Math.ceil(total / validatedPagination.limit),
      },
    };
  }

  async reviewFlag(flagId: number, action: 'dismiss' | 'remove_content'): Promise<ForumFlag | null> {
    const [flag] = await db.select().from(forumFlags).where(eq(forumFlags.id, flagId));
    
    if (!flag) {
      return null;
    }
    
    // Mark flag as reviewed
    const result = await db.update(forumFlags)
      .set({
        reviewedAt: new Date(),
      })
      .where(eq(forumFlags.id, flagId))
      .returning();
    
    const updatedFlag = result[0];
    if (!updatedFlag) {
      throw new Error('Failed to update flag');
    }
    
    // If action is to remove content, delete the flagged content
    if (action === 'remove_content') {
      if (updatedFlag.postId) {
        await db.delete(forumPosts).where(eq(forumPosts.id, updatedFlag.postId));
      } else if (updatedFlag.commentId) {
        await db.delete(forumComments).where(eq(forumComments.id, updatedFlag.commentId));
      }
    }
    
    return this.enrichFlag(updatedFlag);
  }

  // Helper methods
  private async enrichPost(post: typeof forumPosts.$inferSelect): Promise<ForumPost> {
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      profileImage: users.profileImage,
      role: users.role,
    }).from(users).where(eq(users.id, post.userId));
    
    const commentCountResult = await db.select({ count: count() }).from(forumComments).where(eq(forumComments.postId, post.id));
    const commentCount = commentCountResult[0]?.count || 0;
    
    return {
      ...post,
      user,
      commentCount,
    };
  }

  private async enrichComment(comment: typeof forumComments.$inferSelect): Promise<ForumComment> {
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      profileImage: users.profileImage,
      role: users.role,
    }).from(users).where(eq(users.id, comment.userId));
    
    return {
      ...comment,
      user,
    };
  }

  private async enrichFlag(flag: typeof forumFlags.$inferSelect): Promise<ForumFlag> {
    const [reporter] = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
    }).from(users).where(eq(users.id, flag.reporterId));
    
    let post = null;
    let comment = null;
    
    if (flag.postId) {
      const [postData] = await db.select().from(forumPosts).where(eq(forumPosts.id, flag.postId));
      if (postData) {
        post = await this.enrichPost(postData);
      }
    }
    
    if (flag.commentId) {
      const [commentData] = await db.select().from(forumComments).where(eq(forumComments.id, flag.commentId));
      if (commentData) {
        comment = await this.enrichComment(commentData);
      }
    }
    
    return {
      ...flag,
      reporter,
      post,
      comment,
    };
  }
}