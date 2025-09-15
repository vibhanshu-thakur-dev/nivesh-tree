import React, { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';

const PortfolioInvestmentRow = ({ 
  investment, 
  formatPercentage 
}) => {
  const { formatCurrency } = useCurrency();
  const { calculateInvestmentMetrics } = useCurrencyConversion();
  const [metrics, setMetrics] = useState({ 
    currentValue: 0, 
    investedValue: 0, 
    gainLoss: 0, 
    gainLossPercentage: 0 
  });

  useEffect(() => {
    calculateInvestmentMetrics(investment).then(setMetrics);
  }, [investment, calculateInvestmentMetrics]);

  return (
    <tr>
      <td className="text-gray-600 font-medium">
        {investment.name.length > 20 ? `${investment.name.substring(0, 20)}...` : investment.name}
      </td>
      <td>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          {investment.investmentType}
        </span>
      </td>
      <td>{investment.quantity}</td>
      <td className="font-medium">{formatCurrency(metrics.currentValue)}</td>
      <td className={metrics.gainLoss >= 0 ? 'text-success-600' : 'text-danger-600'}>
        {formatCurrency(metrics.gainLoss)}
      </td>
      <td className={metrics.gainLossPercentage >= 0 ? 'text-success-600' : 'text-danger-600'}>
        {formatPercentage(metrics.gainLossPercentage)}
      </td>
    </tr>
  );
};

export default PortfolioInvestmentRow;
