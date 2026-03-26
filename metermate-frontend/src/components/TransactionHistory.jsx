// src/components/TransactionHistory.jsx
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function TransactionHistory({ groupId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [groupId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payments/history/${groupId}`);
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Don't show error toast for non-existent endpoint during transition
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (status) => {
    if (status === 'Successful') return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
    if (status === 'Failed') return <ArrowUpRight className="w-5 h-5 text-red-600" />;
    return <Clock className="w-5 h-5 text-yellow-600" />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Successful':
        return 'bg-green-100 text-green-700';
      case 'Failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin">
          <Clock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-600 mt-2">Loading transaction history...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-600">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
        >
          <div className="flex items-center space-x-4 flex-1">
            <div className="bg-white p-2.5 rounded-full border-2 border-gray-200">
              {getTransactionIcon(transaction.status)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {transaction.user_name}
                <span className="text-gray-500 text-sm ml-2">
                  {transaction.payment_type === 'session_payment' ? 'Payment' : 'Settlement'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(transaction.created_at)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-bold text-gray-900">₦{parseFloat(transaction.amount).toLocaleString()}</p>
            <span className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-1 ${getStatusBadge(transaction.status)}`}>
              {transaction.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
