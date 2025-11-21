
import React, { useState, useEffect } from 'react';
import { PMTemplate, Location, Asset, Company, Priority } from '../types';
import { X, MapPin, Wrench, PlayCircle, Building2, AlertCircle } from 'lucide-react';

interface PMGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: PMTemplate | null;
  locations: Location[];
  assets: Asset[];
  companies: Company[];
  onConfirm: (locationId: string, assetId: string, priority: Priority) => void;
  isProcessing: boolean;
}

export const PMGenerationModal: React.FC<PMGenerationModalProps> = ({
  isOpen,
  onClose,
  template,
  locations,
  assets,
  companies,
  onConfirm,
  isProcessing
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>(Priority.MEDIUM);

  // Reset state when template changes
  useEffect(() => {
    if (isOpen) {
      setSelectedLocation('');
      setSelectedAsset('');
      setSelectedPriority(Priority.MEDIUM);
    }
  }, [isOpen, template]);

  if (!isOpen || !template) return null;

  const company = companies.find(c => c.id === template.companyId);

  // 1. Filter Locations based on Template's Company
  const availableLocations = locations.filter(l => l.companyId === template.companyId);

  // 2. Filter Assets based on:
  //    - Template's Equipment Type
  //    - Template's System
  //    - Selected Location (if any)
  const availableAssets = assets.filter(a => 
    a.companyId === template.companyId &&
    String(a.equipmentTypeId) === String(template.equipmentTypeId) &&
    String(a.systemId) === String(template.systemId) &&
    (selectedLocation === '' || a.locationId === selectedLocation)
  );

  const handleConfirm = () => {
    if (!selectedLocation) {
      alert("Please select a location.");
      return;
    }
    onConfirm(selectedLocation, selectedAsset, selectedPriority);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Generate Work Order</h3>
            <p className="text-xs text-slate-500 mt-1">From Plan: {template.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Company Info (ReadOnly) */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
            <div className="bg-white p-2 rounded-full text-blue-600 shadow-sm">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-xs text-blue-500 font-bold uppercase">Company</p>
              <p className="text-sm font-medium text-slate-700">{company?.name || template.companyId}</p>
            </div>
          </div>

          {/* Location Selection (Required) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <MapPin size={16} className="text-slate-400" />
              Select Location <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setSelectedAsset(''); // Reset asset when location changes
              }}
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">-- Choose Location --</option>
              {availableLocations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            {availableLocations.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No locations found for this company.</p>
            )}
          </div>

          {/* Asset Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Wrench size={16} className="text-slate-400" />
              Select Specific Asset (Optional)
            </label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              disabled={!selectedLocation}
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">-- Specific Asset Not Required (TBD) --</option>
              {availableAssets.map(asset => (
                <option key={asset.id} value={asset.id}>{asset.name} ({asset.assetTag})</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Filtered by Equipment Type & System defined in PM Template.
            </p>
          </div>

           {/* Priority Selection */}
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-slate-400" />
              Priority Level
            </label>
            <div className="flex gap-2">
              {Object.values(Priority).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                    ${selectedPriority === p 
                      ? 'border-transparent ring-2 ring-offset-1 ring-blue-500 ' + (p === Priority.CRITICAL ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800')
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !selectedLocation}
            className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            {isProcessing ? 'Generating...' : 'Confirm & Generate'}
            {!isProcessing && <PlayCircle size={18} />}
          </button>
        </div>

      </div>
    </div>
  );
};
