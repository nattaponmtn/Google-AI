import React, { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderTask, Asset, Company, Status, WorkOrderPart, InventoryPart, Tool, PMTemplateDetail, Location, Priority, WorkType, System, EquipmentType, UserProfile } from '../types';
import { ArrowLeft, MapPin, CheckCircle2, Wrench, Package, Save, Plus, Trash2, Loader2, Image as ImageIcon, AlertCircle, Minus, AlertTriangle, Building2, Settings, Tag, Upload, X, Calendar, User, Clock } from 'lucide-react';
import { updateWorkOrder, deleteWorkOrder, uploadImageToDrive } from '../services/sheetService';

interface WorkOrderDetailsProps {
  workOrder: WorkOrder;
  asset?: Asset;
  company?: Company;
  initialTasks: WorkOrderTask[];
  initialPartsUsed: WorkOrderPart[];
  inventoryParts?: InventoryPart[];
  tools?: Tool[];
  pmDetails?: PMTemplateDetail[];
  assets?: Asset[]; 
  locations?: Location[];
  companies?: Company[]; 
  systems?: System[];
  equipmentTypes?: EquipmentType[];
  users?: UserProfile[];
  onSave: (wo: WorkOrder, tasks: WorkOrderTask[], parts: WorkOrderPart[]) => void;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

export const WorkOrderDetails: React.FC<WorkOrderDetailsProps> = ({ 
    workOrder, 
    asset, 
    company, 
    initialTasks, 
    initialPartsUsed, 
    inventoryParts = [],
    tools = [],
    pmDetails = [],
    assets = [],
    locations = [],
    companies = [],
    systems = [],
    equipmentTypes = [],
    users = [],
    onSave, 
    onBack,
    onDelete
}) => {
  const [currentTitle, setCurrentTitle] = useState<string>(workOrder.title);
  const [currentStatus, setCurrentStatus] = useState<string>(workOrder.status);
  const [currentPriority, setCurrentPriority] = useState<string>(workOrder.priority);
  const [currentWorkType, setCurrentWorkType] = useState<string>(workOrder.workType);
  
  const [currentDescription, setCurrentDescription] = useState<string>(workOrder.description || '');

  const [currentCompanyId, setCurrentCompanyId] = useState<string>(workOrder.companyId || '');
  const [currentLocationId, setCurrentLocationId] = useState<string>(workOrder.locationId || '');
  const [currentAssetId, setCurrentAssetId] = useState<string>(workOrder.assetId || '');
  const [currentSystemId, setCurrentSystemId] = useState<string>(workOrder.systemId || '');
  const [currentEquipmentTypeId, setCurrentEquipmentTypeId] = useState<string>(workOrder.equipmentTypeId || '');

  // Planning State
  const [currentAssignedToUserId, setCurrentAssignedToUserId] = useState<string>(workOrder.assignedToUserId || '');
  const [currentRequestedByUserId, setCurrentRequestedByUserId] = useState<string>(workOrder.requestedByUserId || '');

  // Helper to get local ISO string for datetime-local input
  const toLocalISO = (dateStr?: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };
  const [currentScheduledDate, setCurrentScheduledDate] = useState<string>(toLocalISO(workOrder.scheduledDate));
  const [currentCompletedAt, setCurrentCompletedAt] = useState<string>(toLocalISO(workOrder.completedAt));
  
  const [tasks, setTasks] = useState<WorkOrderTask[]>(initialTasks);
  const [partsUsed, setPartsUsed] = useState<WorkOrderPart[]>(initialPartsUsed);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false); 
  const [isAddingPart, setIsAddingPart] = useState(false);
  
  // Local state for images
  const [currentImages, setCurrentImages] = useState<string[]>(workOrder.images || []);
  const [isUploading, setIsUploading] = useState(false);

  // Reset state ONLY when Work Order ID changes to prevent overwriting local edits during parent re-renders
  useEffect(() => {
      setCurrentTitle(workOrder.title);
      setCurrentImages(workOrder.images || []);
      setCurrentDescription(workOrder.description || '');
      setCurrentStatus(workOrder.status);
      setCurrentPriority(workOrder.priority);
      setCurrentWorkType(workOrder.workType);
      setCurrentCompanyId(workOrder.companyId || '');
      setCurrentLocationId(workOrder.locationId || '');
      setCurrentAssetId(workOrder.assetId || '');
      setCurrentSystemId(workOrder.systemId || '');
      setCurrentEquipmentTypeId(workOrder.equipmentTypeId || '');
      setCurrentAssignedToUserId(workOrder.assignedToUserId || '');
      setCurrentRequestedByUserId(workOrder.requestedByUserId || '');
      setCurrentScheduledDate(toLocalISO(workOrder.scheduledDate));
      setCurrentCompletedAt(toLocalISO(workOrder.completedAt));
      setTasks(initialTasks);
      setPartsUsed(initialPartsUsed);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrder.id]); 

  // Auto-set Completed Date when Status becomes Completed
  useEffect(() => {
      if ((currentStatus === Status.COMPLETED || currentStatus === Status.MAINTENANCE) && !currentCompletedAt) {
          const now = new Date();
          const offset = now.getTimezoneOffset() * 60000;
          const localNow = new Date(now.getTime() - offset).toISOString().slice(0, 16);
          setCurrentCompletedAt(localNow);
      }
  }, [currentStatus]);

  const getPriorityLabel = (p: string) => {
      switch(p) {
          case Priority.LOW: return 'Low';
          case Priority.MEDIUM: return 'Medium';
          case Priority.HIGH: return 'High';
          case Priority.CRITICAL: return 'Critical';
          default: return p;
      }
  };
  
  // Filter active users for assignment dropdown
  // Note: If currentAssignedToUserId exists but user is inactive, we should still likely show them or handle it gracefully
  const assignmentOptions = users.filter(u => u.isActive || u.userId === currentAssignedToUserId);
  
  const availableLocations = currentCompanyId && currentCompanyId !== 'Unknown'
    ? locations.filter(l => l.companyId === currentCompanyId)
    : locations;

  const availableAssets = assets.filter(a => 
    (!currentCompanyId || currentCompanyId === 'Unknown' || a.companyId === currentCompanyId) && 
    (!currentLocationId || a.locationId === currentLocationId)
  );

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleTaskStatusChange = (taskId: string, status: 'Normal' | 'Monitor' | 'Abnormal') => {
      setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, isCompleted: true, resultStatus: status } : t
      ));
  };

  const handleTaskValueChange = (taskId: string, value: string) => {
    setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t;
        const numVal = parseFloat(value);
        return {
            ...t,
            actualValueText: value,
            actualValueNumeric: !isNaN(numVal) ? numVal : undefined,
            isCompleted: value.trim() !== '' || t.resultStatus !== undefined
        };
    }));
  };
  
  const handleTaskDescriptionChange = (taskId: string, description: string) => {
    setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, description: description } : t
    ));
  };

  const handleAddTask = () => {
    const newTask: WorkOrderTask = {
        id: `WOT-NEW-${Date.now()}`,
        workOrderId: workOrder.id,
        description: '',
        isCompleted: false
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleDeleteTask = (taskId: string) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleAddPart = (partId: string) => {
      if (!partId) return;
      setPartsUsed(prev => [
          ...prev,
          {
              id: `wop-${Date.now()}`,
              workOrderId: workOrder.id,
              partId: partId,
              quantityUsed: 1
          }
      ]);
      setIsAddingPart(false);
  };

  const handleUpdatePartQuantity = (id: string, delta: number) => {
      setPartsUsed(prev => prev.map(p => {
          if (p.id !== id) return p;
          const newQty = Math.max(1, p.quantityUsed + delta);
          return { ...p, quantityUsed: newQty };
      }));
  };

  const handleRemovePart = (id: string) => {
      setPartsUsed(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    let finalStatus = currentStatus;

    if (progress === 100 && tasks.length > 0 && currentStatus !== Status.COMPLETED && currentStatus !== Status.MAINTENANCE) {
        if (window.confirm("All tasks are completed. Do you want to mark this ticket as COMPLETED?")) {
            finalStatus = Status.COMPLETED;
        }
    }

    const updatedWO: WorkOrder = { 
        ...workOrder,
        title: currentTitle,
        status: finalStatus,
        priority: currentPriority,
        workType: currentWorkType,
        description: currentDescription,
        companyId: currentCompanyId,
        locationId: currentLocationId,
        assetId: currentAssetId,
        systemId: currentSystemId,
        equipmentTypeId: currentEquipmentTypeId,
        images: currentImages,
        // Planning Fields (Convert back to ISO if needed, standard string is usually enough but better to be consistent)
        assignedToUserId: currentAssignedToUserId,
        requestedByUserId: currentRequestedByUserId,
        scheduledDate: currentScheduledDate ? new Date(currentScheduledDate).toISOString() : undefined,
        completedAt: currentCompletedAt ? new Date(currentCompletedAt).toISOString() : undefined,
    };

    const formattedTasks = tasks.map(t => ({
        ...t,
        actualValueText: t.resultStatus ? `[${t.resultStatus}] ${t.actualValueText || ''}`.trim() : t.actualValueText
    }));
    
    try {
        const success = await updateWorkOrder(updatedWO, formattedTasks, partsUsed);
        if (success) {
             onSave(updatedWO, formattedTasks, partsUsed);
             onBack(); 
        } else {
             alert("Failed to sync with server. Check your connection.");
        }
    } catch (e) {
        console.error("Save failed", e);
        alert("An error occurred while saving.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
      if (!onDelete) return;
      if (!deleteConfirm) {
          setDeleteConfirm(true);
          setTimeout(() => setDeleteConfirm(false), 3000);
          return;
      }
      setIsDeleting(true);
      try {
          const success = await deleteWorkOrder(workOrder.id);
          if (success) {
              onDelete(workOrder.id);
              onBack();
          } else {
              alert("Failed to delete. Check server logs.");
              setDeleteConfirm(false);
          }
      } catch (e) {
          alert("Error deleting work order.");
          setDeleteConfirm(false);
      } finally {
          setIsDeleting(false);
      }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64String = reader.result as string;
          const fileName = `wo_${workOrder.id}_${Date.now()}.jpg`;
          
          const uploadedUrl = await uploadImageToDrive(base64String, fileName, workOrder.id);
          
          if (uploadedUrl) {
              setCurrentImages(prev => [...prev, uploadedUrl]);
          } else {
              alert("Failed to upload image. Please try again.");
          }
          setIsUploading(false);
      };
      reader.readAsDataURL(file);
  };
  
  const handleDeleteImage = (indexToDelete: number) => {
    setCurrentImages(prev => prev.filter((_, i) => i !== indexToDelete));
  };

  const isEditable = currentStatus !== Status.COMPLETED;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
                {isEditable ? (
                    <input 
                        type="text"
                        value={currentTitle}
                        onChange={(e) => setCurrentTitle(e.target.value)}
                        className="text-2xl font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:outline-none w-full py-1"
                    />
                ) : (
                    <h2 className="text-2xl font-bold text-slate-800">{workOrder.title}</h2>
                )}
                <p className="text-slate-500 font-mono text-sm mt-1">{workOrder.woNumber}</p>
            </div>
            <div className="flex flex-wrap gap-2">
                 <select 
                    value={currentPriority}
                    onChange={(e) => setCurrentPriority(e.target.value)}
                    disabled={!isEditable}
                    className={`bg-white border border-slate-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium shadow-sm ${!isEditable ? 'bg-slate-100 text-slate-500' : 'text-slate-700'}`}
                >
                    {Object.values(Priority).map(p => (
                        <option key={p} value={p}>Priority: {getPriorityLabel(p)}</option>
                    ))}
                </select>

                <select 
                    value={currentStatus}
                    onChange={(e) => setCurrentStatus(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium shadow-sm"
                >
                    {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                
                <button 
                    onClick={handleSave}
                    disabled={isSaving || isDeleting}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Save & Close
                </button>

                {onDelete && (
                    <button 
                        onClick={handleDelete}
                        disabled={isDeleting || isSaving}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium border ${
                            deleteConfirm 
                                ? 'bg-red-600 text-white border-red-700 hover:bg-red-700 shadow-md animate-pulse' 
                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                        title="Delete Ticket"
                    >
                         {isDeleting ? <Loader2 className="animate-spin" size={18} /> : deleteConfirm ? <><AlertTriangle size={18} /><span>Confirm?</span></> : <Trash2 size={18} />}
                    </button>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="space-y-4 mb-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><Building2 size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Company</p>
                                {isEditable ? (
                                    <select 
                                        value={currentCompanyId}
                                        onChange={(e) => {
                                            setCurrentCompanyId(e.target.value);
                                            setCurrentLocationId('');
                                            setCurrentAssetId('');
                                        }}
                                        className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                    >
                                        <option value="" disabled>-- Select Company --</option>
                                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                ) : (
                                    <p className="font-medium">{company?.name || currentCompanyId}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-slate-700">
                             <div className="p-2 bg-slate-100 rounded-lg mt-1"><Tag size={18} /></div>
                             <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Work Type</p>
                                {isEditable ? (
                                    <select 
                                        value={currentWorkType}
                                        onChange={(e) => setCurrentWorkType(e.target.value)}
                                        className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                    >
                                        {Object.values(WorkType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                ) : (
                                    <p className="font-medium">{currentWorkType}</p>
                                )}
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><MapPin size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Location</p>
                                {isEditable ? (
                                    <select 
                                        value={currentLocationId}
                                        onChange={(e) => {
                                            setCurrentLocationId(e.target.value);
                                            setCurrentAssetId('');
                                        }}
                                        className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                    >
                                        <option value="" disabled>-- Select Location --</option>
                                        {availableLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                ) : (
                                    <p className="font-medium">{locations.find(l => l.id === currentLocationId)?.name || 'Unknown Site'}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><Wrench size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Asset</p>
                                {isEditable ? (
                                    <select 
                                        value={currentAssetId}
                                        onChange={(e) => {
                                            const newId = e.target.value;
                                            setCurrentAssetId(newId);
                                            const foundAsset = assets.find(a => a.id === newId);
                                            if (foundAsset) {
                                                setCurrentEquipmentTypeId(foundAsset.equipmentTypeId);
                                                setCurrentSystemId(foundAsset.systemId);
                                            }
                                        }}
                                        className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                    >
                                        <option value="" disabled>-- Select Asset --</option>
                                        <option value="TBD">General Area (No Specific Asset)</option>
                                        {availableAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>)}
                                    </select>
                                ) : (
                                    <p className="font-medium">
                                        {asset ? asset.name : (currentAssetId === 'TBD' || !currentAssetId ? 'General Area (No specific asset)' : currentAssetId)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><Settings size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">System</p>
                                {isEditable ? (
                                    <select 
                                        value={currentSystemId}
                                        onChange={(e) => setCurrentSystemId(e.target.value)}
                                        className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                    >
                                        <option value="">-- Select System --</option>
                                        {systems.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} {s.nameTh && s.nameTh !== s.name ? `(${s.nameTh})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="font-medium">
                                        {(() => {
                                            const s = systems.find(s => s.id === currentSystemId);
                                            return s ? `${s.name} ${s.nameTh && s.nameTh !== s.name ? `(${s.nameTh})` : ''}` : (currentSystemId || '-');
                                        })()}
                                    </p>
                                )}
                            </div>
                         </div>

                         <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><Tag size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Equipment Type</p>
                                {isEditable ? (
                                    <select 
                                        value={currentEquipmentTypeId}
                                        onChange={(e) => setCurrentEquipmentTypeId(e.target.value)}
                                        className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                    >
                                        <option value="">-- Select Type --</option>
                                        {equipmentTypes.map(eq => (
                                            <option key={eq.id} value={eq.id}>
                                                {eq.name} {eq.nameTh && eq.nameTh !== eq.name ? `(${eq.nameTh})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="font-medium">
                                        {(() => {
                                            const eq = equipmentTypes.find(e => e.id === currentEquipmentTypeId);
                                            return eq ? `${eq.name} ${eq.nameTh && eq.nameTh !== eq.name ? `(${eq.nameTh})` : ''}` : (currentEquipmentTypeId || '-');
                                        })()}
                                    </p>
                                )}
                            </div>
                         </div>
                    </div>

                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Description</h4>
                    <textarea
                        value={currentDescription}
                        onChange={(e) => setCurrentDescription(e.target.value)}
                        disabled={!isEditable}
                        className={`w-full p-4 rounded-lg text-sm leading-relaxed border ${isEditable ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                        rows={5}
                    />
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <ImageIcon size={16} /> Attachments
                        </h4>
                        {isEditable && (
                            <label className="cursor-pointer text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-md flex items-center gap-1.5 border border-blue-100 transition-colors font-medium">
                                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                Add New Photo
                                <input 
                                    type="file" 
                                    hidden 
                                    accept="image/*" 
                                    onChange={handleUploadPhoto} 
                                    disabled={isUploading}
                                />
                            </label>
                        )}
                    </div>
                    
                    {currentImages && currentImages.length > 0 ? (
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {currentImages.map((img, idx) => (
                                <div key={`${idx}-${img}`} className="relative group">
                                    <a href={img} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md">
                                        <img src={img} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                                    </a>
                                    {isEditable && (
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDeleteImage(idx);
                                            }}
                                            className="absolute top-1 right-1 bg-red-600 text-white p-1.5 rounded-full shadow-md z-20 hover:bg-red-700 transition-colors cursor-pointer"
                                            title="Remove image"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-sm flex flex-col items-center justify-center">
                            <ImageIcon size={24} className="mb-2 opacity-20" />
                            No photos attached
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="text-blue-600" size={20} />
                        Tasks & Checks
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">
                            {progress}% Done
                        </span>
                        <button 
                            onClick={handleAddTask}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                            title="Add Task"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
                
                <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="space-y-4">
                    {tasks.map((task) => {
                        const pmDetail = workOrder.pmTemplateId 
                            ? pmDetails.find(d => 
                                String(d.pmTemplateId) === String(workOrder.pmTemplateId) && 
                                (task.id.includes(String(d.id)) || d.taskDescription === task.description)
                              )
                            : null;
                        
                        return (
                            <div key={task.id} className={`p-4 rounded-lg border transition-all ${task.isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                                <div className="flex items-start gap-3">
                                    <button 
                                        onClick={() => {
                                            const newStatus = !task.isCompleted;
                                            setTasks(prev => prev.map(t => t.id === task.id ? {...t, isCompleted: newStatus} : t));
                                        }}
                                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 hover:border-blue-400'}`}
                                    >
                                        {task.isCompleted && <CheckCircle2 size={14} />}
                                    </button>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={task.description}
                                            onChange={(e) => handleTaskDescriptionChange(task.id, e.target.value)}
                                            placeholder="Task description..."
                                            className={`w-full text-sm font-medium bg-transparent border-none focus:ring-0 p-0 mb-1 ${task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}
                                        />
                                        
                                        {pmDetail && (
                                            <div className="flex gap-2 mt-1">
                                                {pmDetail.isCritical && (
                                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-1">
                                                        <AlertCircle size={10} /> Critical
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="mt-3">
                                            {pmDetail?.expectedInputType === 'Number' ? (
                                                <div className="flex items-center gap-2">
                                                     <input 
                                                        type="number" 
                                                        placeholder="Value"
                                                        value={task.actualValueText || ''}
                                                        onChange={(e) => handleTaskValueChange(task.id, e.target.value)}
                                                        className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none"
                                                     />
                                                     <span className="text-xs text-slate-500">
                                                         {pmDetail.standardMinValue && pmDetail.standardMaxValue 
                                                            ? `(Std: ${pmDetail.standardMinValue} - ${pmDetail.standardMaxValue})` 
                                                            : ''}
                                                     </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    <button 
                                                        onClick={() => handleTaskStatusChange(task.id, 'Normal')}
                                                        className={`px-3 py-1 text-xs rounded border transition-colors ${task.resultStatus === 'Normal' ? 'bg-emerald-100 border-emerald-200 text-emerald-700 font-bold' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                                                    >
                                                        Normal
                                                    </button>
                                                    <button 
                                                        onClick={() => handleTaskStatusChange(task.id, 'Monitor')}
                                                        className={`px-3 py-1 text-xs rounded border transition-colors ${task.resultStatus === 'Monitor' ? 'bg-yellow-100 border-yellow-200 text-yellow-700 font-bold' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                                                    >
                                                        Monitor
                                                    </button>
                                                    <button 
                                                        onClick={() => handleTaskStatusChange(task.id, 'Abnormal')}
                                                        className={`px-3 py-1 text-xs rounded border transition-colors ${task.resultStatus === 'Abnormal' ? 'bg-red-100 border-red-200 text-red-700 font-bold' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                                                    >
                                                        Abnormal
                                                    </button>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Add notes..."
                                                        value={task.actualValueText || ''}
                                                        onChange={(e) => handleTaskValueChange(task.id, e.target.value)}
                                                        className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="mt-0.5 text-slate-300 hover:text-red-500 transition-colors p-1"
                                        title="Delete Task"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {tasks.length === 0 && <p className="text-slate-400 text-center py-4 text-sm italic">No tasks defined. Click '+' to add.</p>}
                </div>
            </div>

        </div>

        <div className="space-y-6">
            {/* Planning & Schedule Card (New) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-slate-600" />
                    Planning & Schedule
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <User size={12} /> Assigned To
                        </label>
                        <select 
                            value={currentAssignedToUserId}
                            onChange={(e) => setCurrentAssignedToUserId(e.target.value)}
                            disabled={!isEditable}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                        >
                            <option value="">-- Unassigned --</option>
                            {assignmentOptions.map(user => (
                                <option key={user.userId} value={user.userId}>
                                    {user.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Clock size={12} /> Scheduled Date
                        </label>
                        <input 
                            type="datetime-local"
                            value={currentScheduledDate}
                            onChange={(e) => setCurrentScheduledDate(e.target.value)}
                            disabled={!isEditable}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>

                    {/* Requester Info */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Requested By</label>
                        <select
                            value={currentRequestedByUserId}
                            onChange={(e) => setCurrentRequestedByUserId(e.target.value)}
                            disabled={!isEditable} // Allow changing requester if needed
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 outline-none"
                        >
                            <option value="">-- System --</option>
                            {users.map(user => (
                                <option key={user.userId} value={user.userId}>{user.fullName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Completed Date (Show if Completed or Maintenance, or allow setting it manually) */}
                    <div className={`transition-all ${currentStatus === Status.COMPLETED || currentStatus === Status.MAINTENANCE ? 'opacity-100' : 'opacity-70'}`}>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Completed Date
                        </label>
                        <input 
                            type="datetime-local"
                            value={currentCompletedAt}
                            onChange={(e) => setCurrentCompletedAt(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Package size={20} className="text-orange-500" />
                        Spare Parts
                    </h3>
                    <button 
                        onClick={() => setIsAddingPart(true)}
                        className="p-1.5 hover:bg-slate-100 rounded text-blue-600 transition-colors"
                        title="Add Part"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="space-y-3">
                    {partsUsed.map(part => {
                        const partInfo = inventoryParts.find(p => p.id === part.partId);
                        return (
                            <div key={part.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex-1 min-w-0 mr-2">
                                    <p className="text-sm font-medium text-slate-800 truncate">{partInfo?.name || part.partId}</p>
                                    <p className="text-xs text-slate-400">Stock: {partInfo?.stockQuantity}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleUpdatePartQuantity(part.id, -1)} className="p-1 text-slate-400 hover:text-slate-600"><Minus size={14} /></button>
                                    <span className="text-sm font-bold w-6 text-center">{part.quantityUsed}</span>
                                    <button onClick={() => handleUpdatePartQuantity(part.id, 1)} className="p-1 text-slate-400 hover:text-slate-600"><Plus size={14} /></button>
                                    <button onClick={() => handleRemovePart(part.id)} className="p-1 text-red-400 hover:text-red-600 ml-1"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        );
                    })}
                    
                    {isAddingPart && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                             <select 
                                onChange={(e) => handleAddPart(e.target.value)}
                                className="w-full p-2 text-sm border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                autoFocus
                             >
                                 <option value="">Select a part...</option>
                                 {inventoryParts.map(p => (
                                     <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQuantity})</option>
                                 ))}
                             </select>
                             <button onClick={() => setIsAddingPart(false)} className="text-xs text-slate-500 mt-2 hover:underline">Cancel</button>
                        </div>
                    )}

                    {partsUsed.length === 0 && !isAddingPart && (
                        <p className="text-sm text-slate-400 italic text-center py-2">No parts used yet.</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Wrench size={20} className="text-slate-600" />
                    Required Tools
                </h3>
                <div className="flex flex-wrap gap-2">
                    {tools.slice(0, 3).map(t => (
                        <span key={t.id} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200">
                            {t.name}
                        </span>
                    ))}
                    <span className="text-xs px-2 py-1 bg-slate-50 text-slate-400 rounded border border-slate-100 border-dashed cursor-pointer hover:bg-slate-100 transition-colors">
                        + Add Tool
                    </span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};