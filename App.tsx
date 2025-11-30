
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './pages/Dashboard';
import { WorkOrderDetails } from './pages/WorkOrderDetails';
import { AssetList } from './pages/AssetList';
import { CreateTicket } from './pages/CreateTicket';
import { AssetDetails } from './pages/AssetDetails';
import { GroupDetails } from './pages/GroupDetails';
import { PMList } from './pages/PMList';
import { InventoryList } from './pages/InventoryList';
import { ToolList } from './pages/ToolList';
import { DatabaseManager } from './pages/DatabaseManager';
import { FormAnalytics } from './pages/FormAnalytics'; // Import new page
import { LoginPage } from './pages/LoginPage';
import { Settings } from './pages/Settings';
import { QRScanner } from './components/QRScanner';
import { WorkOrderCard } from './components/WorkOrderCard';
import { PMSelectionModal } from './components/PMSelectionModal';
import { fetchFullDatabase, createWorkOrder, updateWorkOrder } from './services/sheetService';
import { getCurrentUser, logout } from './services/authService';
import { WorkOrder, Asset, Company, Location, System, EquipmentType, PMTemplate, PMTemplateDetail, WorkOrderTask, InventoryPart, WorkOrderPart, Tool, ToolCheckout, UserProfile, StorageLocation, Priority, Status, WorkType } from './types';
import { Loader2, Plus, Filter, Search, ChevronRight, ScanLine } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- DATA STATE ---
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [pmTemplates, setPMTemplates] = useState<PMTemplate[]>([]);
  const [pmDetails, setPMDetails] = useState<PMTemplateDetail[]>([]);
  const [tasks, setTasks] = useState<WorkOrderTask[]>([]);
  const [inventoryParts, setInventoryParts] = useState<InventoryPart[]>([]);
  const [partsUsed, setPartsUsed] = useState<WorkOrderPart[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolCheckouts, setToolCheckouts] = useState<ToolCheckout[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // --- UI STATE ---
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{type: 'system' | 'location' | 'equipmentType', id: string} | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // --- PM SCAN STATE ---
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [scannedPMCode, setScannedPMCode] = useState<string>(''); // For PM Scan logic
  const [scannedFilters, setScannedFilters] = useState<{ companyId?: string; locationId?: string }>({}); // Store filters from scanner
  const [showPMModal, setShowPMModal] = useState(false);
  const [matchedPMTemplates, setMatchedPMTemplates] = useState<PMTemplate[]>([]);
  const [isProcessingPM, setIsProcessingPM] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsSyncing(true);
      const data = await fetchFullDatabase();
      if (data) {
        setCompanies(data.companies);
        setLocations(data.locations);
        setStorageLocations(data.storageLocations);
        setSystems(data.systems);
        setEquipmentTypes(data.equipmentTypes);
        setAssets(data.assets);
        setPMTemplates(data.pmTemplates);
        setPMDetails(data.pmDetails);
        setWorkOrders(data.workOrders);
        setTasks(data.tasks);
        setInventoryParts(data.parts);
        setPartsUsed(data.partsUsed);
        setTools(data.tools);
        setToolCheckouts(data.checkouts);
        setAllUsers(data.users);
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const sessionUser = getCurrentUser();
    if (sessionUser) {
      setUser(sessionUser);
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
       loadData();
    }, 120000); 
    return () => clearInterval(interval);
  }, [user, loadData]);

  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    setIsLoading(true);
    loadData();
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setWorkOrders([]);
    setAssets([]);
  };

  const handleManualSync = async () => {
      await loadData();
  };
  
  const handleNavigate = (page: string) => {
    if (page === 'qr-scan') {
      setIsScanning(true);
      return;
    }
    setSelectedAssetId(null);
    setSelectedGroup(null);
    setSelectedWorkOrderId(null);
    setIsCreatingTicket(false);
    setCurrentPage(page);
    setIsSidebarOpen(false);
  };

  // --- CORE QR LOGIC ---
  const handleQRScan = (code: string, filters?: { companyId?: string, locationId?: string }) => {
    console.log("Scanned Code:", code, "Filters:", filters);
    setScannedFilters(filters || {}); 
    
    const cleanCode = code.trim();
    const cleanLower = cleanCode.toLowerCase();

    // 1. Check Work Orders
    const foundWO = workOrders.find(w => {
        const matchesCode = w.woNumber.toLowerCase() === cleanLower || w.id === cleanCode;
        const matchesCompany = filters?.companyId ? w.companyId === filters.companyId : true;
        return matchesCode && matchesCompany;
    });

    if (foundWO) {
      setSelectedWorkOrderId(foundWO.id);
      setCurrentPage('workorders');
      setIsScanning(false);
      return;
    }

    // 2. Check PM Templates
    const pmMatches = pmTemplates.filter(pm => {
        const matchesCode = pm.id.toLowerCase().includes(cleanLower) || cleanLower.includes(pm.id.toLowerCase());
        const matchesCompany = filters?.companyId ? pm.companyId === filters.companyId : true;
        return matchesCode && matchesCompany;
    });

    if (pmMatches.length > 0) {
        setMatchedPMTemplates(pmMatches);
        setScannedPMCode(cleanCode);
        setScannedAsset(null); 
        
        const linkedAsset = assets.find(a => {
            const matchesTag = cleanCode.includes(a.assetTag) || cleanCode.includes(a.id);
            const matchesCompany = filters?.companyId ? a.companyId === filters.companyId : true;
            const matchesLoc = filters?.locationId ? a.locationId === filters.locationId : true;
            return matchesTag && matchesCompany && matchesLoc;
        });

        if (linkedAsset) {
            setScannedAsset(linkedAsset);
        }

        setShowPMModal(true);
        setIsScanning(false); 
        return;
    }

    // 3. Check Assets
    const foundAsset = assets.find(a => {
        const matchesCode = 
            a.assetTag.toLowerCase() === cleanLower || 
            a.id === cleanCode ||
            cleanLower.includes(a.assetTag.toLowerCase()) ||
            a.name.toLowerCase().includes(cleanLower); 
        
        const matchesCompany = filters?.companyId ? a.companyId === filters.companyId : true;
        const matchesLoc = filters?.locationId ? a.locationId === filters.locationId : true;
        
        return matchesCode && matchesCompany && matchesLoc;
    });

    if (foundAsset) {
      setScannedAsset(foundAsset);
      
      const indirectMatches = pmTemplates.filter(pm => 
        pm.companyId === foundAsset.companyId &&
        String(pm.systemId) === String(foundAsset.systemId) &&
        String(pm.equipmentTypeId) === String(foundAsset.equipmentTypeId)
      );

      if (indirectMatches.length > 0) {
        setMatchedPMTemplates(indirectMatches);
        setScannedPMCode(foundAsset.assetTag);
        setShowPMModal(true);
        setIsScanning(false);
      } else {
        setSelectedAssetId(foundAsset.id);
        setCurrentPage('assets');
        setIsScanning(false);
      }
      return;
    }
    
    // IF NO MATCH, DO NOT CLOSE SCANNER. JUST ALERT.
    alert(`ไม่พบข้อมูลสำหรับ: '${cleanCode}' ในขอบเขตที่เลือก`);
  };

  const handlePMSelectionConfirm = async (selectedIds: string[]) => {
    setIsProcessingPM(true);
    
    try {
        const newWOs: WorkOrder[] = [];
        const newTasksAccumulator: WorkOrderTask[] = [];
        let targetAsset = scannedAsset;

        if (!targetAsset && scannedFilters.locationId && selectedIds.length > 0) {
             const firstTemplate = matchedPMTemplates.find(t => t.id === selectedIds[0]);
             if (firstTemplate) {
                 const potentialAssets = assets.filter(a => 
                    a.companyId === firstTemplate.companyId &&
                    a.locationId === scannedFilters.locationId &&
                    String(a.systemId) === String(firstTemplate.systemId) &&
                    String(a.equipmentTypeId) === String(firstTemplate.equipmentTypeId)
                 );
                 if (potentialAssets.length === 1) {
                     targetAsset = potentialAssets[0];
                 }
             }
        }

        for (const pmId of selectedIds) {
            const template = matchedPMTemplates.find(t => t.id === pmId);
            if (!template) continue;

            const assetIdToUse = targetAsset ? targetAsset.id : 'TBD';
            const locationIdToUse = targetAsset ? targetAsset.locationId : (scannedFilters.locationId || '');
            const companyIdToUse = template.companyId;

            const newWO: WorkOrder = {
                id: `WO-GEN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                woNumber: 'Generating...', 
                workType: WorkType.PM,
                title: `PM: ${template.name}`,
                description: template.remarks || `Generated via Scan: ${scannedPMCode}`,
                status: Status.OPEN,
                priority: Priority.MEDIUM,
                assetId: assetIdToUse,
                companyId: companyIdToUse,
                locationId: locationIdToUse,
                systemId: template.systemId,
                equipmentTypeId: template.equipmentTypeId,
                pmTemplateId: template.id,
                createdAt: new Date().toISOString(),
                assignedToUserId: '',
                requestedByUserId: user?.userId || 'System',
                assetName: targetAsset ? targetAsset.name : 'Asset (From PM)',
                companyName: companies.find(c => c.id === companyIdToUse)?.name
            };

            const created = await createWorkOrder(newWO);
            const createdWO = { ...newWO, id: created.id, woNumber: created.woNumber };
            newWOs.push(createdWO);

            const relevantDetails = pmDetails.filter(d => d.pmTemplateId === template.id);
            const generatedTasks: WorkOrderTask[] = relevantDetails.map((detail, idx) => ({
                id: `WOT-${created.id}-${idx}`,
                workOrderId: created.id,
                description: detail.taskDescription,
                isCompleted: false
            }));

            if (generatedTasks.length > 0) {
                 await updateWorkOrder(createdWO, generatedTasks, []);
                 newTasksAccumulator.push(...generatedTasks);
            }
        }

        setWorkOrders(prev => [...newWOs, ...prev]);
        setTasks(prev => [...prev, ...newTasksAccumulator]);
        setShowPMModal(false);
        
        if (targetAsset) {
             setSelectedAssetId(targetAsset.id);
             setCurrentPage('assets');
        } else {
             setCurrentPage('workorders');
        }

    } catch (e) {
        console.error(e);
        alert("Error creating PM Work Orders. Please check connection.");
    } finally {
        setIsProcessingPM(false);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard 
                  workOrders={workOrders} 
                  assets={assets}
                  inventoryParts={inventoryParts}
                  companies={companies}
                  systems={systems}
                  tasks={tasks}
               />;
      
      case 'form-analytics': // New Page
        return <FormAnalytics />;

      case 'workorders':
        if (isCreatingTicket) {
          return (
            <CreateTicket 
              companies={companies}
              assets={assets}
              locations={locations}
              systems={systems}
              equipmentTypes={equipmentTypes}
              users={allUsers}
              currentUser={user}
              onCreate={(newTicket) => {
                setWorkOrders(prev => [newTicket, ...prev]);
                setIsCreatingTicket(false);
              }}
              onCancel={() => setIsCreatingTicket(false)}
            />
          );
        }
        if (selectedWorkOrderId) {
          const wo = workOrders.find(w => w.id === selectedWorkOrderId);
          if (!wo) return <div>Ticket not found</div>;
          
          return (
            <WorkOrderDetails 
              workOrder={wo}
              asset={assets.find(a => a.id === wo.assetId)}
              company={companies.find(c => c.id === wo.companyId)}
              initialTasks={tasks.filter(t => t.workOrderId === wo.id)}
              initialPartsUsed={partsUsed.filter(p => p.workOrderId === wo.id)}
              inventoryParts={inventoryParts}
              tools={tools}
              pmDetails={pmDetails}
              assets={assets}
              locations={locations}
              companies={companies}
              systems={systems}
              equipmentTypes={equipmentTypes}
              users={allUsers}
              onSave={(updatedWo, updatedTasks, updatedParts) => {
                 setWorkOrders(prev => prev.map(w => w.id === updatedWo.id ? updatedWo : w));
                 setTasks(prev => [...prev.filter(t => t.workOrderId !== updatedWo.id), ...updatedTasks]);
                 setPartsUsed(prev => [...prev.filter(p => p.workOrderId !== updatedWo.id), ...updatedParts]);
                 handleManualSync();
              }}
              onBack={() => setSelectedWorkOrderId(null)}
              onDelete={(id) => {
                 setWorkOrders(prev => prev.filter(w => w.id !== id));
                 setSelectedWorkOrderId(null);
              }}
            />
          );
        }
        
        const filteredWOs = workOrders.filter(wo => 
            filterStatus === 'All' ? true : wo.status === filterStatus
        );

        return (
          <div className="space-y-6 animate-fade-in pb-24">
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Work Orders</h2>
                    <p className="text-slate-500 text-sm">{filteredWOs.length} Active Jobs</p>
                </div>
                <div className="flex gap-2 items-center w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">All Status</option>
                            <option value={Status.OPEN}>Open</option>
                            <option value={Status.IN_PROGRESS}>In Progress</option>
                            <option value={Status.WAITING_PARTS}>Waiting Parts</option>
                            <option value={Status.COMPLETED}>Completed</option>
                        </select>
                        <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <button 
                        onClick={() => setIsCreatingTicket(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Plus size={18} /> New Ticket
                    </button>
                </div>
             </div>

             <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold">WO Number</th>
                      <th className="px-6 py-3 font-semibold">Description / Asset</th>
                      <th className="px-6 py-3 font-semibold">Type</th>
                      <th className="px-6 py-3 font-semibold text-center">Priority</th>
                      <th className="px-6 py-3 font-semibold text-center">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWOs.map(wo => {
                      const asset = assets.find(a => a.id === wo.assetId);
                      return (
                        <tr key={wo.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedWorkOrderId(wo.id)}>
                          <td className="px-6 py-4 font-mono text-slate-500">{wo.woNumber}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{wo.title}</div>
                            <div className="text-xs text-slate-500">{asset?.name || wo.assetName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                wo.workType === WorkType.PM ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                                wo.workType === WorkType.CM ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-700'
                            }`}>
                              {wo.workType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                wo.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' :
                                wo.priority === Priority.HIGH ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-600'
                             }`}>
                                {wo.priority}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                wo.status === Status.COMPLETED ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                wo.status === Status.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                             }`}>
                                {wo.status}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <ChevronRight className="inline-block text-slate-400" size={16} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>

             <div className="md:hidden grid grid-cols-1 gap-4">
                {filteredWOs.map(wo => (
                    <WorkOrderCard 
                        key={wo.id}
                        workOrder={wo}
                        asset={assets.find(a => a.id === wo.assetId)}
                        company={companies.find(c => c.id === wo.companyId)}
                        onClick={() => setSelectedWorkOrderId(wo.id)}
                    />
                ))}
             </div>
             
             {filteredWOs.length === 0 && (
                 <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    No work orders found.
                 </div>
             )}
          </div>
        );

      case 'assets':
        // 1. Asset Details View
        if (selectedAssetId) {
          const asset = assets.find(a => a.id === selectedAssetId);
          if (asset) {
            return (
              <AssetDetails 
                asset={asset}
                workOrders={workOrders}
                partsUsed={partsUsed}
                partsInventory={inventoryParts}
                onBack={() => {
                    setSelectedAssetId(null);
                    setScannedAsset(null);
                }}
              />
            );
          }
        }
        
        // 2. Group Analytics View
        if (selectedGroup) {
            return (
                <GroupDetails 
                    groupType={selectedGroup.type}
                    groupId={selectedGroup.id}
                    data={{
                        companies, locations, systems, equipmentTypes, assets, workOrders, partsUsed, inventoryParts, pmTemplates
                    }}
                    onBack={() => setSelectedGroup(null)}
                    onSelectAsset={setSelectedAssetId}
                />
            );
        }

        // 3. Asset List View
        return (
          <AssetList 
            assets={assets} 
            systems={systems}
            locations={locations}
            equipmentTypes={equipmentTypes}
            selectedCompanyId={user?.companyId || 'all'}
            onSelectAsset={setSelectedAssetId} 
            onSelectGroup={(type, id) => setSelectedGroup({type, id})}
          />
        );

      case 'pm-plans':
        return (
          <PMList 
            templates={pmTemplates}
            pmDetails={pmDetails}
            companies={companies}
            systems={systems}
            equipmentTypes={equipmentTypes}
            onGenerateWorkOrder={(template) => {
                const newWO: WorkOrder = {
                    id: `WO-PM-${Date.now()}`,
                    woNumber: 'Generating...',
                    workType: WorkType.PM,
                    title: `PM: ${template.name}`,
                    description: `Scheduled Maintenance based on plan: ${template.name}. \n${template.remarks}`,
                    status: Status.OPEN,
                    priority: Priority.MEDIUM,
                    assetId: 'TBD',
                    companyId: template.companyId,
                    locationId: '',
                    systemId: template.systemId,
                    equipmentTypeId: template.equipmentTypeId,
                    pmTemplateId: template.id,
                    createdAt: new Date().toISOString(),
                    assignedToUserId: '',
                    requestedByUserId: 'System'
                };
                createWorkOrder(newWO).then(res => {
                    setWorkOrders(prev => [{...newWO, id: res.id, woNumber: res.woNumber}, ...prev]);
                    alert(`PM Work Order Created: ${res.woNumber}`);
                });
            }}
          />
        );

      case 'inventory':
        return <InventoryList parts={inventoryParts} storageLocations={storageLocations} onRefresh={handleManualSync} />;

      case 'tool-crib':
        return <ToolList tools={tools} checkouts={toolCheckouts} workOrders={workOrders} />;

      case 'database-manager':
        return <DatabaseManager data={{ companies, locations, storageLocations, systems, equipmentTypes, assets, pmTemplates, parts: inventoryParts, tools }} />;

      case 'settings':
        return (
            <Settings 
                currentUser={{ 
                    name: user?.fullName || 'User', 
                    role: user?.role || 'Viewer', 
                    avatar: `https://ui-avatars.com/api/?name=${user?.fullName}&background=0D8ABC&color=fff` 
                }} 
                onLogout={handleLogout}
                onSync={handleManualSync}
            />
        );

      default:
        return <div>Page not found</div>;
    }
  };

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} isLoadingData={isLoading} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        isSyncing={isSyncing}
      />
      
      <main className="flex-1 overflow-auto w-full md:ml-64 relative">
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
           {renderContent()}
        </div>
      </main>

      <button 
        onClick={() => setIsScanning(true)}
        className="fixed bottom-8 right-8 hidden md:flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-300 hover:scale-110 transition-transform z-40"
        title="Scan QR Code"
      >
        <ScanLine size={24} />
      </button>

      <MobileNav activeTab={currentPage} onNavigate={handleNavigate} />
      
      <QRScanner 
        isOpen={isScanning} 
        onClose={() => setIsScanning(false)} 
        onScan={handleQRScan} 
        companies={companies}
        locations={locations}
        systems={systems}
        equipmentTypes={equipmentTypes}
      />

      <PMSelectionModal 
        isOpen={showPMModal}
        onClose={() => {
            setShowPMModal(false);
            if (scannedAsset) {
                setSelectedAssetId(scannedAsset.id);
                setCurrentPage('assets');
            }
        }}
        matchedTemplates={matchedPMTemplates}
        pmDetails={pmDetails}
        onConfirm={handlePMSelectionConfirm}
        scannedCode={scannedPMCode || scannedAsset?.assetTag || 'Unknown'}
        isProcessing={isProcessingPM}
      />
    </div>
  );
};
