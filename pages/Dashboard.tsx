
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line 
} from 'recharts';
import { WorkOrder, Status, Priority, WorkType, Asset, InventoryPart, Company, System, WorkOrderTask } from '../types';
import { 
  ClipboardList, AlertTriangle, CheckCircle2, Activity, Wrench, Package, Filter, Calendar as CalendarIcon, Clock, ArrowUpRight, ArrowRight, ScanLine, PlusSquare, Search, BrainCircuit
} from 'lucide-react';

interface DashboardProps {
  workOrders: WorkOrder[];
  assets: Asset[];
  inventoryParts: InventoryPart[];
  companies: Company[];
  systems: System[];
  tasks: WorkOrderTask[];
  onNavigate: (page: string) => void;
}

type TabType = 'overview' | 'pm' | 'cm';
type DateFilterType = 'All' | 'Today' | 'ThisMonth' | 'LastMonth' | 'ThisYear' | 'Custom';

export const Dashboard: React.FC<DashboardProps> = ({ workOrders, assets, inventoryParts, companies, systems, tasks, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  
  // --- Date Filter State ---
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ThisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Initialize dates on mount
  useEffect(() => {
      const now = new Date();
      // Default to start of month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      setCustomStartDate(startOfMonth.toISOString().split('T')[0]);
      setCustomEndDate(endOfMonth.toISOString().split('T')[0]);
  }, []);

  const handleDatePresetChange = (preset: DateFilterType) => {
      setDateFilter(preset);
      const now = new Date();
      let start = new Date();
      let end = new Date();

      switch (preset) {
          case 'Today':
              // Start/End are already now, just format
              break;
          case 'ThisMonth':
              start = new Date(now.getFullYear(), now.getMonth(), 1);
              end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              break;
          case 'LastMonth':
              start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              end = new Date(now.getFullYear(), now.getMonth(), 0);
              break;
          case 'ThisYear':
              start = new Date(now.getFullYear(), 0, 1);
              end = new Date(now.getFullYear(), 11, 31);
              break;
          default:
              return; // Keep existing for Custom/All
      }
      
      setCustomStartDate(start.toISOString().split('T')[0]);
      setCustomEndDate(end.toISOString().split('T')[0]);
  };

  // --- Data Filtering Logic ---
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      // 1. Company Filter
      const matchCompany = selectedCompany === 'All' || wo.companyId === selectedCompany;
      
      // 2. Date Filter
      let matchDate = true;
      if (dateFilter !== 'All') {
          if (!wo.createdAt) return false;
          const woDate = new Date(wo.createdAt.split('T')[0]); // Compare purely on date part
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          
          // Ensure valid dates
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
             matchDate = woDate >= start && woDate <= end;
          }
      }

      return matchCompany && matchDate;
    });
  }, [workOrders, selectedCompany, dateFilter, customStartDate, customEndDate]);

  // --- KPI Helpers (Overview) ---
  const overviewStats = useMemo(() => {
    const pendingCM = filteredWorkOrders.filter(w => w.workType === WorkType.CM && w.status !== Status.COMPLETED && w.status !== Status.MAINTENANCE).length;
    const pendingPM = filteredWorkOrders.filter(w => w.workType === WorkType.PM && w.status !== Status.COMPLETED && w.status !== Status.MAINTENANCE).length;
    
    const critical = filteredWorkOrders.filter(w => w.priority === Priority.CRITICAL && w.status !== Status.COMPLETED).length;
    const completed = filteredWorkOrders.filter(w => w.status === Status.COMPLETED).length;
    
    // Recent pending jobs (Top 5)
    const recentPending = filteredWorkOrders
        .filter(w => w.status !== Status.COMPLETED && w.status !== Status.MAINTENANCE)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    // Cost (Mock calculation)
    const laborCost = completed * 500;
    const materialCost = completed * 800;
    const totalCost = laborCost + materialCost;

    return { pendingCM, pendingPM, critical, completed, totalCost, recentPending };
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
                {/* Abnormal List */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-sm md:text-base">รายการที่ต้องให้ความสำคัญ (Abnormal Findings)</h3>
                        <span className="text-[10px] md:text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">Action Required</span>
                    </div>
                    <div className="overflow-x-auto flex-1">
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
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <CheckCircle2 size={32} className="text-emerald-400 mb-2"/>
                                            <span>เยี่ยมมาก! ไม่พบความผิดปกติในรายการ PM</span>
                                        </div>
                                    </td></tr>
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

                {/* Health Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hidden md:block">
                    <h3 className="font-bold text-slate-800 mb-4">สุขภาพเครื่องจักร (Health)</h3>
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
                    <h3 className="font-bold text-slate-800 mb-6 text-center">5 อันดับระบบที่เสียบ่อย (Top Systems)</h3>
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
        {/* TOP CONTROL BAR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between xl:items-center gap-4 sticky top-0 z-30 md:static">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Maintenance Dashboard</h2>
                <p className="text-slate-500 text-sm">
                    {dateFilter === 'All' ? 'Showing All History' : `Data from ${customStartDate} to ${customEndDate}`}
                </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto">
                <div className="relative w-full md:w-48">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium text-slate-700"
                    >
                        <option value="All">ทุกบริษัท (All)</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col md:flex-row gap-2 bg-slate-100 p-1 rounded-lg">
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select 
                            value={dateFilter}
                            onChange={(e) => handleDatePresetChange(e.target.value as DateFilterType)}
                            className="w-full md:w-auto pl-10 pr-8 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-bold text-slate-700 h-full"
                        >
                            <option value="ThisMonth">This Month</option>
                            <option value="LastMonth">Last Month</option>
                            <option value="ThisYear">This Year</option>
                            <option value="Today">Today</option>
                            <option value="Custom">Custom Range</option>
                            <option value="All">All Time</option>
                        </select>
                    </div>

                    {(dateFilter !== 'All') && (
                        <div className="flex items-center gap-2 px-2">
                             <input 
                                type="date" 
                                value={customStartDate}
                                onChange={(e) => {
                                    setCustomStartDate(e.target.value);
                                    setDateFilter('Custom');
                                }}
                                className="bg-transparent text-xs font-medium text-slate-600 outline-none border-b border-slate-300 focus:border-blue-500 w-24"
                             />
                             <span className="text-slate-400 text-xs">-</span>
                             <input 
                                type="date" 
                                value={customEndDate}
                                onChange={(e) => {
                                    setCustomEndDate(e.target.value);
                                    setDateFilter('Custom');
                                }}
                                className="bg-transparent text-xs font-medium text-slate-600 outline-none border-b border-slate-300 focus:border-blue-500 w-24"
                             />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* TABS */}
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
                {/* 1. SEPARATED KPI CARDS */}
                <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {/* Pending CM */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">งานซ่อมคงค้าง</p>
                                <p className="text-[10px] text-slate-400">Backlog (CM)</p>
                            </div>
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <Wrench size={18} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-orange-600">{overviewStats.pendingCM}</h3>
                    </div>

                    {/* Pending PM */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">PM คงค้าง</p>
                                <p className="text-[10px] text-slate-400">Preventive Due</p>
                            </div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <ClipboardList size={18} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-blue-600">{overviewStats.pendingPM}</h3>
                    </div>

                    {/* Critical */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">งานด่วน</p>
                                <p className="text-[10px] text-slate-400">Critical Priority</p>
                            </div>
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                <AlertTriangle size={18} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-red-600">{overviewStats.critical}</h3>
                    </div>

                    {/* Completed */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">เสร็จแล้ว</p>
                                <p className="text-[10px] text-slate-400">Completed (Period)</p>
                            </div>
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <CheckCircle2 size={18} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-emerald-600">{overviewStats.completed}</h3>
                    </div>
                </div>

                {/* 2. RECENT ACTIVITY LIST (Actionable) */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={18} className="text-slate-500" />
                            Job Queue (รายการล่าสุดที่ค้างอยู่)
                        </h3>
                        <span className="text-xs text-slate-500">Top 5 Pending</span>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Job ID</th>
                                    <th className="px-6 py-3 font-medium">Description</th>
                                    <th className="px-6 py-3 font-medium">Type</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {overviewStats.recentPending.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                            No pending jobs found. Great work!
                                        </td>
                                    </tr>
                                ) : (
                                    overviewStats.recentPending.map(wo => (
                                        <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 font-mono text-xs text-slate-500">{wo.woNumber}</td>
                                            <td className="px-6 py-3">
                                                <div className="font-bold text-slate-700 text-sm">{wo.title}</div>
                                                <div className="text-xs text-slate-400">{wo.assetName}</div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                                    wo.workType === WorkType.PM ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                                                }`}>
                                                    {wo.workType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                                    wo.status === Status.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                    wo.status === Status.WAITING_PARTS ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                    'bg-slate-100 text-slate-700 border-slate-200'
                                                 }`}>
                                                    {wo.status}
                                                 </span>
                                            </td>
                                            <td className="px-6 py-3 text-right text-xs text-slate-400 font-mono">
                                                {wo.createdAt.split('T')[0]}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. STOCK ALERT (Sidebar) - FULL HEIGHT */}
                <div className="lg:col-span-1 bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[400px]">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Package className="text-orange-500" size={20} /> Low Stock
                    </h3>
                    <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
                        {inventoryParts.filter(p => p.stockQuantity <= p.minStockLevel).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-4">
                                <CheckCircle2 size={32} className="text-emerald-500 opacity-50 mb-2" />
                                <p className="text-sm">Stock levels are healthy.</p>
                            </div>
                        ) : (
                            inventoryParts.filter(p => p.stockQuantity <= p.minStockLevel).map(p => (
                                <div key={p.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-700 truncate">{p.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{p.nameTh}</p>
                                    </div>
                                    <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded border border-red-100 whitespace-nowrap shadow-sm">
                                        {p.stockQuantity} Left
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'pm' && <PMView />}
        {activeTab === 'cm' && <CMView />}
    </div>
  );
};
