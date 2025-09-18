import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3, 
  Activity,
  Target,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import PortfolioChart from './PortfolioChart';

const AnalyticsDashboard = ({ 
  portfolioData = {}, 
  investments = [], 
  goals = [],
  className = "" 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDetails, setShowDetails] = useState(true);
  const [animatedValues, setAnimatedValues] = useState({});

  // Generate sample data for demonstration
  const generateSampleData = (type, count = 12) => {
    const data = [];
    const now = new Date();
    
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      
      switch (type) {
        case 'performance':
          data.push({
            name: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            value: Math.random() * 10000 + 50000,
            invested: Math.random() * 8000 + 45000,
            gain: Math.random() * 2000 + 5000
          });
          break;
        case 'allocation':
          data.push({
            name: ['Stocks', 'Bonds', 'ETFs', 'Crypto', 'Real Estate'][i % 5],
            value: Math.random() * 30 + 10,
            color: ['#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'][i % 5]
          });
          break;
        case 'monthly':
          data.push({
            name: date.toLocaleDateString('en-US', { month: 'short' }),
            value: Math.random() * 5000 + 2000,
            target: 3000
          });
          break;
        default:
          data.push({
            name: date.toLocaleDateString('en-US', { month: 'short' }),
            value: Math.random() * 1000 + 500
          });
      }
    }
    return data;
  };

  const performanceData = generateSampleData('performance');
  const allocationData = generateSampleData('allocation', 5);
  const monthlyData = generateSampleData('monthly');

  // Animate numbers
  useEffect(() => {
    const animateValue = (key, targetValue, duration = 2000) => {
      const startValue = 0;
      const increment = targetValue / (duration / 16);
      let currentValue = startValue;
      
      const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
          currentValue = targetValue;
          clearInterval(timer);
        }
        setAnimatedValues(prev => ({ ...prev, [key]: currentValue }));
      }, 16);
    };

    if (portfolioData.totalValue) {
      animateValue('totalValue', portfolioData.totalValue);
      animateValue('totalInvested', portfolioData.totalInvested);
      animateValue('totalGainLoss', portfolioData.totalGainLoss);
    }
  }, [portfolioData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'allocation', label: 'Allocation', icon: PieChart },
    { id: 'goals', label: 'Goals', icon: Target }
  ];

  const metrics = [
    {
      label: 'Total Value',
      value: animatedValues.totalValue || portfolioData.totalValue || 0,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-success-600'
    },
    {
      label: 'Total Invested',
      value: animatedValues.totalInvested || portfolioData.totalInvested || 0,
      change: '+8.2%',
      trend: 'up',
      icon: Target,
      color: 'text-primary-600'
    },
    {
      label: 'Gain/Loss',
      value: animatedValues.totalGainLoss || portfolioData.totalGainLoss || 0,
      change: formatPercentage(portfolioData.gainLossPercentage || 0),
      trend: (portfolioData.gainLossPercentage || 0) >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: (portfolioData.gainLossPercentage || 0) >= 0 ? 'text-success-600' : 'text-danger-600'
    },
    {
      label: 'Investment Count',
      value: investments.length || 0,
      change: '+3',
      trend: 'up',
      icon: BarChart3,
      color: 'text-accent-600'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights into your portfolio performance</p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn btn-ghost"
        >
          {showDetails ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="card group hover:shadow-large transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-r from-primary-100 to-purple-100 group-hover:scale-110 transition-transform duration-300`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div className="flex items-center space-x-1">
                {metric.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-success-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-danger-600" />
                )}
                <span className={`text-sm font-semibold ${metric.trend === 'up' ? 'text-success-600' : 'text-danger-600'}`}>
                  {metric.change}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {metric.label === 'Investment Count' ? 
                  Math.round(metric.value) : 
                  formatCurrency(metric.value)
                }
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-primary-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PortfolioChart
                data={performanceData}
                type="area"
                height={300}
                showAnimation={true}
              />
              <PortfolioChart
                data={allocationData}
                type="pie"
                height={300}
                showAnimation={true}
              />
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <PortfolioChart
                data={performanceData}
                type="line"
                height={400}
                showAnimation={true}
              />
              {showDetails && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Best Performer</h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-success-600" />
                      </div>
                      <div>
                        <p className="font-semibold">AAPL</p>
                        <p className="text-success-600 font-bold">+24.5%</p>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Worst Performer</h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center">
                        <TrendingDown className="h-6 w-6 text-danger-600" />
                      </div>
                      <div>
                        <p className="font-semibold">TSLA</p>
                        <p className="text-danger-600 font-bold">-12.3%</p>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Volatility</h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
                        <Activity className="h-6 w-6 text-warning-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Medium</p>
                        <p className="text-warning-600 font-bold">15.2%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'allocation' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PortfolioChart
                data={allocationData}
                type="pie"
                height={400}
                showAnimation={true}
              />
              <div className="space-y-4">
                {allocationData.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{item.value.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">{formatCurrency(item.value * 1000)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-6">
              <PortfolioChart
                data={monthlyData}
                type="bar"
                height={300}
                showAnimation={true}
              />
              {showDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Goal Progress</h3>
                    <div className="space-y-4">
                      {goals.slice(0, 3).map((goal, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{goal.name}</span>
                            <span className="text-sm text-gray-600">{goal.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${goal.progress}%` }}
                              transition={{ duration: 1, delay: index * 0.2 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Monthly Targets</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
                        <span className="font-medium">Investment Target</span>
                        <span className="text-success-600 font-bold">$3,000</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
                        <span className="font-medium">Savings Rate</span>
                        <span className="text-primary-600 font-bold">25%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-warning-50 rounded-lg">
                        <span className="font-medium">Risk Level</span>
                        <span className="text-warning-600 font-bold">Moderate</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default AnalyticsDashboard;

