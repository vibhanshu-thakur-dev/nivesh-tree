import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddGoalModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    goalName: '',
    targetAmount: '',
    targetDate: '',
    goalType: 'total_value',
    targetSymbol: ''
  });
  const [loading, setLoading] = useState(false);

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
      const goalData = {
        ...formData,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate || null,
        targetSymbol: formData.goalType === 'specific_investment' ? formData.targetSymbol : null
      };
      await onAdd(goalData);
    } catch (error) {
      console.error('Add goal error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Add Investment Goal</h3>
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
                Goal Name *
              </label>
              <input
                id="goalName"
                name="goalName"
                type="text"
                required
                className="input"
                placeholder="e.g., Retirement Fund, House Down Payment"
                value={formData.goalName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="goalType" className="label">
                Goal Type *
              </label>
              <select
                id="goalType"
                name="goalType"
                required
                className="input"
                value={formData.goalType}
                onChange={handleChange}
              >
                <option value="total_value">Total Portfolio Value</option>
                <option value="specific_investment">Specific Investment Value</option>
              </select>
            </div>

            {formData.goalType === 'specific_investment' && (
              <div>
                <label htmlFor="targetSymbol" className="label">
                  Target Investment Symbol *
                </label>
                <input
                  id="targetSymbol"
                  name="targetSymbol"
                  type="text"
                  required={formData.goalType === 'specific_investment'}
                  className="input"
                  placeholder="e.g., AAPL, TSLA"
                  value={formData.targetSymbol}
                  onChange={handleChange}
                />
              </div>
            )}

            <div>
              <label htmlFor="targetAmount" className="label">
                Target Amount *
              </label>
              <input
                id="targetAmount"
                name="targetAmount"
                type="number"
                step="0.01"
                required
                className="input"
                placeholder="100000"
                value={formData.targetAmount}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="targetDate" className="label">
                Target Date (Optional)
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
                {loading ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddGoalModal;
