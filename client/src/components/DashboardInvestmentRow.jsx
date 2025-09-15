import React, { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';

const DashboardInvestmentRow = ({ 
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
      <td className="font-medium">{investment.symbol}</td>
      <td className="text-gray-600">{investment.name}</td>
      <td>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          {investment.investmentType}
        </span>
      </td>
      <td>{investment.quantity}</td>
      <td>{formatCurrency(metrics.currentValue)}</td>
      <td className={metrics.gainLoss >= 0 ? 'text-success-600' : 'text-danger-600'}>
        {formatCurrency(metrics.gainLoss)} ({formatPercentage(metrics.gainLossPercentage)})
      </td>
    </tr>
  );
};

export default DashboardInvestmentRow;
