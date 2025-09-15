import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddInvestmentModal = ({ onClose, onAdd, members = [] }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    investmentType: 'stock',
    quantity: '',
    averagePrice: '',
    currency: 'USD',
    memberId: ''
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
      const investmentData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        averagePrice: parseFloat(formData.averagePrice)
      };
      await onAdd(investmentData);
    } catch (error) {
      console.error('Add investment error:', error);
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
            <h3 className="text-lg font-semibold text-gray-900">Add Investment</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="symbol" className="label">
                Symbol *
              </label>
              <input
                id="symbol"
                name="symbol"
                type="text"
                required
                className="input"
                placeholder="AAPL"
                value={formData.symbol}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="name" className="label">
                Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input"
                placeholder="Apple Inc."
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="investmentType" className="label">
                Investment Type *
              </label>
              <select
                id="investmentType"
                name="investmentType"
                required
                className="input"
                value={formData.investmentType}
                onChange={handleChange}
              >
                <option value="stock">Stock</option>
                <option value="mutual_fund">Mutual Fund</option>
                <option value="isa">ISA</option>
                <option value="etf">ETF</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="label">
                  Quantity *
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.000001"
                  required
                  className="input"
                  placeholder="10"
                  value={formData.quantity}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="memberId" className="label">
                  Member *
                </label>
                <select
                  id="memberId"
                  name="memberId"
                  className="input"
                  value={formData.memberId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a member</option>
                  {members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="currency" className="label">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  className="input"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="GBX">GBX - British Pence</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="averagePrice" className="label">
                Average Price *
              </label>
              <input
                id="averagePrice"
                name="averagePrice"
                type="number"
                step="0.01"
                required
                className="input"
                placeholder="150.00"
                value={formData.averagePrice}
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
                {loading ? 'Adding...' : 'Add Investment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddInvestmentModal;
