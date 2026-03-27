import { useEffect, useState } from 'react';
import { Bell, Plug, PlugZap, UserPlus, UserMinus, CreditCard, Target, Zap } from 'lucide-react';
import api from '../services/api';

const iconByType = {
  device_added: Plug,
  device_removed: PlugZap,
  member_added: UserPlus,
  member_left: UserMinus,
  payment_received: CreditCard,
  target_updated: Target,
  electricity_purchased: Zap,
  payment_round_reopened: Bell
};

export default function MeterNotifications({ groupId, refreshSignal }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    fetchNotifications();
  }, [groupId, refreshSignal]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/groups/${groupId}/notifications?limit=25`);
      setNotifications(response.data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
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

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
      <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800">
        <Bell className="w-5 h-5 mr-2 text-blue-600" />
        Meter Notifications
      </h2>

      {loading ? (
        <p className="text-sm text-gray-500">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className="p-4 rounded-lg border border-dashed border-gray-200 text-sm text-gray-500">
          No meter activity yet.
        </div>
      ) : (
        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
          {notifications.map((item) => {
            const EventIcon = iconByType[item.event_type] || Bell;
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg"
              >
                <div className="p-2 rounded-full bg-blue-100 text-blue-700">
                  <EventIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed">{item.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(item.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
