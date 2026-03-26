// src/pages/groupDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import AppliancesByMember from '../components/AppliancesByMember';
import TransactionHistory from '../components/TransactionHistory';
import SettlementModal from '../components/SettlementModal';
import LeaveGroupModal from '../components/LeaveGroupModal';
import DeleteGroupModal from '../components/DeleteGroupModal';
import { APPLIANCE_CATEGORIES, getAllAppliances } from '../utils/applianceCategories';
import {
  ArrowLeft, Users, Plug, CreditCard, Activity, CheckCircle,
  Zap, Trash2, LogOut, AlertCircle, Clock
} from 'lucide-react';
import styles from './groupDetail.module.css';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [appliances, setAppliances] = useState([]);
  const [members, setMembers] = useState([]);
  const [isPaying, setIsPaying] = useState(false);

  const [newAppliance, setNewAppliance] = useState({ appliance_id: '', daily_hours: '' });
  const [inviteEmail, setInviteEmail] = useState('');

  // Get all appliances for dropdown
  const allAppliances = getAllAppliances();
  const selectedAppliance = allAppliances.find(a => a.id === newAppliance.appliance_id);


  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [costPerUser, setCostPerUser] = useState({});

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  useEffect(() => {
    // Auto-calculate costs when group data is loaded
    if (group && appliances.length >= 0 && members.length > 0) {
      calculateCostsAutomatically();
    }
  }, [group, appliances, members]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupRes, applianceRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/appliances/${id}`)
      ]);
      setGroup(groupRes.data.group);
      setMembers(groupRes.data.members);
      setAppliances(applianceRes.data.appliances);
    } catch (error) {
      toast.error('Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppliance = async (e) => {
    e.preventDefault();

    if (!newAppliance.appliance_id) {
      toast.error('Please select a device');
      return;
    }

    if (!newAppliance.daily_hours || newAppliance.daily_hours <= 0) {
      toast.error('Please enter valid hours per day');
      return;
    }

    try {
      const applianceData = {
        group_id: id,
        device_name: selectedAppliance.name,
        wattage: selectedAppliance.wattage,
        daily_hours: parseInt(newAppliance.daily_hours, 10),
        category: selectedAppliance.category
      };

      await api.post('/appliances/add', applianceData);
      toast.success(`✅ ${selectedAppliance.name} logged!`);
      setNewAppliance({ appliance_id: '', daily_hours: '' });
      fetchGroupData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add appliance');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await api.post('/groups/invite', { group_id: id, email: inviteEmail });
      toast.success('Flatmate invited!');
      setInviteEmail('');
      fetchGroupData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to invite member');
    }
  };

  const handleDeleteGroupClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteGroup = async () => {
    setIsDeletingGroup(true);
    try {
      await api.delete(`/groups/${id}`);
      toast.success('Group deleted successfully');
      setShowDeleteModal(false);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete group');
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleLeaveGroup = async () => {
    setIsLeavingGroup(true);
    try {
      await api.delete(`/groups/${id}/leave`);
      toast.success('You left the group');
      setShowLeaveModal(false);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to leave group');
    } finally {
      setIsLeavingGroup(false);
    }
  };

  const calculateCostsAutomatically = async () => {
    if (!group || !members.length) return;

    const safeTargetAmount = parseFloat(group?.target_amount?.toString().replace(/,/g, '')) || 0;

    try {
      const breakdownRes = await api.post('/sessions/calculate-costs', {
        group_id: id,
        total_cost: safeTargetAmount
      });

      setCostPerUser(breakdownRes.data.cost_per_user || {});
    } catch (error) {
      console.error('Error auto-calculating breakdown:', error);

      // Fallback to equal split if calculation fails
      const splitAmount = safeTargetAmount / members.length;
      const fallbackCosts = {};
      members.forEach(member => {
        fallbackCosts[member.id] = splitAmount;
      });
      setCostPerUser(fallbackCosts);
    }
  };

  const handleViewBreakdown = async () => {
    const safeTargetAmount = parseFloat(group?.target_amount?.toString().replace(/,/g, '')) || 0;

    console.log('=== handleViewBreakdown ===');
    console.log('Members at time of breakdown:', members);
    console.log('Members count:', members?.length);
    console.log('Current costPerUser:', costPerUser);

    try {
      const breakdownRes = await api.post('/sessions/calculate-costs', {
        group_id: id,
        total_cost: safeTargetAmount
      });

      console.log('Breakdown response cost_per_user:', breakdownRes.data.cost_per_user);

      // Set the calculated costs from Python engine
      setCostPerUser(breakdownRes.data.cost_per_user || {});
      toast.success('Cost breakdown calculated');
      setShowSettlementModal(true);
    } catch (error) {
      console.error('Error calculating breakdown:', error);
      toast.error('Failed to calculate cost breakdown');

      // Fallback to equal split if calculation fails
      const splitAmount = safeTargetAmount / members.length;
      const fallbackCosts = {};
      members.forEach(member => {
        fallbackCosts[member.id] = splitAmount;
      });
      setCostPerUser(fallbackCosts);
      setShowSettlementModal(true);
    }
  };

  const handleProceedToPayment = async (amount) => {
    if (amount <= 0 || isNaN(amount)) {
      toast.error("Error: Payment amount is invalid or zero.");
      return;
    }

    setIsPaying(true);
    const payToast = toast.loading('Initializing secure payment...');

    try {
      // Check if Interswitch payment script is loaded
      if (!window.webpayCheckout) {
        throw new Error('Payment gateway not loaded. Please refresh the page and try again.');
      }

      const initRes = await api.post('/payments/initialize', {
        group_id: id,
        amount: amount
      });
      const txn_ref = initRes.data.txn_ref;

      toast.dismiss(payToast);
      setShowSettlementModal(false);

      let paymentRequest = {
        merchant_code: 'MX007',
        pay_item_id: '101007',
        txn_ref: txn_ref,
        amount: Math.round(amount * 100),
        currency: 566,
        cust_email: user.email,
        cust_name: user.name,
        site_redirect_url: window.location.href,
        mode: 'TEST',
        onComplete: async (response) => {
          if (response.resp === '00' || response.desc === 'Approved by Financial Institution') {
            const verifyToast = toast.loading('Verifying transaction with the bank...');
            try {
              await api.post('/payments/verify', { txn_ref });
              toast.dismiss(verifyToast);
              toast.success('Payment successful! Balance updated.', { icon: '🎉' });
              fetchGroupData();
            } catch (err) {
              toast.dismiss(verifyToast);
              toast.error('Payment processed, but backend verification failed.');
            }
          } else {
            toast.error('Payment cancelled or failed.');
          }
          setIsPaying(false);
        }
      };

      window.webpayCheckout(paymentRequest);
    } catch (error) {
      toast.dismiss(payToast);
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to initialize payment.');
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin">
          <Zap className="w-8 h-8 text-blue-500" />
        </div>
        <p className="text-gray-600 mt-2 font-medium">Syncing with grid...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 text-lg font-medium">Meter Group not found.</p>
      </div>
    );
  }

  const safeTargetAmount = parseFloat(group?.target_amount?.toString().replace(/,/g, '')) || 0;
  const safeBalance = parseFloat(group?.current_balance?.toString().replace(/,/g, '')) || 0;
  const safeMembersCount = members?.length || 1;
  const myShare = safeTargetAmount / safeMembersCount;
  const progressPercent = safeTargetAmount > 0 ? Math.min((safeBalance / safeTargetAmount) * 100, 100) : 0;
  const isHost = group.host_id === user.id;

  return (
    <div className={`${styles.pageContainer} min-h-screen bg-gradient-to-br from-slate-50 to-gray-100`}>
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1 ml-4">
            <h1 className="text-2xl font-bold text-gray-900">Meter {group.meter_number}</h1>
            <p className="text-gray-600 text-sm">
              Status: <span className="font-semibold text-blue-600">{group.status}</span>
            </p>
          </div>
          {!isHost && (
            <button
              onClick={() => setShowLeaveModal(true)}
              disabled={isLeavingGroup}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              <span>Leave</span>
            </button>
          )}
          {isHost && (
            <button
              onClick={handleDeleteGroupClick}
              disabled={isDeletingGroup}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN - Funding & Members */}
          <div className="lg:col-span-1 space-y-6">
            {/* Funding Status Card */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                Funding Status
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
                    <span>Collected</span>
                    <span className="text-blue-600">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium">Target</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₦{safeTargetAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium">Raised</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₦{safeBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Your Share Box */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <p className="text-sm text-gray-700 font-medium mb-1">Your Share</p>
                <p className="text-2xl font-bold text-gray-900">₦{(costPerUser[user.id] || myShare).toLocaleString()}</p>
                <p className="text-xs text-gray-600 mt-2">
                  {Object.keys(costPerUser).length > 0 ? 'Based on usage' : `1/${members.length} split`}
                </p>
              </div>

              {/* View Settlement Button */}
              <button
                onClick={handleViewBreakdown}
                className="w-full mt-3 py-2 rounded-lg font-semibold text-sm flex items-center justify-center transition-all bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              >
                <Activity className="w-4 h-4 mr-2" /> View Breakdown
              </button>

              {/* Payment Button */}
              <button
                onClick={() => {
                  // Use calculated amount if available, otherwise fallback to equal split
                  const paymentAmount = costPerUser[user.id] || myShare;
                  handleProceedToPayment(paymentAmount);
                }}
                disabled={isPaying || progressPercent >= 100}
                className={`w-full mt-4 py-3 rounded-lg font-bold flex items-center justify-center transition-all ${
                  progressPercent >= 100
                    ? 'bg-green-100 text-green-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-lg hover:shadow-xl'
                }`}
              >
                {progressPercent >= 100 ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" /> Fully Funded
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" /> Pay ₦{(costPerUser[user.id] || myShare).toLocaleString()}
                  </>
                )}
              </button>
            </div>

            {/* Members Card */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Household ({members.length})
              </h2>

              <ul className="space-y-2 mb-4">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-all"
                  >
                    <span className="font-medium text-gray-700">
                      {m.name}
                      {m.id === user.id && <span className="text-blue-600 ml-2 text-xs font-bold">YOU</span>}
                    </span>
                    <span className="text-xs text-gray-500">joined</span>
                  </li>
                ))}
              </ul>

              {/* Invite Form */}
              {isHost && (
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Invite flatmate"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Appliances & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appliances Section */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-6 flex items-center text-gray-800">
                <Plug className="w-5 h-5 mr-2 text-blue-600" />
                Appliance Ledger
              </h2>

              {/* Add Appliance Form - Dropdown Selection */}
              <form onSubmit={handleAddAppliance} className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Device Dropdown */}
                  <select
                    required
                    value={newAppliance.appliance_id}
                    onChange={(e) => setNewAppliance({ ...newAppliance, appliance_id: e.target.value })}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white"
                  >
                    <option value="">Select Device...</option>
                    {Object.entries(APPLIANCE_CATEGORIES).map(([categoryKey, category]) => (
                      <optgroup key={categoryKey} label={category.name}>
                        {Object.entries(category.appliances).map(([appKey, app]) => (
                          <option key={appKey} value={appKey}>
                            {app.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {/* Wattage Display (Read-only) */}
                  <input
                    type="text"
                    placeholder="Wattage (auto-filled)"
                    readOnly
                    value={selectedAppliance ? `${selectedAppliance.wattage}W` : ''}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                  />

                  {/* Hours Per Day */}
                  <input
                    type="number"
                    placeholder="Hrs / Day"
                    required
                    min="1"
                    max="24"
                    step="1"
                    value={newAppliance.daily_hours}
                    onChange={(e) => {
                      // Only allow integer values, reject decimals
                      const value = e.target.value;
                      if (value === '' || Number.isInteger(Number(value))) {
                        setNewAppliance({ ...newAppliance, daily_hours: value });
                      }
                    }}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!selectedAppliance}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plug className="w-4 h-4" />
                    Log Device
                  </button>
                </div>

                {/* Helper text */}
                {selectedAppliance && (
                  <div className="mt-3 text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                    💡 <strong>{selectedAppliance.name}</strong> uses ~<strong>{selectedAppliance.wattage}W</strong>
                    {newAppliance.daily_hours && ` → ~${((selectedAppliance.wattage * newAppliance.daily_hours) / 1000).toFixed(2)} kWh/day`}
                  </div>
                )}
              </form>

              {/* Appliances by Member */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Devices by Member</p>
                <AppliancesByMember
                  appliances={appliances}
                  members={members}
                  userId={user.id}
                  onApplianceDelete={fetchGroupData}
                />
              </div>
            </div>

            {/* Transaction History Section */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Transaction History
              </h2>
              <TransactionHistory groupId={id} />
            </div>
          </div>
        </div>
      </main>

      {/* Settlement Modal */}
      <SettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        settlement={{}}
        costPerUser={costPerUser}
        user={user}
        members={members}
        onProceedToPayment={handleProceedToPayment}
      />

      {/* Leave Group Modal */}
      <LeaveGroupModal
        isOpen={showLeaveModal}
        groupName={group?.meter_number || 'Group'}
        onConfirm={handleLeaveGroup}
        onCancel={() => setShowLeaveModal(false)}
        isLoading={isLeavingGroup}
      />

      {/* Delete Group Modal */}
      <DeleteGroupModal
        isOpen={showDeleteModal}
        groupName={group?.meter_number || 'Group'}
        onConfirm={handleConfirmDeleteGroup}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeletingGroup}
      />
    </div>
  );
}
