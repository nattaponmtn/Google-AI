
import React, { useState, useEffect } from 'react';
import { Tool, ToolCheckout, Status, WorkOrder } from '../types';
import { Search, CheckCircle2, AlertTriangle, XCircle, Wrench, User, LayoutList, LayoutGrid } from 'lucide-react';
import { updateToolStatus } from '../services/sheetService';

interface ToolListProps {
  tools: Tool[];
  checkouts: ToolCheckout[];
  workOrders: WorkOrder[];
}

type FilterTab = 'all' | 'good' | 'bad';

export const ToolList: React.FC<ToolListProps> = ({ tools }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [localTools, setLocalTools] = useState<Tool[]>(tools);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // Default to list for desktop preference

  useEffect(() => {
    setLocalTools(tools);
  }, [tools]);

  const handleAudit = async (tool: Tool, newStatus: string, newCondition: string) => {
    const updatedTool = { ...tool, status: newStatus, condition: newCondition };
    setLocalTools(prev => prev.map(t => t.id === tool.id ? updatedTool : t));

    try {
       await updateToolStatus(tool.id, newStatus, newCondition);
    } catch (error) {
       console.error("Audit failed", error);
       setLocalTools(prev => prev.map(t => t.id === tool.id ? tool : t));
       alert("บันทึกไม่สำเร็จ โปรดตรวจสอบอินเทอร์เน็ต");
    }
  };

  const filteredTools = localTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tool.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'good') {
        return tool.status === Status.AVAILABLE && tool.condition !== 'Poor' && tool.condition !== 'Missing';
    }
    if (activeTab === 'bad') {
        return tool.status === Status.MAINTENANCE || tool.status === Status.LOST || tool.condition === 'Poor' || tool.condition === 'Missing';
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">เช็คเครื่องมือ (Tool Audit)</h2>
          <p className="text-slate-500 text-sm">ตรวจสอบสถานะและสภาพเครื่องมือประจำวัน</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
         <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
             {/* Filter Tabs */}
             <div className="flex p-1 bg-slate-100 rounded-lg w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    ทั้งหมด
                </button>
                <button 
                    onClick={() => setActiveTab('good')}
                    className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'good' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-700'}`}
                >
                    ปกติ
                </button>
                <button 
                    onClick={() => setActiveTab('bad')}
                    className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'bad' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-red-700'}`}
                >
                    เสีย/หาย
                </button>
             </div>

             {/* Search */}
             <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="ค้นหาเครื่องมือ..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
             </div>
         </div>
      </div>

      {/* MOBILE VIEW: Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
          {filteredTools.map(tool => {
              let statusColor = 'text-slate-600 bg-slate-100';
              if (tool.status === Status.AVAILABLE) statusColor = 'text-emerald-700 bg-emerald-50';
              if (tool.status === Status.MAINTENANCE) statusColor = 'text-orange-700 bg-orange-50';
              if (tool.status === Status.LOST) statusColor = 'text-red-700 bg-red-50';
              if (tool.status === Status.CHECKED_OUT) statusColor = 'text-blue-700 bg-blue-50';

              return (
                  <div key={tool.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                      <div className="p-4 flex gap-4">
                          <img 
                            src={tool.imageUrl || `https://placehold.co/100x100?text=${tool.name}`} 
                            alt={tool.name} 
                            className="w-16 h-16 rounded-lg object-cover bg-slate-100"
                          />
                          <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-800 truncate">{tool.name}</h3>
                              <p className="text-xs text-slate-400 font-mono mb-2">{tool.id}</p>
                              <span className={`text-xs px-2 py-1 rounded font-bold ${statusColor}`}>
                                  {tool.status}
                              </span>
                          </div>
                      </div>
                      <div className="border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100">
                          <button onClick={() => handleAudit(tool, Status.AVAILABLE, 'Good')} className="py-3 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 flex justify-center">
                              <CheckCircle2 size={20} />
                          </button>
                          <button onClick={() => handleAudit(tool, Status.MAINTENANCE, 'Poor')} className="py-3 hover:bg-orange-50 text-slate-400 hover:text-orange-600 flex justify-center">
                              <Wrench size={20} />
                          </button>
                          <button onClick={() => handleAudit(tool, Status.LOST, 'Missing')} className="py-3 hover:bg-red-50 text-slate-400 hover:text-red-600 flex justify-center">
                              <XCircle size={20} />
                          </button>
                      </div>
                  </div>
              );
          })}
      </div>

      {/* DESKTOP VIEW: Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                      <th className="px-6 py-3 w-16">Image</th>
                      <th className="px-6 py-3">Tool Name / ID</th>
                      <th className="px-6 py-3 text-center">Current Status</th>
                      <th className="px-6 py-3 text-right">Quick Audit Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredTools.map(tool => {
                      return (
                          <tr key={tool.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-3">
                                  <img 
                                    src={tool.imageUrl || `https://placehold.co/600x400/f1f5f9/334155?text=${encodeURIComponent(tool.name)}`} 
                                    alt={tool.name} 
                                    className="w-10 h-10 rounded object-cover bg-slate-100 border border-slate-200"
                                  />
                              </td>
                              <td className="px-6 py-3">
                                  <div className="font-bold text-slate-800">{tool.name}</div>
                                  <div className="text-xs text-slate-500 font-mono">{tool.id}</div>
                              </td>
                              <td className="px-6 py-3 text-center">
                                  {tool.status === Status.AVAILABLE && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Available</span>}
                                  {tool.status === Status.MAINTENANCE && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Maintenance</span>}
                                  {tool.status === Status.LOST && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Lost/Missing</span>}
                                  {tool.status === Status.CHECKED_OUT && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Checked Out</span>}
                              </td>
                              <td className="px-6 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                      <button 
                                          onClick={() => handleAudit(tool, Status.AVAILABLE, 'Good')}
                                          className="p-1.5 rounded-md hover:bg-emerald-100 text-slate-400 hover:text-emerald-700 transition-colors"
                                          title="Mark Good"
                                      >
                                          <CheckCircle2 size={18} />
                                      </button>
                                      <button 
                                          onClick={() => handleAudit(tool, Status.MAINTENANCE, 'Poor')}
                                          className="p-1.5 rounded-md hover:bg-orange-100 text-slate-400 hover:text-orange-700 transition-colors"
                                          title="Mark for Repair"
                                      >
                                          <Wrench size={18} />
                                      </button>
                                      <button 
                                          onClick={() => handleAudit(tool, Status.LOST, 'Missing')}
                                          className="p-1.5 rounded-md hover:bg-red-100 text-slate-400 hover:text-red-700 transition-colors"
                                          title="Mark Lost"
                                      >
                                          <XCircle size={18} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
          {filteredTools.length === 0 && (
              <div className="p-12 text-center text-slate-400">No tools found matching your filters.</div>
          )}
      </div>
    </div>
  );
};
