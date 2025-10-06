import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { householdsAPI } from '../services/api';

const AddGoalModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: '',
    targetDate: '',
    targetSymbol: '',
    memberId: '',
    currency: 'GBP',
    investmentType: 'isa'
  });
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await householdsAPI.getMembers();
        setMembers(res.data.members || []);
      } catch (e) {
        setMembers([]);
      }
    };
    loadMembers();
  }, []);

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
        title: formData.title,
        memberId: formData.memberId,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate || null,
        currency: formData.currency,
        investmentType: formData.investmentType,
        targetSymbol: formData.targetSymbol || null
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
              <label htmlFor="title" className="label">
                Goal Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                className="input"
                placeholder="e.g., ISA for John, House Down Payment"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="memberId" className="label">Member *</label>
              <select
                id="memberId"
                name="memberId"
                required
                className="input"
                value={formData.memberId}
                onChange={handleChange}
              >
                <option value="">Select member</option>
                {members.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>

            {false && (
              <div>
                <label htmlFor="targetSymbol" className="label">
                  Target Investment Symbol *
                </label>
                <input
                  id="targetSymbol"
                  name="targetSymbol"
                  type="text"
                  required={false}
                  className="input"
                  placeholder="e.g., AAPL, TSLA"
                  value={formData.targetSymbol}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="currency" className="label">Currency *</label>
                <select
                  id="currency"
                  name="currency"
                  required
                  className="input"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="GBP">GBP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div>
                <label htmlFor="investmentType" className="label">Investment Type *</label>
                <select
                  id="investmentType"
                  name="investmentType"
                  required
                  className="input"
                  value={formData.investmentType}
                  onChange={handleChange}
                >
                  <option value="isa">ISA</option>
                  <option value="mutual_fund">Mutual Fund</option>
                  <option value="stock">Stock</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

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
