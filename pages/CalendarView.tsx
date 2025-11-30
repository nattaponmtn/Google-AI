
import React, { useState, useMemo } from 'react';
import { WorkOrder, Priority, Status } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, AlertCircle, CheckCircle2, Filter } from 'lucide-react';

interface CalendarViewProps {
  workOrders: WorkOrder[];
  onSelectWorkOrder: (id: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ workOrders, onSelectWorkOrder }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // --- Calendar Logic ---
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  // --- Data Logic ---
  const monthData = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOffset = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < firstDayOffset; i++) {
      days.push(null);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    return days;
  }, [currentDate]);

  const getWorkOrdersForDate = (date: Date) => {
    return workOrders.filter(wo => {
      // Prioritize scheduledDate, fallback to createdAt
      const targetStr = wo.scheduledDate || wo.createdAt;
      if (!targetStr) return false;
      const woDate = new Date(targetStr);
      return isSameDay(woDate, date);
    });
  };

  const selectedDayTasks = useMemo(() => {
    return getWorkOrdersForDate(selectedDate).sort((a,b) => {
        // Sort by priority (Critical first) then status
        const pMap: Record<string, number> = { [Priority.CRITICAL]: 4, [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
        return (pMap[b.priority as string] || 0) - (pMap[a.priority as string] || 0);
    });
  }, [selectedDate, workOrders]);

  // --- UI Helpers ---
  const priorityColors: { [key: string]: string } = {
    [Priority.LOW]: 'bg-blue-100 text-blue-800 border-blue-200',
    [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [Priority.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
    [Priority.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-fade-in gap-4 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Maintenance Calendar</h2>
          <p className="text-slate-500 text-sm">ตารางงานและการนัดหมาย (Schedule)</p>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center gap-4 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm self-start md:self-auto w-full md:w-auto justify-between md:justify-start">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 font-bold text-slate-800 w-40 justify-center">
            <CalendarIcon size={18} className="text-blue-600" />
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main Content: Split View */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        
        {/* LEFT: Calendar Grid */}
        <div className="lg:w-7/12 xl:w-8/12 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
             {/* Days Header */}
             <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span className="hidden md:inline">{day}</span>
                    <span className="md:hidden">{day.charAt(0)}</span>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-100 gap-px border-b border-slate-200 overflow-y-auto">
                {monthData.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} className="bg-slate-50/30 min-h-[60px]" />;
                    
                    const dayTasks = getWorkOrdersForDate(date);
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());
                    const hasCritical = dayTasks.some(t => t.priority === Priority.CRITICAL);

                    return (
                        <div 
                            key={date.toISOString()} 
                            onClick={() => setSelectedDate(date)}
                            className={`
                                relative bg-white p-1 md:p-2 cursor-pointer transition-all hover:bg-blue-50/50 flex flex-col items-center md:items-start min-h-[60px] md:min-h-[100px]
                                ${isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/30 z-10' : ''}
                            `}
                        >
                            {/* Date Number */}
                            <span className={`
                                text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1
                                ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}
                                ${isSelected && !isToday ? 'bg-blue-100 text-blue-700' : ''}
                            `}>
                                {date.getDate()}
                            </span>

                            {/* Indicators (Mobile/Compact) */}
                            <div className="flex gap-1 md:hidden mt-1 flex-wrap justify-center">
                                {dayTasks.slice(0, 3).map((_, i) => (
                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${hasCritical ? 'bg-red-500' : 'bg-blue-500'}`} />
                                ))}
                                {dayTasks.length > 3 && <span className="text-[8px] text-slate-400">+</span>}
                            </div>

                            {/* Task Preview (Desktop) */}
                            <div className="hidden md:flex flex-col gap-1 w-full overflow-hidden">
                                {dayTasks.slice(0, 3).map(wo => (
                                    <div key={wo.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${priorityColors[wo.priority as string] || 'bg-slate-100 text-slate-600'}`}>
                                        {wo.woNumber}
                                    </div>
                                ))}
                                {dayTasks.length > 3 && (
                                    <span className="text-[10px] text-slate-400 pl-1">+{dayTasks.length - 3} more</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* RIGHT: Task List for Selected Date */}
        <div className="lg:w-5/12 xl:w-4/12 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-64 lg:h-auto">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    {selectedDate.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                    {selectedDayTasks.length} Tasks
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedDayTasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-8">
                        <CheckCircle2 size={48} className="mb-3 opacity-20" />
                        <p>No work orders scheduled for this day.</p>
                        <p className="text-xs mt-1">Select another date to view tasks.</p>
                    </div>
                ) : (
                    selectedDayTasks.map(wo => (
                        <div 
                            key={wo.id}
                            onClick={() => onSelectWorkOrder(wo.id)}
                            className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                    wo.workType === 'Preventive (PM)' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                    {wo.workType}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColors[wo.priority as string]}`}>
                                    {wo.priority}
                                </span>
                            </div>
                            
                            <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {wo.title}
                            </h4>
                            
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                                <div className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    <span className="truncate max-w-[100px]">{wo.assetName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${wo.status === Status.COMPLETED ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    <span>{wo.status}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
};
