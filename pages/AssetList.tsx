
import React, { useState } from 'react';
import { Asset, System, Location } from '../types';
import { Settings, MapPin, Search, AlertCircle, Hash } from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
  systems: System[];
  locations: Location[];
  selectedCompanyId: string;
  onSelectAsset: (assetId: string) => void;
}

export const AssetList: React.FC<AssetListProps> = ({ assets, systems, locations, selectedCompanyId, onSelectAsset }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to resolve names
  const getSystemName = (id: string) => systems.find(s => s.id === id)?.name || id;
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || id;

  const filteredAssets = assets.filter(asset => {
    // Filter by company logic
    const matchesCompany = selectedCompanyId === 'all' || asset.assetTag.includes(selectedCompanyId) || asset.companyId === selectedCompanyId; 
    
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCompany && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Asset Registry</h2>
            <p className="text-slate-500 text-sm">Total Machines: {filteredAssets.length}</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search asset tag, name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAssets.map((asset) => (
          <div key={asset.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
            <div className="h-36 bg-slate-100 relative overflow-hidden">
              <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold border uppercase ${
                asset.status === 'Active' 
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}>
                {asset.status}
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <div className="mb-2">
                  <h3 className="font-bold text-slate-800 truncate text-sm">{asset.name}</h3>
                  <p className="text-xs text-blue-600 font-mono">{asset.assetTag}</p>
              </div>
              
              <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin size={12} className="text-slate-400" />
                  <span className="truncate">{getLocationName(asset.locationId)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Settings size={12} className="text-slate-400" />
                  <span className="truncate">{getSystemName(asset.systemId)}</span>
                </div>

                 <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Hash size={12} className="text-slate-400" />
                  <span className="truncate">{asset.serialNumber}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <button 
                    onClick={() => onSelectAsset(asset.id)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                    View Details
                </button>
                <div className={`w-2 h-2 rounded-full ${
                    asset.condition === 'Good' ? 'bg-emerald-500' : 
                    asset.condition === 'Fair' ? 'bg-yellow-500' : 'bg-red-500'
                }`} title={`Condition: ${asset.condition}`}></div>
              </div>
            </div>
          </div>
        ))}

        {filteredAssets.length === 0 && (
           <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <AlertCircle size={48} className="mb-4 opacity-20" />
              <p>No assets found.</p>
           </div>
        )}
      </div>
    </div>
  );
};
