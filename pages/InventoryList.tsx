
import React, { useState, useEffect } from 'react';
import { InventoryPart, StorageLocation } from '../types';
import { Package, Search, AlertTriangle, CheckCircle2, Plus, MapPin, DollarSign, Pencil, Trash2, Save, X, Loader2, Tag, Hash, Settings, Filter } from 'lucide-react';
import { createPart, updatePart, deletePart, createStorageLocation, deleteStorageLocation } from '../services/sheetService';

interface InventoryListProps {
  parts: InventoryPart[];
  storageLocations: StorageLocation[];
  onRefresh?: () => void;
}

const initialPartState: InventoryPart = {
  id: '',
  name: '',
  nameTh: '',
  stockQuantity: 0,
  minStockLevel: 0,
  unitPrice: 0,
  location: '',
  brand: '',
  category: ''
};

// Thai Categories
const CATEGORIES_TH = [
  'สิ้นเปลือง (Consumable)',
  'ไฟฟ้า (Electrical)',
  'เครื่องกล (Mechanical)',
  'เครื่องมือ (Tools)',
  'ทั่วไป (General)',
  'ความปลอดภัย (Safety)',
  'หล่อลื่น (Lubricant)'
];

export const InventoryList: React.FC<InventoryListProps> = ({ parts, storageLocations, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  const [localParts, setLocalParts] = useState<InventoryPart[]>(parts);
  const [localStorageLocations, setLocalStorageLocations] = useState<StorageLocation[]>(storageLocations);

  useEffect(() => {
      setLocalParts(parts);
      setLocalStorageLocations(storageLocations);
  }, [parts, storageLocations]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocationMgrOpen, setIsLocationMgrOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPart, setCurrentPart] = useState<InventoryPart>(initialPartState);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  const filteredParts = localParts.filter(part => {
    const searchLower = searchTerm.toLowerCase();
    const name = part.name || '';
    const nameTh = part.nameTh || '';
    const id = part.id || '';
    const location = part.location || '';

    const matchesSearch = name.toLowerCase().includes(searchLower) || 
                          nameTh.toLowerCase().includes(searchLower) ||
                          id.toLowerCase().includes(searchLower) ||
                          location.toLowerCase().includes(searchLower);

    const matchesStock = filterLowStock ? part.stockQuantity <= part.minStockLevel : true;
    
    return matchesSearch && matchesStock;
  });

  const lowStockCount = localParts.filter(p => p.stockQuantity <= p.minStockLevel).length;
  const totalValue = localParts.reduce((acc, p) => acc + (p.stockQuantity * (p.unitPrice || 0)), 0);

  const handleAdd = () => {
    setIsEditing(false);
    setCurrentPart({ ...initialPartState, id: `PART-${Date.now()}` }); 
    setIsModalOpen(true);
  };

  const handleEdit = (part: InventoryPart) => {
    setIsEditing(true);
    setCurrentPart({
        id: part.id,
        name: part.name || '',
        nameTh: part.nameTh || '',
        stockQuantity: Number(part.stockQuantity) || 0,
        minStockLevel: Number(part.minStockLevel) || 0,
        unitPrice: Number(part.unitPrice) || 0,
        location: part.location || '',
        brand: part.brand || '',
        category: part.category || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("ยืนยันการลบรายการนี้? (Are you sure?)")) {
       const previousParts = [...localParts];
       setLocalParts(prev => prev.filter(p => p.id !== id));
       
       try {
          const success = await deletePart(id);
          if (!success) throw new Error('Failed');
          if (onRefresh) onRefresh();
       } catch (error) {
          alert("เกิดข้อผิดพลาดในการลบ (Error deleting)");
          setLocalParts(previousParts);
       }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const optimisticPart = { ...currentPart };
    const previousParts = [...localParts];

    try {
      if (isEditing) {
         setLocalParts(prev => prev.map(p => p.id === optimisticPart.id ? optimisticPart : p));
      } else {
         setLocalParts(prev => [optimisticPart, ...prev]);
      }
      setIsModalOpen(false);

      let success = false;
      if (isEditing) {
        success = await updatePart(currentPart);
      } else {
        success = await createPart(currentPart);
      }

      if (success) {
        if (onRefresh) onRefresh();
      } else {
        throw new Error('API Failed');
      }
    } catch (error) {
      console.error(error);
      alert("บันทึกไม่สำเร็จ (Save failed)");
      setLocalParts(previousParts);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddStorageLocation = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!newLocationName.trim()) return;
      
      const tempId = `LOC-${Date.now()}`;
      const newLoc = { id: tempId, name: newLocationName };
      
      const prevLocs = [...localStorageLocations];
      setLocalStorageLocations(prev => [...prev, newLoc]);
      setNewLocationName('');

      try {
          const success = await createStorageLocation(newLocationName);
          if (!success) throw new Error('Failed');
          if (onRefresh) onRefresh();
      } catch (e) {
          alert("เพิ่มจุดเก็บของไม่สำเร็จ");
          setLocalStorageLocations(prevLocs);
      }
  };

  const handleDeleteStorageLocation = async (id: string) => {
      if(!window.confirm("ลบจุดเก็บของนี้?")) return;

      const prevLocs = [...localStorageLocations];
      setLocalStorageLocations(prev => prev.filter(l => l.id !== id));

      try {
          const success = await deleteStorageLocation(id);
          if (!success) throw new Error('Failed');
          if (onRefresh) onRefresh();
      } catch (e) {
          alert("ลบไม่สำเร็จ");
          setLocalStorageLocations(prevLocs);
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setCurrentPart(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24 md:pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">คลังอะไหล่ (Inventory)</h2>
          <p className="text-slate-500 text-sm">จัดการสต็อก จุดเก็บของ และต้นทุนอะไหล่</p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={handleAdd}
                className="w-full md:w-auto flex justify-center items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors font-medium"
            >
                <Plus size={18} />
                <span>เพิ่มอะไหล่ (Add Part)</span>
            </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Package size={24} />
              </div>
              <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">จำนวนรายการ (SKU)</p>
                  <h3 className="text-2xl font-bold text-slate-800">{localParts.length}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                  <AlertTriangle size={24} />
              </div>
              <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">สินค้าใกล้หมด (Low Stock)</p>
                  <h3 className="text-2xl font-bold text-slate-800">{lowStockCount}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                  <DollarSign size={24} />
              </div>
              <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">มูลค่ารวม (Total Value)</p>
                  <h3 className="text-2xl font-bold text-slate-800">฿{totalValue.toLocaleString()}</h3>
              </div>
          </div>
      </div>

      {/* Filters & List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
              <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="ค้นหาชื่อ, รหัส, หรือจุดเก็บ..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-900 select-none bg-white px-3 py-1.5 rounded border border-slate-200 sm:border-none sm:bg-transparent">
                      <input 
                        type="checkbox" 
                        checked={filterLowStock}
                        onChange={(e) => setFilterLowStock(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex items-center gap-1">
                        <Filter size={14} className="sm:hidden" /> 
                        แสดงเฉพาะใกล้หมด
                      </span>
                  </label>
              </div>
          </div>

          {/* DESKTOP VIEW: Table */}
          <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-3 font-semibold">รายการสินค้า (Item)</th>
                          <th className="px-6 py-3 font-semibold">จุดเก็บ (Location)</th>
                          <th className="px-6 py-3 font-semibold">ราคา (Price)</th>
                          <th className="px-6 py-3 font-semibold text-center">คงเหลือ (Stock)</th>
                          <th className="px-6 py-3 font-semibold text-center">สถานะ (Status)</th>
                          <th className="px-6 py-3 font-semibold text-right">จัดการ</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredParts.map((part) => {
                          const isLow = part.stockQuantity <= part.minStockLevel;
                          return (
                            <tr key={part.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 text-base">{part.nameTh || part.name}</span>
                                        <span className="text-xs text-slate-500">{part.name}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 rounded">{part.id}</span>
                                            {part.brand && <span className="text-[10px] text-blue-600 border border-blue-100 px-1.5 rounded-full">{part.brand}</span>}
                                            {part.category && <span className="text-[10px] text-slate-600 border border-slate-200 px-1.5 rounded-full">{part.category}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-slate-400" />
                                        <span>{part.location || '-'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                                    ฿{(part.unitPrice || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className={`font-bold text-lg ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                                        {part.stockQuantity}
                                    </div>
                                    <div className="text-xs text-slate-400">Min: {part.minStockLevel}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {isLow ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                                            <AlertTriangle size={12} /> เติมของด่วน
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                                            <CheckCircle2 size={12} /> ปกติ
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => handleEdit(part)}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="แก้ไข"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(part.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="ลบ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>

          {/* MOBILE VIEW: Card List */}
          <div className="md:hidden bg-slate-50">
              <div className="flex flex-col divide-y divide-slate-100">
                {filteredParts.map((part) => {
                   const isLow = part.stockQuantity <= part.minStockLevel;
                   return (
                     <div key={part.id} className="bg-white p-4 flex flex-col gap-3">
                        {/* Header: Name & Status */}
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                                <h3 className="font-bold text-slate-800 text-base leading-tight mb-0.5">{part.nameTh || part.name}</h3>
                                <p className="text-xs text-slate-500">{part.name}</p>
                            </div>
                            <div className={`flex flex-col items-end shrink-0 px-2 py-1 rounded ${isLow ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                <span className="text-lg font-bold leading-none">{part.stockQuantity}</span>
                                <span className="text-[10px] font-medium opacity-80">Min: {part.minStockLevel}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                             <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{part.id}</span>
                             {part.brand && <span className="text-[10px] text-blue-600 border border-blue-100 bg-blue-50 px-1.5 py-0.5 rounded-full">{part.brand}</span>}
                             {part.category && <span className="text-[10px] text-slate-600 border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded-full">{part.category}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-2 py-2 border-t border-slate-50 mt-1">
                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                <MapPin size={14} className="text-slate-400" />
                                <span className="truncate">{part.location || '-'}</span>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 text-sm text-slate-800 font-mono font-medium">
                                ฿{(part.unitPrice || 0).toLocaleString()}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mt-1">
                             <button 
                                onClick={() => handleEdit(part)}
                                className="col-span-3 flex items-center justify-center gap-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium text-sm transition-colors"
                             >
                                <Pencil size={16} /> แก้ไขข้อมูล
                             </button>
                             <button 
                                onClick={() => handleDelete(part.id)}
                                className="col-span-1 flex items-center justify-center py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                             >
                                <Trash2 size={16} />
                             </button>
                        </div>
                     </div>
                   );
                })}
              </div>
          </div>

          {filteredParts.length === 0 && (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center bg-white">
                  <Package size={48} className="mb-3 opacity-20" />
                  <p>ไม่พบรายการที่ค้นหา (No parts found)</p>
              </div>
          )}
      </div>

      {/* PART MODAL - FULL SCREEN ON MOBILE, CENTERED ON DESKTOP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl sm:max-w-2xl overflow-hidden flex flex-col transition-all">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-shrink-0 sticky top-0 z-10">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {isEditing ? <Pencil size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />}
                        {isEditing ? 'แก้ไขรายการ (Edit Part)' : 'เพิ่มอะไหล่ใหม่ (Add New Part)'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Scrollable Form Content */}
                <div className="overflow-y-auto flex-1 p-6 overscroll-contain">
                    <form id="partForm" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Names */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อสินค้า (English Name) <span className="text-red-500">*</span></label>
                                <input 
                                    type="text"
                                    name="name"
                                    value={currentPart.name || ''}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Ball Bearing 6205"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อไทย (Thai Name)</label>
                                <input 
                                    type="text"
                                    name="nameTh"
                                    value={currentPart.nameTh || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. ตลับลูกปืน 6205"
                                />
                            </div>

                            {/* Stock Info */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนคงเหลือ (Current Stock)</label>
                                <input 
                                    type="number"
                                    name="stockQuantity"
                                    value={currentPart.stockQuantity}
                                    onChange={handleInputChange}
                                    min="0"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">จุดเตือนขั้นต่ำ (Min Level)</label>
                                <input 
                                    type="number"
                                    name="minStockLevel"
                                    value={currentPart.minStockLevel}
                                    onChange={handleInputChange}
                                    min="0"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Price & Location */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ราคาต่อหน่วย (Unit Price)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">฿</span>
                                    <input 
                                        type="number"
                                        name="unitPrice"
                                        value={currentPart.unitPrice}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">จุดเก็บของ (Location)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            name="location"
                                            value={currentPart.location || ''}
                                            onChange={handleInputChange}
                                            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                                        >
                                            <option value="">-- เลือกจุดเก็บ --</option>
                                            {localStorageLocations.map(loc => (
                                                <option key={loc.id} value={loc.name}>{loc.name}</option>
                                            ))}
                                            {currentPart.location && !localStorageLocations.find(l => l.name === currentPart.location) && (
                                                <option value={currentPart.location}>{currentPart.location}</option>
                                            )}
                                        </select>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsLocationMgrOpen(true)}
                                        className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-slate-600"
                                        title="จัดการจุดเก็บ"
                                    >
                                        <Settings size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Details */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ยี่ห้อ/แบรนด์ (Brand)</label>
                                <div className="relative">
                                    <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text"
                                        name="brand"
                                        value={currentPart.brand || ''}
                                        onChange={handleInputChange}
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. SKF"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">หมวดหมู่ (Category)</label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        name="category"
                                        value={currentPart.category || ''}
                                        onChange={handleInputChange}
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                                    >
                                        <option value="">-- เลือกหมวดหมู่ --</option>
                                        {CATEGORIES_TH.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        {currentPart.category && !CATEGORIES_TH.includes(currentPart.category) && (
                                             <option value={currentPart.category}>{currentPart.category}</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Modal Footer (Sticky) */}
                <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0 flex justify-end gap-3 pb-safe">
                    <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        disabled={isProcessing}
                    >
                        ยกเลิก (Cancel)
                    </button>
                    <button 
                        type="submit"
                        form="partForm"
                        disabled={isProcessing}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium flex items-center gap-2 disabled:opacity-70"
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        บันทึก (Save)
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* STORAGE LOCATION MANAGER MODAL */}
      {isLocationMgrOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">จัดการจุดเก็บของ</h3>
                    <button onClick={() => setIsLocationMgrOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4">
                    <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border border-slate-100 rounded-lg p-2 bg-slate-50">
                        {localStorageLocations.length === 0 && <p className="text-center text-sm text-slate-400 py-4">ยังไม่มีจุดเก็บของ</p>}
                        {localStorageLocations.map(loc => (
                            <div key={loc.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-slate-200">
                                <span className="text-sm font-medium text-slate-700">{loc.name}</span>
                                <button onClick={() => handleDeleteStorageLocation(loc.id)} className="text-red-400 hover:text-red-600 p-1">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            placeholder="ชื่อจุดเก็บใหม่..."
                            className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                        />
                        <button 
                            type="button"
                            onClick={handleAddStorageLocation}
                            disabled={!newLocationName.trim()}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                        >
                            เพิ่ม
                        </button>
                    </div>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};
