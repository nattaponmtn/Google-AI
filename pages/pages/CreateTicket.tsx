import React, { useState, useRef } from 'react';
import { Asset, Priority, Status, WorkOrder, Company, WorkType, System, EquipmentType, Location, WorkOrderTask, UserProfile } from '../types';
import { ArrowLeft, Save, Building2, Tag, Wrench, MapPin, Plus, X, Trash2, CheckCircle2, Image as ImageIcon, Settings, Loader2, Upload, Calendar, User, Clock } from 'lucide-react';
import { uploadImageToDrive, createWorkOrder, updateWorkOrder } from '../services/sheetService';

interface CreateTicketProps {
  companies: Company[];
  assets: Asset[];
  locations: Location[];
  systems: System[];
  equipmentTypes: EquipmentType[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  onCreate: (ticket: WorkOrder) => void;
  onCancel: () => void;
}

export const CreateTicket: React.FC<CreateTicketProps> = ({ 
  companies, 
  assets, 
  locations, 
  systems, 
  equipmentTypes, 
  users,
  currentUser,
  onCreate, 
  onCancel 
}) => {
  // --- Form State ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [workType, setWorkType] = useState<WorkType>(WorkType.CM);
  const [status, setStatus] = useState<Status>(Status.OPEN);

  // --- Relation State ---
  const [selectedCompany, setSelectedCompany] = useState<string>(companies[0]?.id || '');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [selectedEquipType, setSelectedEquipType] = useState<string>('');

  // --- Planning State ---
  const [assignedToUserId, setAssignedToUserId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');

  // --- Tasks State ---
  const [tasks, setTasks] = useState<{id: string, description: string}[]>([]);

  // --- Image State ---
  const [previewImages, setPreviewImages] = useState<string[]>([]); // Base64 for preview
  
  // --- UI State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // --- Filtering Logic ---
  const availableLocations = locations.filter(l => l.companyId === selectedCompany);
  const availableAssets = assets.filter(a => 
    a.companyId === selectedCompany && 
    (!selectedLocation || a.locationId === selectedLocation)
  );
  const availableSystems = systems.filter(s => s.companyId === selectedCompany);
  
  // Filter active users for assignment
  const activeUsers = users.filter(u => u.isActive && (u.companyId === selectedCompany || u.role === 'Admin' || u.role === 'Manager'));

  // --- Handlers ---

  const handleAssetChange = (assetId: string) => {
    setSelectedAsset(assetId);
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      // Auto-fill related fields
      setSelectedLocation(asset.locationId);
      setSelectedSystem(asset.systemId);
      setSelectedEquipType(asset.equipmentTypeId);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    // Reset dependent fields
    setSelectedLocation('');
    setSelectedAsset('');
    setSelectedSystem('');
  };

  // --- Task Handlers ---
  const handleAddTask = () => {
    setTasks([...tasks, { id: `temp-${Date.now()}`, description: '' }]);
  };

  const handleTaskChange = (id: string, val: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, description: val } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // --- Image Handlers ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewImages([...previewImages, base64]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = (index: number) => {
    setPreviewImages(previewImages.filter((_, i) => i !== index));
  };

  // --- Submit Handler ---
  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Please enter a Title");
      return;
    }
    if (!selectedCompany) {
        alert("Please select a Company");
        return;
    }

    setIsSubmitting(true);
    setLoadingMessage('Creating Work Order...');

    try {
      // 1. Construct Basic WO Object
      const newWO: WorkOrder = {
        id: `WO-TEMP-${Date.now()}`, // Temp ID, will be replaced by server
        woNumber: 'Generating...',
        workType,
        title,
        description,
        status,
        priority,
        assetId: selectedAsset || 'TBD',
        locationId: selectedLocation,
        companyId: selectedCompany,
        systemId: selectedSystem,
        equipmentTypeId: selectedEquipType,
        createdAt: new Date().toISOString(),
        images: [],
        // Planning Fields
        assignedToUserId: assignedToUserId,
        requestedByUserId: currentUser?.userId || currentUser?.id || 'System',
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined
      };

      // 2. Create Header on Server
      const result = await createWorkOrder(newWO);
      const realId = result.id;
      const realWoNumber = result.woNumber;

      // 3. Upload Images (if any)
      const uploadedUrls: string[] = [];
      if (previewImages.length > 0) {
        setLoadingMessage(`Uploading ${previewImages.length} images...`);
        for (let i = 0; i < previewImages.length; i++) {
            const base64Data = previewImages[i];
            const fileName = `wo_${realId}_${i}.jpg`;
            const url = await uploadImageToDrive(base64Data, fileName, realId);
            if (url) uploadedUrls.push(url);
        }
      }

      // 4. Create Tasks Objects
      const finalTasks: WorkOrderTask[] = tasks
        .filter(t => t.description.trim() !== '')
        .map((t, idx) => ({
            id: `WOT-${realId}-${idx}`,
            workOrderId: realId,
            description: t.description,
            isCompleted: false
        }));

      // 5. Update Work Order with Tasks and Image URLs
      if (finalTasks.length > 0 || uploadedUrls.length > 0) {
          setLoadingMessage('Finalizing data...');
          const updatedWO = { ...newWO, id: realId, woNumber: realWoNumber, images: uploadedUrls };
          await updateWorkOrder(updatedWO, finalTasks, []);
          
          // Success Update
          onCreate(updatedWO);
      } else {
          // Success Simple
          onCreate({ ...newWO, id: realId, woNumber: realWoNumber });
      }

    } catch (error) {
      console.error("Creation Error", error);
      alert("Failed to create ticket. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onCancel} disabled={isSubmitting} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">New Work Order</h2>
                <p className="text-slate-500 text-sm">Create a new maintenance ticket</p>
            </div>
            <div className="flex gap-2">
                <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium shadow-sm"
                >
                    {Object.values(Priority).map(p => <option key={p} value={p}>Priority: {p}</option>)}
                </select>

                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm shadow-blue-200 disabled:opacity-70"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            {loadingMessage}
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Create Ticket
                        </>
                    )}
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout (Matches WorkOrderDetails) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* General Info Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">General Information</h3>
                
                <div className="space-y-4">
                    {/* Row 1: Company & Work Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><Building2 size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Company</p>
                                <select 
                                  className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                  value={selectedCompany}
                                  onChange={(e) => handleCompanyChange(e.target.value)}
                                >
                                  {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><Tag size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Work Type</p>
                                <select 
                                  className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                  value={workType}
                                  onChange={(e) => setWorkType(e.target.value as WorkType)}
                                >
                                  {Object.values(WorkType).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Location & Asset */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><MapPin size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Location</p>
                                <select 
                                  className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                  value={selectedLocation}
                                  onChange={(e) => setSelectedLocation(e.target.value)}
                                >
                                  <option value="">-- Select Location --</option>
                                  {availableLocations.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                  ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><Wrench size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Asset</p>
                                <select 
                                  className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                  value={selectedAsset}
                                  onChange={(e) => handleAssetChange(e.target.value)}
                                >
                                  <option value="">-- Select Asset (Optional) --</option>
                                  {availableAssets.map(a => (
                                    <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                                  ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: System & Equip Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><Settings size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">System</p>
                                <select 
                                  className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                  value={selectedSystem}
                                  onChange={(e) => setSelectedSystem(e.target.value)}
                                >
                                  <option value="">-- Select System --</option>
                                  {availableSystems.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-slate-700">
                            <div className="p-2 bg-slate-100 rounded-lg mt-1"><Tag size={18} /></div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 font-bold uppercase">Equipment Type</p>
                                <select 
                                  className="w-full p-1 bg-white border-b border-slate-300 focus:border-blue-500 outline-none font-medium text-sm"
                                  value={selectedEquipType}
                                  onChange={(e) => setSelectedEquipType(e.target.value)}
                                >
                                  <option value="">-- Select Type --</option>
                                  {equipmentTypes.map(eq => (
                                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                                  ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description & Title Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Title</label>
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 border-b border-slate-300 focus:border-blue-500 outline-none text-lg font-bold text-slate-800 placeholder:font-normal"
                        placeholder="e.g. Water Leak in Pump Room"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-4 rounded-lg text-sm leading-relaxed border bg-white border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        rows={5}
                        placeholder="Describe the issue in detail..."
                    />
                 </div>
            </div>

            {/* Attachments Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <ImageIcon size={16} /> Attachments
                    </h4>
                    <label className="cursor-pointer text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-md flex items-center gap-1.5 border border-blue-100 transition-colors font-medium">
                        <Upload size={14} />
                        Add Photos
                        <input 
                            type="file" 
                            hidden 
                            accept="image/*" 
                            onChange={handleImageSelect}
                        />
                    </label>
                </div>

                {previewImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {previewImages.map((img, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                                <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => handleDeleteImage(idx)}
                                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow-md opacity-90 hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-sm">
                        No photos attached
                    </div>
                )}
            </div>

        </div>

        {/* Right Column (1 span) */}
        <div className="space-y-6">

             {/* Planning & Schedule Card */}
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-slate-600" />
                    Planning
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <User size={12} /> Assigned To
                        </label>
                        <select 
                            value={assignedToUserId}
                            onChange={(e) => setAssignedToUserId(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                        >
                            <option value="">-- Unassigned --</option>
                            {activeUsers.map(user => (
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
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>
            
            {/* Tasks Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="text-blue-600" size={20} />
                        Tasks & Checks
                    </h3>
                    <button 
                        onClick={handleAddTask}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                        title="Add Task"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="space-y-3">
                    {tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2">
                             <input 
                                type="checkbox" 
                                disabled 
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 bg-slate-100"
                             />
                             <input
                                type="text"
                                value={task.description}
                                onChange={(e) => handleTaskChange(task.id, e.target.value)}
                                placeholder="Task description..."
                                className="flex-1 text-sm border-b border-slate-200 focus:border-blue-500 outline-none py-1"
                                autoFocus={task.description === ''}
                             />
                             <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-slate-400 hover:text-red-500"
                             >
                                <Trash2 size={14} />
                             </button>
                        </div>
                    ))}
                    {tasks.length === 0 && (
                        <p className="text-sm text-slate-400 italic text-center py-4">No tasks added yet.</p>
                    )}
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};