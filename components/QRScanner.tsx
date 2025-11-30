import React, { useState, useEffect } from 'react';
import { X, Search, Keyboard, ScanLine, Building2, MapPin, Settings, Tag } from 'lucide-react';
import { Company, Location, System, EquipmentType } from '../types';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string, filters?: { companyId?: string; locationId?: string }) => void;
  companies: Company[];
  locations: Location[];
  systems: System[];
  equipmentTypes: EquipmentType[];
}

export const QRScanner: React.FC<QRScannerProps> = ({ 
  isOpen, 
  onClose, 
  onScan,
  companies,
  locations,
  systems,
  equipmentTypes
}) => {
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(true);
  
  // Filter State
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [selectedEquipType, setSelectedEquipType] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
        setManualCode('');
        // Optional: Keep selections or reset them
        // setSelectedCompany('');
        // setSelectedLocation('');
        // setSelectedSystem('');
        // setSelectedEquipType('');
    }
  }, [isOpen]);

  // Logic to auto-construct PM ID based on selections
  useEffect(() => {
    if (selectedCompany && selectedSystem && selectedEquipType) {
        const company = companies.find(c => c.id === selectedCompany);
        
        // Robust Company Code Logic
        let compCode = company?.code;
        // Check if code is missing, empty, or just a dash, fallback to ID
        if (!compCode || compCode.trim() === '' || compCode === '-') {
            compCode = company?.id;
        }
        
        if (!compCode) compCode = 'CTC'; // Ultimate fallback if data is totally broken

        // Normalize equipment type: EQ-006 -> EQ006 (Remove hyphens)
        // Check if it exists before replace
        const eqId = selectedEquipType ? selectedEquipType.replace(/-/g, '') : '';
        
        const generatedId = `PMT-${compCode}-${selectedSystem}-${eqId}`;
        setManualCode(generatedId);
    }
  }, [selectedCompany, selectedSystem, selectedEquipType, companies]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim(), { 
          companyId: selectedCompany || undefined, 
          locationId: selectedLocation || undefined 
      });
      // Don't clear manualCode immediately if it's generated, let user see it
      if (!selectedSystem) setManualCode('');
    }
  };

  // Filter lists based on Company
  const filteredLocations = selectedCompany 
    ? locations.filter(l => l.companyId === selectedCompany) 
    : locations;
    
  const filteredSystems = selectedCompany
    ? systems.filter(s => s.companyId === selectedCompany)
    : systems;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white flex items-center gap-2">
          <ScanLine className="text-blue-400" />
          <span className="font-bold text-lg">Scan or Select</span>
        </div>
        <button onClick={onClose} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all">
          <X size={24} />
        </button>
      </div>

      {/* Camera Viewport (Simulated) */}
      <div className="flex-1 relative bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
        {isCameraActive ? (
          <>
             {/* Camera Feed Placeholder */}
             <div className="absolute inset-0 opacity-40">
                <div className="w-full h-full bg-[radial-gradient(circle,transparent_20%,#000_80%)]"></div>
                {/* Animated Scan Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
             </div>
             
             {/* Focus Frame */}
             <div className="relative w-64 h-64 border-2 border-white/50 rounded-3xl overflow-hidden z-10">
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white/70 text-xs font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Align QR code within frame</p>
               </div>
             </div>
          </>
        ) : (
          <div className="text-slate-500 flex flex-col items-center">
            <Keyboard size={48} className="mb-4 opacity-50" />
            <p>Manual Entry Mode</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-white rounded-t-3xl p-6 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-20 space-y-4 max-h-[60vh] overflow-y-auto">
        
        {/* Row 1: Company & Location */}
        <div className="grid grid-cols-2 gap-3">
             <div className="relative">
                 <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <select
                    value={selectedCompany}
                    onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        setSelectedLocation('');
                        setSelectedSystem('');
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium"
                 >
                     <option value="">Company</option>
                     {companies.map(c => (
                         <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                 </select>
             </div>
             <div className="relative">
                 <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium"
                    disabled={!selectedCompany && locations.length > 0} 
                 >
                     <option value="">Location</option>
                     {filteredLocations.map(l => (
                         <option key={l.id} value={l.id}>{l.name}</option>
                     ))}
                 </select>
             </div>
        </div>

        {/* Row 2: System & Equipment Type */}
        <div className="grid grid-cols-2 gap-3">
             <div className="relative">
                 <Settings size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <select
                    value={selectedSystem}
                    onChange={(e) => setSelectedSystem(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium"
                 >
                     <option value="">System</option>
                     {filteredSystems.map(s => (
                         <option key={s.id} value={s.id}>{s.name} {s.nameTh ? `(${s.nameTh})` : ''}</option>
                     ))}
                 </select>
             </div>
             <div className="relative">
                 <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <select
                    value={selectedEquipType}
                    onChange={(e) => setSelectedEquipType(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium"
                 >
                     <option value="">Equip. Type</option>
                     {equipmentTypes.map(eq => (
                         <option key={eq.id} value={eq.id}>
                             {eq.name} {eq.nameTh ? `/ ${eq.nameTh}` : ''}
                         </option>
                     ))}
                 </select>
             </div>
        </div>

        {/* Manual Input Form */}
        <form onSubmit={handleManualSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Asset Tag, Name, or PM ID..."
              className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>
          <button 
            type="submit"
            disabled={!manualCode.trim()}
            className="bg-blue-600 text-white px-5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            GO
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-400">
          Tip: Selecting all 3 filters (Company, System, Equip) will auto-generate PM ID.
        </p>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};