
import React from 'react';
import { LayoutDashboard, ClipboardList, ScanLine, Sparkles, Menu } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onNavigate: (page: string) => void;
  onOpenMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onNavigate, onOpenMenu }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
    { id: 'workorders', icon: ClipboardList, label: 'Jobs' },
    { id: 'qr-scan', icon: ScanLine, label: 'Scan', isPrimary: true },
    { id: 'smart-assistant', icon: Sparkles, label: 'Ask AI' }, // Replaced Assets with AI
    // Changed from Settings to Menu to open full sidebar
    { id: 'menu', icon: Menu, label: 'Menu', isAction: true }, 
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 md:hidden z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          if (item.isPrimary) {
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center justify-center -mt-8 relative group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white hover:scale-105 transition-transform ring-4 ring-white">
                  <item.icon size={24} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1">{item.label}</span>
              </button>
            );
          }

          if (item.isAction) {
             return (
                <button
                  key={item.id}
                  onClick={onOpenMenu}
                  className="flex flex-col items-center justify-center p-2 min-w-[3.5rem] transition-colors text-slate-400 hover:text-slate-700"
                >
                  <item.icon size={20} />
                  <span className="text-[10px] font-medium mt-1">{item.label}</span>
                </button>
             );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center p-2 min-w-[3.5rem] transition-colors
                ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              <item.icon size={20} className={isActive ? 'fill-current/10' : ''} />
              <span className={`text-[10px] font-medium mt-1 ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
