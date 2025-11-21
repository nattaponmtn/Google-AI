
import React, { useState } from 'react';
import { PMTemplate, PMTemplateDetail, Company, System, EquipmentType } from '../types';
import { ChevronDown, ChevronUp, Clock, Building2, ListChecks, PlayCircle, Loader2, Search, Filter, RefreshCcw } from 'lucide-react';

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

  const resetFilters = () => {
      setSearchTerm('');
      setSelectedCompany('');
      setSelectedSystem('');
      setSelectedEquipType('');
  };

  const filteredTemplates = templates.filter(pm => {
      const matchesSearch = pm.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            pm.remarks.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCompany = !selectedCompany || pm.companyId === selectedCompany;
      const matchesSystem = !selectedSystem || pm.systemId === selectedSystem;
      const matchesEquip = !selectedEquipType || pm.equipmentTypeId === selectedEquipType;

      return matchesSearch && matchesCompany && matchesSystem && matchesEquip;
  });

  return (
    <div className="space-y-6 animate-fade-in">
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Filter size={16} className="text-blue-600" />
              Filter Templates
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search name or remarks..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
              </div>

              {/* Company Filter */}
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

              {/* System Filter */}
              <select
                  value={selectedSystem}
                  onChange={(e) => setSelectedSystem(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                  <option value="">All Systems</option>
                  {systems.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>

              {/* Equipment Type Filter */}
              <select
                  value={selectedEquipType}
                  onChange={(e) => setSelectedEquipType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                  <option value="">All Equipment Types</option>
                  {equipmentTypes.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                  ))}
              </select>
          </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400">No maintenance plans match your filters.</p>
            </div>
        ) : (
            filteredTemplates.map((pm) => {
                const company = companies.find(c => c.id === pm.companyId);
                const system = systems.find(s => s.id === pm.systemId);
                const details = pmDetails.filter(d => d.pmTemplateId === pm.id).sort((a, b) => a.stepNumber - b.stepNumber);
                const isGenerating = generatingId === pm.id;
                
                return (
                    <div key={pm.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div 
                            onClick={() => toggleExpand(pm.id)}
                            className="p-4 cursor-pointer bg-white hover:bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                        {pm.frequencyValue} {pm.frequencyType.toUpperCase()}
                                    </span>
                                    {company && (
                                        <span className="text-xs flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 rounded">
                                            <Building2 size={10} /> {company.name}
                                        </span>
                                    )}
                                    {system && (
                                        <span className="text-xs text-slate-400 border border-slate-200 px-1.5 rounded hidden sm:inline-block">
                                            {system.name}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-semibold text-slate-800">{pm.name}</h3>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{pm.remarks}</p>
                            </div>

                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Clock size={16} />
                                        <span>{pm.estimatedMinutes} mins</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ListChecks size={16} />
                                        <span>{details.length} Steps</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={(e) => handleGenerateClick(e, pm)}
                                    disabled={isGenerating}
                                    className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200 transition-all disabled:opacity-70"
                                >
                                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                                    Generate Job
                                </button>

                                <div className="text-slate-400">
                                    {expandedId === pm.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedId === pm.id && (
                            <div className="bg-slate-50 border-t border-slate-200 p-4">
                                <div className="flex justify-between items-center mb-3">
                                     <h4 className="text-sm font-bold text-slate-700">Checklist Steps</h4>
                                     <div className="text-xs text-slate-400">ID: {pm.id}</div>
                                </div>
                                
                                {details.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No specific steps defined for this template.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {details.map((step) => (
                                            <div key={step.id} className="flex items-start gap-3 bg-white p-3 rounded border border-slate-200">
                                                <div className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                    {step.stepNumber}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-800">{step.taskDescription}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        {step.isCritical && (
                                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                                CRITICAL
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                            Input: {step.expectedInputType}
                                                        </span>
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
