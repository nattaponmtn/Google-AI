
import React from 'react';
import { LayoutDashboard, ClipboardList, Settings, Building2, X, BookOpenCheck, Package, Wrench, Database, Loader2, RefreshCw, FileSpreadsheet, Calendar, Sparkles, PenTool } from 'lucide-react';

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
    { id: 'smart-assistant', label: 'Smart Assistant', icon: Sparkles, isSpecial: true },
    { id: 'calendar', label: 'Calendar', icon: Calendar }, 
    { id: 'workorders', label: 'Work Orders', icon: ClipboardList },
    { id: 'form-analytics', label: 'Check Sheets', icon: FileSpreadsheet },
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
      {/* Mobile Overlay - High Z-Index to cover everything */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[60] md:hidden backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 h-full w-72 md:w-64 bg-slate-900 text-white z-[70] 
        transform transition-transform duration-300 ease-[cubic-bezier(0.25, 1, 0.5, 1)] shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:z-30
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
              <PenTool className="text-blue-500 fill-blue-500/20" />
              NexGen
            </h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">CMMS for Enterprise</p>
          </div>
          <button 
            onClick={onClose} 
            className="md:hidden p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
             const isSpecial = (item as any).isSpecial;
             return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                    ${currentPage === item.id 
                      ? (isSpecial ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-900/50' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-semibold')
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <item.icon 
                    size={20} 
                    className={`${currentPage === item.id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} ${isSpecial && currentPage !== item.id ? 'text-purple-400' : ''}`} 
                  />
                  <span className={`text-sm tracking-wide ${isSpecial ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                  {isSpecial && currentPage !== item.id && (
                     <span className="absolute right-2 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                  )}
                </button>
             );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
            <div className="flex justify-between items-center mb-2">
                 <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">System Status</p>
                 {isSyncing ? (
                    <Loader2 size={12} className="text-blue-400 animate-spin" />
                 ) : (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                 )}
            </div>
            
            {isSyncing ? (
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                    <RefreshCw size={12} className="animate-spin" />
                    Syncing...
                </div>
            ) : (
                <p className="text-xs text-slate-400 font-medium">● Live Connected</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
