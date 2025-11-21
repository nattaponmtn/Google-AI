
import React from 'react';
import { LayoutDashboard, ClipboardList, PenTool, Settings, Building2, X, BookOpenCheck, Package, Wrench, Database } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workorders', label: 'Work Orders', icon: ClipboardList },
    // Calendar removed as it is now a view inside Work Orders
    { id: 'assets', label: 'Asset Registry', icon: Building2 },
    { id: 'pm-plans', label: 'Maintenance Plans', icon: BookOpenCheck },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'tool-crib', label: 'Tool Crib', icon: Wrench },
    { id: 'database-manager', label: 'Database', icon: Database },
    // AI features removed for deployment/testing
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
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Storage Used</p>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-3/4"></div>
            </div>
            <p className="text-xs text-right text-slate-400 mt-1">Live Sync (Sheet)</p>
          </div>
        </div>
      </div>
    </>
  );
};
