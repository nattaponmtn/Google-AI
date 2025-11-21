
import React, { useState } from 'react';
import { X, Camera, Search, Keyboard, ScanLine } from 'lucide-react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(true);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white flex items-center gap-2">
          <ScanLine className="text-blue-400" />
          <span className="font-bold text-lg">Scan QR Code</span>
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

             {/* Simulation Buttons (For Testing) */}
             <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-3 z-20 px-4">
               <button 
                 onClick={() => onScan('LAK-GEN-001')}
                 className="px-4 py-2 bg-emerald-600/90 text-white text-xs font-bold rounded-lg backdrop-blur-md shadow-lg hover:scale-105 transition-transform"
               >
                 Sim: Asset (LAK-GEN-001)
               </button>
               <button 
                 onClick={() => onScan('PMT-CTC-SYS013-EQ006')}
                 className="px-4 py-2 bg-blue-600/90 text-white text-xs font-bold rounded-lg backdrop-blur-md shadow-lg hover:scale-105 transition-transform"
               >
                 Sim: PM Group (PMT...EQ006)
               </button>
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
      <div className="bg-white rounded-t-3xl p-6 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-20">
        
        {/* Manual Input Form */}
        <form onSubmit={handleManualSubmit} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter Asset Tag or ID..."
              className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
            />
          </div>
          <button 
            type="submit"
            disabled={!manualCode.trim()}
            className="bg-blue-600 text-white px-5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            GO
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Supported Formats: Asset Tags, PM Template IDs, System IDs
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
