
import React, { useState } from 'react';
import { Tool, ToolCheckout, Status, WorkOrder } from '../types';
import { Wrench, Search, User, Clock, CheckCircle2, AlertCircle, ArrowRightLeft, RotateCcw } from 'lucide-react';

interface ToolListProps {
  tools: Tool[];
  checkouts: ToolCheckout[];
  workOrders: WorkOrder[];
  onUpdateStatus?: (toolId: string, newStatus: string) => void;
}

export const ToolList: React.FC<ToolListProps> = ({ tools, checkouts, workOrders, onUpdateStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to get current checkout info
  const getActiveCheckout = (toolId: string) => {
    return checkouts.find(c => c.toolId === toolId && !c.checkedInAt);
  };

  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tool.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = (tool: Tool) => {
      if (!onUpdateStatus) return;
      
      if (tool.status === Status.AVAILABLE) {
          if (window.confirm(`Check out ${tool.name}?`)) {
              onUpdateStatus(tool.id, Status.CHECKED_OUT);
          }
      } else if (tool.status === Status.CHECKED_OUT) {
           if (window.confirm(`Return ${tool.name}?`)) {
              onUpdateStatus(tool.id, Status.AVAILABLE);
          }
      } else {
          // Maintenance
          if (window.confirm(`Mark ${tool.name} as fixed (Available)?`)) {
              onUpdateStatus(tool.id, Status.AVAILABLE);
          }
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tool Crib</h2>
          <p className="text-slate-500 text-sm">Track shared tools and equipment availability.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
             <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="Search tools..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
              </div>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-3 font-semibold">Tool Name</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                          <th className="px-6 py-3 font-semibold">Current User</th>
                          <th className="px-6 py-3 font-semibold">Work Order</th>
                          <th className="px-6 py-3 font-semibold text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredTools.map((tool) => {
                          const checkout = getActiveCheckout(tool.id);
                          const wo = checkout ? workOrders.find(w => w.id === checkout.workOrderId || w.woNumber === checkout.workOrderId) : null;
                          
                          let statusColor = 'bg-slate-100 text-slate-800';
                          if (tool.status === Status.AVAILABLE) statusColor = 'bg-emerald-100 text-emerald-800';
                          if (tool.status === Status.CHECKED_OUT) statusColor = 'bg-blue-100 text-blue-800';
                          if (tool.status === Status.MAINTENANCE) statusColor = 'bg-amber-100 text-amber-800';

                          return (
                            <tr key={tool.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                            <Wrench size={18} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800">{tool.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">{tool.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                        {tool.status === Status.AVAILABLE ? <CheckCircle2 size={12} /> : 
                                         tool.status === Status.CHECKED_OUT ? <User size={12} /> : <AlertCircle size={12} />}
                                        {tool.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {checkout ? (
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <User size={14} className="text-slate-400" />
                                            <span>{checkout.checkedOutByUserId}</span>
                                            <span className="text-xs text-slate-400 ml-1">
                                                ({new Date(checkout.checkedOutAt).toLocaleDateString()})
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {wo ? (
                                        <div className="text-blue-600 hover:underline cursor-pointer text-xs font-medium">
                                            {wo.woNumber}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {tool.status === Status.AVAILABLE && (
                                        <button onClick={() => handleToggleStatus(tool)} className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1 justify-end ml-auto">
                                            <ArrowRightLeft size={14} /> Check Out
                                        </button>
                                    )}
                                    {tool.status === Status.CHECKED_OUT && (
                                        <button onClick={() => handleToggleStatus(tool)} className="text-emerald-600 hover:text-emerald-800 font-medium text-xs flex items-center gap-1 justify-end ml-auto">
                                            <RotateCcw size={14} /> Return
                                        </button>
                                    )}
                                    {tool.status === Status.MAINTENANCE && (
                                        <button onClick={() => handleToggleStatus(tool)} className="text-slate-500 hover:text-slate-700 font-medium text-xs flex items-center gap-1 justify-end ml-auto">
                                            Resolve
                                        </button>
                                    )}
                                </td>
                            </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
