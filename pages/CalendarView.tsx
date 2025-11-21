
import React, { useState } from 'react';
import { WorkOrder, Priority } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewProps {
  workOrders: WorkOrder[];
  onSelectWorkOrder: (id: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ workOrders, onSelectWorkOrder }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // Create calendar grid
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getWorkOrdersForDay = (day: number) => {
    return workOrders.filter(wo => {
      if (!wo.scheduledDate) return false;
      const woDate = new Date(wo.scheduledDate);
      return (
        woDate.getDate() === day &&
        woDate.getMonth() === currentDate.getMonth() &&
        woDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const priorityColors: { [key: string]: string } = {
    [Priority.LOW]: 'bg-blue-100 text-blue-800',
    [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
    [Priority.HIGH]: 'bg-orange-100 text-orange-800',
    [Priority.CRITICAL]: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Maintenance Schedule</h2>
          <p className="text-slate-500 text-sm">Monthly view of scheduled work orders</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-md text-slate-600">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 font-bold text-slate-800 w-32 justify-center">
            <CalendarIcon size={18} className="text-blue-600" />
            {monthName} {year}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-md text-slate-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-100 gap-px border-b border-slate-200">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="bg-slate-50/50" />;
            }
            const dayWos = getWorkOrdersForDay(day);
            const isToday = 
              day === new Date().getDate() && 
              currentDate.getMonth() === new Date().getMonth() && 
              currentDate.getFullYear() === new Date().getFullYear();

            return (
              <div key={day} className={`bg-white min-h-[120px] p-2 relative hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}`}>
                    {day}
                  </span>
                  {dayWos.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded-md">
                      {dayWos.length}
                    </span>
                  )}
                </div>
                
                <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                  {dayWos.map(wo => (
                    <button 
                      key={wo.id}
                      onClick={() => onSelectWorkOrder(wo.id)}
                      className={`w-full text-left px-2 py-1 rounded text-[10px] font-medium truncate border flex items-center gap-1 ${priorityColors[wo.priority as string] || 'bg-slate-100 text-slate-700'} border-transparent hover:brightness-95 transition-all`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        wo.status === 'Completed' ? 'bg-emerald-500' : 'bg-current'
                      }`} />
                      <span className="truncate">{wo.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
