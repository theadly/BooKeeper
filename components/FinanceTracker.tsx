import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, Category, StatusOption, BankTransaction, GoogleSheetsConfig } from '../types';
import {
  Plus, Search, Trash2, FileSpreadsheet, Edit, X, CheckSquare,
  Square, ChevronUp, ChevronDown, Undo2, Redo2, ArrowRight,
  FileText, ShieldCheck, Package, Info, Sheet, RefreshCw, Link2,
  CheckCircle, AlertTriangle, Copy, Zap
} from 'lucide-react';
import { CONFIG } from '../config';
import { FINANCE_STATUS_OPTIONS, CATEGORY_OPTIONS, formatCurrency, formatDate } from '../constants';
import { fetchSheetHeaders, autoDetectMapping, MAPPABLE_FIELDS } from '../services/googleSheetsService';

interface FinanceTrackerProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onBulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onBulkDeleteTransactions: (ids: string[]) => void;
  onExcelImport: (file: File) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isProcessing?: boolean;
  columnWidths: Record<string, number>;
  onColumnWidthChange: (widths: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  columnLabels: Record<string, string>;
  onUpdateColumnLabel: (key: string, label: string) => void;
  showAedEquivalent: boolean;
  bankTransactions: BankTransaction[];
  onReconcile: (transactionId: string, bankIds: string[], type: 'client' | 'laila') => void;
  onUnlink: (transactionId: string, type: 'client' | 'laila') => void;
  googleSheetsConfig: GoogleSheetsConfig;
  onSaveGoogleSheetsConfig: (config: GoogleSheetsConfig) => void;
  onSyncSheets: () => Promise<{ added: number; updated: number; skipped: number } | void>;
  isSyncingSheets: boolean;
  sheetSyncError?: string | null;
  onDeduplicate: () => Promise<number>;
}

interface SortConfig { key: string; direction: 'asc' | 'desc' | null; }

const FinanceTracker: React.FC<FinanceTrackerProps> = ({
  transactions, onAddTransaction, onUpdateTransaction, onBulkUpdateTransactions,
  onDeleteTransaction, onBulkDeleteTransactions, onExcelImport,
  onUndo, onRedo, canUndo, canRedo, isProcessing,
  columnWidths, onColumnWidthChange, columnLabels, showAedEquivalent, bankTransactions, onReconcile, onUnlink,
  googleSheetsConfig, onSaveGoogleSheetsConfig, onSyncSheets, isSyncingSheets, sheetSyncError, onDeduplicate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Google Sheets panel state
  const [isSheetPanelOpen, setIsSheetPanelOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(googleSheetsConfig?.sheetUrl ?? '');
  const [sheetMapping, setSheetMapping] = useState<Record<string, string>>(googleSheetsConfig?.columnMapping ?? {});
  const [sheetAutoSync, setSheetAutoSync] = useState(googleSheetsConfig?.autoSync ?? false);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [detectingHeaders, setDetectingHeaders] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [sheetsDetected, setSheetsDetected] = useState(Object.keys(googleSheetsConfig?.columnMapping ?? {}).length > 0);
  const [sheetSyncResult, setSheetSyncResult] = useState<{ added: number; updated: number; skipped: number } | null>(null);
  const [dedupeStatus, setDedupeStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [dedupeCount, setDedupeCount] = useState(0);
  const sheetPanelRef = useRef<HTMLDivElement>(null);

  const isSheetsConnected = !!(googleSheetsConfig?.sheetUrl && Object.keys(googleSheetsConfig?.columnMapping ?? {}).length > 0);

  // Sync local sheet state when config changes (e.g. after load from DB)
  useEffect(() => {
    if (googleSheetsConfig) {
      setSheetUrl(googleSheetsConfig.sheetUrl ?? '');
      setSheetMapping(googleSheetsConfig.columnMapping ?? {});
      setSheetAutoSync(googleSheetsConfig.autoSync ?? false);
      if (googleSheetsConfig.sheetUrl && Object.keys(googleSheetsConfig.columnMapping ?? {}).length > 0) {
        setSheetsDetected(true);
      }
    }
  }, [googleSheetsConfig]);

  const handleDetectColumns = async () => {
    if (!sheetUrl.trim()) return;
    setDetectingHeaders(true);
    setDetectError(null);
    setSheetsDetected(false);
    const { headers, error } = await fetchSheetHeaders(sheetUrl.trim());
    setDetectingHeaders(false);
    if (error) { setDetectError(error); return; }
    setSheetHeaders(headers);
    setSheetMapping(autoDetectMapping(headers));
    setSheetsDetected(true);
  };

  const handleSaveSheetConfig = () => {
    onSaveGoogleSheetsConfig({ sheetUrl, columnMapping: sheetMapping, autoSync: sheetAutoSync, lastSync: googleSheetsConfig?.lastSync });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const resizingCol = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const stickyX = { check: 0, actions: 40, year: 104, project: 104 + (columnWidths.year || 72) };

  const initialFormData: Partial<Transaction> = {
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.INCOME,
    category: Category.FREELANCE,
    amount: 0, project: '', customerName: '', currency: 'AED',
    clientStatus: 'Pending', ladlyStatus: 'Pending',
    referenceNumber: '', paymentToLmRef: '', invoiceNumber: '',
  };
  const [formData, setFormData] = useState<Partial<Transaction>>(initialFormData);

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => t.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setIsNewMenuOpen(false);
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) setIsYearDropdownOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingCol.current) return;
      const deltaX = e.clientX - resizingCol.current.startX;
      const newWidth = Math.max(50, resizingCol.current.startWidth + deltaX);
      onColumnWidthChange(prev => ({ ...prev, [resizingCol.current!.key]: newWidth }));
    };
    const handleMouseUp = () => { resizingCol.current = null; document.body.style.cursor = 'default'; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [onColumnWidthChange]);

  const startResizing = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    resizingCol.current = { key, startX: e.clientX, startWidth: columnWidths[key] || 100 };
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  };

  const sortedTransactions = useMemo(() => {
    let list = transactions.filter(t => {
      const matchesSearch = !searchTerm || t.project.toLowerCase().includes(searchTerm.toLowerCase()) || (t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesYear = yearFilter.length === 0 || yearFilter.includes(t.year.toString());
      return matchesSearch && matchesYear;
    });
    if (sortConfig.key && sortConfig.direction) {
      list.sort((a, b) => {
        let valA = (a as any)[sortConfig.key] ?? '';
        let valB = (b as any)[sortConfig.key] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return list;
  }, [transactions, searchTerm, yearFilter, sortConfig]);

  const summaryTotals = useMemo(() => {
    const income = sortedTransactions.filter(t => t.type === TransactionType.INCOME);
    const billable = income.filter(t => !['Draft', 'Void'].includes(t.clientStatus || ''));
    const outstanding = income.filter(t => ['Unpaid', 'Overdue', 'Sent'].includes(t.clientStatus));
    const drafts = income.filter(t => t.clientStatus === 'Draft');
    const pendingAdly = income.filter(t => t.ladlyStatus === 'Pending');
    return {
      count: sortedTransactions.length,
      revenue: billable.reduce((s, t) => s + (t.amount || 0), 0),
      totalFees: billable.reduce((s, t) => s + (t.fee || 0), 0),
      totalPayable: billable.reduce((s, t) => s + (t.payable || 0), 0),
      outstanding: outstanding.reduce((s, t) => s + (t.amount || 0), 0),
      draft: drafts.reduce((s, t) => s + (t.amount || 0), 0),
      pendingAdly: pendingAdly.reduce((s, t) => s + (t.payable || 0), 0),
    };
  }, [sortedTransactions]);

  const ResizableTh = ({ colKey, style = {}, align = 'left', label: customLabel }: { colKey: string; style?: React.CSSProperties; align?: 'left' | 'center' | 'right'; label?: string }) => {
    const label = customLabel || columnLabels[colKey] || colKey.toUpperCase();
    const isSorted = sortConfig.key === colKey;
    return (
      <th className={`px-3 py-3 sticky top-0 bg-surface-container-low border-b border-r border-surface-container z-[200] group relative select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`} style={{ ...style, width: columnWidths[colKey] || 100 }}>
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span className="truncate cursor-pointer hover:text-primary transition-colors font-medium text-[10px] text-on-surface-variant uppercase tracking-wider" onClick={() => setSortConfig(prev => ({ key: colKey, direction: prev.key === colKey && prev.direction === 'asc' ? 'desc' : 'asc' }))}>{label}</span>
          {isSorted && (sortConfig.direction === 'asc' ? <ChevronUp size={10} className="text-primary" /> : <ChevronDown size={10} className="text-primary" />)}
        </div>
        <div onMouseDown={(e) => startResizing(colKey, e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-[210] group/handle flex items-center justify-center hover:bg-primary/20 transition-all"><div className="w-px h-1/2 bg-outline-variant group-hover/handle:bg-primary" /></div>
      </th>
    );
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      'Paid': 'text-emerald-700 bg-emerald-50 border-emerald-200',
      'Paid to personal account': 'text-blue-700 bg-blue-50 border-blue-200',
      'Pending': 'text-amber-700 bg-amber-50 border-amber-200',
      'Unpaid': 'text-rose-700 bg-rose-50 border-rose-200',
      'Overdue': 'text-red-700 bg-red-50 border-red-200',
      'Draft': 'text-slate-500 bg-slate-50 border-slate-200',
      'Void': 'text-slate-400 bg-slate-50 border-slate-200',
    };
    return styles[status] || 'text-slate-500 bg-slate-50 border-slate-200';
  };

  const handleUpdateStatus = (id: string, field: 'clientStatus' | 'ladlyStatus', value: StatusOption) => {
    const tx = transactions.find(t => t.id === id);
    if (tx) onUpdateTransaction({ ...tx, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = { ...formData };
    if (!finalData.year && finalData.date) finalData.year = new Date(finalData.date).getFullYear();
    if (finalData.type === TransactionType.INCOME && finalData.amount) {
      const gross = Number(finalData.amount);
      const net = gross / (1 + CONFIG.VAT_RATE);
      finalData.net = Number(net.toFixed(2));
      finalData.vat = Number((gross - net).toFixed(2));
      finalData.fee = Number((net * CONFIG.ADLY_FEE_RATE).toFixed(2));
      finalData.payable = Number((net - (finalData.fee || 0)).toFixed(2));
      finalData.clientPayment = Number(((finalData.payable || 0) * (1 + CONFIG.VAT_RATE)).toFixed(2));
    }
    if (editingId) onUpdateTransaction({ ...finalData, id: editingId } as Transaction);
    else onAddTransaction({ ...finalData, id: crypto.randomUUID() } as Transaction);
    setIsModalOpen(false); setEditingId(null); setFormData(initialFormData);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Permanently delete this record?')) {
      onDeleteTransaction(id);
      if (selectedDetailId === id) setSelectedDetailId(null);
    }
  };

  const selectedTransaction = transactions.find(t => t.id === selectedDetailId);

  const thBase = "px-3 py-3 sticky top-0 bg-surface-container-low border-b border-r border-surface-container z-[250] text-center";
  const tdStickyBase = "py-3 sticky bg-surface-container-lowest group-hover:bg-surface-container-low z-[100] border-r border-surface-container transition-colors";

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm mx-1 mb-4 relative">

      {/* Header */}
      <div className="shrink-0 px-8 pt-6 pb-3">
        <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">Fiscal Cycle</p>
        <h1 className="font-serif text-2xl text-on-background mt-0.5">{formatDate(new Date())}</h1>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 px-6 py-3 flex flex-col xl:flex-row gap-3 border-b border-surface-container relative z-[1000]">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative" ref={newMenuRef}>
            <button onClick={() => setIsNewMenuOpen(!isNewMenuOpen)} className="bg-primary text-on-primary px-5 py-2 rounded-full font-semibold text-sm shadow-sm hover:bg-primary-dim transition-colors flex items-center gap-2 h-[38px]">
              <Plus size={15} strokeWidth={2.5} /> New Entry
            </button>
            {isNewMenuOpen && (
              <div className="absolute left-0 mt-2 w-60 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container z-[3000] overflow-hidden">
                <button onClick={() => { setFormData(initialFormData); setEditingId(null); setIsModalOpen(true); setIsNewMenuOpen(false); }} className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-container-low transition-all border-b border-surface-container">
                  <div className="p-2 bg-primary-container/40 rounded-lg text-primary"><Plus size={16}/></div>
                  <div><p className="text-sm font-semibold text-on-background">Manual Entry</p><p className="text-[10px] text-on-surface-variant">New single record</p></div>
                </button>
                <button onClick={() => { fileInputRef.current?.click(); setIsNewMenuOpen(false); }} className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-container-low transition-all">
                  <div className="p-2 bg-tertiary-container/40 rounded-lg text-tertiary"><FileSpreadsheet size={16}/></div>
                  <div><p className="text-sm font-semibold text-on-background">Excel Import</p><p className="text-[10px] text-on-surface-variant">Bulk import from file</p></div>
                </button>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={(e) => e.target.files?.[0] && onExcelImport(e.target.files[0])} />

          <div className="flex items-center bg-surface-container border border-surface-container-high rounded-full h-[38px] overflow-hidden shrink-0">
            <button disabled={!canUndo} onClick={onUndo} className="px-3 text-on-surface-variant hover:text-primary disabled:opacity-30 transition-all border-r border-surface-container-high h-full" title="Undo"><Undo2 size={15}/></button>
            <button disabled={!canRedo} onClick={onRedo} className="px-3 text-on-surface-variant hover:text-primary disabled:opacity-30 transition-all h-full" title="Redo"><Redo2 size={15}/></button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={15} />
            <input type="text" placeholder="Search projects, clients..." className="w-full bg-surface-container-low pl-10 pr-4 py-2 border border-surface-container rounded-full text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none h-[38px] text-on-background placeholder:text-on-surface-variant/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button onClick={() => { if (confirm(`Delete ${selectedIds.size} records?`)) { onBulkDeleteTransactions(Array.from(selectedIds)); setSelectedIds(new Set()); } }} className="bg-error/10 text-error border border-error/20 px-4 py-2 rounded-full font-semibold text-sm hover:bg-error/20 transition-all flex items-center gap-2 h-[38px] shrink-0 animate-in zoom-in-95">
              <Trash2 size={14} /> Delete ({selectedIds.size})
            </button>
          )}
          {availableYears.length > 1 && (
            <div className="relative shrink-0" ref={yearDropdownRef}>
              <button
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className={`flex items-center gap-1.5 px-4 h-[38px] rounded-full text-[11px] font-semibold uppercase tracking-wide border transition-all ${yearFilter.length > 0 ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface-container text-on-surface-variant border-surface-container-high hover:text-on-background'}`}
              >
                {yearFilter.length === 0 ? 'All Years' : yearFilter.length === 1 ? yearFilter[0] : `${yearFilter.length} Years`}
                <ChevronDown size={12} className={`transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isYearDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg z-[999] min-w-[140px] py-1.5 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => { setYearFilter([]); setIsYearDropdownOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-[11px] font-medium transition-colors ${yearFilter.length === 0 ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                  >All Years</button>
                  {availableYears.map(y => (
                    <button
                      key={y}
                      onClick={() => {
                        setYearFilter(prev => {
                          const str = y.toString();
                          const next = prev.includes(str) ? prev.filter(v => v !== str) : [...prev, str];
                          if (next.length === 0 || next.length === availableYears.length) { setIsYearDropdownOpen(false); return []; }
                          return next;
                        });
                      }}
                      className={`w-full px-4 py-2 text-left text-[11px] font-medium flex items-center gap-2 transition-colors ${yearFilter.includes(y.toString()) ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                    >
                      {yearFilter.includes(y.toString()) ? <CheckSquare size={12} className="text-primary" /> : <Square size={12} className="text-outline-variant" />}
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Google Sheets sync button */}
          <button
            onClick={() => setIsSheetPanelOpen(v => !v)}
            title="Google Sheets Sync"
            className={`flex items-center gap-1.5 px-3 h-[38px] rounded-full text-[11px] font-semibold uppercase tracking-wide border transition-all shrink-0 ${isSheetPanelOpen ? 'bg-emerald-600 text-white border-emerald-600' : isSheetsConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-surface-container text-on-surface-variant border-surface-container-high hover:text-on-background'}`}
          >
            {isSyncingSheets ? <RefreshCw size={14} className="animate-spin" /> : <Sheet size={14} />}
            <span className="hidden sm:inline">{isSheetsConnected ? 'Sheet' : 'Connect Sheet'}</span>
            {isSheetsConnected && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
          </button>

          {/* Deduplicate button */}
          <button
            onClick={async () => {
              setDedupeStatus('running');
              const removed = await onDeduplicate();
              setDedupeCount(removed);
              setDedupeStatus('done');
              setTimeout(() => setDedupeStatus('idle'), 3500);
            }}
            disabled={dedupeStatus === 'running'}
            title="Find & Remove Duplicates"
            className="flex items-center gap-1.5 px-3 h-[38px] rounded-full text-[11px] font-semibold uppercase tracking-wide border border-surface-container-high bg-surface-container text-on-surface-variant hover:text-on-background transition-all shrink-0 disabled:opacity-50"
          >
            <Copy size={13} className={dedupeStatus === 'running' ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">
              {dedupeStatus === 'running' ? 'Scanning...' : dedupeStatus === 'done' ? (dedupeCount > 0 ? `${dedupeCount} removed` : 'Clean') : 'Dedup'}
            </span>
          </button>
        </div>
      </div>

      {/* Google Sheets Panel */}
      {isSheetPanelOpen && (
        <div ref={sheetPanelRef} className="shrink-0 px-6 py-4 border-b border-surface-container bg-surface-container-low/50 animate-in slide-in-from-top-2 duration-200 z-[900]">
          <div className="flex items-start gap-4 flex-wrap">
            {/* URL + Detect */}
            <div className="flex-1 min-w-[280px] space-y-2">
              <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">Google Sheet URL</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full bg-surface-container-lowest border border-surface-container rounded-lg pl-8 pr-3 py-2 text-xs font-medium text-on-background outline-none focus:ring-2 focus:ring-primary/20"
                    value={sheetUrl}
                    onChange={e => { setSheetUrl(e.target.value); setSheetsDetected(false); setDetectError(null); }}
                  />
                </div>
                <button
                  onClick={handleDetectColumns}
                  disabled={detectingHeaders || !sheetUrl.trim()}
                  className="px-3 py-2 bg-primary text-on-primary rounded-lg text-[10px] font-medium uppercase tracking-wide disabled:opacity-50 shrink-0 hover:bg-primary-dim transition-colors"
                >
                  {detectingHeaders ? <RefreshCw size={11} className="animate-spin" /> : 'Detect'}
                </button>
              </div>
              {detectError && (
                <p className="text-[9px] text-error flex items-center gap-1"><AlertTriangle size={10}/> {detectError}</p>
              )}
              <p className="text-[8px] text-on-surface-variant">Sheet must be shared — <strong>Anyone with the link can view</strong></p>
            </div>

            {/* Column mapping (shown after detect) */}
            {(sheetsDetected && sheetHeaders.length > 0) && (
              <div className="flex-1 min-w-[240px] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">Column Mapping</p>
                  <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full ${Object.keys(sheetMapping).length >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {Object.keys(sheetMapping).length}/{MAPPABLE_FIELDS.length} detected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {MAPPABLE_FIELDS.map(({ key, label, required }) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className={`text-[8px] w-20 shrink-0 ${required ? 'font-semibold text-on-background' : 'text-on-surface-variant'}`}>{label}{required ? '*' : ''}</span>
                      <select
                        value={sheetMapping[key] || ''}
                        onChange={e => setSheetMapping(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 bg-surface-container border border-surface-container rounded px-1.5 py-1 text-[9px] font-medium text-on-background outline-none min-w-0"
                      >
                        <option value="">—</option>
                        {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0 min-w-[160px]">
              {/* Auto-sync toggle */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">Auto-sync on load</span>
                <button
                  type="button"
                  onClick={() => setSheetAutoSync(v => !v)}
                  className={`relative w-9 h-4 rounded-full transition-colors shrink-0 ${sheetAutoSync ? 'bg-emerald-500' : 'bg-surface-container-high'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${sheetAutoSync ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <button
                onClick={() => { handleSaveSheetConfig(); }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-surface-container border border-surface-container-high rounded-lg text-[10px] font-medium uppercase tracking-wide text-on-background hover:bg-surface-container-high transition-colors"
              >
                <CheckCircle size={12} /> Save Config
              </button>

              <button
                onClick={async () => {
                  handleSaveSheetConfig();
                  setSheetSyncResult(null);
                  const result = await onSyncSheets();
                  if (result) setSheetSyncResult(result);
                }}
                disabled={isSyncingSheets || (!sheetsDetected && !isSheetsConnected)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-medium uppercase tracking-wide hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={isSyncingSheets ? 'animate-spin' : ''} />
                {isSyncingSheets ? 'Syncing...' : 'Sync Now'}
              </button>

              {/* Result / status */}
              {sheetSyncResult && !sheetSyncError && (
                <p className="text-[9px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle size={10}/> {sheetSyncResult.added} added · {sheetSyncResult.updated} updated
                </p>
              )}
              {sheetSyncError && (
                <p className="text-[9px] text-error font-medium flex items-center gap-1">
                  <AlertTriangle size={10}/> {sheetSyncError}
                </p>
              )}
              {isSheetsConnected && googleSheetsConfig.lastSync && (
                <p className="text-[8px] text-on-surface-variant">Last sync: {new Date(googleSheetsConfig.lastSync).toLocaleString()}</p>
              )}
              {isSheetsConnected && googleSheetsConfig.autoSync && (
                <div className="flex items-center gap-1">
                  <Zap size={9} className="text-emerald-600" />
                  <span className="text-[8px] font-semibold text-emerald-600 uppercase">Auto-sync enabled</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Bar */}
      {sortedTransactions.length > 0 && (
        <div className="shrink-0 px-6 py-2 flex items-center gap-4 border-b border-surface-container bg-surface-container-low/30 text-[11px] font-medium flex-wrap">
          <span className="text-on-surface-variant">{summaryTotals.count} {summaryTotals.count === 1 ? 'entry' : 'entries'}</span>
          <span className="text-outline-variant">·</span>
          <span className="text-on-surface-variant">Revenue: <span className="font-serif text-on-background">{formatCurrency(summaryTotals.revenue, 'AED')}</span></span>
          <span className="text-outline-variant">·</span>
          <span className="text-on-surface-variant">Laila: <span className="font-serif text-primary">{formatCurrency(summaryTotals.totalPayable, 'AED')}</span></span>
          <span className="text-outline-variant">·</span>
          <span className="text-on-surface-variant">Adly: <span className="font-serif text-tertiary">{formatCurrency(summaryTotals.totalFees, 'AED')}</span></span>
          {summaryTotals.outstanding > 0 && (
            <>
              <span className="text-outline-variant">·</span>
              <span className="text-on-surface-variant">Outstanding: <span className="font-serif text-rose-600">{formatCurrency(summaryTotals.outstanding, 'AED')}</span></span>
            </>
          )}
          {summaryTotals.draft > 0 && (
            <>
              <span className="text-outline-variant">·</span>
              <span className="text-on-surface-variant">Draft: <span className="font-serif text-slate-500">{formatCurrency(summaryTotals.draft, 'AED')}</span></span>
            </>
          )}
          {summaryTotals.pendingAdly > 0 && (
            <>
              <span className="text-outline-variant">·</span>
              <span className="text-on-surface-variant">Pending from Adly: <span className="font-serif text-amber-600">{formatCurrency(summaryTotals.pendingAdly, 'AED')}</span></span>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 flex relative">
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0 min-w-max">
              <thead>
                <tr>
                  <th className={`${thBase} left-0 w-[40px]`}>
                    <button onClick={() => selectedIds.size === sortedTransactions.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(sortedTransactions.map(t => t.id)))}>
                      {selectedIds.size > 0 ? <CheckSquare size={15} className="text-primary"/> : <Square size={15} className="text-on-surface-variant"/>}
                    </button>
                  </th>
                  <th className={`${thBase} left-[40px] w-[64px]`}></th>
                  <ResizableTh colKey="year" label="Year" style={{ left: `104px` }} />
                  <ResizableTh colKey="project" label="Project" style={{ left: `${stickyX.project}px` }} />
                  <ResizableTh colKey="client" label="Client" />
                  <ResizableTh colKey="inv" label="Inv #" />
                  <ResizableTh colKey="cStatus" align="center" label="Client Status" />
                  <ResizableTh colKey="lStatus" align="center" label="Ladly Status" />
                  <ResizableTh colKey="amount" align="right" label="Invoice Amount" />
                  <ResizableTh colKey="vat" align="right" label="VAT" />
                  <ResizableTh colKey="net" align="right" label="Net" />
                  <ResizableTh colKey="fee" align="right" label="Fee" />
                  <ResizableTh colKey="payable" align="right" label="To Laila" />
                  <ResizableTh colKey="paid" align="right" label="LM Transfer" />
                  <ResizableTh colKey="paymentDate" align="center" label="Date Paid" />
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="font-serif text-lg text-on-background">No entries yet</p>
                          <p className="text-sm text-on-surface-variant mt-1">Add your first transaction or import from Excel</p>
                        </div>
                        <button onClick={() => { setFormData(initialFormData); setEditingId(null); setIsModalOpen(true); }} className="mt-1 bg-primary text-on-primary px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-dim transition-colors">
                          + New Entry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : sortedTransactions.map((t) => (
                  <tr key={t.id} onClick={() => setSelectedDetailId(t.id)} className={`group cursor-pointer transition-colors ${selectedDetailId === t.id ? 'bg-primary/5' : 'hover:bg-surface-container-low'}`}>
                    {/* Check */}
                    <td className={`${tdStickyBase} px-3 text-center left-0 w-[40px]`} onClick={(e) => { e.stopPropagation(); const s = new Set(selectedIds); s.has(t.id) ? s.delete(t.id) : s.add(t.id); setSelectedIds(s); }}>
                      {selectedIds.has(t.id) ? <CheckSquare size={15} className="text-primary"/> : <Square size={15} className="text-on-surface-variant opacity-0 group-hover:opacity-100"/>}
                    </td>
                    {/* Actions */}
                    <td className={`${tdStickyBase} px-1 text-center left-[40px] w-[64px]`}>
                      <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setFormData(t); setEditingId(t.id); setIsModalOpen(true); }} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Edit"><Edit size={13}/></button>
                        <button onClick={(e) => handleDelete(t.id, e)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all" title="Delete"><Trash2 size={13}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedDetailId(t.id); }} className={`p-1.5 rounded-lg transition-all ${(t.referenceNumber || t.paymentToLmRef) ? 'text-primary' : 'text-on-surface-variant hover:text-primary hover:bg-primary/10'}`} title="Details"><Info size={13}/></button>
                      </div>
                    </td>
                    {/* Year */}
                    <td className={`${tdStickyBase} px-4 text-on-surface-variant font-medium`} style={{ left: `104px` }}>{t.year}</td>
                    {/* Project */}
                    <td className={`${tdStickyBase} px-5 truncate`} style={{ left: `${stickyX.project}px`, width: columnWidths.project || 200 }}>
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-on-background group-hover:text-primary transition-colors truncate block">{t.project}</span>
                        {t.referenceNumber && <ShieldCheck size={12} className="text-primary shrink-0" />}
                      </div>
                    </td>
                    {/* Client */}
                    <td className="px-5 py-3 text-on-surface-variant font-medium truncate max-w-[180px] border-r border-surface-container">{t.customerName || '—'}</td>
                    {/* INV # */}
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-primary border-r border-surface-container">{t.invoiceNumber || '—'}</td>
                    {/* Client Status */}
                    <td className="px-3 py-3 text-center min-w-[140px] border-r border-surface-container" onClick={e => e.stopPropagation()}>
                      <select className={`w-full px-2 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-all cursor-pointer outline-none appearance-none text-center ${getStatusStyle(t.clientStatus)}`} value={t.clientStatus} onChange={(e) => handleUpdateStatus(t.id, 'clientStatus', e.target.value as StatusOption)}>
                        {FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-white text-slate-900">{opt}</option>)}
                      </select>
                    </td>
                    {/* Ladly Status */}
                    <td className="px-3 py-3 text-center min-w-[140px] border-r border-surface-container" onClick={e => e.stopPropagation()}>
                      <select className={`w-full px-2 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-all cursor-pointer outline-none appearance-none text-center ${getStatusStyle(t.ladlyStatus)}`} value={t.ladlyStatus} onChange={(e) => handleUpdateStatus(t.id, 'ladlyStatus', e.target.value as StatusOption)}>
                        {FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-white text-slate-900">{opt}</option>)}
                      </select>
                    </td>
                    {/* Amounts */}
                    <td className="px-5 py-3 text-right font-serif text-on-background border-r border-surface-container">{formatCurrency(t.amount, t.currency)}</td>
                    <td className="px-5 py-3 text-right text-on-surface-variant border-r border-surface-container">{formatCurrency(t.vat || 0, t.currency)}</td>
                    <td className="px-5 py-3 text-right font-serif text-on-background border-r border-surface-container">{formatCurrency(t.net || 0, t.currency)}</td>
                    <td className="px-5 py-3 text-right text-error border-r border-surface-container">{formatCurrency(t.fee || 0, t.currency)}</td>
                    <td className="px-5 py-3 text-right font-serif font-medium text-primary border-r border-surface-container">{formatCurrency(t.payable || 0, t.currency)}</td>
                    <td className="px-5 py-3 text-right font-serif text-tertiary border-r border-surface-container">{formatCurrency(t.clientPayment || 0, t.currency)}</td>
                    <td className="px-5 py-3 text-center text-on-surface-variant font-medium text-[11px]">{t.clientPaymentDate ? formatDate(t.clientPaymentDate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedTransaction && (
          <div className="w-[380px] bg-surface-container-lowest border-l border-surface-container flex flex-col shrink-0 animate-in slide-in-from-right-10 duration-300 z-[500]">
            <div className="p-6 border-b border-surface-container flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-container/40 text-primary rounded-lg"><Info size={20}/></div>
                <h3 className="font-serif text-lg text-on-background">Detail</h3>
              </div>
              <button onClick={() => setSelectedDetailId(null)} className="p-2 text-on-surface-variant hover:text-on-background rounded-lg hover:bg-surface-container transition-all"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div>
                <p className="text-[10px] font-medium text-primary uppercase tracking-widest mb-2">Reference</p>
                <h4 className="font-serif text-xl text-on-background leading-tight">{selectedTransaction.project}</h4>
                <div className="flex flex-wrap gap-2 pt-3">
                  <span className="px-3 py-1 bg-surface-container rounded-full text-[10px] font-semibold text-primary uppercase tracking-wider">{selectedTransaction.invoiceNumber || 'No Invoice'}</span>
                  {selectedTransaction.customerName && <span className="px-3 py-1 bg-surface-container rounded-full text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">{selectedTransaction.customerName}</span>}
                </div>
              </div>
              <div className="pt-4 border-t border-surface-container space-y-3">
                <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-widest">Financials</p>
                {[
                  { l: 'Invoice Amount', v: formatCurrency(selectedTransaction.amount, selectedTransaction.currency), c: 'font-serif text-lg text-on-background' },
                  { l: 'VAT (5%)', v: formatCurrency(selectedTransaction.vat || 0, selectedTransaction.currency), c: 'text-on-surface-variant' },
                  { l: 'Fee (15%)', v: formatCurrency(selectedTransaction.fee || 0, selectedTransaction.currency), c: 'text-error' },
                  { l: 'To Laila', v: formatCurrency(selectedTransaction.payable || 0, selectedTransaction.currency), c: 'font-serif text-xl text-primary' },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-on-surface-variant">{row.l}</span>
                    <span className={row.c}>{row.v}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl space-y-3">
                <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-widest">Bank References</p>
                <div>
                  <p className="text-[10px] text-on-surface-variant mb-1">Inward</p>
                  <p className="text-[11px] font-mono font-semibold text-primary truncate">{selectedTransaction.referenceNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant mb-1">Outward to LM</p>
                  <p className="text-[11px] font-mono font-semibold text-on-background truncate">{selectedTransaction.paymentToLmRef || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[5000] bg-on-background/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setIsModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-surface-container" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-6 flex justify-between items-center border-b border-surface-container bg-surface-container-low/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary text-on-primary rounded-xl"><Package size={22}/></div>
                <div>
                  <h2 className="font-serif text-xl text-on-background">{editingId ? 'Edit Entry' : 'New Entry'}</h2>
                  <p className="text-[11px] font-medium text-on-surface-variant mt-0.5">Manual record</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-on-surface-variant hover:text-on-background rounded-lg hover:bg-surface-container transition-all"><X size={22}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { label: 'Project', field: 'project', type: 'text', placeholder: 'e.g. Dyson Squad 2026', required: true },
                  { label: 'Client', field: 'customerName', type: 'text', placeholder: 'e.g. Weber Shandwick' },
                  { label: 'Date', field: 'date', type: 'date', required: true },
                  { label: 'Invoice Amount (AED)', field: 'amount', type: 'number', placeholder: '0.00', required: true },
                  { label: 'Invoice #', field: 'invoiceNumber', type: 'text', placeholder: 'INV-2026-001' },
                ].map(({ label, field, type, placeholder, required }) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{label}</label>
                    <input
                      type={type} required={required} placeholder={placeholder}
                      className="w-full bg-surface-container-low border border-surface-container rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={(formData as any)[field] || ''}
                      onChange={e => setFormData({ ...formData, [field]: type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Category</label>
                  <select className="w-full bg-surface-container-low border border-surface-container rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none appearance-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Client Status</label>
                  <select className="w-full bg-surface-container-low border border-surface-container rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none appearance-none" value={formData.clientStatus} onChange={e => setFormData({ ...formData, clientStatus: e.target.value as StatusOption })}>
                    {FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Internal Status</label>
                  <select className="w-full bg-surface-container-low border border-surface-container rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none appearance-none" value={formData.ladlyStatus} onChange={e => setFormData({ ...formData, ladlyStatus: e.target.value as StatusOption })}>
                    {FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-surface-container text-on-surface-variant font-semibold rounded-full hover:text-on-background transition-all text-sm">Cancel</button>
                <button type="submit" className="flex-[2] py-3 bg-primary text-on-primary font-semibold rounded-full shadow-sm hover:bg-primary-dim transition-colors text-sm flex items-center justify-center gap-2">Save Entry <ArrowRight size={16}/></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceTracker;
