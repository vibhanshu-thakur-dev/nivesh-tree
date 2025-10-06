import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Target, 
  Edit, 
  Trash2, 
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react';
import { goalsAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import AddGoalModal from '../components/AddGoalModal';
import EditGoalModal from '../components/EditGoalModal';
import { householdsAPI } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { formatCurrency } = useCurrency();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [selectedMemberId, statusFilter]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedMemberId) params.memberId = selectedMemberId;
      if (statusFilter) params.status = statusFilter;
      const response = await goalsAPI.getGoals(params);
      setGoals(response.data.goals || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await householdsAPI.getMembers();
      setMembers(res.data.members || []);
    } catch (e) {
      setMembers([]);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await goalsAPI.deleteGoal(id);
        toast.success('Goal deleted successfully');
        fetchGoals();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete goal');
      }
    }
  };

  const handleAddGoal = async (goalData) => {
    try {
      await goalsAPI.createGoal(goalData);
      toast.success('Goal created successfully');
      setShowAddModal(false);
      fetchGoals();
    } catch (error) {
      console.error('Add goal error:', error);
      toast.error('Failed to create goal');
    }
  };

  const handleEditGoal = async (id, goalData) => {
    try {
      await goalsAPI.updateGoal(id, goalData);
      toast.success('Goal updated successfully');
      setEditingGoal(null);
      fetchGoals();
    } catch (error) {
      console.error('Update goal error:', error);
      toast.error('Failed to update goal');
    }
  };

  const handleUpdateProgress = async (id) => {
    try {
      await goalsAPI.updateGoalProgress(id);
      toast.success('Goal progress updated');
      fetchGoals();
    } catch (error) {
      console.error('Update progress error:', error);
      toast.error('Failed to update goal progress');
    }
  };

  const formatAmount = (amount, currency) => formatCurrency(amount || 0, currency);

  const formatDate = (dateString) => {
    if (!dateString) return 'No target date';
    return new Date(dateString).toLocaleDateString();
  };

  const getProgressPercentage = (current, target) => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Goals</h1>
          <p className="text-gray-600">Set and track your investment objectives</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
          >
            <option value="">All Members</option>
            {members.map(m => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </button>
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
          <p className="text-gray-600 mb-6">Create your first investment goal to get started</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const progressPercentage = getProgressPercentage(goal.currentAmount, goal.targetAmount);
            const isAchieved = goal.status === 'achieved' || goal.status === 'completed';
            const isOverdue = goal.targetDate && new Date(goal.targetDate) < new Date() && !isAchieved;

            return (
              <div key={goal._id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {isAchieved ? (
                      <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
                    ) : (
                      <Target className="h-5 w-5 text-primary-600 mr-2" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {goal.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setEditingGoal(goal)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal._id)}
                      className="text-gray-400 hover:text-danger-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-medium">
                      {formatAmount(goal.currentAmount, goal.currency)} / {formatAmount(goal.targetAmount, goal.currency)}
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isAchieved ? 'bg-success-600' : 'bg-primary-600'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {progressPercentage.toFixed(1)}% complete
                    </span>
                    {isAchieved && (
                      <span className="text-xs font-medium text-success-600 bg-success-100 px-2 py-1 rounded-full">
                        Achieved!
                      </span>
                    )}
                  </div>

                  {goal.targetDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className={isOverdue ? 'text-danger-600' : ''}>
                        Target: {formatDate(goal.targetDate)}
                      </span>
                    </div>
                  )}

                  {goal.target_symbol && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Target Investment:</span> {goal.target_symbol}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => handleUpdateProgress(goal._id)}
                      className="btn btn-outline w-full text-sm"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Update Progress
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddGoalModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddGoal}
        />
      )}

      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onUpdate={handleEditGoal}
        />
      )}
    </div>
  );
};

export default Goals;
