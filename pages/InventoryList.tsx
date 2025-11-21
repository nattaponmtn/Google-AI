

import React, { useState } from 'react';
import { InventoryPart } from '../types';
import { Package, Search, AlertTriangle, CheckCircle2, Plus, MapPin, DollarSign, Tag } from 'lucide-react';

interface InventoryListProps {
  parts: InventoryPart[];
  onUpdateStock?: (partId: string, newQuantity: number) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ parts, onUpdateStock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  const filteredParts = parts.filter(part => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = part.name.toLowerCase().includes(searchLower) || 
                          (part.nameTh && part.nameTh.toLowerCase().includes(searchLower)) ||
                          part.id.toLowerCase().includes(searchLower) ||
                          (part.location && part.location.toLowerCase().includes(searchLower));

    const matchesStock = filterLowStock ? part.stockQuantity <= part.minStockLevel : true;
    
    return matchesSearch && matchesStock;
  });

  const lowStockCount = parts.filter(p => p.stockQuantity <= p.minStockLevel).length;
  const totalValue = parts.reduce((acc, p) => acc + (p.stockQuantity * p.unitPrice), 0);

  const handleAdjust = (part: InventoryPart) => {
      if (!onUpdateStock) return;
      const result = window.prompt(`Adjust stock for ${part.name}. Current: ${part.stockQuantity}`, part.stockQuantity.toString());
      if (result !== null) {
          const qty = parseInt(result, 10);
          if (!isNaN(qty) && qty >= 0) {
              onUpdateStock(part.id, qty);
          } else {
              alert("Please enter a valid number.");
          }
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Spare Parts Inventory</h2>
          <p className="text-slate-500 text-sm">Manage stock levels, costs, and locations.</p>
        </div>
        
        <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors">
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
                          <th className="px-6 py-3 font-semibold text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredParts.map((part) => {
                          const isLow = part.stockQuantity <= part.minStockLevel;
                          return (
                            <tr key={part.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-800">{part.name}</span>
                                        {part.nameTh && <span className="text-xs text-slate-500">{part.nameTh}</span>}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 rounded">{part.id}</span>
                                            {part.brand && <span className="text-[10px] text-blue-600 border border-blue-100 px-1.5 rounded-full">{part.brand}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-slate-400" />
                                        <span>{part.location}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-600">
                                    ฿{part.unitPrice.toLocaleString()}
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
                                    <button 
                                        onClick={() => handleAdjust(part)}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Adjust Stock
                                    </button>
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
    </div>
  );
};
