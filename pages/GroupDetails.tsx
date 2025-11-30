import React, { useState, useMemo } from 'react';
import { Asset, WorkOrder, WorkOrderPart, InventoryPart, Status, Priority, Company, Location, System, EquipmentType, PMTemplate, WorkType } from '../types';
import { ArrowLeft, Building2, MapPin, Settings, Tag, TrendingUp, AlertTriangle, CheckCircle2, DollarSign, Package, PieChart as PieIcon, BarChart3, LayoutDashboard, History, Calendar, List, Clock, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

interface GroupDetailsProps {
  groupType: 'company' | 'location' | 'system' | 'equipmentType';
  groupId: string;
  data: {
    companies: Company[];
    locations: Location[];
    systems: System[];
    equipmentTypes: EquipmentType[];
    assets: Asset[];
    workOrders: WorkOrder[];
    partsUsed: WorkOrderPart[];
    inventoryParts: InventoryPart[];
    pmTemplates: PMTemplate[];
  };
  onBack: () => void;
  onSelectAsset: (assetId: string) => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b'];
const PRIORITY_COLORS = {
    [Priority.LOW]: '#3b82f6',
    [Priority.MEDIUM]: '#f59e0b',
    [Priority.HIGH]: '#f97316',
    [Priority.CRITICAL]: '#ef4444'
};

export const GroupDetails: React.FC<GroupDetailsProps> = ({ groupType, groupId, data, onBack, onSelectAsset }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'pm' | 'inventory'>('overview');

  // 1. Resolve Group Info
  const groupInfo = useMemo(() => {
    switch (groupType) {
      case 'company': return { name: data.companies.find(c => c.id === groupId)?.name || groupId, icon: Building2, label: 'Company' };
      case 'location': return { name: data.locations.find(l => l.id === groupId)?.name || groupId, icon: MapPin, label: 'Location' };
      case 'system': return { name: data.systems.find(s => s.id === groupId)?.name || groupId, icon: Settings, label: 'System' };
      case 'equipmentType': return { name: data.equipmentTypes.find(e => e.id === groupId)?.name || groupId, icon: Tag, label: 'Equipment Type' };
      default: return { name: 'Unknown', icon: Building2, label: 'Group' };
    }
  }, [groupType, groupId, data]);

  // 2. Filter Assets in this Group
  const groupAssets = useMemo(() => {
    return data.assets.filter(a => {
      if (groupType === 'company') return a.companyId === groupId;
      if (groupType === 'location') return a.locationId === groupId;
      if (groupType === 'system') return a.systemId === groupId;
      if (groupType === 'equipmentType') return a.equipmentTypeId === groupId;
      return false;
    });
  }, [data.assets, groupType, groupId]);

  // 3. Filter Work Orders for these Assets OR directly matching the group if possible
  const groupWOs = useMemo(() => {
    const assetIds = groupAssets.map(a => a.id);
    return data.workOrders.filter(wo => {
        // Direct match if available on WO
        if (groupType === 'equipmentType' && wo.equipmentTypeId === groupId) return true;
        if (groupType === 'system' && wo.systemId === groupId) return true;
        // Fallback to asset inclusion
        return assetIds.includes(wo.assetId);
    }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data.workOrders, groupAssets, groupType, groupId]);

  // 4. Filter PM Templates
  const groupPMs = useMemo(() => {
      return data.pmTemplates.filter(pm => {
          if (groupType === 'equipmentType') return pm.equipmentTypeId === groupId;
          if (groupType === 'system') return pm.systemId === groupId;
          // PM templates usually don't have locationId directly, so we might skip for location view or infer via assets
          return false;
      });
  }, [data.pmTemplates, groupType, groupId]);

  // 5. Calculate KPIs
  const kpis = useMemo(() => {
    const totalAssets = groupAssets.length;
    const activeAssets = groupAssets.filter(a => a.status === 'Active').length;
    const healthScore = totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0;
    
    const openWOs = groupWOs.filter(wo => wo.status === Status.OPEN || wo.status === Status.IN_PROGRESS).length;
    
    // Calculate Costs
    let totalLaborCost = 0;
    let totalPartsCost = 0;

    groupWOs.forEach(wo => {
        // Labor: 500 THB/hr (Mock Rate)
        totalLaborCost += (wo.estimatedHours || 0) * 500;

        // Parts
        const partsForWo = data.partsUsed.filter(p => p.workOrderId === wo.id);
        partsForWo.forEach(p => {
            const partInfo = data.inventoryParts.find(ip => ip.id === p.partId);
            if (partInfo) {
                totalPartsCost += (p.quantityUsed * partInfo.unitPrice);
            }
        });
    });

    const totalCost = totalLaborCost + totalPartsCost;
    const totalDowntime = groupWOs.reduce((acc, wo) => acc + (wo.estimatedHours || 0), 0);

    return { totalAssets, healthScore, openWOs, totalCost, totalLaborCost, totalPartsCost, totalDowntime };
  }, [groupAssets, groupWOs, data.partsUsed, data.inventoryParts]);

  // 6. Charts Data Preparation
  const costTrendData = useMemo(() => {
      const months: Record<string, { labor: number, parts: number }> = {};
      
      // Sort WOs by date ascending for trend
      const sortedWOs = [...groupWOs].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      sortedWOs.forEach(wo => {
          const m = new Date(wo.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
          if (!months[m]) months[m] = { labor: 0, parts: 0 };
          
          months[m].labor += (wo.estimatedHours || 0) * 500;
          
          const partsForWo = data.partsUsed.filter(p => p.workOrderId === wo.id);
          partsForWo.forEach(p => {
            const partInfo = data.inventoryParts.find(ip => ip.id === p.partId);
            if (partInfo) {
                months[m].parts += (p.quantityUsed * partInfo.unitPrice);
            }
          });
      });

      return Object.entries(months).map(([name, cost]) => ({
          name,
          Labor: cost.labor,
          Parts: cost.parts,
          Total: cost.labor + cost.parts
      }));
  }, [groupWOs, data.partsUsed, data.inventoryParts]);

  const priorityDistribution = useMemo(() => {
      const counts = { [Priority.LOW]: 0, [Priority.MEDIUM]: 0, [Priority.HIGH]: 0, [Priority.CRITICAL]: 0 };
      groupWOs.forEach(wo => {
          const p = wo.priority as Priority;
          if (counts[p] !== undefined) counts[p]++;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [groupWOs]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={24} />
            </button>
            <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <groupInfo.icon size={14} />
                <span className="uppercase font-bold tracking-wider">{groupInfo.label} Dashboard</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{groupInfo.name}</h2>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto self-start md:self-auto w-full md:w-auto">
             {[
                 { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                 { id: 'history', label: 'History', icon: History },
                 { id: 'pm', label: 'PM Plans', icon: Calendar },
                 { id: 'inventory', label: 'Inventory', icon: List }
             ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap flex-1 md:flex-none justify-center
                        ${activeTab === tab.id 
                            ? 'bg-white text-blue-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                        }`}
                 >
                     <tab.icon size={16} />
                     {tab.label}
                 </button>
             ))}
          </div>
      </div>

      {/* TABS CONTENT */}
      {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-2">Total Assets</p>
                    <div className="flex items-end justify-between relative z-10">
                        <h3 className="text-3xl font-bold text-slate-800">{kpis.totalAssets}</h3>
                        <Package className="text-blue-500 opacity-20" size={32} />
                    </div>
                    <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-50 rounded-tl-full opacity-50" />
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-2">Health Score</p>
                    <div className="flex items-end justify-between relative z-10">
                        <h3 className={`text-3xl font-bold ${kpis.healthScore > 80 ? 'text-emerald-600' : 'text-orange-500'}`}>{kpis.healthScore}%</h3>
                        <TrendingUp className="text-emerald-500 opacity-20" size={32} />
                    </div>
                    <div className={`absolute right-0 bottom-0 w-16 h-16 rounded-tl-full opacity-20 ${kpis.healthScore > 80 ? 'bg-emerald-100' : 'bg-orange-100'}`} />
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-2">Total Cost (YTD)</p>
                    <div className="flex items-end justify-between relative z-10">
                        <h3 className="text-3xl font-bold text-slate-800">฿{(kpis.totalCost/1000).toFixed(1)}k</h3>
                        <DollarSign className="text-slate-500 opacity-20" size={32} />
                    </div>
                    <div className="absolute right-0 bottom-0 w-16 h-16 bg-slate-100 rounded-tl-full opacity-50" />
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-2">Open Issues</p>
                    <div className="flex items-end justify-between relative z-10">
                        <h3 className="text-3xl font-bold text-red-600">{kpis.openWOs}</h3>
                        <AlertTriangle className="text-red-500 opacity-20" size={32} />
                    </div>
                    <div className="absolute right-0 bottom-0 w-16 h-16 bg-red-50 rounded-tl-full opacity-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Cost Chart */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <BarChart3 size={20} className="text-blue-600" />
                          Maintenance Cost Trend
                      </h3>
                      <div className="h-72">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costTrendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="Labor" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} barSize={40} />
                                <Bar dataKey="Parts" stackId="a" fill="#f59e0b" radius={[4,4,0,0]} barSize={40} />
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <PieIcon size={20} className="text-emerald-600" />
                          Work Order Priorities
                      </h3>
                      <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Pie
                                data={priorityDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {priorityDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as Priority]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                            <span className="text-3xl font-bold text-slate-700">{groupWOs.length}</span>
                            <span className="text-xs text-slate-500 uppercase font-medium">Total Jobs</span>
                        </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
             <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <History size={18} /> Maintenance History
                 </h3>
                 <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                     {groupWOs.length} Records
                 </span>
             </div>
             
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                         <tr>
                             <th className="px-6 py-3">Date</th>
                             <th className="px-6 py-3">WO Number</th>
                             <th className="px-6 py-3">Title</th>
                             <th className="px-6 py-3">Asset</th>
                             <th className="px-6 py-3 text-center">Type</th>
                             <th className="px-6 py-3 text-center">Status</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                         {groupWOs.map(wo => (
                             <tr key={wo.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono text-xs">{wo.createdAt.split('T')[0]}</td>
                                 <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">{wo.woNumber}</td>
                                 <td className="px-6 py-4 font-medium text-slate-800">{wo.title}</td>
                                 <td className="px-6 py-4 text-slate-600">{wo.assetName}</td>
                                 <td className="px-6 py-4 text-center">
                                     <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${
                                         wo.workType === WorkType.PM ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                     }`}>
                                         {wo.workType}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                     <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                        wo.status === Status.COMPLETED ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                        wo.status === Status.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                        'bg-slate-100 text-slate-700 border-slate-200'
                                     }`}>
                                        {wo.status}
                                     </span>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
                 {groupWOs.length === 0 && <div className="p-8 text-center text-slate-400">No work orders found.</div>}
             </div>
          </div>
      )}

      {activeTab === 'pm' && (
          <div className="space-y-4 animate-fade-in">
              {groupPMs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                      <p>No PM Plans linked specifically to this group.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupPMs.map(pm => (
                          <div key={pm.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                      <Calendar size={20} />
                                  </div>
                                  <span className="text-xs font-mono text-slate-400">{pm.id}</span>
                              </div>
                              <h4 className="font-bold text-slate-800 mb-1">{pm.name}</h4>
                              <p className="text-xs text-slate-500 mb-4 line-clamp-2">{pm.remarks}</p>
                              <div className="flex items-center gap-4 text-xs font-medium text-slate-600 border-t border-slate-100 pt-3">
                                  <span className="flex items-center gap-1"><Clock size={14}/> {pm.frequencyValue} {pm.frequencyType}</span>
                                  <span className="flex items-center gap-1"><Clock size={14}/> {pm.estimatedMinutes} min</span>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <List size={18} /> Asset Inventory
                 </h3>
                 <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                     {groupAssets.length} Items
                 </span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-500 border-b border-slate-100">
                    <tr>
                    <th className="px-6 py-3 font-medium">Asset Name</th>
                    <th className="px-6 py-3 font-medium">Tag</th>
                    <th className="px-6 py-3 font-medium">Location</th>
                    <th className="px-6 py-3 font-medium text-center">Status</th>
                    <th className="px-6 py-3 font-medium text-center">Condition</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {groupAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800">{asset.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-500 text-xs">{asset.assetTag}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs">{data.locations.find(l => l.id === asset.locationId)?.name || asset.locationId}</td>
                        <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {asset.status}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${asset.condition === 'Good' ? 'bg-emerald-500' : asset.condition === 'Fair' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            <span>{asset.condition}</span>
                        </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                        <button 
                            onClick={() => onSelectAsset(asset.id)}
                            className="text-blue-600 hover:underline text-xs font-bold"
                        >
                            View Details
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
             </div>
          </div>
      )}

    </div>
  );
};