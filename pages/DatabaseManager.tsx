import React, { useState, useMemo } from 'react';
import { Company, Location, System, EquipmentType, Asset, PMTemplate, InventoryPart, Tool, StorageLocation } from '../types';
import { Search, Database, Table, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

interface DatabaseManagerProps {
  data: {
    companies: Company[];
    locations: Location[];
    systems: System[];
    equipmentTypes: EquipmentType[];
    assets: Asset[];
    pmTemplates: PMTemplate[];
    parts: InventoryPart[];
    tools: Tool[];
    storageLocations: StorageLocation[];
  };
}

type TableKey = keyof DatabaseManagerProps['data'];

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<TableKey>('assets');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const tables: { key: TableKey; label: string }[] = [
    { key: 'companies', label: 'Companies' },
    { key: 'locations', label: 'Locations' },
    { key: 'storageLocations', label: 'Storage Locs' },
    { key: 'systems', label: 'Systems' },
    { key: 'equipmentTypes', label: 'Equip Types' },
    { key: 'assets', label: 'Assets' },
    { key: 'pmTemplates', label: 'PM Templates' },
    { key: 'parts', label: 'Parts' },
    { key: 'tools', label: 'Tools' },
  ];

  const currentData = data[activeTab] || [];
  
  // Extract headers dynamically
  const headers = currentData.length > 0 ? Object.keys(currentData[0]) : [];

  // --- Logic: Sorting & Filtering ---
  const processedData = useMemo(() => {
    let result = [...currentData];

    // 1. Filter
    if (searchTerm) {
      result = result.filter((item: any) => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // 2. Sort
    if (sortConfig) {
      result.sort((a: any, b: any) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [currentData, searchTerm, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- Logic: Export to CSV ---
  const downloadCSV = () => {
    if (processedData.length === 0) return;

    const csvHeaders = headers.join(',');
    const csvRows = processedData.map((row: any) => {
      return headers.map(fieldName => {
        const val = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
        const escaped = String(val).replace(/"/g, '""'); // Escape double quotes
        return `"${escaped}"`;
      }).join(',');
    });

    const csvString = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexgen_${activeTab}_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- Helper: Smart Cell Renderer ---
  const renderCell = (key: string, value: any) => {
    if (value === null || value === undefined) return <span className="text-slate-300">-</span>;

    // Boolean / Status Checks
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${value ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {value ? 'True' : 'False'}
        </span>
      );
    }

    const strVal = String(value);

    // Status Coloring
    if (key.toLowerCase().includes('status') || key === 'isActive') {
       const isPositive = ['Active', 'Available', 'Good', 'Completed', 'Open'].includes(strVal) || strVal === 'true';
       const isNegative = ['Inactive', 'Lost', 'Disposed', 'Poor'].includes(strVal) || strVal === 'false';
       
       if (isPositive) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">{strVal}</span>;
       if (isNegative) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">{strVal}</span>;
       return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">{strVal}</span>;
    }

    // Date Formatting
    if ((key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) && strVal.includes('-') && strVal.length >= 10) {
        // Check if looks like date
        const d = new Date(strVal);
        if (!isNaN(d.getTime())) {
            return <span className="font-mono text-xs text-slate-600">{d.toLocaleDateString()}</span>;
        }
    }

    // Images
    if (key.toLowerCase().includes('image') && strVal.startsWith('http')) {
        return (
            <a href={strVal} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                <ExternalLink size={12} /> View Img
            </a>
        );
    }

    // ID Truncation
    if (key === 'id' || key.endsWith('Id')) {
        return <span className="font-mono text-xs text-slate-400" title={strVal}>{strVal.length > 8 ? strVal.substring(0, 8) + '...' : strVal}</span>;
    }

    return <span className="truncate max-w-xs block" title={strVal}>{strVal}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-blue-600" />
            Database Manager
          </h2>
          <p className="text-slate-500 text-sm">Inspect master data synchronized from Google Sheets</p>
        </div>
        
        <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
        >
            <Download size={16} />
            Export CSV
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {tables.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchTerm(''); setSortConfig(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === tab.key 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Table size={14} />
            {tab.label}
            <span className={`ml-1 text-xs py-0.5 px-1.5 rounded-full ${activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {data[tab.key]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search in ${activeTab}...`}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
           </div>
           <div className="flex items-center gap-2 text-sm text-slate-500 ml-auto">
             <Filter size={16} />
             <span>{processedData.length} records</span>
           </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {headers.map(header => (
                  <th 
                    key={header} 
                    onClick={() => requestSort(header)}
                    className="px-6 py-3 font-semibold tracking-wider bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1">
                        {header}
                        <span className="text-slate-300 group-hover:text-slate-500">
                            {sortConfig?.key === header ? (
                                sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                                <ArrowUpDown size={12} />
                            )}
                        </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  {headers.map(header => (
                    <td key={`${idx}-${header}`} className="px-6 py-3 text-slate-700">
                      {renderCell(header, row[header])}
                    </td>
                  ))}
                </tr>
              ))}
              {processedData.length === 0 && (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-12 text-center text-slate-400">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
