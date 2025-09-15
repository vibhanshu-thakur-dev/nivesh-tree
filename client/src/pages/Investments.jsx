import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Edit, 
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Database,
  Upload,
  FileText
} from 'lucide-react';
import { investmentsAPI, householdsAPI } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import AddInvestmentModal from '../components/AddInvestmentModal';
import EditInvestmentModal from '../components/EditInvestmentModal';
import InvestmentRow from '../components/InvestmentRow';

const Investments = () => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearType, setClearType] = useState('trading212'); // 'trading212', 'tickertape', 'all'
  const [trading212Summary, setTrading212Summary] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [allInvestments, setAllInvestments] = useState([]);
  
  const { formatCurrency } = useCurrency();
  const { convertInvestments, calculateInvestmentMetrics } = useCurrencyConversion();

  useEffect(() => {
    fetchMembers();
    fetchInvestments();
  }, []);

  useEffect(() => {
    filterInvestmentsByMember();
  }, [selectedMemberId, allInvestments]);

  const fetchMembers = async () => {
    try {
      const response = await householdsAPI.getMembers();
      setMembers(response.data.members);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load household members');
    }
  };

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response = await investmentsAPI.getInvestments();
      setAllInvestments(response.data.investments);
      setInvestments(response.data.investments);
    } catch (error) {
      console.error('Error fetching investments:', error);
      toast.error('Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  const filterInvestmentsByMember = () => {
    if (!allInvestments) return;

    if (!selectedMemberId) {
      // Show all household investments
      setInvestments(allInvestments);
    } else {
      // Show member-specific investments
      const memberInvestments = allInvestments.filter(investment => {
        // Handle both string and ObjectId formats
        const investmentMemberId = investment.memberId?._id || investment.memberId;
        return investmentMemberId === selectedMemberId;
      });
      setInvestments(memberInvestments);
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
        fetchInvestments();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync investments');
    } finally {
      setSyncing(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      toast.error('Please select a valid CSV file');
      setSelectedFile(null);
    }
  };

  const handleCSVUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    if (!selectedMemberId) {
      toast.error('Please select a member first');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('csvFile', selectedFile);

      const response = await investmentsAPI.importTickertapeCSV(formData, selectedMemberId);
      toast.success(response.data.message);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('csvFileInput');
      if (fileInput) fileInput.value = '';
      fetchInvestments();
    } catch (error) {
      console.error('CSV upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to import CSV file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteInvestment = async (id) => {
    if (window.confirm('Are you sure you want to delete this investment?')) {
      try {
        await investmentsAPI.deleteInvestment(id);
        toast.success('Investment deleted successfully');
        fetchInvestments();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete investment');
      }
    }
  };

  const handleAddInvestment = async (investmentData) => {
    try {
      await investmentsAPI.addInvestment(investmentData);
      toast.success('Investment added successfully');
      setShowAddModal(false);
      fetchInvestments();
    } catch (error) {
      console.error('Add investment error:', error);
      toast.error('Failed to add investment');
    }
  };

  const handleEditInvestment = async (id, investmentData) => {
    try {
      await investmentsAPI.updateInvestment(id, investmentData);
      toast.success('Investment updated successfully');
      setEditingInvestment(null);
      fetchInvestments();
    } catch (error) {
      console.error('Update investment error:', error);
      toast.error('Failed to update investment');
    }
  };

  const handleShowClearModal = async (type = 'trading212') => {
    try {
      setClearType(type);
      if (type === 'trading212') {
        const response = await investmentsAPI.getTrading212Summary();
        setTrading212Summary(response.data.summary);
      } else {
        setTrading212Summary(null);
      }
      setShowClearModal(true);
    } catch (error) {
      console.error('Error fetching data summary:', error);
      toast.error('Failed to load data summary');
    }
  };

  const handleClearData = async () => {
    try {
      setClearing(true);
      
      if (clearType === 'all') {
        await investmentsAPI.clearAllInvestmentData();
        toast.success('All investment data cleared successfully');
      } else {
        await investmentsAPI.clearPlatformData(clearType);
        toast.success(`${clearType} data cleared successfully`);
      }
      
      setShowClearModal(false);
      fetchInvestments();
    } catch (error) {
      console.error('Clear data error:', error);
      toast.error(`Failed to clear ${clearType} data`);
    } finally {
      setClearing(false);
    }
  };

  // Currency formatting is now handled by the currency context

  const formatPercentage = (percentage) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const filteredInvestments = investments.filter(investment => {
    const matchesSearch = investment.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || investment.investmentType === filterType;
    return matchesSearch && matchesFilter;
  });

  const investmentTypes = ['all', 'stock', 'mutual_fund', 'isa', 'etf'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Select Member</h2>
            <p className="text-sm text-gray-600">Choose a household member to view their investments</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Investments</h1>
          <p className="text-gray-600">
            {selectedMemberId 
              ? `Manage ${members.find(m => m._id === selectedMemberId)?.name}'s investment portfolio`
              : 'Manage your household investment portfolio'
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
          <div className="flex items-center space-x-2">
            <input
              id="csvFileInput"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="csvFileInput"
              className="btn btn-outline cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Select CSV File
            </label>
            {selectedFile && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Selected: {selectedFile.name}
                </span>
                <button
                  onClick={handleCSVUpload}
                  disabled={uploading}
                  className="btn btn-primary"
                >
                  {uploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Import CSV
                </button>
              </div>
            )}
          </div>
          <div className="relative group">
            <button
              onClick={() => handleShowClearModal('trading212')}
              className="btn btn-outline btn-danger"
            >
              <Database className="h-4 w-4 mr-2" />
              Clear Data
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => handleShowClearModal('trading212')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Clear Trading212 Data
                </button>
                <button
                  onClick={() => handleShowClearModal('tickertape')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Clear Tickertape Data
                </button>
                <button
                  onClick={() => handleShowClearModal('all')}
                  className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  Clear All Investment Data
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Investment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              {investmentTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Investments Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Avg Price</th>
                <th>Current Price</th>
                <th>Total Value</th>
                <th>Gain/Loss</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    {investments.length === 0 ? 'No investments found. Add your first investment!' : 'No investments match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredInvestments.map((investment) => (
                  <InvestmentRow
                    key={investment._id}
                    investment={investment}
                    onEdit={setEditingInvestment}
                    onDelete={handleDeleteInvestment}
                    formatPercentage={formatPercentage}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddInvestmentModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddInvestment}
          members={members}
        />
      )}

      {editingInvestment && (
        <EditInvestmentModal
          investment={editingInvestment}
          onClose={() => setEditingInvestment(null)}
          onUpdate={handleEditInvestment}
        />
      )}

      {/* Clear Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Clear {clearType === 'all' ? 'All Investment' : clearType.charAt(0).toUpperCase() + clearType.slice(1)} Data
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will permanently delete all your {clearType === 'all' ? 'investment' : clearType} synced data. This action cannot be undone.
              </p>
              
              {trading212Summary && clearType === 'trading212' && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Data to be deleted:</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>• {trading212Summary.orders} historical orders</div>
                    <div>• {trading212Summary.investments} investment positions</div>
                    <div>• {trading212Summary.accounts} Trading212 account(s)</div>
                    <div>• Total value: {formatCurrency(trading212Summary.totalValue)}</div>
                  </div>
                </div>
              )}
              
              {clearType === 'all' && (
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-900 mb-2">⚠️ Warning:</h4>
                  <div className="text-sm text-red-700">
                    This will delete ALL your investment data from all platforms (Trading212, Tickertape, and manual entries).
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500">
                You can re-sync your data anytime by clicking the sync buttons after clearing.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="btn btn-outline flex-1"
                disabled={clearing}
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={clearing}
                className="btn btn-danger flex-1"
              >
                {clearing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
