// src/components/SettlementModal.jsx
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export default function SettlementModal({ isOpen, onClose, settlement, costPerUser, user, members, onProceedToPayment }) {
  if (!isOpen) return null;

  // Debug logs
  console.log('=== SettlementModal Debug ===');
  console.log('members prop:', members);
  console.log('costPerUser:', costPerUser);
  console.log('user:', user);
  console.log('onProceedToPayment:', typeof onProceedToPayment);

  const userShare = costPerUser[user?.id] || 0;

  // Helper to get member name by user_id (handling string/number conversion)
  const getMemberName = (userId) => {
    if (!members || members.length === 0) {
      console.warn('No members array provided to SettlementModal');
      return 'Unknown Member';
    }

    // Try to find member by comparing both as numbers and strings
    let member = members.find(m => {
      const nameMatch = String(m.id) === String(userId) || String(m.user_id) === String(userId) || m.id === parseInt(userId) || m.user_id === parseInt(userId);
      if (nameMatch) {
        console.log(`✅ Found member: ${m.name} (id: ${m.id || m.user_id})`);
      }
      return nameMatch;
    });

    if (!member) {
      console.warn(`❌ Member not found for userId: ${userId}. Available members:`, members.map(m => ({ id: m.id, name: m.name, user_id: m.user_id })));
    }

    return member?.name || 'Unknown Member';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in-down">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Settlement Summary</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Your Share */}
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <p className="text-sm text-gray-600 font-medium mb-1">Your Calculated Share</p>
            <p className="text-3xl font-bold text-gray-900">₦{parseFloat(userShare).toLocaleString()}</p>
          </div>

          {/* Breakdown Table */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Member Breakdown</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {Object.entries(costPerUser).map(([userId, cost]) => {
                const isCurrentUser = String(userId) === String(user?.id);
                const memberName = getMemberName(userId);
                return (
                  <div
                    key={userId}
                    className={`flex justify-between items-center p-2 rounded border ${
                      isCurrentUser
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isCurrentUser ? 'text-blue-900' : 'text-gray-700'}`}>
                      {isCurrentUser ? 'You' : memberName}
                    </span>
                    <span className={`font-bold ${isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
                      ₦{parseFloat(cost).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">
              Costs have been calculated based on appliance consumption
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (onProceedToPayment) {
                  onProceedToPayment(userShare);
                } else {
                  console.error('onProceedToPayment prop not provided');
                }
              }}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
