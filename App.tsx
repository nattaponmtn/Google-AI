


import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { CreateTicket } from './pages/CreateTicket';
import { WorkOrderCard } from './components/WorkOrderCard';
import { CalendarView } from './components/CalendarView'; // Import new component
// Removed AI pages import
import { AssetList } from './pages/AssetList';
import { AssetDetails } from './pages/AssetDetails';
import { PMList } from './pages/PMList';
import { WorkOrderDetails } from './pages/WorkOrderDetails';
import { InventoryList } from './pages/InventoryList';
import { ToolList } from './pages/ToolList';
// Removed old page-level CalendarView import if it conflicts, but assuming we replaced it or using component
import { Settings } from './pages/Settings';
import { DatabaseManager } from './pages/DatabaseManager';
import { LoginPage } from './pages/LoginPage';
import { MobileNav } from './components/MobileNav';
import { QRScanner } from './components/QRScanner';
import { PMSelectionModal } from './components/PMSelectionModal';
import { PMGenerationModal } from './components/PMGenerationModal'; 
import { fetchFullDatabase, createWorkOrder, updateWorkOrder } from './services/sheetService';
import { getCurrentUser, logout } from './services/authService';
import { WorkOrder, Asset, PMTemplate, WorkType, Status, Priority, InventoryPart, Tool, WorkOrderTask, WorkOrderPart, Company, Location, System, PMTemplateDetail, ToolCheckout, EquipmentType, UserProfile } from './types';
import { Plus, Menu, ScanLine, Loader2, RefreshCw, Filter, Search, RotateCcw, SlidersHorizontal, ChevronRight, Calendar, User, LayoutList, CalendarDays } from 'lucide-react';

export const App: React.FC = () => {
  // --- Application State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dataFetchedRef = useRef(false); 
  
  // Master Data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pmTemplates, setPmTemplates] = useState<PMTemplate[]>([]);
  const [pmDetails, setPmDetails] = useState<PMTemplateDetail[]>([]);
  const [inventoryParts, setInventoryParts] = useState<InventoryPart[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolCheckouts, setToolCheckouts] = useState<ToolCheckout[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]); 
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Transaction Data
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrderTasks, setWorkOrderTasks] = useState<WorkOrderTask[]>([]);
  const [partsUsed, setPartsUsed] = useState<WorkOrderPart[]>([]);

  // Navigation State
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list'); // New View Mode State
  
  // --- Filters State ---
  const [statusFilter, setStatusFilter] = useState<string>('All'); 
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('All');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterSystem, setFilterSystem] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  
  // PM & QR Logic State
  const [isPMModalOpen, setIsPMModalOpen] = useState(false);
  const [matchedPMs, setMatchedPMs] = useState<PMTemplate[]>([]);
  const [scannedCode, setScannedCode] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false); 

  // NEW PM GENERATION MODAL STATE
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [selectedPMTemplate, setSelectedPMTemplate] = useState<PMTemplate | null>(null);
  const [isGeneratingPM, setIsGeneratingPM] = useState(false);

  // --- Initialization ---

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchFullDatabase();
      if (data) {
        setCompanies(data.companies);
        setLocations(data.locations);
        setSystems(data.systems);
        setEquipmentTypes(data.equipmentTypes);
        setAssets(data.assets);
        setPmTemplates(data.pmTemplates);
        setPmDetails(data.pmDetails);
        setWorkOrders(data.workOrders);
        setWorkOrderTasks(data.tasks);
        setInventoryParts(data.parts);
        setPartsUsed(data.partsUsed);
        setTools(data.tools);
        setToolCheckouts(data.checkouts);
        setUsers(data.users);
      }
    } catch (e) {
      console.error("Data load failed", e);
      alert("Failed to load data from Google Sheets. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        if (!dataFetchedRef.current) {
            dataFetchedRef.current = true;
            loadData();
        }
    } else {
        setIsLoading(false);
    }
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
      loadData();
  };

  const handleLogout = () => {
      logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setWorkOrders([]);
  };

  // --- Handlers ---

  const handleCreateWorkOrder = (newTicket: WorkOrder) => {
    setWorkOrders(prev => [newTicket, ...prev]);
    setCurrentPage('workorders');
    setViewMode('list'); // Force list view when creating new
    setSelectedWorkOrderId(newTicket.id);
    loadData(); 
  };

  const handleWorkOrderUpdate = (updatedWO: WorkOrder, updatedTasks: WorkOrderTask[], updatedParts: WorkOrderPart[]) => {
      setWorkOrders(prev => prev.map(wo => wo.id === updatedWO.id ? updatedWO : wo));
      setWorkOrderTasks(prev => {
          const otherTasks = prev.filter(t => t.workOrderId !== updatedWO.id);
          return [...otherTasks, ...updatedTasks];
      });
      setPartsUsed(prev => {
          const otherParts = prev.filter(p => p.workOrderId !== updatedWO.id);
          return [...otherParts, ...updatedParts];
      });
  };

  const handleDeleteWorkOrder = (id: string) => {
      setWorkOrders(prev => prev.filter(w => w.id !== id));
      setWorkOrderTasks(prev => prev.filter(t => t.workOrderId !== id));
      setPartsUsed(prev => prev.filter(p => p.workOrderId !== id));
  };

  const handleQRScan = (code: string) => {
    setIsQRScannerOpen(false);
    setScannedCode(code);
    
    const asset = assets.find(a => a.assetTag === code || a.id === code);
    if (asset) {
        setSelectedAssetId(asset.id);
        setCurrentPage('asset-details');
        return;
    }

    const matchingPMs = pmTemplates.filter(pm => 
        pm.id.includes(code) || pm.systemId === code || pm.name.includes(code)
    );

    if (matchingPMs.length > 0) {
        setMatchedPMs(matchingPMs);
        setIsPMModalOpen(true);
    } else {
        alert(`No Assets or PM Plans found for code: ${code}`);
    }
  };

  const openPMGenerationModal = (template: PMTemplate) => {
    setSelectedPMTemplate(template);
    setIsGenModalOpen(true);
  };

  const executePMGeneration = async (locationId: string, assetId: string, priority: Priority) => {
    if (!selectedPMTemplate) return;
    setIsGeneratingPM(true);

    try {
        const template = selectedPMTemplate;
        const selectedLoc = locations.find(l => l.id === locationId);
        const selectedAst = assets.find(a => a.id === assetId);
        
        const newWO: WorkOrder = {
            id: `WO-GEN-${Date.now()}`,
            woNumber: `WO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000)}`,
            workType: WorkType.PM,
            title: template.name,
            description: `Generated from plan: ${template.name}. Remarks: ${template.remarks}`,
            status: Status.OPEN,
            priority: priority, 
            assetId: assetId || 'TBD',
            locationId: locationId,
            systemId: template.systemId,
            equipmentTypeId: template.equipmentTypeId,
            pmTemplateId: template.id,
            createdAt: new Date().toISOString(),
            scheduledDate: new Date().toISOString().slice(0, 10),
            estimatedHours: Math.ceil(template.estimatedMinutes / 60),
            assignedToUserId: 'TBD',
            requestedByUserId: currentUser?.userId || 'System',
            
            assetName: selectedAst?.name || 'TBD',
            locationName: selectedLoc?.name || locationId,
            companyName: companies.find(c => c.id === template.companyId)?.name || template.companyId,
            companyId: template.companyId
        };

        const result = await createWorkOrder(newWO);
        
        const templateTasks = pmDetails.filter(d => d.pmTemplateId === template.id);
        const newTasks: WorkOrderTask[] = templateTasks.map((t, index) => ({
            id: `WOT-${result.id}-${index}`,
            workOrderId: result.id, 
            description: t.taskDescription,
            isCompleted: false
        }));
        
        const finalWO = { ...newWO, id: result.id, woNumber: result.woNumber };
        
        if (newTasks.length > 0) {
           await updateWorkOrder(finalWO, newTasks, []);
        }

        setWorkOrders(prev => [finalWO, ...prev]);
        setWorkOrderTasks(prev => [...prev, ...newTasks]);

        alert(`PM Created Successfully!\nTicket: ${result.woNumber}`);
        setIsGenModalOpen(false);
        setCurrentPage('workorders');
        setViewMode('list');
        setSelectedWorkOrderId(finalWO.id);

    } catch (error) {
        console.error("PM Gen Error", error);
        alert("Failed to generate work order.");
    } finally {
        setIsGeneratingPM(false);
    }
  };

  const handleBatchGenerate = async (selectedIds: string[]) => {
      setIsBatchProcessing(true);
      try {
          const templates = pmTemplates.filter(t => selectedIds.includes(t.id));
          const createdOrders: WorkOrder[] = [];
          
          for (const tmpl of templates) {
              const newWO: WorkOrder = {
                id: `WO-BATCH-${Date.now()}`,
                woNumber: `WO-BATCH-${Math.floor(Math.random()*1000)}`,
                workType: WorkType.PM,
                title: tmpl.name,
                description: `Batch Generated via QR`,
                status: Status.OPEN,
                priority: Priority.MEDIUM,
                assetId: 'TBD',
                locationId: 'TBD', 
                systemId: tmpl.systemId,
                equipmentTypeId: tmpl.equipmentTypeId,
                pmTemplateId: tmpl.id,
                createdAt: new Date().toISOString(),
                companyId: tmpl.companyId,
                scheduledDate: new Date().toISOString().slice(0, 10)
              };
              const result = await createWorkOrder(newWO);
              
              const templateTasks = pmDetails.filter(d => d.pmTemplateId === tmpl.id);
              const newTasks = templateTasks.map((t, idx) => ({
                 id: `WOT-${result.id}-${idx}`,
                 workOrderId: result.id,
                 description: t.taskDescription,
                 isCompleted: false
              }));
              
              const finalWO = { ...newWO, id: result.id, woNumber: result.woNumber };
              await updateWorkOrder(finalWO, newTasks, []);
              
              createdOrders.push(finalWO);
              setWorkOrders(prev => [finalWO, ...prev]);
              setWorkOrderTasks(prev => [...prev, ...newTasks]);
          }
          
          alert(`Generated ${createdOrders.length} orders.`);
          setIsPMModalOpen(false);
          setCurrentPage('workorders');
          
      } catch (error) {
          console.error("Batch Gen Error", error);
          alert("Partial or full failure during batch generation.");
      } finally {
          setIsBatchProcessing(false);
      }
  };


  // --- Render Views ---

  if (!isAuthenticated) {
      return <LoginPage onLoginSuccess={handleLoginSuccess} isLoadingData={isLoading} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-semibold">Loading Enterprise Data...</h2>
        <p className="text-sm mt-2">Synchronizing with Google Sheets</p>
      </div>
    );
  }

  const renderContent = () => {
    if (selectedWorkOrderId) {
      const wo = workOrders.find(w => w.id === selectedWorkOrderId);
      if (wo) {
        const woTasks = workOrderTasks.filter(t => t.workOrderId === wo.id);
        const woParts = partsUsed.filter(p => p.workOrderId === wo.id);
        const asset = assets.find(a => a.id === wo.assetId);
        const company = companies.find(c => c.id === wo.companyId);
        
        return (
          <WorkOrderDetails 
            workOrder={wo}
            asset={asset}
            company={company}
            initialTasks={woTasks}
            initialPartsUsed={woParts}
            inventoryParts={inventoryParts}
            tools={tools}
            pmDetails={pmDetails}
            assets={assets}
            locations={locations}
            companies={companies} 
            systems={systems}
            equipmentTypes={equipmentTypes}
            users={users}
            onSave={handleWorkOrderUpdate}
            onBack={() => setSelectedWorkOrderId(null)}
            onDelete={handleDeleteWorkOrder}
          />
        );
      }
    }

    if (selectedAssetId) {
        const asset = assets.find(a => a.id === selectedAssetId);
        if (asset) {
            return (
                <AssetDetails 
                    asset={asset} 
                    workOrders={workOrders} 
                    partsUsed={partsUsed} 
                    partsInventory={inventoryParts}
                    onBack={() => { setSelectedAssetId(null); setCurrentPage('assets'); }} 
                />
            );
        }
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard workOrders={workOrders} />;
      case 'create-ticket':
        return <CreateTicket 
                companies={companies} 
                assets={assets} 
                locations={locations}
                systems={systems}
                equipmentTypes={equipmentTypes}
                users={users}
                currentUser={currentUser}
                onCreate={handleCreateWorkOrder} 
                onCancel={() => setCurrentPage('dashboard')} 
               />;
      case 'workorders':
      case 'calendar': // Treat calendar page click as navigating to workorders with calendar view, but keeping 'workorders' as currentPage
        const filteredWorkOrders = workOrders.filter(wo => {
            // 1. Status Filter
            let matchesStatus = true;
            if (statusFilter === 'Open') matchesStatus = wo.status === Status.OPEN || wo.status === Status.SCHEDULED;
            else if (statusFilter === 'In Progress') matchesStatus = wo.status === Status.IN_PROGRESS || wo.status === Status.WAITING_PARTS;
            else if (statusFilter === 'Completed') matchesStatus = wo.status === Status.COMPLETED;
            
            // 2. Work Type Filter
            let matchesType = true;
            if (workTypeFilter !== 'All') {
                matchesType = wo.workType === workTypeFilter;
            }

            // 3. Text Search (Title or WO Number)
            let matchesSearch = true;
            if (filterSearch.trim()) {
                const term = filterSearch.toLowerCase();
                matchesSearch = (wo.title.toLowerCase().includes(term) || wo.woNumber.toLowerCase().includes(term));
            }

            // 4. Company Filter
            let matchesCompany = true;
            if (filterCompany) {
                matchesCompany = wo.companyId === filterCompany;
            }

            // 5. System Filter
            let matchesSystem = true;
            if (filterSystem) {
                matchesSystem = wo.systemId === filterSystem;
            }

            // 6. Location Filter
            let matchesLocation = true;
            if (filterLocation) {
                matchesLocation = wo.locationId === filterLocation;
            }

            return matchesStatus && matchesType && matchesSearch && matchesCompany && matchesSystem && matchesLocation;
        });

        const resetFilters = () => {
            setStatusFilter('All');
            setWorkTypeFilter('All');
            setFilterSearch('');
            setFilterCompany('');
            setFilterSystem('');
            setFilterLocation('');
            setIsMobileFiltersOpen(false);
        };

        const hasActiveFilters = statusFilter !== 'All' || workTypeFilter !== 'All' || filterCompany !== '' || filterSystem !== '' || filterLocation !== '';
        
        const priorityColors: {[key: string]: string} = {
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

        return (
            <div className="space-y-6 animate-fade-in">
                {/* Header and Actions */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-800">Work Orders</h2>
                    
                    <div className="flex gap-2">
                        <button onClick={loadData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 bg-white">
                                <RefreshCw size={20} />
                        </button>
                        <button onClick={() => setCurrentPage('create-ticket')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                            <Plus size={20} />
                            <span className="hidden md:inline">New Ticket</span>
                        </button>
                    </div>
                </div>

                {/* Advanced Filters Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-4">
                             <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Filter size={16} /> Filters
                             </h4>
                             
                             {/* VIEW TOGGLE BUTTONS (List / Calendar) */}
                             <div className="flex items-center bg-slate-100 rounded-lg p-1">
                                <button 
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
                                        viewMode === 'list' 
                                        ? 'bg-white text-blue-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <LayoutList size={16} />
                                    <span className="hidden sm:inline">List</span>
                                </button>
                                <button 
                                    onClick={() => setViewMode('calendar')}
                                    className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
                                        viewMode === 'calendar' 
                                        ? 'bg-white text-blue-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <CalendarDays size={16} />
                                    <span className="hidden sm:inline">Calendar</span>
                                </button>
                             </div>
                         </div>

                         <button 
                             onClick={resetFilters} 
                             className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                         >
                             <RotateCcw size={12} /> Clear All
                         </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* Search Input & Toggle Button */}
                        <div className="flex gap-2 col-span-1 md:col-span-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search Title or WO#..." 
                                    value={filterSearch}
                                    onChange={(e) => setFilterSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            <button
                                onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                                className={`md:hidden p-2 rounded-lg border transition-colors ${
                                    isMobileFiltersOpen || hasActiveFilters
                                    ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}
                            >
                                <SlidersHorizontal size={20} />
                            </button>
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Open">Open & Scheduled</option>
                            <option value="In Progress">In Progress & Waiting</option>
                            <option value="Completed">Completed</option>
                        </select>

                         {/* Work Type Filter */}
                         <select
                            value={workTypeFilter}
                            onChange={(e) => setWorkTypeFilter(e.target.value)}
                            className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}
                        >
                            <option value="All">All Work Types</option>
                             {Object.values(WorkType).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        {/* Company Filter */}
                        <select
                            value={filterCompany}
                            onChange={(e) => { setFilterCompany(e.target.value); setFilterLocation(''); setFilterSystem(''); }}
                            className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}
                        >
                            <option value="">All Companies</option>
                             {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        
                         {/* Location Filter (Dependent) */}
                         {filterCompany && (
                            <select
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 animate-in fade-in slide-in-from-top-1 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}
                            >
                                <option value="">All Locations</option>
                                {locations.filter(l => l.companyId === filterCompany).map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        )}

                         {/* System Filter (Dependent) */}
                         {filterCompany && (
                            <select
                                value={filterSystem}
                                onChange={(e) => setFilterSystem(e.target.value)}
                                className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 animate-in fade-in slide-in-from-top-1 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}
                            >
                                <option value="">All Systems</option>
                                {systems.filter(s => s.companyId === filterCompany).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* CONDITIONAL RENDERING BASED ON VIEW MODE */}
                {viewMode === 'list' ? (
                    <>
                        {/* DESKTOP VIEW: TABLE */}
                        <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">WO Number</th>
                                            <th className="px-6 py-3 font-semibold">Title</th>
                                            <th className="px-6 py-3 font-semibold text-center">Status</th>
                                            <th className="px-6 py-3 font-semibold text-center">Priority</th>
                                            <th className="px-6 py-3 font-semibold">Asset / System</th>
                                            <th className="px-6 py-3 font-semibold">Scheduled / Created</th>
                                            <th className="px-6 py-3 font-semibold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredWorkOrders.map(wo => {
                                            const pColor = priorityColors[wo.priority as Priority] || 'bg-gray-100 text-gray-800';
                                            const sColor = statusColors[wo.status as Status] || 'bg-gray-50 text-gray-600 border-gray-200';
                                            const asset = assets.find(a => a.id === wo.assetId);
                                            
                                            return (
                                                <tr key={wo.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedWorkOrderId(wo.id)}>
                                                    <td className="px-6 py-4 font-mono text-slate-500">
                                                        {wo.woNumber}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-800">{wo.title}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{wo.description}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${sColor}`}>
                                                            {wo.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${pColor}`}>
                                                            {wo.priority}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {asset ? (
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-slate-800">{asset.name}</span>
                                                                <span className="text-xs text-slate-500">{asset.assetTag}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic">General / System</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        {wo.scheduledDate ? (
                                                            <div className="flex items-center gap-1 text-blue-600">
                                                                <Calendar size={14} />
                                                                <span>{new Date(wo.scheduledDate).toLocaleDateString()}</span>
                                                            </div>
                                                        ) : (
                                                             <span className="text-xs">{new Date(wo.createdAt).toLocaleDateString()}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="text-slate-400 hover:text-blue-600 transition-colors">
                                                            <ChevronRight size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                             </div>
                             {filteredWorkOrders.length === 0 && (
                                <div className="p-12 text-center text-slate-400 bg-slate-50/50">
                                    No work orders found.
                                </div>
                             )}
                        </div>

                        {/* MOBILE VIEW: CARDS */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {filteredWorkOrders.map((wo) => (
                                <WorkOrderCard 
                                    key={wo.id} 
                                    workOrder={wo} 
                                    asset={assets.find(a => a.id === wo.assetId)}
                                    company={companies.find(c => c.id === wo.companyId)}
                                    onClick={() => {
                                        setSelectedWorkOrderId(wo.id);
                                    }}
                                />
                            ))}
                            {filteredWorkOrders.length === 0 && (
                                <div className="col-span-full text-center py-12 text-slate-400">
                                    <div className="bg-slate-50 inline-block p-4 rounded-full mb-3">
                                        <Filter size={24} />
                                    </div>
                                    <p>No work orders match your filters.</p>
                                    <button onClick={resetFilters} className="text-blue-600 text-sm font-bold mt-2 hover:underline">
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* CALENDAR VIEW */
                    <CalendarView 
                        workOrders={filteredWorkOrders}
                        onSelectWorkOrder={(id) => setSelectedWorkOrderId(id)}
                    />
                )}
            </div>
        );
      case 'assets':
        return <AssetList 
                assets={assets} 
                systems={systems} 
                locations={locations} 
                selectedCompanyId={filterCompany || 'all'} // Reuse filter logic
                onSelectAsset={(id) => { setSelectedAssetId(id); }} 
               />;
      case 'pm-plans':
        return <PMList 
                templates={pmTemplates} 
                pmDetails={pmDetails} 
                companies={companies}
                systems={systems}
                equipmentTypes={equipmentTypes}
                onGenerateWorkOrder={openPMGenerationModal} 
               />;
      case 'inventory':
        return <InventoryList parts={inventoryParts} onRefresh={loadData} />;
      case 'tool-crib':
        return <ToolList tools={tools} checkouts={toolCheckouts} workOrders={workOrders} />;
      case 'database-manager':
        return <DatabaseManager data={{ companies, locations, systems, equipmentTypes, assets, pmTemplates, parts: inventoryParts, tools }} />;
      case 'settings':
        return <Settings 
                    currentUser={{ name: currentUser?.fullName || 'User', role: currentUser?.role || 'Viewer', avatar: "https://ui-avatars.com/api/?name=User&background=random" }} 
                    onLogout={handleLogout} 
               />;
      default:
        return <Dashboard workOrders={workOrders} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
        {/* Sidebar (Desktop) */}
        <Sidebar 
            currentPage={currentPage} 
            onNavigate={(page) => {
                // If navigating to calendar menu item, set page to workorders and view to calendar
                if (page === 'calendar') {
                    setCurrentPage('workorders');
                    setViewMode('calendar');
                } else {
                    setCurrentPage(page);
                    // Default to list if navigating back to workorders from elsewhere
                    if (page === 'workorders') setViewMode('list');
                }
                setIsSidebarOpen(false);
                setSelectedWorkOrderId(null);
                setSelectedAssetId(null);
            }} 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative md:ml-64 transition-all duration-300">
            
            {/* Mobile Header */}
            <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center md:hidden z-30">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
                        <Menu size={24} />
                    </button>
                    <h1 className="font-bold text-lg text-slate-800">NexGen</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsQRScannerOpen(true)} className="p-2 bg-blue-50 text-blue-600 rounded-full">
                        <ScanLine size={20} />
                    </button>
                     <img 
                        src={currentUser?.role === 'Admin' ? "https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff" : "https://ui-avatars.com/api/?name=User&background=random"} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full border border-slate-200"
                        onClick={() => setCurrentPage('settings')}
                    />
                </div>
            </header>

            {/* Desktop Header (Optional/Minimal) */}
            <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-4 justify-between items-center">
                <h1 className="text-xl font-bold text-slate-800 capitalize">
                    {currentPage === 'dashboard' ? 'Dashboard' : 
                     currentPage === 'workorders' ? 'Work Orders' :
                     currentPage === 'assets' ? 'Asset Registry' :
                     currentPage.replace('-', ' ')}
                </h1>
                <div className="flex items-center gap-4">
                     <button onClick={() => setIsQRScannerOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
                        <ScanLine size={18} />
                        <span className="hidden lg:inline">Scan QR</span>
                    </button>
                    <div 
                        className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                        onClick={() => setCurrentPage('settings')}
                    >
                        <div className="text-right hidden lg:block">
                            <p className="text-sm font-bold text-slate-800">{currentUser?.fullName}</p>
                            <p className="text-xs text-slate-500">{currentUser?.role}</p>
                        </div>
                        <img 
                            src={currentUser?.role === 'Admin' ? "https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff" : "https://ui-avatars.com/api/?name=User&background=random"} 
                            alt="Profile" 
                            className="w-9 h-9 rounded-full border border-slate-200 shadow-sm"
                        />
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-slate-50 scroll-smooth">
                <div className="max-w-7xl mx-auto">
                     {renderContent()}
                </div>
            </main>

            {/* Mobile Navigation Bar */}
            <MobileNav activeTab={currentPage} onNavigate={(page) => {
                if (page === 'qr-scan') setIsQRScannerOpen(true);
                else setCurrentPage(page);
            }} />

        </div>

        {/* Modals & Overlays */}
        <QRScanner 
            isOpen={isQRScannerOpen} 
            onClose={() => setIsQRScannerOpen(false)} 
            onScan={handleQRScan} 
        />

        <PMSelectionModal 
            isOpen={isPMModalOpen}
            onClose={() => setIsPMModalOpen(false)}
            matchedTemplates={matchedPMs}
            pmDetails={pmDetails}
            onConfirm={handleBatchGenerate}
            scannedCode={scannedCode}
            isProcessing={isBatchProcessing}
        />

        <PMGenerationModal
            isOpen={isGenModalOpen}
            onClose={() => setIsGenModalOpen(false)}
            template={selectedPMTemplate}
            locations={locations}
            assets={assets}
            companies={companies}
            onConfirm={executePMGeneration}
            isProcessing={isGeneratingPM}
        />
    </div>
  );
};
