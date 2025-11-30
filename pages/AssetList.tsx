
import React, { useState, useMemo } from 'react';
import { Asset, System, Location, EquipmentType } from '../types';
import { Settings, MapPin, Search, AlertCircle, Hash, ChevronRight, LayoutGrid, Network, Building2, ChevronDown, ChevronUp, Tag, BarChart2 } from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
  systems: System[];
  locations: Location[];
  equipmentTypes: EquipmentType[];
  selectedCompanyId: string;
  onSelectAsset: (assetId: string) => void;
  onSelectGroup?: (type: 'system' | 'location' | 'equipmentType', id: string) => void;
}

type ViewMode = 'grid' | 'system' | 'location' | 'equipmentType';

export const AssetList: React.FC<AssetListProps> = ({ 
  assets, 
  systems, 
  locations, 
  equipmentTypes,
  selectedCompanyId, 
  onSelectAsset,
  onSelectGroup
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Helper to resolve names
  const getSystemName = (id: string) => systems.find(s => s.id === id)?.name || 'Unassigned System';
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || 'Unassigned Location';
  const getEquipTypeName = (id: string) => equipmentTypes.find(e => e.id === id)?.name || 'Unassigned Type';

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
        // Filter by company logic
        const matchesCompany = selectedCompanyId === 'all' || asset.assetTag.includes(selectedCompanyId) || asset.companyId === selectedCompanyId; 
        
        const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesCompany && matchesSearch;
    });
  }, [assets, selectedCompanyId, searchTerm]);

  // Grouping Logic
  const groupedData = useMemo(() => {
      if (viewMode === 'grid') return null;

      const groups: Record<string, Asset[]> = {};
      
      filteredAssets.forEach(asset => {
          let key = '';

          if (viewMode === 'system') {
              key = asset.systemId || 'unknown';
          } else if (viewMode === 'location') {
              key = asset.locationId || 'unknown';
          } else if (viewMode === 'equipmentType') {
              key = asset.equipmentTypeId || 'unknown';
          }

          if (!groups[key]) {
              groups[key] = [];
          }
          groups[key].push(asset);
      });

      // Sort keys based on name for display
      return Object.entries(groups).map(([id, items]) => {
          let name = 'Unknown';
          if (viewMode === 'system') name = getSystemName(id);
          else if (viewMode === 'location') name = getLocationName(id);
          else if (viewMode === 'equipmentType') name = getEquipTypeName(id);

          return { id, name, items };
      }).sort((a, b) => a.name.localeCompare(b.name));

  }, [filteredAssets, viewMode, systems, locations, equipmentTypes]);

  const renderAssetCard = (asset: Asset) => (
      <div 
         key={asset.id} 
         onClick={() => onSelectAsset(asset.id)}
         className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col cursor-pointer active:scale-[0.98] h-full"
      >
        <div className="h-40 bg-slate-100 relative overflow-hidden">
          <img 
            src={asset.imageUrl || `https://placehold.co/400x300?text=${asset.name}`} 
            alt={asset.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
          
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur-md ${
            asset.status === 'Active' 
              ? 'bg-emerald-500/90 text-white' 
              : 'bg-red-500/90 text-white'
          }`}>
            {asset.status}
          </div>
          
          <div className="absolute bottom-3 left-3 text-white">
             <p className="text-xs font-mono bg-black/40 px-1.5 py-0.5 rounded inline-block mb-1">{asset.assetTag}</p>
             <h3 className="font-bold text-sm leading-tight line-clamp-2 text-shadow">{asset.name}</h3>
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <span className="truncate font-medium">{getLocationName(asset.locationId)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Settings size={14} className="text-slate-400 shrink-0" />
              <span className="truncate">{getSystemName(asset.systemId)}</span>
            </div>

             <div className="flex items-center gap-2 text-xs text-slate-500">
              <Hash size={14} className="text-slate-400 shrink-0" />
              <span className="truncate font-mono">{asset.serialNumber}</span>
            </div>
          </div>

          <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${
                    asset.condition === 'Good' ? 'bg-emerald-500' : 
                    asset.condition === 'Fair' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-slate-500">{asset.condition}</span>
            </div>
            <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center">
                Details <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Asset Registry</h2>
            <p className="text-slate-500 text-sm">Total Machines: {filteredAssets.length}</p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-3 w-full md:w-auto">
            {/* View Mode Toggles */}
            <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Card View"
                >
                    <LayoutGrid size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('system')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all text-xs font-bold whitespace-nowrap ${viewMode === 'system' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Network size={18} />
                    <span className="hidden sm:inline">System</span>
                </button>
                <button 
                    onClick={() => setViewMode('location')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all text-xs font-bold whitespace-nowrap ${viewMode === 'location' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Building2 size={18} />
                    <span className="hidden sm:inline">Location</span>
                </button>
                <button 
                    onClick={() => setViewMode('equipmentType')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all text-xs font-bold whitespace-nowrap ${viewMode === 'equipmentType' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Tag size={18} />
                    <span className="hidden sm:inline">Type</span>
                </button>
            </div>

            <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search asset..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
            </div>
        </div>
      </div>

      {/* RENDER CONTENT */}
      {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssets.map(renderAssetCard)}
            {filteredAssets.length === 0 && (
               <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <AlertCircle size={48} className="mb-4 opacity-20" />
                  <p>No assets found matching your criteria.</p>
               </div>
            )}
          </div>
      ) : (
          <div className="space-y-4">
              {groupedData?.map((group) => {
                  const isExpanded = expandedGroups[group.id] ?? true; // Default to expanded
                  const activeCount = group.items.filter(a => a.status === 'Active').length;
                  const issueCount = group.items.length - activeCount;

                  return (
                      <div key={group.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          {/* Group Header */}
                          <div 
                            className="p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => toggleGroup(group.id)}
                          >
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg shrink-0 ${
                                      viewMode === 'system' ? 'bg-blue-100 text-blue-600' : 
                                      viewMode === 'location' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'
                                  }`}>
                                      {viewMode === 'system' ? <Network size={20} /> : viewMode === 'location' ? <MapPin size={20} /> : <Tag size={20} />}
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-slate-800 text-base">{group.name}</h3>
                                      <p className="text-xs text-slate-500">{group.items.length} Assets • {activeCount} Active</p>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                  {onSelectGroup && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectGroup(viewMode as any, group.id);
                                        }}
                                        className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 flex items-center gap-1 transition-colors"
                                    >
                                        <BarChart2 size={14} /> Analytics
                                    </button>
                                  )}
                                  
                                  {issueCount > 0 && (
                                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100 whitespace-nowrap">
                                          <AlertCircle size={12} /> {issueCount} Issues
                                      </span>
                                  )}
                                  <div className="text-slate-400">
                                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                  </div>
                              </div>
                          </div>

                          {/* Group Content */}
                          {isExpanded && (
                              <div className="p-4 bg-slate-50/50 border-t border-slate-200">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                      {group.items.map(renderAssetCard)}
                                  </div>
                              </div>
                          )}
                      </div>
                  );
              })}
              
              {groupedData?.length === 0 && (
                   <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <AlertCircle size={48} className="mb-4 opacity-20" />
                      <p>No asset groups found.</p>
                   </div>
              )}
          </div>
      )}
    </div>
  );
};
