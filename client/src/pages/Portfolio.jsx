import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  RefreshCw,
  Download,
  Edit,
  Trash2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { investmentsAPI, householdsAPI } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';
import DataTable from '../components/DataTable';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const Portfolio = () => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'chart', 'pie'
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [household, setHousehold] = useState(null);
  const [allPortfolioData, setAllPortfolioData] = useState(null);
  
  const { formatCurrency } = useCurrency();
  const { convertInvestments, calculateInvestmentMetrics, convertPortfolioData } = useCurrencyConversion();

  useEffect(() => {
    fetchHouseholdData();
    fetchPortfolioData();
  }, []);

  useEffect(() => {
    filterDataByMember();
  }, [selectedMemberId, allPortfolioData]);

  const fetchHouseholdData = async () => {
    try {
      const [householdResponse, membersResponse] = await Promise.all([
        householdsAPI.getHousehold(),
        householdsAPI.getMembers()
      ]);
      
      setHousehold(householdResponse.data.household);
      setMembers(membersResponse.data.members);
    } catch (error) {
      console.error('Error fetching household data:', error);
      toast.error('Failed to load household data');
    }
  };

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const response = await investmentsAPI.getPortfolioSummary();
      const rawData = response.data;
      
      console.log('Raw portfolio data:', rawData);
      console.log('Members in raw data:', rawData.members);
      
      // Convert portfolio data to selected currency
      // Temporarily disable client-side conversion to debug
      const convertedData = await convertPortfolioData(rawData);
      
      console.log('Converted portfolio data:', convertedData);
      console.log('Members in converted data:', convertedData.members);
      
      setAllPortfolioData(convertedData);
      setPortfolioData(convertedData);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const filterDataByMember = () => {
    if (!allPortfolioData) return;

    if (!selectedMemberId) {
      // Show household totals
      setPortfolioData(allPortfolioData);
    } else {
      // Show member-specific data
      console.log('Debug - selectedMemberId:', selectedMemberId);
      console.log('Debug - allPortfolioData.members:', allPortfolioData.members);
      console.log('Debug - member IDs:', allPortfolioData.members?.map(m => ({ memberId: m.memberId, memberIdString: m.memberId?.toString() })));
      const memberData = allPortfolioData.members?.find(member => String(member.memberId) === String(selectedMemberId));
      console.log('Debug - found memberData:', memberData);
      if (memberData) {
        setPortfolioData({
          ...allPortfolioData,
          totalValue: memberData.totalValue,
          totalInvested: memberData.totalInvested,
          totalGainLoss: memberData.totalGainLoss,
          gainLossPercentage: memberData.gainLossPercentage,
          investmentCount: memberData.investmentCount,
          investments: memberData.investments
        });
      } else {
        // If no member data found, show empty portfolio
        setPortfolioData({
          ...allPortfolioData,
          totalValue: 0,
          totalInvested: 0,
          totalGainLoss: 0,
          gainLossPercentage: 0,
          investmentCount: 0,
          investments: []
        });
      }
    }
  };

  // Currency formatting is now handled by the currency context

  const formatPercentage = (percentage) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatCurrencyWithSymbol = (amount, currency) => {
    if (!amount && amount !== 0) return 'N/A';
    
    const currencySymbols = {
      'GBP': '£',
      'USD': '$',
      'EUR': '€',
      'INR': '₹',
      'isa': '£' // ISA is typically in GBP
    };
    
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Define columns for DataTable
  const columns = [
    {
      key: 'name',
      header: 'Name',
      accessor: 'name',
      sortable: true,
      searchable: true,
      render: (investment) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-100 to-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{investment.name}</div>
            <div className="text-sm text-gray-500">{investment.symbol}</div>
          </div>
        </div>
      )
    },
    {
      key: 'investmentType',
      header: 'Type',
      accessor: 'investmentType',
      sortable: true,
      filterable: true,
      render: (investment) => (
        <span className="badge badge-primary">
          {investment.investmentType?.charAt(0).toUpperCase() + investment.investmentType?.slice(1).replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'quantity',
      header: 'Quantity',
      accessor: 'quantity',
      sortable: true,
      sortType: 'number',
      render: (investment) => (
        <span className="font-medium">{investment.quantity?.toLocaleString()}</span>
      )
    },
    {
      key: 'currentValue',
      header: 'Current Value',
      accessor: (investment) => investment.totalValue || (investment.quantity * investment.currentPrice),
      sortable: true,
      sortType: 'number',
      render: (investment) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(investment.totalValue || (investment.quantity * investment.currentPrice))}
        </span>
      )
    },
    {
      key: 'gainLoss',
      header: 'Gain/Loss',
      accessor: (investment) => {
        const currentValue = investment.totalValue || (investment.quantity * investment.currentPrice);
        const investedValue = investment.quantity * investment.averagePrice;
        return currentValue - investedValue;
      },
      sortable: true,
      sortType: 'number',
      render: (investment) => {
        const currentValue = investment.totalValue || (investment.quantity * investment.currentPrice);
        const investedValue = investment.quantity * investment.averagePrice;
        const gainLoss = currentValue - investedValue;
        
        return (
          <div className={`font-semibold ${gainLoss >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {formatCurrency(gainLoss)}
          </div>
        );
      }
    },
    {
      key: 'returnPercentage',
      header: 'Return %',
      accessor: (investment) => {
        const currentValue = investment.totalValue || (investment.quantity * investment.currentPrice);
        const investedValue = investment.quantity * investment.averagePrice;
        return investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0;
      },
      sortable: true,
      sortType: 'number',
      render: (investment) => {
        const currentValue = investment.totalValue || (investment.quantity * investment.currentPrice);
        const investedValue = investment.quantity * investment.averagePrice;
        const gainLossPercentage = investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0;
        
        return (
          <div className={`font-semibold ${gainLossPercentage >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {formatPercentage(gainLossPercentage)}
          </div>
        );
      }
    }
  ];

  const prepareChartData = () => {
    if (!portfolioData?.investments) return [];

    return portfolioData.investments.map(investment => {
      const currentValue = investment.totalValue || (investment.quantity * investment.currentPrice);
      const investedValue = investment.quantity * investment.averagePrice;
      const gainLoss = currentValue - investedValue;
      const gainLossPercentage = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;

      return {
        symbol: investment.symbol,
        name: investment.name.length > 20 ? `${investment.name.substring(0, 20)}...` : investment.name,
        currentValue,
        investedValue,
        gainLoss,
        gainLossPercentage,
        type: investment.investmentType
      };
    });
  };

  const preparePieChartData = () => {
    if (!portfolioData?.investments) return [];

    const typeTotals = {};
    portfolioData.investments.forEach(investment => {
      const currentValue = investment.totalValue || (investment.quantity * investment.currentPrice);
      
      if (!typeTotals[investment.investmentType]) {
        typeTotals[investment.investmentType] = 0;
      }
      typeTotals[investment.investmentType] += currentValue;
    });

    const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return Object.entries(typeTotals).map(([type, value], index) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
      value,
      color: colors[index % colors.length]
    }));
  };

  const exportToCSV = () => {
    if (!portfolioData?.investments) return;

    const csvData = portfolioData.investments.map(investment => {
      const currentValue = investment.totalValue || (investment.quantity * investment.currentPrice);
      const investedValue = investment.quantity * investment.averagePrice;
      const gainLoss = currentValue - investedValue;
      const gainLossPercentage = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;

      return {
        Name: investment.name.length > 20 ? `${investment.name.substring(0, 20)}...` : investment.name,
        Type: investment.investmentType,
        Quantity: investment.quantity,
        [`Average Price (${investment.currency})`]: investment.averagePrice.toFixed(2),
        [`Current Price (${investment.currency})`]: investment.currentPrice ? investment.currentPrice.toFixed(2) : 'N/A',
        [`Current Value (${investment.currency})`]: currentValue.toFixed(2),
        [`Invested Value (${investment.currency})`]: investedValue.toFixed(2),
        [`Gain/Loss (${investment.currency})`]: gainLoss.toFixed(2),
        'Gain/Loss %': gainLossPercentage.toFixed(2),
        'Original Currency': investment.currency
      };
    });

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const chartData = prepareChartData();
  const pieData = preparePieChartData();

  return (
    <div className="space-y-6">
      {/* Member Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {household?.name || 'Household'} Portfolio Analysis
            </h2>
            <p className="text-sm text-gray-600">Choose a member to view their portfolio analysis</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedMemberId || ''}
              onChange={(e) => setSelectedMemberId(e.target.value || null)}
              className="input"
            >
              <option value="">All Members</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Analysis</h1>
          <p className="text-gray-600">
            {selectedMemberId 
              ? `Comprehensive view of ${members.find(m => m._id === selectedMemberId)?.name}'s investment portfolio`
              : 'Comprehensive view of your household investment portfolio'
            }
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportToCSV}
            className="btn btn-outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchPortfolioData}
            className="btn btn-outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      {portfolioData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(portfolioData.totalValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Invested</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(portfolioData.totalInvested)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Gain/Loss</p>
                <p className={`text-2xl font-bold ${
                  portfolioData.totalGainLoss >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {formatCurrency(portfolioData.totalGainLoss)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Return %</p>
                <p className={`text-2xl font-bold ${
                  portfolioData.gainLossPercentage >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {formatPercentage(portfolioData.gainLossPercentage)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment-wise Breakdown */}
      {portfolioData && portfolioData.investmentWise && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Investment-wise Breakdown</h3>
            <div className="text-sm text-gray-500">By Investment Type</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* ISA Investments */}
            {portfolioData.investmentWise.totalValueIsa > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">ISA</h4>
                      <p className="text-sm text-gray-600">Individual Savings Account</p>
                    </div>
                  </div>
                  <span className="badge badge-primary">ISA</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Value</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrencyWithSymbol(portfolioData.investmentWise.totalValueIsa, portfolioData.investmentWise.currencyIsa)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Invested</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrencyWithSymbol(portfolioData.investmentWise.totalInvestedIsa, portfolioData.investmentWise.currencyIsa)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gain/Loss</span>
                    <span className={`font-semibold ${
                      (portfolioData.investmentWise.totalValueIsa - portfolioData.investmentWise.totalInvestedIsa) >= 0 
                        ? 'text-success-600' 
                        : 'text-danger-600'
                    }`}>
                      {formatCurrencyWithSymbol(portfolioData.investmentWise.totalValueIsa - portfolioData.investmentWise.totalInvestedIsa, portfolioData.investmentWise.currencyIsa)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Return</span>
                    <span className={`font-semibold ${
                      ((portfolioData.investmentWise.totalValueIsa - portfolioData.investmentWise.totalInvestedIsa) / portfolioData.investmentWise.totalInvestedIsa * 100) >= 0 
                        ? 'text-success-600' 
                        : 'text-danger-600'
                    }`}>
                      {formatPercentage(
                        portfolioData.investmentWise.totalInvestedIsa > 0 
                          ? ((portfolioData.investmentWise.totalValueIsa - portfolioData.investmentWise.totalInvestedIsa) / portfolioData.investmentWise.totalInvestedIsa) * 100
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mutual Fund Investments */}
            {portfolioData.investmentWise.totalValueMutualFund > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Mutual Funds</h4>
                      <p className="text-sm text-gray-600">Professional Fund Management</p>
                    </div>
                  </div>
                  <span className="badge badge-success">Mutual Fund</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Value</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrencyWithSymbol(portfolioData.investmentWise.totalValueMutualFund, portfolioData.investmentWise.currencyMutualFund)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Invested</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrencyWithSymbol(portfolioData.investmentWise.totalInvestedMutualFund, portfolioData.investmentWise.currencyMutualFund)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gain/Loss</span>
                    <span className={`font-semibold ${
                      (portfolioData.investmentWise.totalValueMutualFund - portfolioData.investmentWise.totalInvestedMutualFund) >= 0 
                        ? 'text-success-600' 
                        : 'text-danger-600'
                    }`}>
                      {formatCurrencyWithSymbol(portfolioData.investmentWise.totalValueMutualFund - portfolioData.investmentWise.totalInvestedMutualFund, portfolioData.investmentWise.currencyMutualFund)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Return</span>
                    <span className={`font-semibold ${
                      ((portfolioData.investmentWise.totalValueMutualFund - portfolioData.investmentWise.totalInvestedMutualFund) / portfolioData.investmentWise.totalInvestedMutualFund * 100) >= 0 
                        ? 'text-success-600' 
                        : 'text-danger-600'
                    }`}>
                      {formatPercentage(
                        portfolioData.investmentWise.totalInvestedMutualFund > 0 
                          ? ((portfolioData.investmentWise.totalValueMutualFund - portfolioData.investmentWise.totalInvestedMutualFund) / portfolioData.investmentWise.totalInvestedMutualFund) * 100
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stock Investments */}
            {portfolioData.investmentWise.totalValueStock > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Stocks</h4>
                      <p className="text-sm text-gray-600">Individual Stock Holdings</p>
                    </div>
                  </div>
                  <span className="badge badge-secondary">Stock</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Value</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrencyWithSymbol(portfolioData.investmentWise.totalValueStock, portfolioData.investmentWise.currencyStock)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Invested</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrencyWithSymbol(portfolioData.investmentWise.totalInvestedStock, portfolioData.investmentWise.currencyStock)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gain/Loss</span>
                    <span className={`font-semibold ${
                      (portfolioData.investmentWise.totalValueStock - portfolioData.investmentWise.totalInvestedStock) >= 0 
                        ? 'text-success-600' 
                        : 'text-danger-600'
                    }`}>
                      {formatCurrencyWithSymbol(portfolioData.investmentWise.totalValueStock - portfolioData.investmentWise.totalInvestedStock, portfolioData.investmentWise.currencyStock)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Return</span>
                    <span className={`font-semibold ${
                      ((portfolioData.investmentWise.totalValueStock - portfolioData.investmentWise.totalInvestedStock) / portfolioData.investmentWise.totalInvestedStock * 100) >= 0 
                        ? 'text-success-600' 
                        : 'text-danger-600'
                    }`}>
                      {formatPercentage(
                        portfolioData.investmentWise.totalInvestedStock > 0 
                          ? ((portfolioData.investmentWise.totalValueStock - portfolioData.investmentWise.totalInvestedStock) / portfolioData.investmentWise.totalInvestedStock) * 100
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member-wise Investment Breakdown */}
      {portfolioData && portfolioData.members && portfolioData.members.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Investment Breakdown by Member</h3>
            <div className="text-sm text-gray-500">Individual Member Portfolios</div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {portfolioData.members.map((member) => (
              <div key={member.memberId} className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{member.memberName}</h4>
                  <div className="text-sm text-gray-500">{member.investmentCount} investments</div>
                </div>
                
                {/* Member Total Summary */}
                <div className="mb-4 p-3 bg-white rounded-lg border">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Total Value</span>
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(member.totalValue)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Invested</span>
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(member.totalInvested)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Gain/Loss</span>
                      <div className={`font-semibold ${
                        member.totalGainLoss >= 0 ? 'text-success-600' : 'text-danger-600'
                      }`}>
                        {formatCurrency(member.totalGainLoss)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Return</span>
                      <div className={`font-semibold ${
                        member.gainLossPercentage >= 0 ? 'text-success-600' : 'text-danger-600'
                      }`}>
                        {formatPercentage(member.gainLossPercentage)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Member Investment-wise Breakdown */}
                {member.investmentWise && (
                  <div className="space-y-3">
                    {/* ISA Investments */}
                    {(member.investmentWise.totalValueIsa > 0 || member.investmentWise.totalInvestedIsa > 0) && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">ISA</span>
                          <span className="text-xs text-blue-600">GBP</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-blue-600">Value</span>
                            <div className="font-semibold text-blue-900">
                              {formatCurrencyWithSymbol(member.investmentWise.totalValueIsa, member.investmentWise.currencyIsa)}
                            </div>
                          </div>
                          <div>
                            <span className="text-blue-600">Invested</span>
                            <div className="font-semibold text-blue-900">
                              {formatCurrencyWithSymbol(member.investmentWise.totalInvestedIsa, member.investmentWise.currencyIsa)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mutual Fund Investments */}
                    {(member.investmentWise.totalValueMutualFund > 0 || member.investmentWise.totalInvestedMutualFund > 0) && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-800">Mutual Fund</span>
                          <span className="text-xs text-green-600">INR</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-green-600">Value</span>
                            <div className="font-semibold text-green-900">
                              {formatCurrencyWithSymbol(member.investmentWise.totalValueMutualFund, member.investmentWise.currencyMutualFund)}
                            </div>
                          </div>
                          <div>
                            <span className="text-green-600">Invested</span>
                            <div className="font-semibold text-green-900">
                              {formatCurrencyWithSymbol(member.investmentWise.totalInvestedMutualFund, member.investmentWise.currencyMutualFund)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stock Investments */}
                    {(member.investmentWise.totalValueStock > 0 || member.investmentWise.totalInvestedStock > 0) && (
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-purple-800">Stock</span>
                          <span className="text-xs text-purple-600">INR</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-purple-600">Value</span>
                            <div className="font-semibold text-purple-900">
                              {formatCurrencyWithSymbol(member.investmentWise.totalValueStock, member.investmentWise.currencyStock)}
                            </div>
                          </div>
                          <div>
                            <span className="text-purple-600">Invested</span>
                            <div className="font-semibold text-purple-900">
                              {formatCurrencyWithSymbol(member.investmentWise.totalInvestedStock, member.investmentWise.currencyStock)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'table' 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'chart' 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setViewMode('pie')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'pie' 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pie Chart
          </button>
        </div>
      </div>

      {/* Portfolio Visualization */}
      {viewMode === 'table' && (
        <DataTable
          data={portfolioData.investments || []}
          columns={columns}
          searchable={true}
          filterable={true}
          sortable={true}
          pagination={true}
          pageSize={10}
          emptyMessage="No investments found in this portfolio."
        />
      )}

      {viewMode !== 'table' && (
        <div className="card">
          {viewMode === 'chart' && (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="currentValue" fill="#0ea5e9" name="Current Value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {viewMode === 'pie' && (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Portfolio;
