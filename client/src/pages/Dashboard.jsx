import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Plus,
  BarChart3
} from 'lucide-react';
import { investmentsAPI, goalsAPI, householdsAPI } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';
import DashboardInvestmentRow from '../components/DashboardInvestmentRow';
import AnalyticsDashboard from '../components/charts/AnalyticsDashboard';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [goalsData, setGoalsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [household, setHousehold] = useState(null);
  const [allPortfolioData, setAllPortfolioData] = useState(null);
  
  const { formatCurrency } = useCurrency();
  const { convertInvestments, calculateInvestmentMetrics, convertPortfolioData } = useCurrencyConversion();

  useEffect(() => {
    fetchHouseholdData();
    fetchDashboardData();
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [portfolioResponse, goalsResponse] = await Promise.all([
        investmentsAPI.getPortfolioSummary(),
        goalsAPI.getGoalProgress()
      ]);
      
      console.log('Dashboard - Raw portfolio data:', portfolioResponse.data);
      console.log('Dashboard - Members in raw data:', portfolioResponse.data.members);
      
      // Convert portfolio data to selected currency
      // Temporarily disable client-side conversion to debug
      const convertedData = await convertPortfolioData(portfolioResponse.data);
      
      console.log('Dashboard - Converted portfolio data:', convertedData);
      console.log('Dashboard - Members in converted data:', convertedData.members);
      
      setAllPortfolioData(convertedData);
      setPortfolioData(convertedData);
      setGoalsData(goalsResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
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
      console.log('Debug Dashboard - selectedMemberId:', selectedMemberId);
      console.log('Debug Dashboard - allPortfolioData.members:', allPortfolioData.members);
      console.log('Debug Dashboard - member IDs:', allPortfolioData.members?.map(m => ({ memberId: m.memberId, memberIdString: m.memberId?.toString() })));
      const memberData = allPortfolioData.members?.find(member => String(member.memberId) === String(selectedMemberId));
      console.log('Debug Dashboard - found memberData:', memberData);
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


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Member Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {household?.name || 'Household'} Dashboard
            </h2>
            <p className="text-sm text-gray-600">Choose a member to view their portfolio summary</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Overview</h1>
          <p className="text-gray-600">
            {selectedMemberId 
              ? `${members.find(m => m._id === selectedMemberId)?.name}'s investment portfolio`
              : 'Household investment portfolio overview'
            }
          </p>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      {portfolioData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-primary-600" />
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
                {portfolioData.totalGainLoss >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-success-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-danger-600" />
                )}
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
                <BarChart3 className="h-8 w-8 text-primary-600" />
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

      {/* All Members Portfolio Overview */}
      {allPortfolioData && allPortfolioData.members && allPortfolioData.members.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">All Members Portfolio Overview</h3>
            <div className="text-sm text-gray-500">
              {allPortfolioData.members.length} member{allPortfolioData.members.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPortfolioData.members.map((member) => (
              <div key={member.memberId} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{member.memberName}</h4>
                  <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                    {member.investmentCount} investment{member.investmentCount !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Value</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(member.totalValue)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Invested</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(member.totalInvested)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gain/Loss</span>
                    <span className={`font-semibold ${
                      member.totalGainLoss >= 0 ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {formatCurrency(member.totalGainLoss)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Return</span>
                    <span className={`font-semibold ${
                      member.gainLossPercentage >= 0 ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {member.gainLossPercentage?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                </div>
                
                {/* Top 3 investments for this member */}
                {member.investments && member.investments.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <h5 className="text-xs font-medium text-gray-500 mb-2">Top Holdings</h5>
                    <div className="space-y-1">
                      {member.investments
                        .sort((a, b) => (b.totalValue || (b.quantity * b.currentPrice)) - (a.totalValue || (a.quantity * a.currentPrice)))
                        .slice(0, 3)
                        .map((investment) => (
                          <div key={investment._id} className="flex justify-between items-center text-xs">
                            <span className="text-gray-600 truncate flex-1 mr-2">
                              {investment.symbol || investment.name}
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(investment.totalValue || (investment.quantity * investment.currentPrice))}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
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
                          <span className="text-xs text-purple-600">GBP</span>
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

      {/* Analytics Dashboard */}
      {portfolioData && (
        <AnalyticsDashboard
          portfolioData={portfolioData}
          investments={portfolioData.investments || []}
          goals={goalsData}
        />
      )}

      {/* Goals Overview */}
      {goalsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Investment Goals</h3>
              <Link to="/goals" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Goals</span>
                <span className="text-lg font-semibold">{goalsData.totalGoals}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Achieved</span>
                <span className="text-lg font-semibold text-success-600">{goalsData.achievedGoals}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="text-lg font-semibold text-primary-600">{goalsData.inProgressGoals}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Link
                to="/investments"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Plus className="h-5 w-5 text-primary-600 mr-3" />
                <span className="text-sm font-medium">Add Investment</span>
              </Link>
              <Link
                to="/goals"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Target className="h-5 w-5 text-primary-600 mr-3" />
                <span className="text-sm font-medium">Set New Goal</span>
              </Link>
              <Link
                to="/portfolio"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <BarChart3 className="h-5 w-5 text-primary-600 mr-3" />
                <span className="text-sm font-medium">View Portfolio</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Investments */}
      {portfolioData && portfolioData.investments && portfolioData.investments.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Investments</h3>
            <Link to="/investments" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Current Value</th>
                  <th>Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.investments.slice(0, 5).map((investment) => (
                  <DashboardInvestmentRow
                    key={investment._id}
                    investment={investment}
                    formatPercentage={formatPercentage}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;