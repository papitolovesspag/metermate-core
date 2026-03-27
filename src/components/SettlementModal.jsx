import { X, CheckCircle } from 'lucide-react';

export default function SettlementModal({
  isOpen,
  onClose,
  costPerUser,
  user,
  members,
  onProceedToPayment,
  group,
  hasPaidInCycle = false,
  isFullyFunded = false
}) {
  if (!isOpen) return null;

  const safeTargetAmount = Number(group?.target_amount) || 0;
  const equalSplit = safeTargetAmount / (members?.length || 1);

  const userShareKey = Object.keys(costPerUser || {}).find((id) => String(id) === String(user?.id));
  const userShare = userShareKey ? Number(costPerUser[userShareKey]) : equalSplit;

  const isDisabled = hasPaidInCycle || isFullyFunded || userShare <= 0;
  const buttonLabel = hasPaidInCycle
    ? 'Already Paid'
    : isFullyFunded
      ? 'Fully Funded'
      : userShare <= 0
        ? 'Nothing Due'
        : 'Proceed to Payment';

  const getMemberName = (userId) => {
    const member = members?.find((m) => String(m.id) === String(userId) || String(m.user_id) === String(userId));
    return member?.name || 'Unknown Member';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in-down">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Settlement Summary</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <p className="text-sm text-gray-600 font-medium mb-1">Your Calculated Share</p>
            <p className="text-3xl font-bold text-gray-900">NGN {Number(userShare).toLocaleString()}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Member Breakdown</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {Object.entries(costPerUser || {}).map(([memberId, cost]) => {
                const isCurrentUser = String(memberId) === String(user?.id);
                const memberName = getMemberName(memberId);
                return (
                  <div
                    key={memberId}
                    className={`flex justify-between items-center p-2 rounded border ${
                      isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isCurrentUser ? 'text-blue-900' : 'text-gray-700'}`}>
                      {isCurrentUser ? 'You' : memberName}
                    </span>
                    <span className={`font-bold ${isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
                      NGN {Number(cost).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">Costs were calculated from appliance usage, with equal split fallback.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all">
              Close
            </button>
            <button
              onClick={() => onProceedToPayment?.(userShare)}
              disabled={isDisabled}
              className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-all ${
                isDisabled
                  ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
              }`}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
