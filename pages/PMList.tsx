
import React, { useState, useEffect } from 'react';
import { PMTemplate, PMTemplateDetail, Company, System, EquipmentType } from '../types';
import { ChevronDown, ChevronUp, Clock, Building2, ListChecks, PlayCircle, Loader2, Search, Filter, RefreshCcw, ScanLine } from 'lucide-react';

interface PMListProps {
  templates: PMTemplate[];
  pmDetails: PMTemplateDetail[];
  companies: Company[];
  systems: System[];
  equipmentTypes: EquipmentType[];
  onGenerateWorkOrder: (template: PMTemplate) => void;
}

export const PMList: React.FC<PMListProps> = ({ 
    templates, 
    pmDetails, 
    companies, 
    systems,
    equipmentTypes,
    onGenerateWorkOrder 
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [selectedEquipType, setSelectedEquipType] = useState('');
  
  // Predicted ID State
  const [predictedId, setPredictedId] = useState('');

  // Effect to construct the PM ID automatically
  useEffect(() => {
    if (selectedCompany && selectedSystem && selectedEquipType) {
        const comp = companies.find(c => c.id === selectedCompany);
        // Fallback Logic:
        // 1. Try comp.code
        // 2. If code is '-' or empty, use comp.id
        // 3. Fallback to 'CTC'
        let compCode = comp?.code;
        if (!compCode || compCode === '-') {
            compCode = comp?.id;
        }
        if (!compCode) compCode = 'CTC'; // Ultimate fallback

        // System ID: Use as is
        const sysId = selectedSystem; 
        
        // Equipment ID: Remove hyphens to match PMT format (e.g., EQ-006 -> EQ006)
        const eqId = selectedEquipType.replace(/-/g, '');

        const pattern = `PMT-${compCode}-${sysId}-${eqId}`;
        setPredictedId(pattern);
    } else {
        setPredictedId('');
    }
  }, [selectedCompany, selectedSystem, selectedEquipType, companies]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleGenerateClick = (e: React.MouseEvent, pm: PMTemplate) => {
    e.stopPropagation();
    setGeneratingId(pm.id);
    
    // Simulate processing delay
    setTimeout(() => {
        onGenerateWorkOrder(pm);
        setGeneratingId(null);
    }, 800);
  };

  const handleSmartSearch = () => {
      if (predictedId) {
          setSearchTerm(predictedId);
      }
  };

  const resetFilters = () => {
      setSearchTerm('');
      setSelectedCompany('');
      setSelectedSystem('');
      setSelectedEquipType('');
      setPredictedId('');
  };

  const filteredTemplates = templates.filter(pm => {
      const matchesSearch = pm.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            pm.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            pm.remarks.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCompany = !selectedCompany || pm.companyId === selectedCompany;
      const matchesSystem = !selectedSystem || pm.systemId === selectedSystem;
      const matchesEquip = !selectedEquipType || pm.equipmentTypeId === selectedEquipType;

      return matchesSearch && matchesCompany && matchesSystem && matchesEquip;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Maintenance Plans</h2>
            <p className="text-slate-500 text-sm">Preventive Maintenance Templates & Checklists</p>
        </div>
        <button 
            onClick={resetFilters}
            className="text-xs font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 self-end md:self-auto"
        >
            <RefreshCcw size={12} /> Reset Filters
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Filter size={16} className="text-blue-600" />
                Filter & ID Builder
            </div>
            
            {/* Smart ID Preview & Action */}
            {predictedId && (
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 w-full md:w-auto animate-fade-in">
                    <span className="text-xs text-blue-500 font-bold uppercase">Pattern:</span>
                    <code className="text-sm font-mono font-bold text-blue-700">{predictedId}-...</code>
                    <button 
                        onClick={handleSmartSearch}
                        className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-md flex items-center gap-1 transition-colors"
                    >
                        <Search size={12} /> Search ID
                    </button>
                </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Company Filter */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Company</label>
                 <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                 >
                    <option value="">All Companies</option>
                    {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                 </select>
              </div>

              {/* System Filter */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">System</label>
                 <select
                    value={selectedSystem}
                    onChange={(e) => setSelectedSystem(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                 >
                    <option value="">All Systems</option>
                    {systems
                        .filter(s => !selectedCompany || s.companyId === selectedCompany)
                        .map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.nameTh ? `(${s.nameTh})` : ''}</option>
                    ))}
                 </select>
              </div>

              {/* Equipment Type Filter */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Equipment Type</label>
                 <select
                    value={selectedEquipType}
                    onChange={(e) => setSelectedEquipType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                 >
                    <option value="">All Equipment Types</option>
                    {equipmentTypes.map(eq => (
                        <option key={eq.id} value={eq.id}>
                            {eq.name} {eq.nameTh ? `/ ${eq.nameTh}` : ''}
                        </option>
                    ))}
                 </select>
              </div>

              {/* Free Text Search */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Search Keywords</label>
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search name, ID..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                  </div>
              </div>
          </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                <ScanLine size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">No matching PM Plans</h3>
                <p className="text-slate-400 text-sm max-w-md mt-1">
                    Try adjusting your filters or use the ID Builder above to find specific maintenance templates.
                </p>
                <button onClick={resetFilters} className="mt-4 text-blue-600 text-sm font-bold hover:underline">
                    Clear all filters
                </button>
            </div>
        ) : (
            filteredTemplates.map((pm) => {
                const company = companies.find(c => c.id === pm.companyId);
                const system = systems.find(s => s.id === pm.systemId);
                const details = pmDetails.filter(d => d.pmTemplateId === pm.id).sort((a, b) => a.stepNumber - b.stepNumber);
                const isGenerating = generatingId === pm.id;
                
                return (
                    <div key={pm.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                        <div 
                            onClick={() => toggleExpand(pm.id)}
                            className="p-4 cursor-pointer bg-white hover:bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                        {pm.id}
                                    </span>
                                    {company && (
                                        <span className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                                            <Building2 size={10} /> {company.name}
                                        </span>
                                    )}
                                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                        {pm.frequencyValue} {pm.frequencyType.toUpperCase()}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">
                                    {pm.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1 flex items-center gap-1">
                                    <span className="font-semibold text-slate-600">Note:</span> {pm.remarks || 'No additional remarks'}
                                </p>
                            </div>

                            <div className="flex items-center gap-4 md:gap-6 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <div className="flex items-center gap-1.5" title="Estimated Time">
                                        <Clock size={16} className="text-slate-400" />
                                        <span className="font-medium">{pm.estimatedMinutes}m</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Checklist Steps">
                                        <ListChecks size={16} className="text-slate-400" />
                                        <span className="font-medium">{details.length}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={(e) => handleGenerateClick(e, pm)}
                                    disabled={isGenerating}
                                    className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200 transition-all disabled:opacity-70 active:scale-95"
                                >
                                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                                    Generate
                                </button>

                                <div className="text-slate-400 bg-slate-50 p-1 rounded-full">
                                    {expandedId === pm.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedId === pm.id && (
                            <div className="bg-slate-50 border-t border-slate-200 p-4 animate-in slide-in-from-top-2">
                                <div className="flex justify-between items-center mb-3">
                                     <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <ListChecks size={16} /> Checklist Steps
                                     </h4>
                                </div>
                                
                                {details.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic bg-white p-4 rounded border border-slate-200 text-center">
                                        No specific steps defined for this template.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {details.map((step) => (
                                            <div key={step.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                <div className="bg-blue-50 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border border-blue-100">
                                                    {step.stepNumber}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-800">{step.taskDescription}</p>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {step.isCritical && (
                                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wide">
                                                                Critical Check
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                            Input: {step.expectedInputType}
                                                        </span>
                                                        {(step.standardMinValue || step.standardMaxValue) && (
                                                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                                Range: {step.standardMinValue ?? '-'} to {step.standardMaxValue ?? '-'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};
