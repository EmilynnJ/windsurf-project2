import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';

interface ReadingSession {
  id: number;
  readerId: number;
  clientId: number;
  type: 'chat' | 'voice' | 'video';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  pricePerMinute: number;
  channelName: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number;
  totalPrice: number;
  paymentStatus: string;
  billedMinutes: number;
  rating: number | null;
  review: string | null;
  reader: {
    id: number;
    username: string | null;
    fullName: string | null;
  };
  client: {
    id: number;
    username: string | null;
    fullName: string | null;
  };
}

const ReadingSessions: React.FC = () => {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterReaderId, setFilterReaderId] = useState<string>('');
  const [filterClientId, setFilterClientId] = useState<string>('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchSessions();
  }, [filterStatus, filterType, filterReaderId, filterClientId]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: filterStatus,
        type: filterType,
        readerId: filterReaderId,
        clientId: filterClientId,
      });

      const response = await fetch(`/api/admin/readings?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reading sessions');
      }

      const data = await response.json();
      setSessions(data.readings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDurationText = (duration: number) => {
    if (duration === 0) return 'Not started';
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="chat">Chat</option>
              <option value="voice">Voice</option>
              <option value="video">Video</option>
            </select>
            
            <input
              type="number"
              placeholder="Filter by Reader ID"
              value={filterReaderId}
              onChange={(e) => setFilterReaderId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="number"
              placeholder="Filter by Client ID"
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="flex gap-2">
              <button
                onClick={fetchSessions}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setFilterStatus('');
                  setFilterType('');
                  setFilterReaderId('');
                  setFilterClientId('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Sessions</h3>
            <p className="text-2xl font-bold text-green-600">
              {sessions.filter(s => s.status === 'in_progress').length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Revenue</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                sessions
                  .filter(s => s.status === 'completed')
                  .reduce((sum, s) => sum + s.totalPrice, 0)
              )}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Rating</h3>
            <p className="text-2xl font-bold text-purple-600">
              {sessions.length > 0 
                ? (sessions
                    .filter(s => s.rating !== null)
                    .reduce((sum, s) => sum + (s.rating || 0), 0) / 
                  sessions.filter(s => s.rating !== null).length
                  ).toFixed(1)
                : '0.0'}
            </p>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Reading Sessions</h3>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {session.type.toUpperCase()} Session
                          </div>
                          <div className="text-sm text-gray-500">
                            Channel: {session.channelName}
                          </div>
                          {session.paymentStatus && (
                            <div className="text-xs text-gray-400 mt-1">
                              Payment: {session.paymentStatus}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Reader: {session.reader.fullName || session.reader.username || `User ${session.reader.id}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            Client: {session.client.fullName || session.client.username || `User ${session.client.id}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSessionStatusColor(session.status)}`}>
                          {session.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getDurationText(session.duration)}
                        {session.billedMinutes > 0 && (
                          <div className="text-xs text-gray-400">
                            Billed: {session.billedMinutes} min
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {formatCurrency(session.totalPrice)}
                        <div className="text-xs text-gray-400">
                          Rate: {formatCurrency(session.pricePerMinute)}/min
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.rating ? (
                          <div className="flex items-center">
                            <span className="text-yellow-500">★</span>
                            <span className="ml-1">{session.rating}/5</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No rating</span>
                        )}
                        {session.review && (
                          <div className="mt-1 text-xs text-gray-500">
                            "{truncateText(session.review, 50)}"
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Created: {formatDate(session.createdAt)}</div>
                        {session.startedAt && (
                          <div>Started: {formatDate(session.startedAt)}</div>
                        )}
                        {session.completedAt && (
                          <div>Completed: {formatDate(session.completedAt)}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

const truncateText = (text: string, maxLength: number = 50) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default ReadingSessions;