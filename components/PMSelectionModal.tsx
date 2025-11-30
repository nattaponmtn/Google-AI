
import React, { useState } from 'react';
import { PMTemplate, PMTemplateDetail } from '../types';
import { X, CheckSquare, Square, Clock, ListChecks, Calendar, PlayCircle, Loader2 } from 'lucide-react';

interface PMSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchedTemplates: PMTemplate[];
  pmDetails: PMTemplateDetail[];
  onConfirm: (selectedIds: string[]) => void;
  scannedCode: string;
  isProcessing: boolean;
}

export const PMSelectionModal: React.FC<PMSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  matchedTemplates,
  pmDetails,
  onConfirm,
  scannedCode,
  isProcessing
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === matchedTemplates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(matchedTemplates.map(t => t.id));
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length > 0) {
      onConfirm(selectedIds);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ListChecks className="text-blue-600" size={20} />
              Select Maintenance Plans
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-mono">Asset: {scannedCode}</p>
          </div>
          {!isProcessing && (
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} />
              </button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-sm text-slate-500 font-medium">Found {matchedTemplates.length} PM Plans</span>
            <button 
              onClick={toggleSelectAll}
              className="text-xs font-bold text-blue-600 hover:underline"
              disabled={isProcessing}
            >
              {selectedIds.length === matchedTemplates.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {matchedTemplates.map(pm => {
            const isSelected = selectedIds.includes(pm.id);
            const stepCount = pmDetails.filter(d => d.pmTemplateId === pm.id).length;

            return (
              <div 
                key={pm.id}
                onClick={() => !isProcessing && toggleSelection(pm.id)}
                className={`border rounded-xl p-4 cursor-pointer transition-all relative ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-sm' 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold text-sm ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>
                      {pm.name}
                    </h4>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                       <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                         <Calendar size={12} />
                         {pm.frequencyValue} {pm.frequencyType}
                       </span>
                       <span className="flex items-center gap-1">
                         <Clock size={12} />
                         {pm.estimatedMinutes} min
                       </span>
                       <span className="flex items-center gap-1">
                         <ListChecks size={12} />
                         {stepCount} Steps
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0 || isProcessing}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {isProcessing ? (
                <>
                    <Loader2 size={20} className="animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <PlayCircle size={20} />
                    Open {selectedIds.length} Work Orders
                </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
