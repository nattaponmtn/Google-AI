
import React, { useState } from 'react';
import { InventoryPart } from '../types';
import { Package, Search, AlertTriangle, CheckCircle2, Plus, Filter, Settings2 } from 'lucide-react';

interface InventoryListProps {
  parts: InventoryPart[];
  onUpdateStock?: (partId: string, newQuantity: number) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ parts, onUpdateStock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          part.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStock = filterLowStock ? part.stockQuantity <= part.minStockLevel : true;
    
    return matchesSearch && matchesStock;
  });

  const lowStockCount = parts.filter(p => p.stockQuantity <= p.minStockLevel).length;

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
          <p className="text-slate-500 text-sm">Manage stock levels and parts for maintenance.</p>
        </div>
        
        <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm">
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
      </div>

      {/* Filters & List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="Search parts..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-900">
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
                          <th className="px-6 py-3 font-semibold text-center">Stock Level</th>
                          <th className="px-6 py-3 font-semibold text-center">Status</th>
                          <th className="px-6 py-3 font-semibold text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredParts.map((part) => {
                          const isLow = part.stockQuantity <= part.minStockLevel;
                          return (
                            <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-800">{part.name}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {part.id}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="font-bold text-slate-800">{part.stockQuantity}</div>
                                    <div className="text-xs text-slate-400">Min: {part.minStockLevel}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {isLow ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            <AlertTriangle size={12} /> Low Stock
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                            <CheckCircle2 size={12} /> Good
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleAdjust(part)}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1 justify-end ml-auto"
                                    >
                                        <Settings2 size={14} />
                                        Adjust
                                    </button>
                                </td>
                            </tr>
                          );
                      })}
                  </tbody>
              </table>
              {filteredParts.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                      No parts found matching your criteria.
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
