import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';

interface Flag {
  id: number;
  postId: number | null;
  commentId: number | null;
  reporterId: number;
  reason: string;
  reviewedAt: string | null;
  reporter: {
    id: number;
    username: string | null;
    fullName: string | null;
  } | null;
  post: {
    id: number;
    title: string;
    content: string;
    userId: number;
    createdAt: string;
  } | null;
  comment: {
    id: number;
    content: string;
    userId: number;
    createdAt: string;
  } | null;
}

const ForumModeration: React.FC = () => {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterReviewed, setFilterReviewed] = useState<string>('false');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchFlags();
  }, [currentPage, filterReviewed]);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        reviewed: filterReviewed,
        limit: '50',
        offset: String((currentPage - 1) * 50),
      });

      const response = await fetch(`/api/admin/forum/flags?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch flags');
      }

      const data = await response.json();
      setFlags(data.flags);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (flagId: number, action: string, reason: string, userId?: number, postId?: number, commentId?: number) => {
    try {
      const response = await fetch('/api/admin/forum/moderate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason,
          userId,
          postId,
          commentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to moderate content');
      }

      fetchFlags(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <AdminLayout onLogout={handleLogout}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="false"
                  checked={filterReviewed === 'false'}
                  onChange={(e) => setFilterReviewed(e.target.value)}
                  className="mr-2"
                />
                Unreviewed Only
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="true"
                  checked={filterReviewed === 'true'}
                  onChange={(e) => setFilterReviewed(e.target.value)}
                  className="mr-2"
                />
                Reviewed Only
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value=""
                  checked={filterReviewed === ''}
                  onChange={(e) => setFilterReviewed(e.target.value)}
                  className="mr-2"
                />
                All Flags
              </label>
            </div>
            <button
              onClick={fetchFlags}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Flags List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Forum Moderation</h3>
            <p className="text-sm text-gray-600 mt-1">Review and moderate flagged content</p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {flags.map((flag) => (
                  <div key={flag.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Flagged
                          </span>
                          {flag.reviewedAt ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Reviewed
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Pending
                            </span>
                          )}
                          {flag.postId && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Post
                            </span>
                          )}
                          {flag.commentId && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              Comment
                            </span>
                          )}
                        </div>
                        
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-1">Reason:</h4>
                          <p className="text-gray-600">{flag.reason}</p>
                        </div>

                        {flag.post && (
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Post Content:</h4>
                            <h5 className="font-semibold text-gray-800 mb-1">{flag.post.title}</h5>
                            <p className="text-gray-600 text-sm">{truncateText(flag.post.content, 200)}</p>
                            <div className="mt-2 text-xs text-gray-500">
                              Posted by User {flag.post.userId} on {formatDate(flag.post.createdAt)}
                            </div>
                          </div>
                        )}

                        {flag.comment && (
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Comment Content:</h4>
                            <p className="text-gray-600 text-sm">{truncateText(flag.comment.content, 200)}</p>
                            <div className="mt-2 text-xs text-gray-500">
                              Commented by User {flag.comment.userId} on {formatDate(flag.comment.createdAt)}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          Reported by User {flag.reporter?.id} ({flag.reporter?.username || flag.reporter?.fullName || 'Anonymous'}) on {formatDate(flag.reviewedAt || flag.reporter?.id?.toString() || '')}
                        </div>
                      </div>

                      <div className="ml-6 space-y-2">
                        <button
                          onClick={() => handleModerationAction(flag.id, 'approve', 'Content approved by admin')}
                          className="block w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Enter removal reason:');
                            if (reason) {
                              handleModerationAction(
                                flag.id, 
                                'remove', 
                                reason,
                                undefined,
                                flag.postId || undefined,
                                flag.commentId || undefined
                              );
                            }
                          }}
                          className="block w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Enter ban reason:');
                            if (reason && (flag.post || flag.comment)) {
                              const userId = flag.post?.userId || flag.comment?.userId;
                              handleModerationAction(flag.id, 'ban_user', reason, userId);
                            }
                          }}
                          className="block w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                        >
                          Ban User
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ForumModeration;