import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button,
  Avatar,
  Input,
  Textarea,
  Select,
  Pagination,
  LoadingPage,
  EmptyState,
} from '../../components/ui';
import type { ForumPost, ForumComment, ForumCategory } from '../../types';

/* ── Constants ──────────────────────────────────────────────── */
const POSTS_PER_PAGE = 10;

const CATEGORIES: { value: ForumCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'General', label: 'General' },
  { value: 'Readings', label: 'Readings' },
  { value: 'Spiritual Growth', label: 'Spiritual Growth' },
  { value: 'Ask a Reader', label: 'Ask a Reader' },
  { value: 'Announcements', label: 'Announcements' },
];

const CATEGORY_LABELS: Record<string, string> = {
  'General': 'General',
  'Readings': 'Readings',
  'Spiritual Growth': 'Spiritual Growth',
  'Ask a Reader': 'Ask a Reader',
  'Announcements': 'Announcements',
};

const CREATE_CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== '');

/* ── Helpers ────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Single Post Card ───────────────────────────────────────── */
function PostCard({
  post,
  isLoggedIn,
  userId,
  userRole,
  onFlag,
  onDelete,
}: {
  post: ForumPost;
  isLoggedIn: boolean;
  userId: number | null;
  userRole: string | null;
  onFlag: (postId: number) => void;
  onDelete: (postId: number) => void;
}) {
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await apiService.get<ForumComment[]>(`/api/forum/posts/${post.id}/comments`);
      setComments(data);
    } catch {
      addToast('error', 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  }, [post.id, addToast]);

  const toggleComments = () => {
    if (!showComments && comments.length === 0) loadComments();
    setShowComments((v) => !v);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const newComment = await apiService.post<ForumComment>(
        `/api/forum/posts/${post.id}/comments`,
        { content: commentText.trim() }
      );
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      addToast('success', 'Comment posted!');
    } catch {
      addToast('error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlagComment = async (commentId: number) => {
    try {
      await apiService.post('/api/forum/flag', { commentId, reason: 'Flagged by user' });
      addToast('info', 'Comment flagged for review');
    } catch {
      addToast('error', 'Failed to flag comment');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await apiService.delete(`/api/forum/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      addToast('success', 'Comment deleted');
    } catch {
      addToast('error', 'Failed to delete comment');
    }
  };

  return (
    <div className="card card--static forum-post">
      {/* ── Post Header ── */}
      <div className="forum-post__header">
        <Avatar
          src={post.authorImage}
          name={post.authorName}
          size="sm"
        />
        <div className="forum-post__meta">
          <span className="forum-post__author">{post.authorName || post.authorUsername || 'Anonymous'}</span>
          <span className="forum-post__time">
            {timeAgo(post.createdAt)} · {CATEGORY_LABELS[post.category] || post.category}
          </span>
        </div>
      </div>

      {/* ── Post Content ── */}
      <h3 className="forum-post__title">{post.title}</h3>
      <p className="forum-post__body">{post.content}</p>

      {/* ── Post Actions ── */}
      <div className="forum-post__actions">
        <button
          className="btn btn--ghost btn--sm"
          onClick={toggleComments}
          aria-expanded={showComments}
          aria-label={`${post.commentCount} comments`}
        >
          💬 {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
        </button>
        {isLoggedIn && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => onFlag(post.id)}
            aria-label="Flag this post"
          >
            🚩 Flag
          </button>
        )}
        {(userRole === 'admin' || userId === post.authorId) && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => onDelete(post.id)}
            aria-label="Delete this post"
          >
            🗑️ Delete
          </button>
        )}
      </div>

      {/* ── Comments ── */}
      {showComments && (
        <div className="flex flex-col gap-3" style={{ marginTop: 'var(--space-3)' }}>
          {loadingComments ? (
            <p className="caption text-center">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="caption text-center">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="forum-comment">
                <Avatar src={comment.authorImage} name={comment.authorName} size="sm" />
                <div className="forum-comment__body">
                  <div className="forum-comment__meta">
                    <span className="forum-comment__author">{comment.authorName || comment.authorUsername || 'Anonymous'}</span>
                    <span className="forum-comment__time">{timeAgo(comment.createdAt)}</span>
                    {isLoggedIn && (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleFlagComment(comment.id)}
                        aria-label="Flag comment"
                      >
                        🚩
                      </button>
                    )}
                    {(userRole === 'admin' || userId === comment.authorId) && (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        aria-label="Delete comment"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  <p className="forum-comment__text">{comment.content}</p>
                </div>
              </div>
            ))
          )}

          {/* ── Comment Form ── */}
          {isLoggedIn ? (
            <form className="flex gap-2 items-end" onSubmit={handleComment}>
              <div className="flex-1">
                <Input
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  aria-label="Comment text"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={submitting}
                disabled={!commentText.trim()}
              >
                Reply
              </Button>
            </form>
          ) : (
            <p className="caption text-center">
              <a href="/login">Sign in</a> to leave a comment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Community Hub Page ─────────────────────────────────────── */
export function CommunityHubPage() {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  // Forum state
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState<ForumCategory | ''>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create post form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<string>('General');
  const [creating, setCreating] = useState(false);

  /* ── Fetch posts ── */
  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(POSTS_PER_PAGE),
        sort: 'newest',
      });
      if (category) query.set('category', category);

      const data = await apiService.get<{ posts: ForumPost[]; pagination: { total: number } }>(
        `/api/forum/posts?${query.toString()}`
      );
      setPosts(data.posts || []);
      setTotalCount(data.pagination?.total || 0);
    } catch {
      addToast('error', 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [page, category, addToast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* ── Create post ── */
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      addToast('error', 'Please fill in the title and content.');
      return;
    }
    setCreating(true);
    try {
      await apiService.post('/api/forum/posts', {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
      });
      addToast('success', 'Post created! ✨');
      setNewTitle('');
      setNewContent('');
      setShowCreate(false);
      setPage(1);
      fetchPosts();
    } catch {
      addToast('error', 'Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  /* ── Flag / Delete handlers ── */
  const handleFlag = async (postId: number) => {
    try {
      await apiService.post('/api/forum/flag', { postId, reason: 'Flagged by user' });
      addToast('info', 'Post flagged for review');
    } catch {
      addToast('error', 'Failed to flag post');
    }
  };

  const handleDelete = async (postId: number) => {
    try {
      await apiService.delete(`/api/forum/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      addToast('success', 'Post deleted');
    } catch {
      addToast('error', 'Failed to delete post');
    }
  };

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

  return (
    <div className="page-enter">
      <div className="container">
        {/* ── Title ──────────────────────────────────── */}
        <section className="section section--hero section--cosmic">
          <h1 className="heading-1">Community Hub</h1>
          <p className="hero__tagline">Connect, share, and grow together</p>
          <div className="divider" />
        </section>

        {/* ── Community Links ────────────────────────── */}
        <section className="section">
          <div className="grid grid--2">
            <a
              href="https://www.facebook.com/groups/soulseer"
              target="_blank"
              rel="noopener noreferrer"
              className="card card--interactive community-link"
              aria-label="Join SoulSeer Facebook Group (opens in new tab)"
            >
              <span className="community-link__icon" aria-hidden="true">📘</span>
              <div>
                <p className="community-link__title">Facebook Group</p>
                <p className="community-link__desc">
                  Join our Facebook community for daily spiritual insights, live events,
                  and heartfelt conversations.
                </p>
              </div>
            </a>
            <a
              href="https://discord.gg/soulseer"
              target="_blank"
              rel="noopener noreferrer"
              className="card card--interactive community-link"
              aria-label="Join SoulSeer Discord Server (opens in new tab)"
            >
              <span className="community-link__icon" aria-hidden="true">💜</span>
              <div>
                <p className="community-link__title">Discord Server</p>
                <p className="community-link__desc">
                  Chat in real-time with readers and seekers in our thriving Discord
                  community.
                </p>
              </div>
            </a>
          </div>
        </section>

        <div className="divider--full divider" />

        {/* ── Forum Section ──────────────────────────── */}
        <section className="section">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="section-title" style={{ marginBottom: 0 }}>
              <h2 className="section-title__text">Forum</h2>
            </div>
            {isAuthenticated && (
              <Button
                variant="primary"
                onClick={() => setShowCreate((v) => !v)}
              >
                {showCreate ? 'Cancel' : '+ New Post'}
              </Button>
            )}
          </div>

          {/* ── Create Post Form ── */}
          {showCreate && isAuthenticated && (
            <form
              className="card card--elevated flex flex-col gap-4"
              onSubmit={handleCreatePost}
              style={{ marginTop: 'var(--space-5)' }}
            >
              <h3 className="heading-4">Create a Post</h3>
              <Input
                label="Title"
                required
                placeholder="What's on your mind?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                label="Content"
                required
                placeholder="Share your thoughts, experiences, or questions..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <Select
                label="Category"
                options={CREATE_CATEGORY_OPTIONS.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setShowCreate(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={creating}>
                  Publish Post
                </Button>
              </div>
            </form>
          )}

          {/* ── Category Filters ── */}
          <div className="category-chips" style={{ marginTop: 'var(--space-5)' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`category-chip ${category === cat.value ? 'category-chip--active' : ''}`}
                onClick={() => {
                  setCategory(cat.value as ForumCategory | '');
                  setPage(1);
                }}
                aria-pressed={category === cat.value}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* ── Posts ── */}
          <div className="flex flex-col gap-4" style={{ marginTop: 'var(--space-5)' }}>
            {isLoading ? (
              <LoadingPage message="Loading posts..." />
            ) : posts.length === 0 ? (
              <EmptyState
                icon="💬"
                title="No Posts Yet"
                description={
                  isAuthenticated
                    ? 'Be the first to start a conversation!'
                    : 'Sign in to start a conversation.'
                }
                action={
                  isAuthenticated
                    ? { label: 'Create Post', onClick: () => setShowCreate(true) }
                    : undefined
                }
              />
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isLoggedIn={isAuthenticated}
                  userId={user?.id ?? null}
                  userRole={user?.role ?? null}
                  onFlag={handleFlag}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* ── Pagination ── */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </section>
      </div>
    </div>
  );
}
