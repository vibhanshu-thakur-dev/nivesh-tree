import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  Key,
  UserPlus,
  Building
} from 'lucide-react';
import { householdsAPI, memberApiKeysAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const HouseholdManagement = () => {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    fetchHouseholdData();
  }, []);

  const fetchHouseholdData = async () => {
    try {
      setLoading(true);
      const [householdResponse, membersResponse] = await Promise.all([
        householdsAPI.getHousehold(),
        householdsAPI.getMembers()
      ]);
      
      setHousehold(householdResponse.data.household);
      setMembers(membersResponse.data.members);
    } catch (error) {
      console.error('Error fetching household data:', error);
      toast.error('Failed to load household data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (memberData) => {
    try {
      await householdsAPI.addMember(memberData);
      toast.success('Member added successfully');
      setShowAddMemberModal(false);
      fetchHouseholdData();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleUpdateMember = async (memberId, memberData) => {
    try {
      await householdsAPI.updateMember(memberId, memberData);
      toast.success('Member updated successfully');
      setShowEditMemberModal(false);
      setEditingMember(null);
      fetchHouseholdData();
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await householdsAPI.deleteMember(memberId);
        toast.success('Member removed successfully');
        fetchHouseholdData();
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error('Failed to remove member');
      }
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setShowEditMemberModal(true);
  };

  const handleManageApiKeys = (member) => {
    setSelectedMember(member);
    setShowApiKeysModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Household Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{household?.name}</h1>
              <p className="text-gray-600">{household?.description}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Household Members ({members.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {members.map((member) => (
            <div key={member._id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-500">{member.email}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {member.role}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleManageApiKeys(member)}
                  className="btn btn-outline btn-sm flex items-center space-x-1"
                  title="Manage API Keys"
                >
                  <Key className="h-4 w-4" />
                  <span>API Keys</span>
                </button>
                
                <button
                  onClick={() => handleEditMember(member)}
                  className="btn btn-outline btn-sm flex items-center space-x-1"
                  title="Edit Member"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                
                {member.role !== 'admin' && (
                  <button
                    onClick={() => handleDeleteMember(member._id)}
                    className="btn btn-outline btn-danger btn-sm flex items-center space-x-1"
                    title="Remove Member"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {members.length === 0 && (
            <div className="px-6 py-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No members yet</h3>
              <p className="text-gray-500 mb-4">Add members to your household to start managing their investments.</p>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Member
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <AddMemberModal
          onClose={() => setShowAddMemberModal(false)}
          onAdd={handleAddMember}
        />
      )}

      {/* Edit Member Modal */}
      {showEditMemberModal && editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => {
            setShowEditMemberModal(false);
            setEditingMember(null);
          }}
          onUpdate={handleUpdateMember}
        />
      )}

      {/* API Keys Modal */}
      {showApiKeysModal && selectedMember && (
        <MemberApiKeysModal
          member={selectedMember}
          onClose={() => {
            setShowApiKeysModal(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
};

// Add Member Modal Component
const AddMemberModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAdd(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add New Member</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              required
              className="input w-full"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="input w-full"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              className="input w-full"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
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
              {loading ? <LoadingSpinner size="sm" /> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Member Modal Component
const EditMemberModal = ({ member, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: member.name,
    email: member.email,
    role: member.role
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate(member._id, formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Member</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              required
              className="input w-full"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="input w-full"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              className="input w-full"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
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
              {loading ? <LoadingSpinner size="sm" /> : 'Update Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Member API Keys Modal Component
const MemberApiKeysModal = ({ member, onClose }) => {
  const [apiKeys, setApiKeys] = useState({ trading212: '', tickertape: '' });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, [member._id]);

  const fetchApiKeys = async () => {
    try {
      const response = await memberApiKeysAPI.getMemberApiKeys(member._id);
      setApiKeys(response.data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const handleSaveApiKeys = async () => {
    setLoading(true);
    try {
      await memberApiKeysAPI.updateMemberApiKeys(member._id, apiKeys);
      toast.success('API keys updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating API keys:', error);
      toast.error('Failed to update API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleTestTrading212 = async () => {
    if (!apiKeys.trading212) {
      toast.error('Please enter a Trading212 API key first');
      return;
    }

    setTesting(true);
    try {
      await memberApiKeysAPI.testMemberTrading212Key(member._id, apiKeys.trading212);
      toast.success('Trading212 API key is valid');
    } catch (error) {
      console.error('Error testing API key:', error);
      toast.error('Invalid Trading212 API key');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">API Keys for {member.name}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trading212 API Key
            </label>
            <div className="flex space-x-2">
              <input
                type="password"
                className="input flex-1"
                value={apiKeys.trading212}
                onChange={(e) => setApiKeys({ ...apiKeys, trading212: e.target.value })}
                placeholder="Enter Trading212 API key"
              />
              <button
                type="button"
                onClick={handleTestTrading212}
                className="btn btn-outline"
                disabled={testing || !apiKeys.trading212}
              >
                {testing ? <LoadingSpinner size="sm" /> : 'Test'}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tickertape API Key
            </label>
            <input
              type="password"
              className="input w-full"
              value={apiKeys.tickertape}
              onChange={(e) => setApiKeys({ ...apiKeys, tickertape: e.target.value })}
              placeholder="Enter Tickertape API key"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveApiKeys}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Save API Keys'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HouseholdManagement;
