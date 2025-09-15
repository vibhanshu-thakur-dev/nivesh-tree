import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  RefreshCw,
  Download
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
import PortfolioInvestmentRow from '../components/PortfolioInvestmentRow';
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
      const convertedData = rawData; // await convertPortfolioData(rawData);
      
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
      <div className="card">
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Current Value</th>
                  <th>Gain/Loss</th>
                  <th>Return %</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.investments.map((investment, index) => (
                  <PortfolioInvestmentRow
                    key={investment._id || index}
                    investment={investment}
                    formatPercentage={formatPercentage}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );
};

export default Portfolio;
