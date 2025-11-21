
import React from 'react';
import { Asset, WorkOrder, WorkOrderPart, InventoryPart, Status, Priority } from '../types';
import { ArrowLeft, Wrench, Calendar, CheckCircle2, AlertTriangle, TrendingUp, Clock, DollarSign, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AssetDetailsProps {
  asset: Asset;
  workOrders: WorkOrder[];
  partsUsed: WorkOrderPart[];
  partsInventory: InventoryPart[];
  onBack: () => void;
}

export const AssetDetails: React.FC<AssetDetailsProps> = ({ asset, workOrders, partsUsed, partsInventory, onBack }) => {
  // Filter data for this asset
  const history = workOrders.filter(wo => wo.assetId === asset.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const openCount = history.filter(wo => wo.status === Status.OPEN || wo.status === Status.IN_PROGRESS).length;
  const completedCount = history.filter(wo => wo.status === Status.COMPLETED).length;
  
  // Mock KPI Calculations
  const totalDowntimeHours = history.reduce((acc, wo) => acc + (wo.estimatedHours || 0), 0);
  const estimatedCost = history.length * 1500; // Mock labor cost
  
  // Prepare Chart Data (Work Orders by Month)
  const chartData = history.reduce((acc: any[], wo) => {
    const month = new Date(wo.createdAt).toLocaleString('default', { month: 'short' });
    const existing = acc.find(d => d.name === month);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: month, count: 1 });
    }
    return acc;
  }, []).reverse();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {asset.name}
            <span className={`text-xs px-2 py-1 rounded-full border uppercase ${
              asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'
            }`}>
              {asset.status}
            </span>
          </h2>
          <p className="text-slate-500 text-sm font-mono">{asset.assetTag} • {asset.model || 'Unknown Model'} • {asset.serialNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Image & Basic Stats */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-48 w-full bg-slate-100 relative">
               <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
               <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
                 <div className="flex gap-4 text-white">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-white/80" />
                        <span className="text-sm">Installed: {asset.purchaseDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Wrench size={16} className="text-white/80" />
                        <span className="text-sm">{asset.manufacturer}</span>
                    </div>
                 </div>
               </div>
            </div>
            
            {/* KPI Grid */}
            <div className="grid grid-cols-3 divide-x divide-slate-100">
                <div className="p-4 text-center">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Health Score</p>
                    <div className="flex items-center justify-center gap-1 text-emerald-600">
                        <CheckCircle2 size={20} />
                        <span className="text-2xl font-bold">94%</span>
                    </div>
                </div>
                <div className="p-4 text-center">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Downtime</p>
                    <div className="flex items-center justify-center gap-1 text-orange-600">
                        <Clock size={20} />
                        <span className="text-2xl font-bold">{totalDowntimeHours}h</span>
                    </div>
                </div>
                <div className="p-4 text-center">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Maint. Cost</p>
                    <div className="flex items-center justify-center gap-1 text-slate-700">
                        <DollarSign size={20} />
                        <span className="text-2xl font-bold">{estimatedCost.toLocaleString()}</span>
                    </div>
                </div>
            </div>
          </div>

          {/* Maintenance History Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
             <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                Work Order Frequency
             </h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px'}} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Work Order History List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Work Order History</h3>
                <span className="text-xs text-slate-500">{history.length} Records</span>
             </div>
             <div className="divide-y divide-slate-100">
                {history.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No work order history.</div>
                ) : (
                    history.map(wo => (
                        <div key={wo.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 items-start">
                            <div className={`mt-1 p-2 rounded-lg ${
                                wo.status === Status.COMPLETED ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                                <CheckCircle2 size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-slate-800 text-sm">{wo.title}</h4>
                                    <span className="text-xs text-slate-400">{wo.createdAt}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{wo.description}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">{wo.workType}</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">{wo.status}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
             </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
            {/* Critical Alerts */}
            {openCount > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-red-700 text-sm">Active Maintenance</h4>
                        <p className="text-xs text-red-600 mt-1">There are {openCount} open work orders requiring attention.</p>
                    </div>
                </div>
            )}

            {/* Spare Parts Used */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Package size={20} className="text-orange-500" />
                    Parts Consumed
                </h3>
                
                {/* Logic to find parts used for THIS asset across all its work orders (by ID or WO Number) */}
                {(() => {
                    const assetWoIds = history.map(h => h.id);
                    const assetWoNumbers = history.map(h => h.woNumber);
                    
                    const consumedParts = partsUsed.filter(p => 
                        assetWoIds.includes(p.workOrderId) || assetWoNumbers.includes(p.workOrderId)
                    );
                    
                    if (consumedParts.length === 0) return <p className="text-sm text-slate-400">No parts recorded.</p>;

                    return (
                        <div className="space-y-3">
                            {consumedParts.map((usage, idx) => {
                                const partInfo = partsInventory.find(p => p.id === usage.partId);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                        <span className="text-slate-700 truncate flex-1 mr-2">{partInfo?.name || usage.partId}</span>
                                        <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded shadow-sm">x{usage.quantityUsed}</span>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>

            {/* Documentation (Mock) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-4">Documentation</h3>
                <ul className="space-y-2 text-sm">
                    <li className="text-blue-600 hover:underline cursor-pointer">User Manual (PDF)</li>
                    <li className="text-blue-600 hover:underline cursor-pointer">Safety Guidelines</li>
                    <li className="text-blue-600 hover:underline cursor-pointer">Wiring Diagram v2.1</li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};
