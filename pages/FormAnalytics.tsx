
import React, { useState, useEffect, useMemo } from 'react';
import { fetchCSVData, CSVRow } from '../services/csvService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, FileSpreadsheet, Filter, RefreshCw, Calendar, PieChart as PieIcon, Table as TableIcon, AlertCircle, Plus, Trash2, Link as LinkIcon, Save, X, AlertTriangle, CheckCircle2, ListX } from 'lucide-react';

interface SheetConfig {
    id: string;
    name: string;
    url: string;
}

const COLORS_STATUS = ['#10b981', '#ef4444', '#f59e0b', '#64748b']; // Green, Red, Amber, Slate

// CORRECT URL: Must be "Published to Web" (pub?output=csv) to avoid CORS errors
const CORRECT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSPZCqpL2rlM0RNSH5cFm2IK_yCNdSqgPYKvjWQ1gS4okor_r3Rcceancu9PBpoEjz1l5EtYDwgPq1n/pub?output=csv";

const DEFAULT_SHEETS: SheetConfig[] = [
    {
        id: 'user-sheet-1',
        name: 'Daily Machine Check',
        url: CORRECT_URL
    }
];

// Keywords to detect status columns based on row content
const BAD_KEYWORDS = ['ผิดปกติ', 'abnormal', 'fail', 'not ok', 'เสีย', 'ชำรุด', 'ไม่ผ่าน', 'no', 'bad', 'leak', 'damage', 'พบความผิดปกติ'];
const GOOD_KEYWORDS = ['ปกติ', 'normal', 'pass', 'ok', 'ผ่าน', 'yes', 'good', 'ปกติทั้งหมด'];

export const FormAnalytics: React.FC = () => {
  // --- STATE: Data Sources ---
  const [sheets, setSheets] = useState<SheetConfig[]>(() => {
      try {
          const saved = localStorage.getItem('nexgen_form_sources');
          if (saved) {
              const parsed = JSON.parse(saved);
              // AUTO-FIX: If we find the old broken URL in storage, replace it with the working one
              if (Array.isArray(parsed)) {
                  return parsed.map((s: SheetConfig) => {
                      if (s.url && s.url.includes('/export?format=csv')) {
                          return { ...s, url: CORRECT_URL };
                      }
                      return s;
                  });
              }
          }
      } catch (e) {
          console.error("Failed to load saved sheets", e);
      }
      return DEFAULT_SHEETS;
  });

  const [activeSheetId, setActiveSheetId] = useState<string>(sheets[0]?.id || '');
  const [isManageMode, setIsManageMode] = useState(false);

  // --- STATE: New Sheet Input ---
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // --- STATE: Data & UI ---
  const [data, setData] = useState<CSVRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'dashboard' | 'issues' | 'table'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  // Save sheets to local storage
  useEffect(() => {
      localStorage.setItem('nexgen_form_sources', JSON.stringify(sheets));
  }, [sheets]);

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const loadData = async () => {
    if (!activeSheet) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await fetchCSVData(activeSheet.url);
      if (result.length === 0) throw new Error("No data found. Check the URL or permissions.");
      
      // Auto-detect timestamp column for sorting
      const headers = Object.keys(result[0]);
      const timeCol = headers.find(h => h.toLowerCase().includes('timestamp') || h.toLowerCase().includes('date') || h.toLowerCase().includes('เวลา'));

      const sorted = timeCol ? result.sort((a, b) => {
          const tA = new Date(String(a[timeCol] || ''));
          const tB = new Date(String(b[timeCol] || ''));
          return tB.getTime() - tA.getTime();
      }) : result;

      setData(sorted);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load CSV data. Make sure the Sheet is 'Published to Web' as CSV.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSheetId]);

  // --- HANDLERS ---
  const handleAddSheet = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName || !newUrl) return;
      const newSheet: SheetConfig = {
          id: `custom-${Date.now()}`,
          name: newName,
          url: newUrl
      };
      setSheets([...sheets, newSheet]);
      setActiveSheetId(newSheet.id);
      setNewName('');
      setNewUrl('');
      setIsManageMode(false);
  };

  const handleDeleteSheet = (id: string) => {
      if (sheets.length <= 1) {
          alert("Keep at least one source.");
          return;
      }
      if (window.confirm("Remove this source?")) {
          const newSheets = sheets.filter(s => s.id !== id);
          setSheets(newSheets);
          if (activeSheetId === id) setActiveSheetId(newSheets[0].id);
      }
  };

  // --- ANALYTICS LOGIC (Smart Checklist) ---
  const analytics = useMemo(() => {
    if (data.length === 0) return null;
    
    const headers = Object.keys(data[0]);
    
    // 1. Identify "Timestamp"
    const timeCol = headers.find(h => h.toLowerCase().includes('timestamp') || h.toLowerCase().includes('date') || h.toLowerCase().includes('วันที่') || h.toLowerCase().includes('เวลา'));
    
    // 2. Identify Status Columns (Dynamic Detection)
    // Looking for columns where the content contains keywords like "Normal" or "Abnormal"
    const statusCols = headers.filter(h => {
        if (h === timeCol) return false;
        // Check first 50 rows (increased sample size) to guess column type
        const sample = data.slice(0, 50).map(r => String(r[h]).toLowerCase());
        return sample.some(v => BAD_KEYWORDS.some(k => v.includes(k)) || GOOD_KEYWORDS.some(k => v.includes(k)));
    });

    // If no specific status columns found, fallback to reasonable columns
    const targetCols = statusCols.length > 0 ? statusCols : headers.filter(h => h !== timeCol);

    // 3. Process Rows
    let totalChecks = 0;
    let totalNormal = 0;
    let totalAbnormal = 0;
    
    const issueCountsByPoint: Record<string, { count: number, originalHeader: string }> = {};
    const issuesList: { id: string, timestamp: string, point: string, value: string, rowIdx: number, fullHeader: string }[] = [];
    const trendDataMap: Record<string, { date: string, normal: number, abnormal: number }> = {};

    data.forEach((row, idx) => {
        const tsRaw = timeCol ? String(row[timeCol]) : `Row ${idx+1}`;
        let tsDateStr = tsRaw;
        try {
            const d = new Date(tsRaw);
            if (!isNaN(d.getTime())) tsDateStr = d.toISOString().split('T')[0];
        } catch(e) {}

        if (!trendDataMap[tsDateStr]) trendDataMap[tsDateStr] = { date: tsDateStr, normal: 0, abnormal: 0 };

        targetCols.forEach(col => {
            const val = String(row[col] || '').toLowerCase();
            const originalVal = String(row[col] || '');
            
            // Clean Header Name logic: Extract text inside [] or remove leading numbers
            let cleanName = col;
            const bracketMatch = col.match(/\[(.*?)\]/);
            if (bracketMatch) {
                cleanName = bracketMatch[1]; // Get text inside brackets
            } else {
                cleanName = col.replace(/^[\d.]+\s*/, '').trim(); // Remove "1.1 "
            }

            // Simple heuristic to ignore very long headers if they are likely comments
            if (cleanName.length > 50) cleanName = cleanName.substring(0, 47) + '...';

            totalChecks++;
            
            if (BAD_KEYWORDS.some(k => val.includes(k))) {
                totalAbnormal++;
                trendDataMap[tsDateStr].abnormal++;
                
                // Track Issue by Point
                if (!issueCountsByPoint[cleanName]) issueCountsByPoint[cleanName] = { count: 0, originalHeader: col };
                issueCountsByPoint[cleanName].count++;

                // Add to Issues List
                issuesList.push({
                    id: `${idx}-${col}`,
                    timestamp: tsRaw,
                    point: cleanName,
                    fullHeader: col,
                    value: originalVal,
                    rowIdx: idx + 1
                });

            } else if (GOOD_KEYWORDS.some(k => val.includes(k))) {
                totalNormal++;
                trendDataMap[tsDateStr].normal++;
            }
        });
    });

    // 4. Prepare Chart Data
    const overallStatus = [
        { name: 'Normal (ปกติ)', value: totalNormal },
        { name: 'Abnormal (ผิดปกติ)', value: totalAbnormal },
    ];

    const issuesByPointData = Object.entries(issueCountsByPoint)
        .map(([name, obj]) => ({ name, count: obj.count, fullHeader: obj.originalHeader }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 10);

    const trendData = Object.values(trendDataMap).sort((a,b) => a.date.localeCompare(b.date)).slice(-30);

    return { 
        totalRows: data.length, 
        headers, 
        timeCol,
        totalChecks,
        totalAbnormal,
        totalNormal,
        overallStatus,
        issuesByPointData,
        trendData,
        issuesList
    };
  }, [data]);

  const filteredData = data.filter(row => 
     Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header & Source Control */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="text-green-600" />
                    Check Sheet Analytics
                </h2>
                <p className="text-slate-500 text-sm">
                    Dynamic visualization for Maintenance Checklists
                </p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select
                        value={activeSheetId}
                        onChange={(e) => {
                            if (e.target.value === 'ADD_NEW') {
                                setIsManageMode(true);
                            } else {
                                setActiveSheetId(e.target.value);
                            }
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                    >
                        {sheets.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                        <option value="ADD_NEW" className="text-blue-600 font-bold">+ Add New Source...</option>
                    </select>
                </div>
                
                <button 
                    onClick={() => setIsManageMode(!isManageMode)}
                    className={`p-2 rounded-lg border transition-colors ${isManageMode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    title="Manage Sources"
                >
                    <Plus size={20} className={isManageMode ? 'rotate-45 transition-transform' : 'transition-transform'} />
                </button>
                
                <button 
                    onClick={loadData}
                    disabled={loading}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>

        {/* Add/Manage Source Panel */}
        {isManageMode && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-700 text-sm">Manage Data Sources</h3>
                    <button onClick={() => setIsManageMode(false)}><X size={16} className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                
                <form onSubmit={handleAddSheet} className="flex flex-col md:flex-row gap-3 mb-4 border-b border-slate-200 pb-4">
                    <input 
                        type="text" 
                        placeholder="Name (e.g. Daily Pump Check)" 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
                        required
                    />
                    <div className="flex-[2] relative">
                         <input 
                            type="url" 
                            placeholder="Link from: File > Share > Publish to web > CSV" 
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                            required
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                            *Must be a direct CSV link, not the editing link.
                        </p>
                    </div>
                   
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 justify-center h-fit">
                        <Save size={16} /> Add
                    </button>
                </form>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {sheets.map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-white p-2 px-3 rounded border border-slate-200">
                            <div className="truncate flex-1">
                                <span className="font-medium text-sm text-slate-700">{s.name}</span>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{s.url}</p>
                            </div>
                            {sheets.length > 1 && (
                                <button onClick={() => handleDeleteSheet(s.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
              <p>Fetching data from Google Sheets...</p>
          </div>
      ) : error ? (
          <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center text-red-600">
              <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p className="font-bold">Unable to load data</p>
              <p className="text-sm mt-1 mb-4 opacity-80">{error}</p>
              <p className="text-xs text-slate-500">Ensure the Google Sheet is "Published to the web" as CSV.</p>
          </div>
      ) : (
          <>
            {/* View Toggle & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                    <button 
                        onClick={() => setViewMode('dashboard')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${viewMode === 'dashboard' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <PieIcon size={16} /> Dashboard
                    </button>
                    <button 
                        onClick={() => setViewMode('issues')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${viewMode === 'issues' ? 'bg-white shadow text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ListX size={16} /> Issues ({analytics?.totalAbnormal || 0})
                    </button>
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <TableIcon size={16} /> Raw Data
                    </button>
                </div>
                {viewMode === 'table' && (
                    <div className="relative w-full sm:w-64">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search raw data..."
                            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}
            </div>

            {/* View: Dashboard */}
            {viewMode === 'dashboard' && analytics && (
                <div className="space-y-6 animate-fade-in">
                    {/* KPI Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Submissions</p>
                            <h3 className="text-3xl font-bold text-slate-800">{analytics.totalRows}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-b-4 border-b-emerald-500">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Pass (ปกติ)</p>
                            <h3 className="text-3xl font-bold text-emerald-600">{analytics.totalNormal}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-b-4 border-b-red-500">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Fail (ผิดปกติ)</p>
                            <h3 className="text-3xl font-bold text-red-600">{analytics.totalAbnormal}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Checks Analyzed</p>
                            <h3 className="text-3xl font-bold text-blue-600">{analytics.totalChecks}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Issues by Machine (Bar Chart) */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <AlertTriangle size={20} className="text-orange-500" />
                                Top 10 Abnormal Points (จุดที่พบปัญหาบ่อย)
                            </h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.issuesByPointData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 11}} />
                                        <Tooltip contentStyle={{borderRadius: '8px'}} />
                                        <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} name="Abnormal Count" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Overall Status (Pie Chart) */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <PieIcon size={20} className="text-blue-600" />
                                Overall Health
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={analytics.overallStatus}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#10b981" />
                                            <Cell fill="#ef4444" />
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center mt-2">
                                <p className="text-xs text-slate-400">Based on all checklist items</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View: Issues List */}
            {viewMode === 'issues' && analytics && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                    <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                        <h3 className="font-bold text-red-800 flex items-center gap-2">
                            <AlertTriangle size={18} />
                            Found {analytics.issuesList.length} Abnormal Items
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Timestamp / Row</th>
                                    <th className="px-6 py-3">Checkpoint (จุดที่ตรวจ)</th>
                                    <th className="px-6 py-3">Recorded Value</th>
                                    <th className="px-6 py-3 text-right">Row Index</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {analytics.issuesList.map((issue, i) => (
                                    <tr key={i} className="hover:bg-red-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                                            {issue.timestamp}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {issue.point}
                                            <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{issue.fullHeader}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                {issue.value}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-slate-400">
                                            Row #{issue.rowIdx}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {analytics.issuesList.length === 0 && (
                            <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                <CheckCircle2 size={48} className="text-emerald-500 mb-2 opacity-50" />
                                <p>No issues found! Everything is Normal.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View: Raw Table */}
            {viewMode === 'table' && (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    {analytics?.headers.map((h, i) => (
                                        <th key={i} className="px-6 py-3 font-semibold bg-slate-50">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.slice(0, 100).map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                                        {analytics?.headers.map((h, cIdx) => {
                                            const val = String(row[h] || '');
                                            const isBad = BAD_KEYWORDS.some(k => val.toLowerCase().includes(k));
                                            const isGood = GOOD_KEYWORDS.some(k => val.toLowerCase().includes(k));
                                            
                                            return (
                                                <td key={cIdx} className="px-6 py-4 text-slate-700">
                                                    {isBad ? (
                                                        <span className="text-red-600 font-bold">{val}</span>
                                                    ) : isGood ? (
                                                        <span className="text-emerald-600 font-medium">{val}</span>
                                                    ) : (
                                                        val
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredData.length === 0 && (
                            <div className="p-12 text-center text-slate-400">No data matches your search.</div>
                        )}
                    </div>
                    {filteredData.length > 100 && (
                        <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                            Showing first 100 rows of {filteredData.length}
                        </div>
                    )}
                 </div>
            )}
          </>
      )}
    </div>
  );
};
