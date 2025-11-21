
import React from 'react';
import { WorkOrder, Priority, Status, Asset, Company, WorkType } from '../types';
import { AlertCircle, Clock, MapPin, Wrench, Calendar } from 'lucide-react';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  asset?: Asset;
  company?: Company;
  onClick: () => void;
}

const priorityColors = {
  [Priority.LOW]: 'bg-blue-100 text-blue-800',
  [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [Priority.HIGH]: 'bg-orange-100 text-orange-800',
  [Priority.CRITICAL]: 'bg-red-100 text-red-800',
};

const statusColors: {[key: string]: string} = {
  [Status.OPEN]: 'bg-slate-100 text-slate-800 border-slate-200',
  [Status.IN_PROGRESS]: 'bg-blue-50 text-blue-700 border-blue-200',
  [Status.WAITING_PARTS]: 'bg-amber-50 text-amber-700 border-amber-200',
  [Status.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [Status.SCHEDULED]: 'bg-purple-50 text-purple-700 border-purple-200',
  [Status.PENDING]: 'bg-orange-50 text-orange-700 border-orange-200',
  [Status.MAINTENANCE]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const typeColors: {[key: string]: string} = {
  [WorkType.PM]: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
  [WorkType.CM]: 'text-blue-700 bg-blue-50 border border-blue-100',
  [WorkType.EMERGENCY]: 'text-red-700 bg-red-50 border border-red-100 font-bold',
  [WorkType.INSPECTION]: 'text-purple-700 bg-purple-50 border border-purple-100',
  [WorkType.CALIBRATION]: 'text-cyan-700 bg-cyan-50 border border-cyan-100',
};

export const WorkOrderCard: React.FC<WorkOrderCardProps> = ({ workOrder, asset, company, onClick }) => {
  const pColor = priorityColors[workOrder.priority as Priority] || 'bg-gray-100 text-gray-800';
  const sColor = statusColors[workOrder.status as Status] || 'bg-gray-50 text-gray-600 border-gray-200';
  const tColor = typeColors[workOrder.workType as string] || 'text-slate-600 bg-slate-50 border border-slate-200';

  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2">
             <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${tColor}`}>
                {workOrder.workType === WorkType.CM ? 'CM' : 
                 workOrder.workType === WorkType.PM ? 'PM' :
                 workOrder.workType}
            </span>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${pColor}`}>
            {workOrder.priority}
            </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-md border ${sColor}`}>
          {workOrder.status}
        </span>
      </div>
      
      <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 text-sm md:text-base line-clamp-1">
        {workOrder.title}
      </h3>
      <p className="text-xs md:text-sm text-slate-500 line-clamp-2 mb-4 flex-grow">{workOrder.description}</p>
      
      <div className="space-y-2 mt-auto">
        {company && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin size={14} />
                <span className="truncate">{company.name}</span>
            </div>
        )}
        {asset && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <Wrench size={14} />
                <span className="truncate font-medium">{asset.name}</span>
            </div>
        )}
        
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>Due: {workOrder.scheduledDate || 'Unscheduled'}</span>
            </div>
            <span className="flex-grow"></span>
            <div className="flex items-center gap-1">
                <span className="font-mono">{workOrder.woNumber}</span>
            </div>
        </div>
      </div>
    </div>
  );
};
