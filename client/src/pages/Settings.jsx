import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import HouseholdManagement from '../components/HouseholdManagement';

const Settings = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Household Settings</h1>
            <p className="text-gray-600">Manage your household members and their API keys</p>
          </div>
        </div>
      </div>

      {/* Household Management */}
      <HouseholdManagement />
    </div>
  );
};

export default Settings;