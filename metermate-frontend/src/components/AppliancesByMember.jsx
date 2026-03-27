import { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import DeleteApplianceModal from './DeleteApplianceModal';

export default function AppliancesByMember({ appliances, members, userId, onApplianceDelete }) {
  const [expandedMember, setExpandedMember] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteApplianceClick = (appliance) => {
    setSelectedAppliance(appliance);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteAppliance = async () => {
    if (!selectedAppliance) return;

    setIsDeleting(true);
    try {
      await api.delete(`/appliances/${selectedAppliance.id}`);
      toast.success('Device deleted');
      setShowDeleteModal(false);
      setSelectedAppliance(null);
      onApplianceDelete?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete device');
    } finally {
      setIsDeleting(false);
    }
  };

  const appliancesByOwner = members.reduce((acc, member) => {
    const memberAppliances = appliances.filter((app) => String(app.user_id) === String(member.id));
    const totalKwh = memberAppliances.reduce((sum, app) => sum + (app.wattage / 1000) * app.daily_hours, 0);

    acc[member.id] = {
      name: member.name,
      appliances: memberAppliances,
      totalKwh: totalKwh.toFixed(2),
      isCurrentUser: String(member.id) === String(userId)
    };
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const data = appliancesByOwner[member.id];
        const isExpanded = expandedMember === member.id;

        return (
          <div key={member.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-all duration-200">
            <button
              onClick={() => setExpandedMember(isExpanded ? null : member.id)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 text-left">
                <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                <div>
                  <p className="font-semibold text-gray-900">
                    {data.name}
                    {data.isCurrentUser && <span className="text-blue-600 ml-2 text-sm">(You)</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.appliances.length} device{data.appliances.length !== 1 ? 's' : ''} • {data.totalKwh} kWh/day
                  </p>
                </div>
              </div>
              <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold text-sm">{data.totalKwh} kWh</div>
            </button>

            {isExpanded && data.appliances.length > 0 && (
              <div className="border-t border-gray-200 bg-white">
                <div className="p-4 space-y-3">
                  {data.appliances.map((appliance) => (
                    <div
                      key={appliance.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{appliance.device_name}</p>
                        <p className="text-sm text-gray-600">
                          {appliance.wattage}W x {appliance.daily_hours}h = {((appliance.wattage / 1000) * appliance.daily_hours).toFixed(2)} kWh
                        </p>
                      </div>
                      {data.isCurrentUser && (
                        <button
                          onClick={() => handleDeleteApplianceClick(appliance)}
                          className="ml-2 text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                          title="Delete appliance"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isExpanded && data.appliances.length === 0 && (
              <div className="p-4 bg-gray-50 text-center text-sm text-gray-500">No appliances logged yet</div>
            )}
          </div>
        );
      })}

      <DeleteApplianceModal
        isOpen={showDeleteModal}
        applianceName={selectedAppliance?.device_name || 'Device'}
        onConfirm={handleConfirmDeleteAppliance}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedAppliance(null);
        }}
        isLoading={isDeleting}
      />
    </div>
  );
}
