import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Plus,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { investmentsAPI, goalsAPI, householdsAPI } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';
import DashboardInvestmentRow from '../components/DashboardInvestmentRow';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [goalsData, setGoalsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
      const convertedData = portfolioResponse.data; // await convertPortfolioData(portfolioResponse.data);
      
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

  const handleSyncInvestments = async (type) => {
    if (!selectedMemberId) {
      toast.error('Please select a member first');
      return;
    }

    try {
      setSyncing(true);
      if (type === 'trading212') {
        await investmentsAPI.syncTrading212(selectedMemberId);
        toast.success('Trading212 investments synced successfully');
      }
      fetchDashboardData();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync investments');
    } finally {
      setSyncing(false);
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
        <div className="flex space-x-3">
          <button
            onClick={() => handleSyncInvestments('trading212')}
            disabled={syncing}
            className="btn btn-outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Trading212
          </button>
          <button
            onClick={() => handleSyncInvestments('tickertape')}
            disabled={syncing}
            className="btn btn-outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Tickertape
          </button>
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
