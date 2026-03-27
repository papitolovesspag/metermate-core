import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import AppliancesByMember from '../components/AppliancesByMember';
import TransactionHistory from '../components/TransactionHistory';
import SettlementModal from '../components/SettlementModal';
import LeaveGroupModal from '../components/LeaveGroupModal';
import DeleteGroupModal from '../components/DeleteGroupModal';
import MeterNotifications from '../components/MeterNotifications';
import { APPLIANCE_CATEGORIES, getAllAppliances } from '../utils/applianceCategories';
import {
  ArrowLeft,
  Users,
  Plug,
  CreditCard,
  Activity,
  CheckCircle,
  Zap,
  Trash2,
  LogOut,
  AlertCircle,
  Clock,
  Pencil,
  Check,
  X,
  RotateCcw
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
  const [costPerUser, setCostPerUser] = useState({});

  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState({
    has_paid_in_cycle: false,
    is_fully_funded: false
  });

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState('');
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const [notificationRefreshSignal, setNotificationRefreshSignal] = useState(0);
  const [isReopeningRound, setIsReopeningRound] = useState(false);

  const allAppliances = getAllAppliances();
  const selectedAppliance = allAppliances.find((a) => a.id === newAppliance.appliance_id);

  useEffect(() => {
    fetchAllData();
  }, [id]);

  useEffect(() => {
    if (group && members.length > 0) {
      calculateCostsAutomatically();
    }
  }, [group, appliances, members]);

  const bumpNotificationRefresh = () => {
    setNotificationRefreshSignal((prev) => prev + 1);
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchGroupData(), fetchPaymentStatus()]);
    setLoading(false);
  };

  const fetchGroupData = async () => {
    try {
      const [groupRes, applianceRes] = await Promise.all([api.get(`/groups/${id}`), api.get(`/appliances/${id}`)]);
      setGroup(groupRes.data.group);
      setMembers(groupRes.data.members || []);
      setAppliances(applianceRes.data.appliances || []);
    } catch {
      toast.error('Failed to load group details.');
    }
  };

  const fetchPaymentStatus = async () => {
    try {
      const response = await api.get(`/payments/status/${id}`);
      setPaymentStatus(response.data || { has_paid_in_cycle: false, is_fully_funded: false });
    } catch {
      setPaymentStatus({ has_paid_in_cycle: false, is_fully_funded: false });
    }
  };

  const handleAddAppliance = async (e) => {
    e.preventDefault();

    if (!newAppliance.appliance_id) {
      toast.error('Please select a device');
      return;
    }

    if (!newAppliance.daily_hours || Number(newAppliance.daily_hours) <= 0) {
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
      toast.success(`${selectedAppliance.name} logged.`);
      setNewAppliance({ appliance_id: '', daily_hours: '' });
      await fetchGroupData();
      bumpNotificationRefresh();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add appliance');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await api.post('/groups/invite', { group_id: id, email: inviteEmail });
      toast.success('Member invited.');
      setInviteEmail('');
      await fetchGroupData();
      bumpNotificationRefresh();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to invite member');
    }
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

  const handleStartTargetEdit = () => {
    setTargetDraft(String(Number(group?.target_amount) || 0));
    setIsEditingTarget(true);
  };

  const handleCancelTargetEdit = () => {
    setIsEditingTarget(false);
    setTargetDraft('');
  };

  const handleSaveTargetEdit = async () => {
    const amount = Number(targetDraft);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Target amount must be greater than zero.');
      return;
    }

    setIsUpdatingTarget(true);
    try {
      const response = await api.patch(`/groups/${id}/target`, { target_amount: amount });
      setGroup((prev) => ({
        ...prev,
        target_amount: response.data.group.target_amount
      }));
      toast.success('Target amount updated.');
      setIsEditingTarget(false);
      await fetchPaymentStatus();
      bumpNotificationRefresh();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update target amount.');
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleReopenRound = async () => {
    if (!isHost) return;

    setIsReopeningRound(true);
    try {
      const response = await api.post(`/groups/${id}/reopen-round`);
      setGroup((prev) => ({ ...prev, ...response.data.group }));
      setCostPerUser({});
      toast.success('New payment round started. Contributions are open again.');
      await fetchPaymentStatus();
      bumpNotificationRefresh();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start a new payment round.');
    } finally {
      setIsReopeningRound(false);
    }
  };

  const calculateCostsAutomatically = async () => {
    const safeTargetAmount = Number(group?.target_amount) || 0;
    if (!safeTargetAmount || !members.length) return;

    try {
      const breakdownRes = await api.post('/sessions/calculate-costs', {
        group_id: id,
        total_cost: safeTargetAmount
      });
      setCostPerUser(breakdownRes.data.cost_per_user || {});
    } catch {
      const splitAmount = safeTargetAmount / members.length;
      const fallbackCosts = {};
      members.forEach((member) => {
        fallbackCosts[member.id] = splitAmount;
      });
      setCostPerUser(fallbackCosts);
    }
  };

  const handleViewBreakdown = async () => {
    await fetchPaymentStatus();
    const safeTargetAmount = Number(group?.target_amount) || 0;

    try {
      const breakdownRes = await api.post('/sessions/calculate-costs', {
        group_id: id,
        total_cost: safeTargetAmount
      });
      setCostPerUser(breakdownRes.data.cost_per_user || {});
      setShowSettlementModal(true);
    } catch {
      toast.error('Failed to calculate cost breakdown');
      const splitAmount = safeTargetAmount / (members.length || 1);
      const fallbackCosts = {};
      members.forEach((member) => {
        fallbackCosts[member.id] = splitAmount;
      });
      setCostPerUser(fallbackCosts);
      setShowSettlementModal(true);
    }
  };

  const handleProceedToPayment = async (amount) => {
    if (paymentStatus.has_paid_in_cycle) {
      toast.error('You already paid for this cycle.');
      return;
    }

    if (amount <= 0 || Number.isNaN(Number(amount))) {
      toast.error('Payment amount is invalid.');
      return;
    }

    setIsPaying(true);
    const payToast = toast.loading('Initializing secure payment...');

    try {
      if (!window.webpayCheckout) {
        throw new Error('Payment gateway not loaded. Please refresh and try again.');
      }

      const initRes = await api.post('/payments/initialize', {
        group_id: id,
        amount
      });
      const txn_ref = initRes.data.txn_ref;

      toast.dismiss(payToast);
      setShowSettlementModal(false);

      const paymentRequest = {
        merchant_code: import.meta.env.VITE_INTERSWITCH_MERCHANT_CODE || 'MX6072',
        pay_item_id: import.meta.env.VITE_INTERSWITCH_PAY_ITEM_ID || '9405967',
        txn_ref,
        amount: Math.round(Number(amount) * 100),
        currency: 566,
        cust_email: user.email,
        cust_name: user.name,
        site_redirect_url: window.location.href,
        mode: import.meta.env.VITE_INTERSWITCH_MODE || 'TEST',
        onComplete: async (response) => {
          if (response.resp === '00' || response.desc === 'Approved by Financial Institution') {
            const verifyToast = toast.loading('Verifying transaction...');
            try {
              await api.post('/payments/verify', { txn_ref });
              toast.dismiss(verifyToast);
              toast.success('Payment successful. Balance updated.');
              await Promise.all([fetchGroupData(), fetchPaymentStatus()]);
              bumpNotificationRefresh();
            } catch (err) {
              toast.dismiss(verifyToast);
              toast.error(err.response?.data?.error || 'Payment verification failed.');
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
      toast.error(error.response?.data?.error || error.message || 'Failed to initialize payment.');
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
        <p className="text-red-600 text-lg font-medium">Meter group not found.</p>
      </div>
    );
  }

  const safeTargetAmount = Number(group?.target_amount) || 0;
  const safeBalance = Number(group?.current_balance) || 0;
  const safeMembersCount = members.length || 1;
  const defaultShare = safeTargetAmount / safeMembersCount;
  const progressPercent = safeTargetAmount > 0 ? Math.min((safeBalance / safeTargetAmount) * 100, 100) : 0;
  const isHost = String(group.host_id) === String(user.id);

  const userShareKey = Object.keys(costPerUser || {}).find((memberId) => String(memberId) === String(user.id));
  const userShare = userShareKey !== undefined ? Number(costPerUser[userShareKey]) : defaultShare;

  const disablePayment = isPaying || userShare <= 0 || paymentStatus.has_paid_in_cycle || paymentStatus.is_fully_funded;
  const canStartNewRound = isHost && (paymentStatus.is_fully_funded || progressPercent >= 100);
  const paymentLabel = paymentStatus.has_paid_in_cycle
    ? 'Already Paid'
    : paymentStatus.is_fully_funded
      ? 'Fully Funded'
      : userShare <= 0
        ? 'Nothing Due'
        : `Pay NGN ${Number(userShare).toLocaleString()}`;

  return (
    <div className={`${styles.pageContainer} min-h-screen bg-gradient-to-br from-slate-50 to-gray-100`}>
      <div className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
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
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeletingGroup}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
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
                    <p className="text-gray-600 font-medium mb-1">Target</p>
                    {!isHost || !isEditingTarget ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-lg font-bold text-gray-900">NGN {safeTargetAmount.toLocaleString()}</p>
                        {isHost && (
                          <button onClick={handleStartTargetEdit} className="text-gray-500 hover:text-blue-600" title="Edit target">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="number"
                          min="1"
                          value={targetDraft}
                          onChange={(e) => setTargetDraft(e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveTargetEdit}
                            disabled={isUpdatingTarget}
                            className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white rounded py-1 text-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelTargetEdit}
                            className="flex-1 flex items-center justify-center gap-1 bg-gray-200 text-gray-700 rounded py-1 text-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-gray-600 font-medium">Raised</p>
                    <p className="text-lg font-bold text-blue-600">NGN {safeBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <p className="text-sm text-gray-700 font-medium mb-1">Your Share</p>
                <p className="text-2xl font-bold text-gray-900">NGN {Number(userShare).toLocaleString()}</p>
                <p className="text-xs text-gray-600 mt-2">
                  {Object.keys(costPerUser).length > 0 ? 'Based on usage' : `1/${members.length || 1} split`}
                </p>
              </div>

              <button
                onClick={handleViewBreakdown}
                className="w-full mt-3 py-2 rounded-lg font-semibold text-sm flex items-center justify-center transition-all bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              >
                <Activity className="w-4 h-4 mr-2" /> View Breakdown
              </button>

              <button
                onClick={() => handleProceedToPayment(userShare)}
                disabled={disablePayment}
                className={`w-full mt-4 py-3 rounded-lg font-bold flex items-center justify-center transition-all ${
                  disablePayment
                    ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-lg hover:shadow-xl'
                }`}
              >
                {paymentStatus.has_paid_in_cycle || paymentStatus.is_fully_funded || userShare <= 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" /> {paymentLabel}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" /> {paymentLabel}
                  </>
                )}
              </button>

              {isHost && (
                <button
                  onClick={handleReopenRound}
                  disabled={isReopeningRound || !canStartNewRound}
                  className={`w-full mt-3 py-2 rounded-lg font-semibold text-sm flex items-center justify-center transition-all border ${
                    canStartNewRound
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  } disabled:opacity-60`}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {isReopeningRound
                    ? 'Starting New Round...'
                    : canStartNewRound
                      ? 'Start New Payment Round'
                      : 'Available at 100% Funding'}
                </button>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Members ({members.length})
              </h2>

              <ul className="space-y-2 mb-4">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-all"
                  >
                    <span className="font-medium text-gray-700">
                      {member.name}
                      {String(member.id) === String(user.id) && <span className="text-blue-600 ml-2 text-xs font-bold">YOU</span>}
                    </span>
                    <span className="text-xs text-gray-500">Joined</span>
                  </li>
                ))}
              </ul>

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
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all">
                    Add
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-6 flex items-center text-gray-800">
                <Plug className="w-5 h-5 mr-2 text-blue-600" />
                Appliance Ledger
              </h2>

              <form onSubmit={handleAddAppliance} className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

                  <input
                    type="text"
                    placeholder="Wattage (auto-filled)"
                    readOnly
                    value={selectedAppliance ? `${selectedAppliance.wattage}W` : ''}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                  />

                  <input
                    type="number"
                    placeholder="Hrs / Day"
                    required
                    min="1"
                    max="24"
                    step="1"
                    value={newAppliance.daily_hours}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || Number.isInteger(Number(value))) {
                        setNewAppliance({ ...newAppliance, daily_hours: value });
                      }
                    }}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />

                  <button
                    type="submit"
                    disabled={!selectedAppliance}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plug className="w-4 h-4" />
                    Log Device
                  </button>
                </div>

                {selectedAppliance && (
                  <div className="mt-3 text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                    <strong>{selectedAppliance.name}</strong> uses about <strong>{selectedAppliance.wattage}W</strong>
                    {newAppliance.daily_hours &&
                      ` -> ~${((selectedAppliance.wattage * Number(newAppliance.daily_hours)) / 1000).toFixed(2)} kWh/day`}
                  </div>
                )}
              </form>

              <p className="text-sm font-semibold text-gray-700 mb-3">Devices by Member</p>
              <AppliancesByMember
                appliances={appliances}
                members={members}
                userId={user.id}
                onApplianceDelete={async () => {
                  await fetchGroupData();
                  bumpNotificationRefresh();
                }}
              />
            </div>

            <MeterNotifications groupId={id} refreshSignal={notificationRefreshSignal} />

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

      <SettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        settlement={{}}
        costPerUser={costPerUser}
        user={user}
        members={members}
        onProceedToPayment={handleProceedToPayment}
        group={group}
        hasPaidInCycle={paymentStatus.has_paid_in_cycle}
        isFullyFunded={paymentStatus.is_fully_funded}
      />

      <LeaveGroupModal
        isOpen={showLeaveModal}
        groupName={group?.meter_number || 'Group'}
        onConfirm={handleLeaveGroup}
        onCancel={() => setShowLeaveModal(false)}
        isLoading={isLeavingGroup}
      />

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
