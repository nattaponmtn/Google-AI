
import React from 'react';
import { LayoutDashboard, ClipboardList, PenTool, Settings, Building2, X, BookOpenCheck, Package, Wrench, Database, Loader2, RefreshCw, FileSpreadsheet } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isSyncing?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, onClose, isSyncing = false }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workorders', label: 'Work Orders', icon: ClipboardList },
    { id: 'form-analytics', label: 'Check Sheets', icon: FileSpreadsheet }, // New Item
    { id: 'assets', label: 'Asset Registry', icon: Building2 },
    { id: 'pm-plans', label: 'Maintenance Plans', icon: BookOpenCheck },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'tool-crib', label: 'Tool Crib', icon: Wrench },
    { id: 'database-manager', label: 'Database', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNav = (id: string) => {
    onNavigate(id);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-50 
        transform transition-transform duration-300 ease-in-out shadow-xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PenTool className="text-blue-500" />
              NexGen
            </h1>
            <p className="text-xs text-slate-400 mt-1">CMMS for Enterprise</p>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${currentPage === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-lg p-3 transition-colors">
            <div className="flex justify-between items-center mb-1">
                 <p className="text-xs text-slate-400">Database Status</p>
                 {isSyncing ? (
                    <Loader2 size={12} className="text-blue-400 animate-spin" />
                 ) : (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                 )}
            </div>
            
            {isSyncing ? (
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium animate-pulse">
                    <RefreshCw size={12} className="animate-spin" />
                    Syncing to Sheet...
                </div>
            ) : (
                <p className="text-xs text-right text-slate-500 mt-1">Live Sync Active</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
