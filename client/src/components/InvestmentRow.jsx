import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';

const InvestmentRow = ({ 
  investment, 
  onEdit, 
  onDelete, 
  formatPercentage 
}) => {
  const { formatCurrency, convertAmount, selectedCurrency } = useCurrency();
  const { calculateInvestmentMetrics } = useCurrencyConversion();
  const [metrics, setMetrics] = useState({ 
    currentValue: 0, 
    investedValue: 0, 
    gainLoss: 0, 
    gainLossPercentage: 0 
  });
  const [convertedPrices, setConvertedPrices] = useState({
    averagePrice: 0,
    currentPrice: 0
  });

  useEffect(() => {
    calculateInvestmentMetrics(investment).then(setMetrics);
    
    // Convert individual prices
    const convertPrices = async () => {
      const originalCurrency = investment.currency || 'USD';
      
      if (originalCurrency === selectedCurrency) {
        setConvertedPrices({
          averagePrice: investment.averagePrice,
          currentPrice: investment.currentPrice
        });
      } else {
        const avgPrice = await convertAmount(investment.averagePrice, originalCurrency, selectedCurrency);
        const currPrice = investment.currentPrice ? 
          await convertAmount(investment.currentPrice, originalCurrency, selectedCurrency) : 0;
        
        setConvertedPrices({
          averagePrice: avgPrice,
          currentPrice: currPrice
        });
      }
    };
    
    convertPrices();
  }, [investment, calculateInvestmentMetrics, convertAmount, selectedCurrency]);

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
      <td>{formatCurrency(convertedPrices.averagePrice)}</td>
      <td>
        {convertedPrices.currentPrice ? formatCurrency(convertedPrices.currentPrice) : 'N/A'}
      </td>
      <td className="font-medium">{formatCurrency(metrics.currentValue)}</td>
      <td>
        <div className={`flex items-center ${
          metrics.gainLoss >= 0 ? 'text-success-600' : 'text-danger-600'
        }`}>
          {metrics.gainLoss >= 0 ? (
            <TrendingUp className="h-4 w-4 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 mr-1" />
          )}
          <span>
            {formatCurrency(metrics.gainLoss)} ({formatPercentage(metrics.gainLossPercentage)})
          </span>
        </div>
      </td>
      <td>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(investment)}
            className="text-primary-600 hover:text-primary-700"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(investment._id)}
            className="text-danger-600 hover:text-danger-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default InvestmentRow;
