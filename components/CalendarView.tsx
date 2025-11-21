
import React, { useState } from 'react';
import { WorkOrder, Priority, Status } from '../types';
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
      // Use scheduledDate if available, otherwise fall back to createdAt for display
      const targetDateStr = wo.scheduledDate || wo.createdAt;
      if (!targetDateStr) return false;
      
      const woDate = new Date(targetDateStr);
      return (
        woDate.getDate() === day &&
        woDate.getMonth() === currentDate.getMonth() &&
        woDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const priorityColors: { [key: string]: string } = {
    [Priority.LOW]: 'bg-blue-100 text-blue-800 border-blue-200',
    [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [Priority.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
    [Priority.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px] md:h-[calc(100vh-14rem)] animate-fade-in">
      {/* Calendar Header */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" size={20} />
            {monthName} {year}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white rounded-md text-slate-600 border border-transparent hover:border-slate-200 transition-all">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white rounded-md text-slate-600 border border-transparent hover:border-slate-200 transition-all">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - Scrollable on mobile */}
      <div className="flex-1 overflow-y-auto overflow-x-auto bg-slate-100">
        <div className="grid grid-cols-7 min-w-[600px] h-full auto-rows-fr gap-px border-b border-slate-200">
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
              <div key={day} className={`bg-white min-h-[100px] p-2 relative hover:bg-slate-50 transition-colors flex flex-col ${isToday ? 'bg-blue-50/30' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}`}>
                    {day}
                  </span>
                </div>
                
                <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                  {dayWos.map(wo => (
                    <button 
                      key={wo.id}
                      onClick={() => onSelectWorkOrder(wo.id)}
                      className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-medium truncate border flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all ${priorityColors[wo.priority as string] || 'bg-slate-100 text-slate-700'}`}
                      title={wo.title}
                    >
                       <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          wo.status === Status.COMPLETED ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                      <span className="truncate">{wo.woNumber}</span>
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
