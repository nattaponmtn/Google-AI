
import React from 'react';
import { User, Shield, Bell, LogOut, Building2 } from 'lucide-react';

interface SettingsProps {
  currentUser: { name: string; role: string; avatar: string };
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser, onLogout }) => {
  
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Settings & Profile</h2>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center gap-6">
        <img src={currentUser.avatar} alt="Profile" className="w-20 h-20 rounded-full bg-slate-100 border-2 border-white shadow-md" />
        <div>
            <h3 className="text-xl font-bold text-slate-800">{currentUser.name}</h3>
            <p className="text-slate-500 flex items-center gap-1">
                <Shield size={14} className="text-blue-500" />
                {currentUser.role}
            </p>
        </div>
      </div>

      {/* App Preferences */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-slate-600" />
            Application Preferences
        </h3>
        
        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
                <Bell size={20} className="text-slate-500" />
                <div>
                    <p className="text-sm font-medium text-slate-800">Push Notifications</p>
                    <p className="text-xs text-slate-500">Receive alerts for critical WOs</p>
                </div>
            </div>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
        </div>

        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
                <Shield size={20} className="text-slate-500" />
                <div>
                    <p className="text-sm font-medium text-slate-800">Data Sync</p>
                    <p className="text-xs text-slate-500">Sync with Google Sheets every 5 mins</p>
                </div>
            </div>
            <button className="text-xs font-bold text-blue-600 hover:underline">Sync Now</button>
        </div>
      </div>
        
      <div className="pt-4">
        <button 
            onClick={onLogout}
            className="w-full py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-medium flex items-center justify-center gap-2"
        >
            <LogOut size={18} />
            Log Out
        </button>
      </div>

    </div>
  );
};
