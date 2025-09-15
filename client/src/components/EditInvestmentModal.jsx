import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const EditInvestmentModal = ({ investment, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    quantity: '',
    averagePrice: '',
    currentPrice: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (investment) {
      setFormData({
        quantity: investment.quantity.toString(),
        averagePrice: investment.average_price.toString(),
        currentPrice: investment.current_price ? investment.current_price.toString() : ''
      });
    }
  }, [investment]);

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
      const updateData = {};
      if (formData.quantity) updateData.quantity = parseFloat(formData.quantity);
      if (formData.averagePrice) updateData.averagePrice = parseFloat(formData.averagePrice);
      if (formData.currentPrice) updateData.currentPrice = parseFloat(formData.currentPrice);

      await onUpdate(investment.id, updateData);
    } catch (error) {
      console.error('Update investment error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!investment) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit {investment.symbol} - {investment.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="quantity" className="label">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                step="0.000001"
                className="input"
                placeholder="10"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="averagePrice" className="label">
                Average Price
              </label>
              <input
                id="averagePrice"
                name="averagePrice"
                type="number"
                step="0.01"
                className="input"
                placeholder="150.00"
                value={formData.averagePrice}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="currentPrice" className="label">
                Current Price
              </label>
              <input
                id="currentPrice"
                name="currentPrice"
                type="number"
                step="0.01"
                className="input"
                placeholder="175.50"
                value={formData.currentPrice}
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
                {loading ? 'Updating...' : 'Update Investment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditInvestmentModal;
