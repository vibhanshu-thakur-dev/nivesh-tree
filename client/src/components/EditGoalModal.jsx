import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const EditGoalModal = ({ goal, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    goalName: '',
    targetAmount: '',
    targetDate: '',
    currentAmount: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goal) {
      setFormData({
        goalName: goal.goal_name,
        targetAmount: goal.target_amount.toString(),
        targetDate: goal.target_date ? goal.target_date.split('T')[0] : '',
        currentAmount: goal.current_amount.toString()
      });
    }
  }, [goal]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        goalName: formData.goalName,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate || null,
        currentAmount: parseFloat(formData.currentAmount)
      };
      await onUpdate(goal.id, updateData);
    } catch (error) {
      console.error('Update goal error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!goal) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Edit Goal</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="goalName" className="label">
                Goal Name
              </label>
              <input
                id="goalName"
                name="goalName"
                type="text"
                required
                className="input"
                value={formData.goalName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="targetAmount" className="label">
                Target Amount
              </label>
              <input
                id="targetAmount"
                name="targetAmount"
                type="number"
                step="0.01"
                required
                className="input"
                value={formData.targetAmount}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="currentAmount" className="label">
                Current Amount
              </label>
              <input
                id="currentAmount"
                name="currentAmount"
                type="number"
                step="0.01"
                className="input"
                value={formData.currentAmount}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="targetDate" className="label">
                Target Date
              </label>
              <input
                id="targetDate"
                name="targetDate"
                type="date"
                className="input"
                value={formData.targetDate}
                onChange={handleChange}
              />
            </div>

            {goal.target_symbol && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Target Investment:</span> {goal.target_symbol}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Goal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditGoalModal;
