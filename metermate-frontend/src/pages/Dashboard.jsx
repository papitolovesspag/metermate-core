import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Zap, Plus, LogOut, Home, Trash2, Pencil, Check, X } from 'lucide-react';
import DeleteGroupModal from '../components/DeleteGroupModal';
import styles from './Dashboard.module.css';

const DISCO_PROVIDERS = [
  { name: 'Select Provider...', code: '' },
  { name: 'Port Harcourt Electric (PHED)', code: '10900' },
  { name: 'Ikeja Electric (IKEDC)', code: '10401' },
  { name: 'Eko Electric (EKEDC)', code: '10201' },
  { name: 'Abuja Electric (AEDC)', code: '10301' },
  { name: 'Enugu Electric (EEDC)', code: '10601' }
];

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  const [selectedDeleteGroup, setSelectedDeleteGroup] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingTargetGroupId, setEditingTargetGroupId] = useState(null);
  const [targetDraft, setTargetDraft] = useState('');
  const [updatingTargetId, setUpdatingTargetId] = useState(null);

  const [newGroup, setNewGroup] = useState({ meter_number: '', target_amount: '', payment_code: '' });

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups/my-groups');
      setGroups(response.data.groups || []);
    } catch (error) {
      toast.error('Failed to load your groups.');
      if (error.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.payment_code) {
      toast.error('Please select an electricity provider.');
      return;
    }

    setIsValidating(true);
    const loadingToast = toast.loading('Validating meter...');

    try {
      const response = await api.post('/groups/create', newGroup);
      toast.dismiss(loadingToast);
      toast.success(`Verified meter owner: ${response.data.registered_to || 'Customer'}`, { duration: 5000 });

      setShowCreateForm(false);
      setNewGroup({ meter_number: '', target_amount: '', payment_code: '' });
      fetchGroups();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.error || 'Failed to create group');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeleteGroupClick = (group) => {
    setSelectedDeleteGroup(group);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!selectedDeleteGroup) return;

    setDeletingGroupId(selectedDeleteGroup.id);
    try {
      await api.delete(`/groups/${selectedDeleteGroup.id}`);
      toast.success('Group deleted successfully.');
      setShowDeleteModal(false);
      setSelectedDeleteGroup(null);
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete group');
    } finally {
      setDeletingGroupId(null);
    }
  };

  const startTargetEdit = (group) => {
    setEditingTargetGroupId(group.id);
    setTargetDraft(String(Number(group.target_amount) || 0));
  };

  const cancelTargetEdit = () => {
    setEditingTargetGroupId(null);
    setTargetDraft('');
  };

  const saveTargetEdit = async (groupId) => {
    const amount = Number(targetDraft);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Target amount must be greater than zero.');
      return;
    }

    setUpdatingTargetId(groupId);
    try {
      await api.patch(`/groups/${groupId}/target`, { target_amount: amount });
      toast.success('Target amount updated.');
      setEditingTargetGroupId(null);
      setTargetDraft('');
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update target.');
    } finally {
      setUpdatingTargetId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getProgressColor = (balance, target) => {
    const safeTarget = Number(target) || 0;
    if (safeTarget <= 0) return 'bg-orange-500';
    const percent = (Number(balance) / safeTarget) * 100;
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 75) return 'bg-blue-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <nav className="bg-white shadow-md border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className={styles.zapIcon}>
            <Zap className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            MeterMate
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 font-medium hidden sm:block">
            Welcome, <span className="text-blue-600 font-semibold">{user?.name}</span>
          </span>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition duration-200"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Your Meter Groups</h1>
            <p className="text-gray-600 mt-1">Manage shared electricity expenses with your household</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`${styles.primaryButton} flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl`}
          >
            <Plus className="w-5 h-5" />
            <span>New Group</span>
          </button>
        </div>

        {showCreateForm && (
          <div className={`${styles.createForm} bg-white p-8 rounded-2xl shadow-lg border-2 border-blue-100 mb-8 animate-fade-in-down`}>
            <h3 className="text-xl font-bold text-gray-800 mb-6">Create a New Meter Group</h3>
            <form onSubmit={handleCreateGroup} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <select
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:border-gray-300"
                  value={newGroup.payment_code}
                  onChange={(e) => setNewGroup({ ...newGroup, payment_code: e.target.value })}
                >
                  {DISCO_PROVIDERS.map((provider) => (
                    <option key={provider.code} value={provider.code}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meter Number</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 45041234567"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300"
                  value={newGroup.meter_number}
                  onChange={(e) => setNewGroup({ ...newGroup, meter_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount (NGN)</label>
                <input
                  required
                  type="number"
                  placeholder="e.g. 25000"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300"
                  value={newGroup.target_amount}
                  onChange={(e) => setNewGroup({ ...newGroup, target_amount: e.target.value })}
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  disabled={isValidating}
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-600 font-semibold disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {isValidating ? 'Validating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin mb-4">
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-gray-600 font-medium">Loading your meter groups...</p>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-lg border-2 border-gray-100 text-center">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Meter Groups Yet</h3>
            <p className="text-gray-600 mb-6">Create your first group or ask a flatmate to invite you.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Create First Group</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => {
              const targetAmount = Number(group.target_amount) || 0;
              const currentBalance = Number(group.current_balance) || 0;
              const progressPercent = targetAmount > 0 ? Math.min((currentBalance / targetAmount) * 100, 100) : 0;
              const isFullyFunded = progressPercent >= 100;
              const isHost = String(group.host_id) === String(user?.id);
              const isEditingTarget = editingTargetGroupId === group.id;

              return (
                <div
                  key={group.id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-1 group/card"
                >
                  <div className={`h-1 ${getProgressColor(currentBalance, targetAmount)}`}></div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span
                          className={`inline-block px-3 py-1 text-xs font-bold rounded-full mb-3 ${
                            isFullyFunded ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isFullyFunded ? 'FUNDED' : group.status}
                        </span>
                        <h3 className="font-bold text-gray-900 text-lg">Meter {group.meter_number}</h3>
                      </div>
                      {isHost && (
                        <button
                          onClick={() => handleDeleteGroupClick(group)}
                          disabled={deletingGroupId === group.id}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover/card:opacity-100"
                          title="Delete group"
                        >
                          <Trash2 className={`w-5 h-5 ${deletingGroupId === group.id ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Target</span>
                        {!isHost || !isEditingTarget ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">NGN {targetAmount.toLocaleString()}</span>
                            {isHost && (
                              <button
                                onClick={() => startTargetEdit(group)}
                                className="text-gray-400 hover:text-blue-600"
                                title="Edit target"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={targetDraft}
                              onChange={(e) => setTargetDraft(e.target.value)}
                              className="w-28 px-2 py-1 border border-blue-300 rounded text-right font-semibold"
                            />
                            <button
                              onClick={() => saveTargetEdit(group.id)}
                              disabled={updatingTargetId === group.id}
                              className="text-green-600 hover:text-green-700"
                              title="Save target"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelTargetEdit}
                              className="text-gray-500 hover:text-gray-700"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Collected</span>
                        <span className={`font-bold ${isFullyFunded ? 'text-green-600' : 'text-blue-600'}`}>
                          NGN {currentBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ease-out ${getProgressColor(currentBalance, targetAmount)}`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-right font-medium">{Math.round(progressPercent)}% funded</p>
                    </div>

                    <button
                      onClick={() => navigate(`/dashboard/group/${group.id}`)}
                      className="w-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-500 hover:to-blue-600 text-gray-700 hover:text-white py-3 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center space-x-2 group/btn"
                    >
                      <span>View Details & Pay</span>
                      <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <DeleteGroupModal
        isOpen={showDeleteModal}
        groupName={selectedDeleteGroup?.meter_number || 'Group'}
        onConfirm={handleConfirmDeleteGroup}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedDeleteGroup(null);
        }}
        isLoading={!!deletingGroupId}
      />
    </div>
  );
}
