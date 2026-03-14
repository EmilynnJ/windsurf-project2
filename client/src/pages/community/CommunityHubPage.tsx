import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button, Card, Avatar, Badge,
  Textarea, SearchInput, LoadingPage, EmptyState, Pagination,
} from '../../components/ui';

/* ─── Types ───────────────────────────────────────────────────── */

interface ForumPost {
  id: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
  category: string;
  title: string;
  content: string;
  commentCount: number;
  createdAt: string;
}

interface Comment {
  id: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'general', label: '💬 General' },
  { value: 'readings', label: '🔮 Readings' },
  { value: 'spiritual_growth', label: '🌱 Spiritual Growth' },
  { value: 'introductions', label: '👋 Introductions' },
  { value: 'off_topic', label: '🎯 Off Topic' },
];

const ITEMS_PER_PAGE = 10;

/* ─── Post Card ───────────────────────────────────────────────── */

function PostCard({
  post,
  onSelect,
}: {
  post: ForumPost;
  onSelect: (post: ForumPost) => void;
}) {
  return (
    <Card className="post-card" onClick={() => onSelect(post)} style={{ cursor: 'pointer' }}>
      <div className="flex gap-3">
        <Avatar src={post.userAvatar} name={post.userName} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '4px' }}>
            <Badge variant="gold" size="sm">{post.category.replace(/_/g, ' ')}</Badge>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {post.userName || 'Anonymous'} · {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{post.title}</h4>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.content}
          </p>
          <div className="flex items-center gap-4" style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              💬 {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─── Post Detail ─────────────────────────────────────────────── */

function PostDetail({
  post,
  onBack,
}: {
  post: ForumPost;
  onBack: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const data = await apiService.get(`/api/forum/posts/${post.id}/comments`);
      setComments(data as Comment[]);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [post.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await apiService.post(`/api/forum/posts/${post.id}/comments`, {
        content: newComment.trim(),
      });
      setNewComment('');
      loadComments();
      addToast('success', 'Reply posted! ✨');
    } catch {
      addToast('error', 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        ← Back to Community
      </Button>

      {/* Post */}
      <Card variant="static">
        <div className="flex gap-3" style={{ marginBottom: 'var(--space-4)' }}>
          <Avatar src={post.userAvatar} name={post.userName} size="md" />
          <div>
            <Badge variant="gold" size="sm">{post.category.replace(/_/g, ' ')}</Badge>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
              {post.userName || 'Anonymous'} · {new Date(post.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        <h2 style={{ fontSize: '1.8rem', marginBottom: 'var(--space-4)' }}>{post.title}</h2>
        <div style={{ lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
          {post.content}
        </div>
      </Card>

      {/* Comments */}
      <h3 style={{ marginTop: 'var(--space-4)' }}>
        Replies ({comments.length})
      </h3>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : comments.length === 0 ? (
        <Card variant="static" className="text-center">
          <p style={{ color: 'var(--text-muted)', padding: 'var(--space-4)' }}>
            No replies yet — be the first to respond!
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <Card key={c.id} variant="static">
              <div className="flex gap-3">
                <Avatar src={c.userAvatar} name={c.userName} size="sm" />
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{c.userName || 'Anonymous'}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {c.content}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reply form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit}>
          <Card variant="static">
            <Textarea
              label="Write a Reply"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
            />
            <div style={{ marginTop: 'var(--space-3)', textAlign: 'right' }}>
              <Button type="submit" variant="primary" loading={submitting} disabled={!newComment.trim()}>
                Post Reply
              </Button>
            </div>
          </Card>
        </form>
      ) : (
        <Card variant="static" className="text-center">
          <p style={{ color: 'var(--text-muted)' }}>
            Sign in to join the conversation.
          </p>
        </Card>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */

export function CommunityHubPage() {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

  // New post form
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [creatingPost, setCreatingPost] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await apiService.get('/api/forum/posts');
      setPosts(data as ForumPost[]);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      addToast('error', 'Title and content are required');
      return;
    }
    setCreatingPost(true);
    try {
      await apiService.post('/api/forum/posts', {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
      });
      addToast('success', 'Post created! ✨');
      setShowNewPost(false);
      setNewTitle('');
      setNewContent('');
      fetchPosts();
    } catch {
      addToast('error', 'Failed to create post');
    } finally {
      setCreatingPost(false);
    }
  };

  // Filter posts
  const filtered = posts.filter((p) => {
    if (category && p.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // If viewing a specific post
  if (selectedPost) {
    return (
      <div className="page-wrapper page-enter">
        <div className="container" style={{ paddingTop: 'var(--space-6)' }}>
          <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper page-enter">
      <div className="container" style={{ paddingTop: 'var(--space-6)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 style={{ marginBottom: 'var(--space-1)' }}>Community Hub</h1>
            <p style={{ color: 'var(--text-muted)' }}>Connect, share, and grow together</p>
          </div>
          {isAuthenticated && (
            <Button variant="primary" onClick={() => setShowNewPost(!showNewPost)}>
              {showNewPost ? 'Cancel' : '+ New Post'}
            </Button>
          )}
        </div>

        {/* New post form */}
        {showNewPost && (
          <Card variant="glow-pink" style={{ marginBottom: 'var(--space-6)' }}>
            <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
              <h3>Create a Post</h3>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {CATEGORIES.filter((c) => c.value).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label form-label--required">Title</label>
                <input
                  className="form-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  maxLength={200}
                />
              </div>
              <Textarea
                label="Content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Share your thoughts, experiences, or questions..."
                rows={5}
                required
              />
              <div style={{ textAlign: 'right' }}>
                <Button type="submit" variant="primary" loading={creatingPost}>
                  Post
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-4 items-center flex-wrap" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search posts..." />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`btn btn--sm ${category === cat.value ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => { setCategory(cat.value); setPage(1); }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
          {filtered.length} post{filtered.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <LoadingPage message="Loading community posts..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No Posts Yet"
            description={search || category ? 'Try adjusting your filters.' : 'Be the first to start a conversation!'}
            action={
              isAuthenticated && !search && !category
                ? { label: 'Create Post', onClick: () => setShowNewPost(true) }
                : (search || category)
                ? { label: 'Clear Filters', onClick: () => { setSearch(''); setCategory(''); } }
                : undefined
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {pageItems.map((post) => (
                <PostCard key={post.id} post={post} onSelect={setSelectedPost} />
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
