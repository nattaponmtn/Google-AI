
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line 
} from 'recharts';
import { WorkOrder, Status, Priority, WorkType, Asset, InventoryPart, Company, System, WorkOrderTask } from '../types';
import { 
  ClipboardList, AlertTriangle, CheckCircle2, Activity, TrendingUp, 
  Wrench, Package, DollarSign, ArrowDownRight, Users, Filter, Calendar as CalendarIcon, PieChart as PieIcon, BarChart2
} from 'lucide-react';

interface DashboardProps {
  workOrders: WorkOrder[];
  assets: Asset[];
  inventoryParts: InventoryPart[];
  companies: Company[];
  systems: System[];
  tasks: WorkOrderTask[];
}

type TabType = 'overview' | 'pm' | 'cm';

export const Dashboard: React.FC<DashboardProps> = ({ workOrders, assets, inventoryParts, companies, systems, tasks }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  
  // --- Data Filtering Logic ---
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const matchCompany = selectedCompany === 'All' || wo.companyId === selectedCompany;
      return matchCompany;
    });
  }, [workOrders, selectedCompany]);

  // --- KPI Helpers ---
  const kpis = useMemo(() => {
    const total = filteredWorkOrders.length;
    const open = filteredWorkOrders.filter(w => w.status !== Status.COMPLETED && w.status !== Status.MAINTENANCE).length;
    const completed = filteredWorkOrders.filter(w => w.status === Status.COMPLETED).length;
    const critical = filteredWorkOrders.filter(w => w.priority === Priority.CRITICAL && w.status !== Status.COMPLETED).length;
    
    // Cost
    const laborCost = completed * 500; // Mock
    const materialCost = completed * 800; // Mock
    
    return { total, open, completed, critical, cost: laborCost + materialCost };
  }, [filteredWorkOrders]);

  // ==========================================
  // VIEW 1: PREVENTIVE MAINTENANCE ANALYTICS
  // ==========================================
  const PMView = () => {
    const pmOrders = filteredWorkOrders.filter(w => w.workType === WorkType.PM);
    const totalPM = pmOrders.length;
    const completedPM = pmOrders.filter(w => w.status === Status.COMPLETED).length;
    
    const abnormalPMs = pmOrders.filter(wo => {
        const woTasks = tasks.filter(t => t.workOrderId === wo.id);
        return woTasks.some(t => t.resultStatus === 'Abnormal');
    });
    
    const stackedData = companies.map(comp => {
        const compPMs = pmOrders.filter(w => w.companyId === comp.id);
        const abnormal = compPMs.filter(wo => tasks.filter(t => t.workOrderId === wo.id).some(t => t.resultStatus === 'Abnormal')).length;
        const watch = compPMs.filter(wo => tasks.filter(t => t.workOrderId === wo.id).some(t => t.resultStatus === 'Monitor')).length;
        const normal = compPMs.length - abnormal - watch;
        
        return {
            name: comp.name.replace('บริษัท', '').replace('จำกัด', '').trim(),
            Normal: normal > 0 ? normal : 0,
            Abnormal: abnormal,
            Watch: watch
        };
    }).filter(d => d.Normal + d.Abnormal + d.Watch > 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs md:text-sm font-medium">งาน PM ทั้งหมด</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{totalPM}</h3>
                    <p className="text-[10px] md:text-xs text-emerald-600 flex items-center gap-1 mt-1">
                        <TrendingUp size={12} /> Target 100%
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                    <p className="text-slate-500 text-xs md:text-sm font-medium">ปกติ (Normal)</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-emerald-700 mt-2">{completedPM - abnormalPMs.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-red-500">
                    <p className="text-slate-500 text-xs md:text-sm font-medium">ผิดปกติ (Abnormal)</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-red-600 mt-2">{abnormalPMs.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                    <p className="text-slate-500 text-xs md:text-sm font-medium">เฝ้าระวัง (Monitor)</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-amber-600 mt-2">1</h3> 
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Priority List Table */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-sm md:text-base">รายการที่ต้องให้ความสำคัญ (Priority)</h3>
                        <span className="text-[10px] md:text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">Abnormal Results</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">บริษัท</th>
                                    <th className="px-4 py-3 whitespace-nowrap hidden md:table-cell">สถานที่</th>
                                    <th className="px-4 py-3 whitespace-nowrap">เครื่องจักร</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {abnormalPMs.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No abnormal findings. Excellent!</td></tr>
                                ) : (
                                    abnormalPMs.map(wo => {
                                        const comp = companies.find(c => c.id === wo.companyId);
                                        const asset = assets.find(a => a.id === wo.assetId);
                                        return (
                                            <tr key={wo.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 truncate max-w-[100px] md:max-w-[150px]">{comp?.name || wo.companyId}</td>
                                                <td className="px-4 py-3 hidden md:table-cell">{wo.locationId}</td>
                                                <td className="px-4 py-3 truncate max-w-[120px] md:max-w-[200px]">{asset?.name || wo.assetName}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">ผิดปกติ</span>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Stacked Chart - Hidden on small mobile, visible on larger */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hidden md:block">
                    <h3 className="font-bold text-slate-800 mb-4">สัดส่วนผลการตรวจเช็ค PM</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stackedData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                                <Tooltip />
                                <Legend verticalAlign="top" height={36} />
                                <Bar dataKey="Normal" stackId="a" fill="#10b981" />
                                <Bar dataKey="Abnormal" stackId="a" fill="#ef4444" />
                                <Bar dataKey="Watch" stackId="a" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // ==========================================
  // VIEW 2: REPAIR (CM) ANALYTICS
  // ==========================================
  const CMView = () => {
    const cmOrders = filteredWorkOrders.filter(w => w.workType === WorkType.CM);
    const totalCM = cmOrders.length;
    const closedCM = cmOrders.filter(w => w.status === Status.COMPLETED).length;
    const progressCM = cmOrders.filter(w => w.status === Status.IN_PROGRESS).length;
    const pendingCM = cmOrders.filter(w => w.status === Status.OPEN || w.status === Status.WAITING_PARTS).length;

    const pieData = [
        { name: 'บริษัท A', value: cmOrders.filter(w => w.companyId === companies[0]?.id).length, color: '#2a9d8f' },
        { name: 'บริษัท B', value: cmOrders.filter(w => w.companyId === companies[1]?.id).length, color: '#e9c46a' },
        { name: 'บริษัท C', value: cmOrders.filter(w => w.companyId === companies[2]?.id).length, color: '#f4a261' },
    ].filter(d => d.value > 0);

    const systemCount = new Map<string, number>();
    cmOrders.forEach(wo => {
        if(wo.systemId) {
            systemCount.set(wo.systemId, (systemCount.get(wo.systemId) || 0) + 1);
        }
    });
    const topSystems = Array.from(systemCount.entries())
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => {
            const sys = systems.find(s => s.id === id);
            return { name: sys ? sys.name : id, count };
        });

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs md:text-sm font-medium">งานซ่อมทั้งหมด</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{totalCM}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
                    <p className="text-slate-500 text-xs md:text-sm font-medium flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> ปิดงานแล้ว</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{closedCM}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
                    <p className="text-slate-500 text-xs md:text-sm font-medium flex items-center gap-2"><Wrench size={16} className="text-blue-500"/> กำลังซ่อม</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{progressCM}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-orange-500">
                    <p className="text-slate-500 text-xs md:text-sm font-medium flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500"/> รอรับงาน</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{pendingCM}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 text-center">สัดส่วนงานซ่อมแยกตามบริษัท</h3>
                    <div className="h-64 md:h-72 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 text-center">5 อันดับระบบที่เสียบ่อย</h3>
                    <div className="h-64 md:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topSystems}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10}} angle={-15} textAnchor="end" height={60} />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{fill: '#f1f5f9'}} />
                                <Bar dataKey="count" fill="#264653" radius={[4, 4, 0, 0]} barSize={40}>
                                    {topSystems.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#264653', '#e76f51', '#2a9d8f', '#e9c46a', '#f4a261'][index % 5]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // ==========================================
  // MAIN DASHBOARD LAYOUT
  // ==========================================
  return (
    <div className="space-y-6 pb-20 md:pb-12">
        {/* TOP CONTROL BAR - Responsive Grid */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 sticky top-0 z-30 md:static">
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">Maintenance Report</h2>
                <p className="text-slate-500 text-xs md:text-sm">ผลการดำเนินงานฝ่ายซ่อมบำรุง</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
                {/* Company Filter */}
                <div className="relative w-full">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium text-slate-700"
                    >
                        <option value="All">ทุกบริษัท (All)</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Date Filter */}
                <div className="relative w-full">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium text-slate-700">
                        <option>This Month</option>
                        <option>Last Month</option>
                        <option>This Year</option>
                    </select>
                </div>
            </div>
        </div>

        {/* TABS - Horizontal Scroll on Mobile */}
        <div className="flex bg-slate-200 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Activity size={16} /> Overview
            </button>
            <button 
                onClick={() => setActiveTab('pm')}
                className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'pm' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <ClipboardList size={16} /> Preventive
            </button>
            <button 
                onClick={() => setActiveTab('cm')}
                className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'cm' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Wrench size={16} /> Repair
            </button>
        </div>

        {/* CONTENT AREA */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
                <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {/* Basic KPI Cards */}
                    <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-xs md:text-sm text-slate-500 font-medium">Active Jobs</p>
                        <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{kpis.open}</h3>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-xs md:text-sm text-slate-500 font-medium">Critical</p>
                        <h3 className="text-2xl md:text-3xl font-bold text-red-600">{kpis.critical}</h3>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-xs md:text-sm text-slate-500 font-medium">Est. Cost</p>
                        <h3 className="text-2xl md:text-3xl font-bold text-slate-800">฿{(kpis.cost/1000).toFixed(1)}k</h3>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-xs md:text-sm text-slate-500 font-medium">Completed</p>
                        <h3 className="text-2xl md:text-3xl font-bold text-emerald-600">{kpis.completed}</h3>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Package className="text-orange-500" size={20} /> Low Stock Alert
                    </h3>
                    <div className="space-y-3">
                        {inventoryParts.filter(p => p.stockQuantity <= p.minStockLevel).slice(0, 5).map(p => (
                            <div key={p.id} className="flex justify-between items-center p-2 bg-orange-50 border border-orange-100 rounded-lg">
                                <span className="text-sm font-medium text-slate-700 truncate">{p.name}</span>
                                <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded whitespace-nowrap">Low: {p.stockQuantity}</span>
                            </div>
                        ))}
                        {inventoryParts.filter(p => p.stockQuantity <= p.minStockLevel).length === 0 && (
                            <p className="text-center text-slate-400 text-sm py-4">Stock levels are good.</p>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="text-blue-500" size={20} /> Active Workload
                    </h3>
                    <div className="space-y-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">U{i}</div>
                                <div className="flex-1">
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{width: `${Math.random() * 80 + 20}%`}}></div>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-500">{Math.floor(Math.random() * 10)} Jobs</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'pm' && <PMView />}
        {activeTab === 'cm' && <CMView />}
    </div>
  );
};
