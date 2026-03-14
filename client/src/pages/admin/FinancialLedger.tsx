import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';

interface Transaction {
  id: number;
  userId: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  readingId: number | null;
  messageId: number | null;
  stripeId: string | null;
  note: string | null;
  createdAt: string;
  user: {
    id: number;
    username: string | null;
    fullName: string | null;
    email: string;
  };
}

const FinancialLedger: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filterType, filterUserId, startDate, endDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: filterType,
        userId: filterUserId,
        startDate: startDate,
        endDate: endDate,
        limit: '50',
        offset: String((currentPage - 1) * 50),
      });

      const response = await fetch(`/api/admin/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setTotalPages(data.pagination.totalPages);
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

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'top_up': return 'bg-green-100 text-green-800';
      case 'reading_charge': return 'bg-blue-100 text-blue-800';
      case 'paid_message': return 'bg-purple-100 text-purple-800';
      case 'payout': return 'bg-red-100 text-red-800';
      case 'adjustment': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionSign = (type: string, amount: number) => {
    if (amount > 0) return '+';
    if (amount < 0) return '';
    return '';
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="top_up">Top Up</option>
              <option value="reading_charge">Reading Charge</option>
              <option value="paid_message">Paid Message</option>
              <option value="payout">Payout</option>
              <option value="adjustment">Adjustment</option>
            </select>
            
            <input
              type="number"
              placeholder="Filter by User ID"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="flex gap-2">
              <button
                onClick={fetchTransactions}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setFilterType('');
                  setFilterUserId('');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Revenue</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(
                transactions
                  .filter(t => t.amount > 0)
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Payouts</h3>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(
                Math.abs(
                  transactions
                    .filter(t => t.amount < 0)
                    .reduce((sum, t) => sum + t.amount, 0)
                )
              )}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Net Balance</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                transactions.reduce((sum, t) => sum + t.amount, 0)
              )}
            </p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Ledger</h3>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(transaction.type)}`}>
                            {transaction.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.user.fullName || transaction.user.username || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.user.email}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {transaction.user.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {getTransactionSign(transaction.type, transaction.amount)}{formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(transaction.balanceBefore)} → {formatCurrency(transaction.balanceAfter)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.note && (
                            <div className="mb-2">
                              <strong>Note:</strong> {transaction.note}
                            </div>
                          )}
                          {transaction.readingId && (
                            <div className="text-xs text-blue-600">
                              Reading ID: {transaction.readingId}
                            </div>
                          )}
                          {transaction.messageId && (
                            <div className="text-xs text-purple-600">
                              Message ID: {transaction.messageId}
                            </div>
                          )}
                          {transaction.stripeId && (
                            <div className="text-xs text-gray-600">
                              Stripe: {transaction.stripeId}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

export default FinancialLedger;