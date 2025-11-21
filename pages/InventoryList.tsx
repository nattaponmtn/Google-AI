




import React, { useState } from 'react';
import { InventoryPart } from '../types';
import { Package, Search, AlertTriangle, CheckCircle2, Plus, MapPin, DollarSign, Pencil, Trash2, Save, X, Loader2, Tag, Hash } from 'lucide-react';
import { createPart, updatePart, deletePart } from '../services/sheetService';

interface InventoryListProps {
  parts: InventoryPart[];
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

export const InventoryList: React.FC<InventoryListProps> = ({ parts, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPart, setCurrentPart] = useState<InventoryPart>(initialPartState);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredParts = parts.filter(part => {
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

  const lowStockCount = parts.filter(p => p.stockQuantity <= p.minStockLevel).length;
  const totalValue = parts.reduce((acc, p) => acc + (p.stockQuantity * (p.unitPrice || 0)), 0);

  // --- Handlers ---

  const handleAdd = () => {
    setIsEditing(false);
    setCurrentPart({ ...initialPartState, id: `PART-${Date.now()}` }); // Temp ID for new
    setIsModalOpen(true);
  };

  const handleEdit = (part: InventoryPart) => {
    setIsEditing(true);
    setCurrentPart({ ...part });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this part?")) {
       setIsProcessing(true); // Global processing state or local, using same for now
       try {
          const success = await deletePart(id);
          if (success) {
             if (onRefresh) onRefresh();
          } else {
             alert("Failed to delete part.");
          }
       } catch (error) {
          console.error(error);
          alert("Error deleting part.");
       } finally {
          setIsProcessing(false);
       }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      let success = false;
      if (isEditing) {
        success = await updatePart(currentPart);
      } else {
        success = await createPart(currentPart);
      }

      if (success) {
        setIsModalOpen(false);
        if (onRefresh) onRefresh();
      } else {
        alert(`Failed to ${isEditing ? 'update' : 'create'} part.`);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setCurrentPart(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Spare Parts Inventory</h2>
          <p className="text-slate-500 text-sm">Manage stock levels, costs, and locations.</p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={handleAdd}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors"
            >
                <Plus size={18} />
                <span className="hidden md:inline">Add Part</span>
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
                  <p className="text-slate-500 text-xs uppercase font-bold">Total SKU</p>
                  <h3 className="text-2xl font-bold text-slate-800">{parts.length}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                  <AlertTriangle size={24} />
              </div>
              <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">Low Stock</p>
                  <h3 className="text-2xl font-bold text-slate-800">{lowStockCount}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                  <DollarSign size={24} />
              </div>
              <div>
                  <p className="text-slate-500 text-xs uppercase font-bold">Total Value</p>
                  <h3 className="text-2xl font-bold text-slate-800">฿{totalValue.toLocaleString()}</h3>
              </div>
          </div>
      </div>

      {/* Filters & List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
              <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="Search by name, ID, or location..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-900 select-none">
                      <input 
                        type="checkbox" 
                        checked={filterLowStock}
                        onChange={(e) => setFilterLowStock(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      Show Low Stock Only
                  </label>
              </div>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-3 font-semibold">Part Details</th>
                          <th className="px-6 py-3 font-semibold">Location</th>
                          <th className="px-6 py-3 font-semibold">Unit Price</th>
                          <th className="px-6 py-3 font-semibold text-center">Stock Level</th>
                          <th className="px-6 py-3 font-semibold text-center">Status</th>
                          <th className="px-6 py-3 font-semibold text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredParts.map((part) => {
                          const isLow = part.stockQuantity <= part.minStockLevel;
                          return (
                            <tr key={part.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-800">{part.name || 'Unnamed Part'}</span>
                                        {part.nameTh && <span className="text-xs text-slate-500">{part.nameTh}</span>}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 rounded">{part.id}</span>
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
                                <td className="px-6 py-4 font-mono text-slate-600">
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
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                            <AlertTriangle size={12} /> Low Stock
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <CheckCircle2 size={12} /> Good
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => handleEdit(part)}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Edit Part"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(part.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete Part"
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
              {filteredParts.length === 0 && (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                      <Package size={48} className="mb-3 opacity-20" />
                      <p>No parts found matching your search.</p>
                  </div>
              )}
          </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {isEditing ? <Pencil size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />}
                        {isEditing ? 'Edit Part' : 'Add New Part'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Part Name (English)</label>
                            <input 
                                type="text"
                                name="name"
                                value={currentPart.name}
                                onChange={handleInputChange}
                                required
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Ball Bearing 6205"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Part Name (Thai)</label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Stock</label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Min. Stock Level</label>
                            <input 
                                type="number"
                                name="minStockLevel"
                                value={currentPart.minStockLevel}
                                onChange={handleInputChange}
                                min="0"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Pricing & Location */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price (THB)</label>
                            <input 
                                type="number"
                                name="unitPrice"
                                value={currentPart.unitPrice}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Storage Location</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text"
                                    name="location"
                                    value={currentPart.location}
                                    onChange={handleInputChange}
                                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Shelf A-01"
                                />
                            </div>
                        </div>

                        {/* Details */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <div className="relative">
                                <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text"
                                    name="category"
                                    value={currentPart.category || ''}
                                    onChange={handleInputChange}
                                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Bearings"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isProcessing}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium flex items-center gap-2 disabled:opacity-70"
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
