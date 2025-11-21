
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WorkOrder, Status, Priority } from '../types';
import { ClipboardList, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

interface DashboardProps {
  workOrders: WorkOrder[];
}

export const Dashboard: React.FC<DashboardProps> = ({ workOrders }) => {
  const openCount = workOrders.filter(w => w.status === Status.OPEN).length;
  const criticalCount = workOrders.filter(w => w.priority === Priority.CRITICAL).length;
  const completedCount = workOrders.filter(w => w.status === Status.COMPLETED).length;
  const totalCount = workOrders.length;
  const efficiency = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const data = [
    { name: 'Open', value: openCount, color: '#3b82f6' },
    { name: 'Waiting', value: workOrders.filter(w => w.status === Status.WAITING_PARTS).length, color: '#f59e0b' },
    { name: 'In Prog', value: workOrders.filter(w => w.status === Status.IN_PROGRESS).length, color: '#6366f1' },
    { name: 'Done', value: completedCount, color: '#10b981' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <div>
             <h2 className="text-2xl font-bold text-slate-800">Maintenance Overview</h2>
             <p className="text-sm text-slate-500">Showing data for selected sites</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Open</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{openCount}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <ClipboardList size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Critical Issues</p>
              <h3 className="text-3xl font-bold text-red-600 mt-1">{criticalCount}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-1">{completedCount}</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Efficiency</p>
              <h3 className="text-3xl font-bold text-purple-600 mt-1">{efficiency}%</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Activity size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Work Order Status</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: '#f1f5f9'}}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Alerts</h3>
          <div className="space-y-4">
            {workOrders.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No recent alerts</p>
            ) : (
                workOrders.slice(0, 4).map((wo) => (
                <div key={wo.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className={`w-2 h-12 rounded-full flex-shrink-0 ${wo.priority === Priority.CRITICAL ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate">{wo.title}</h4>
                    <p className="text-xs text-slate-500 flex justify-between mt-1">
                        <span>{wo.createdAt}</span>
                        <span>{wo.site || 'HQ'}</span>
                    </p>
                    </div>
                    <span className="text-xs font-medium text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 whitespace-nowrap">
                    {wo.status}
                    </span>
                </div>
                ))
            )}
            {workOrders.length > 4 && (
                <button className="w-full py-2 text-sm text-blue-600 font-medium hover:text-blue-700">
                View All Alerts
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
