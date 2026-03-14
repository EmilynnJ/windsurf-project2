// ============================================================
// CommunityHubPage — Forum + community links
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ToastProvider';
import { forumApi } from '../services/api';
import type { ForumPost, ForumComment, ForumCategory } from '../types';

const CATEGORIES: ForumCategory[] = [
  'General',
  'Readings',
  'Spiritual Growth',
  'Ask a Reader',
  'Announcements',
];

const POSTS_PER_PAGE = 10;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function CommunityHubPage() {
  const { isAuthenticated, user, login } = useAuth();
  const { addToast } = useToast();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | ''>('');
  const [page, setPage] = useState(0);

  // Post form
  const [showPostForm, setShowPostForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<ForumCategory>('General');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expanded post
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [expandedComments, setExpandedComments] = useState<ForumComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await forumApi.getPosts({
        category: selectedCategory || undefined,
        limit: POSTS_PER_PAGE,
        offset: page * POSTS_PER_PAGE,
      });
      setPosts(result.posts);
      setTotalPosts(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { login(); return; }
    if (!newTitle.trim() || !newContent.trim()) return;

    // Only admins can post in Announcements
    if (newCategory === 'Announcements' && user?.role !== 'admin') {
      addToast('error', 'Only admins can create announcements.');
      return;
    }

    setIsSubmitting(true);
    try {
      await forumApi.createPost({ title: newTitle, content: newContent, category: newCategory });
      addToast('success', 'Post created!');
      setShowPostForm(false);
      setNewTitle('');
      setNewContent('');
      setPage(0);
      fetchPosts();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpandPost = async (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      setExpandedComments([]);
      return;
    }
    setExpandedPostId(postId);
    try {
      const result = await forumApi.getPost(postId);
      setExpandedComments(result.comments);
    } catch {
      setExpandedComments([]);
    }
  };

  const handleComment = async (postId: number) => {
    if (!isAuthenticated) { login(); return; }
    if (!commentText.trim()) return;
    try {
      await forumApi.createComment(postId, { content: commentText });
      setCommentText('');
      addToast('success', 'Comment posted!');
      // Refresh comments
      const result = await forumApi.getPost(postId);
      setExpandedComments(result.comments);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to post comment');
    }
  };

  const handleReply = async (postId: number, parentId: number) => {
    if (!isAuthenticated) { login(); return; }
    if (!replyText.trim()) return;
    try {
      await forumApi.createComment(postId, { content: replyText, parentCommentId: parentId });
      setReplyText('');
      setReplyingTo(null);
      addToast('success', 'Reply posted!');
      const result = await forumApi.getPost(postId);
      setExpandedComments(result.comments);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to post reply');
    }
  };

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  const availableCategories = CATEGORIES.filter(
    (c) => c !== 'Announcements' || user?.role === 'admin'
  );

  return (
    <div className="page-content page-enter">
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <section style={{ textAlign: 'center', padding: '40px 0 24px' }}>
          <h1>Community Hub</h1>
          <p style={{ marginTop: '8px' }}>
            Connect, share, and grow with our spiritual community.
          </p>
        </section>

        {/* Community Links */}
        <section
          className="card-static"
          style={{
            padding: '24px',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '1.5rem' }}>Join Our Communities</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="https://www.facebook.com/groups/soulseer"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Facebook Group
            </a>
            <a
              href="https://discord.gg/soulseer"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Discord Server
            </a>
          </div>
        </section>

        <div className="divider" />

        {/* Forum Section */}
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ fontSize: '1.8rem' }}>Forum</h2>
            {isAuthenticated && (
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="btn btn-primary btn-sm"
              >
                {showPostForm ? 'Cancel' : '+ New Post'}
              </button>
            )}
          </div>

          {/* New Post Form */}
          {showPostForm && (
            <form
              onSubmit={handleCreatePost}
              className="card-static"
              style={{ padding: '24px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <input
                type="text"
                placeholder="Post title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                maxLength={200}
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ForumCategory)}
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <textarea
                placeholder="Write your post..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                required
                rows={5}
                style={{ resize: 'vertical' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ alignSelf: 'flex-end' }}
              >
                {isSubmitting ? 'Posting...' : 'Publish Post'}
              </button>
            </form>
          )}

          {/* Category Tabs */}
          <div className="tabs" style={{ marginBottom: '20px' }}>
            <button
              className={`tab ${!selectedCategory ? 'tab-active' : ''}`}
              onClick={() => { setSelectedCategory(''); setPage(0); }}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`tab ${selectedCategory === cat ? 'tab-active' : ''}`}
                onClick={() => { setSelectedCategory(cat); setPage(0); }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Posts List */}
          {isLoading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading posts...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>{error}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>No Posts Yet</h3>
              <p style={{ marginTop: '8px' }}>
                {isAuthenticated ? 'Be the first to start a conversation!' : 'Log in to start a conversation.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {posts.map((post) => (
                <div key={post.id} className="card-static" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Post header */}
                  <div
                    style={{ padding: '18px 20px', cursor: 'pointer' }}
                    onClick={() => handleExpandPost(post.id)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>
                        {post.category}
                      </span>
                      {post.isPinned && (
                        <span className="badge badge-pink" style={{ fontSize: '0.6rem' }}>📌 Pinned</span>
                      )}
                    </div>
                    <h4 style={{ fontSize: '1rem', margin: '0 0 6px', color: 'var(--text-light)' }}>
                      {post.title}
                    </h4>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '0.8rem',
                        color: 'var(--text-light-muted)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        by {post.author?.fullName || post.author?.username || 'Unknown'}
                        {post.author?.role === 'reader' && (
                          <span style={{ color: 'var(--primary-pink)', marginLeft: '4px' }}>✦ Reader</span>
                        )}
                        {post.author?.role === 'admin' && (
                          <span style={{ color: 'var(--accent-gold)', marginLeft: '4px' }}>★ Admin</span>
                        )}
                      </span>
                      <span>{formatDate(post.createdAt)}</span>
                      <span>💬 {post.commentCount ?? 0} comments</span>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedPostId === post.id && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ padding: '18px 20px' }}>
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                          {post.content}
                        </p>
                      </div>

                      {/* Comments */}
                      <div
                        style={{
                          borderTop: '1px solid var(--border-subtle)',
                          padding: '16px 20px',
                          background: 'rgba(0,0,0,0.15)',
                        }}
                      >
                        <h5
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            marginBottom: '12px',
                            color: 'var(--text-light-secondary)',
                          }}
                        >
                          Comments ({expandedComments.length})
                        </h5>

                        {expandedComments
                          .filter((c) => !c.parentCommentId)
                          .map((comment) => (
                            <CommentThread
                              key={comment.id}
                              comment={comment}
                              replies={expandedComments.filter((r) => r.parentCommentId === comment.id)}
                              postId={post.id}
                              isAuthenticated={isAuthenticated}
                              replyingTo={replyingTo}
                              replyText={replyText}
                              setReplyingTo={setReplyingTo}
                              setReplyText={setReplyText}
                              onReply={handleReply}
                              onLogin={login}
                            />
                          ))}

                        {/* Add comment */}
                        {isAuthenticated ? (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleComment(post.id);
                                }
                              }}
                              style={{ flex: 1, fontSize: '0.85rem', padding: '10px 14px' }}
                            />
                            <button
                              onClick={() => handleComment(post.id)}
                              className="btn btn-primary btn-sm"
                              disabled={!commentText.trim()}
                            >
                              Post
                            </button>
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginTop: '12px' }}>
                            <button
                              onClick={login}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary-pink)',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.8rem',
                                padding: 0,
                              }}
                            >
                              Log in
                            </button>{' '}
                            to join the conversation.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                marginTop: '28px',
                paddingBottom: '40px',
              }}
            >
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="btn btn-ghost btn-sm"
                disabled={page === 0}
              >
                ← Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages - 1}
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ============================================================
// Comment Thread Component (one level deep)
// ============================================================

function CommentThread({
  comment,
  replies,
  postId,
  isAuthenticated,
  replyingTo,
  replyText,
  setReplyingTo,
  setReplyText,
  onReply,
  onLogin,
}: {
  comment: ForumComment;
  replies: ForumComment[];
  postId: number;
  isAuthenticated: boolean;
  replyingTo: number | null;
  replyText: string;
  setReplyingTo: (id: number | null) => void;
  setReplyText: (text: string) => void;
  onReply: (postId: number, parentId: number) => void;
  onLogin: () => void;
}) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div
          className="avatar"
          style={{
            width: '28px',
            height: '28px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-elevated)',
            color: 'var(--primary-pink)',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-heading)',
          }}
        >
          {(comment.author?.fullName || comment.author?.username || '?')[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              {comment.author?.fullName || comment.author?.username || 'Unknown'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light-muted)' }}>
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: '4px 0' }}>{comment.content}</p>
          <button
            onClick={() => {
              if (!isAuthenticated) { onLogin(); return; }
              setReplyingTo(replyingTo === comment.id ? null : comment.id);
              setReplyText('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-light-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: '2px 0',
              fontFamily: 'var(--font-body)',
            }}
          >
            Reply
          </button>

          {/* Reply input */}
          {replyingTo === comment.id && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onReply(postId, comment.id);
                  }
                }}
                style={{ flex: 1, fontSize: '0.82rem', padding: '8px 12px' }}
                autoFocus
              />
              <button
                onClick={() => onReply(postId, comment.id)}
                className="btn btn-primary btn-sm"
                disabled={!replyText.trim()}
                style={{ fontSize: '0.8rem', padding: '8px 14px' }}
              >
                Reply
              </button>
            </div>
          )}

          {/* Nested replies */}
          {replies.length > 0 && (
            <div
              style={{
                marginTop: '10px',
                paddingLeft: '16px',
                borderLeft: '2px solid var(--border-subtle)',
              }}
            >
              {replies.map((reply) => (
                <div key={reply.id} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {reply.author?.fullName || reply.author?.username || 'Unknown'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', lineHeight: 1.5, margin: '2px 0 0' }}>
                    {reply.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
