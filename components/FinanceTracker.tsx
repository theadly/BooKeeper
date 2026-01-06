import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, Category, StatusOption, BankTransaction } from '../types';
import { 
  Plus, Search, Trash2, FileSpreadsheet, Edit, X, CheckSquare, 
  Square, ChevronUp, ChevronDown, 
  Check, Link as LinkIcon, Save, ExternalLink, Calculator, InfoIcon,
  Fingerprint, Hash, CreditCard, Globe, Undo2, Redo2, ArrowRight,
  FileText, Landmark, ShieldCheck, ChevronRight, LayoutGrid, List,
  Calendar as CalendarIcon, User, Package, Info
} from 'lucide-react';
import { CONFIG } from '../config';
import { FINANCE_STATUS_OPTIONS, CATEGORY_OPTIONS, formatCurrency, formatDate } from '../constants';

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
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc' | null;
}

const FinanceTracker: React.FC<FinanceTrackerProps> = ({ 
  transactions, onAddTransaction, onUpdateTransaction, onBulkUpdateTransactions,
  onDeleteTransaction, onBulkDeleteTransactions, onExcelImport, 
  onUndo, onRedo, canUndo, canRedo,
  isProcessing,
  columnWidths, onColumnWidthChange, columnLabels, showAedEquivalent, bankTransactions, onReconcile, onUnlink
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const resizingCol = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const stickyX = { check: 0, edit: 56, delete: 112, link: 168, year: 224, project: 224 + (columnWidths.year || 80) };

  const initialFormData: Partial<Transaction> = {
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.INCOME,
    category: Category.FREELANCE,
    amount: 0,
    project: '',
    customerName: '',
    currency: 'AED',
    clientStatus: 'Pending',
    ladlyStatus: 'Pending',
    referenceNumber: '',
    paymentToLmRef: '',
    invoiceNumber: '',
  };

  const [formData, setFormData] = useState<Partial<Transaction>>(initialFormData);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
        setIsNewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingCol.current) return;
      const targetKey = resizingCol.current.key;
      const deltaX = e.clientX - resizingCol.current.startX;
      const newWidth = Math.max(50, resizingCol.current.startWidth + deltaX);
      onColumnWidthChange(prev => ({ ...prev, [targetKey]: newWidth }));
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
      const matchesType = typeFilter === 'All' || t.type === typeFilter;
      return matchesSearch && matchesYear && matchesType;
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
  }, [transactions, searchTerm, yearFilter, typeFilter, sortConfig]);

  const ResizableTh = ({ colKey, style = {}, align = 'left', label: customLabel }: { colKey: string; style?: React.CSSProperties; align?: 'left'|'center'|'right'; label?: string }) => {
    const label = customLabel || columnLabels[colKey] || colKey.toUpperCase();
    const isSorted = sortConfig.key === colKey;
    return (
      <th 
        className={`px-3 py-4 sticky top-0 bg-white dark:bg-slate-900 border-b border-r border-slate-300 dark:border-slate-600 z-[200] group relative select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`} 
        style={{ ...style, width: columnWidths[colKey] || 100 }}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span className="truncate cursor-pointer hover:text-primary transition-colors font-black text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest" onClick={() => setSortConfig(prev => ({ key: colKey, direction: prev.key === colKey && prev.direction === 'asc' ? 'desc' : 'asc' }))}>{label}</span>
          {isSorted && (sortConfig.direction === 'asc' ? <ChevronUp size={10} className="text-primary" /> : <ChevronDown size={10} className="text-primary" />)}
        </div>
        <div onMouseDown={(e) => startResizing(colKey, e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-[210] group/handle flex items-center justify-center bg-slate-100/30 dark:bg-slate-800/30 hover:bg-primary/40 transition-all"><div className="w-px h-1/2 bg-slate-300 dark:bg-slate-600 group-hover/handle:bg-primary" /></div>
      </th>
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    const styles: Record<string, string> = {
      'Paid': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
      'Paid to personal account': 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800',
      'Pending': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',
      'Unpaid': 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800',
      'Overdue': 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800',
      'Draft': 'text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800',
    };
    return styles[status] || 'text-slate-400 bg-slate-50 border-slate-100';
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
    if (confirm('Permanently delete this ledger record? This action is irreversible.')) {
      onDeleteTransaction(id);
      if (selectedDetailId === id) setSelectedDetailId(null);
    }
  };

  const selectedTransaction = transactions.find(t => t.id === selectedDetailId);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-bg-card rounded-[3rem] border border-slate-300 dark:border-slate-600 shadow-2xl mx-1 mb-4 relative">
      <div className="shrink-0 px-10 pt-10 pb-4">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Fiscal Cycle</p>
         <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{formatDate(new Date())}</h1>
      </div>

      <div className="shrink-0 px-10 py-6 flex flex-col xl:flex-row gap-6 border-b border-slate-300 dark:border-slate-600 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md relative z-[1000]">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative" ref={newMenuRef}>
            <button onClick={() => setIsNewMenuOpen(!isNewMenuOpen)} className="bg-[#009A92] text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 h-[52px]"><Plus size={20} strokeWidth={3} /> NEW</button>
            {isNewMenuOpen && (
              <div className="absolute left-0 mt-3 w-72 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 z-[3000] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                <button onClick={() => { setFormData(initialFormData); setEditingId(null); setIsModalOpen(true); setIsNewMenuOpen(false); }} className="w-full flex items-center gap-4 p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-b border-slate-100 dark:border-slate-800"><div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-2xl text-teal-600"><Plus size={20}/></div><div className="flex flex-col"><span className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Manual Entry</span><span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">New Single Protocol</span></div></button>
                <button onClick={() => { fileInputRef.current?.click(); setIsNewMenuOpen(false); }} className="w-full flex items-center gap-4 p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600"><FileSpreadsheet size={20}/></div><div className="flex flex-col"><span className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white">EXCEL IMPORT</span><span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">Bulk System Ingestion</span></div></button>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={(e) => e.target.files?.[0] && onExcelImport(e.target.files[0])} />

          <div className="flex items-center gap-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-1 py-1 rounded-[1.4rem] shadow-sm h-[52px] shrink-0">
             <button disabled={!canUndo} onClick={onUndo} className="px-5 text-slate-400 hover:text-primary disabled:opacity-20 transition-all border-r border-slate-300 dark:border-slate-600 h-full" title="Undo"><Undo2 size={20}/></button>
             <button disabled={!canRedo} onClick={onRedo} className="px-5 text-slate-400 hover:text-primary disabled:opacity-20 transition-all h-full" title="Redo"><Redo2 size={20}/></button>
          </div>

          <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Global search..." className="w-full bg-white dark:bg-slate-950 pl-14 pr-6 py-4 border border-slate-300 dark:border-slate-600 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none shadow-inner h-[52px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {selectedIds.size > 0 && (
            <button onClick={() => { if(confirm(`Confirm deletion of ${selectedIds.size} records?`)) onBulkDeleteTransactions(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="bg-rose-50 text-rose-600 border border-rose-300 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm animate-in zoom-in-95 hover:bg-rose-100 transition-all flex items-center gap-2 h-[52px] shrink-0"><Trash2 size={16} /> DELETE ({selectedIds.size})</button>
          )}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shrink-0 h-[52px] items-center border border-slate-300 dark:border-slate-600">
              {['All', 'Income', 'Expense'].map((t: any) => (<button key={t} onClick={() => setTypeFilter(t)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === t ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex relative">
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0 min-w-max">
              <thead>
                <tr className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
                  <th className="px-6 py-5 text-center sticky top-0 left-0 z-[250] bg-white dark:bg-slate-900 border-b border-r border-slate-300 dark:border-slate-600 w-[56px]">
                      <button onClick={() => selectedIds.size === sortedTransactions.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(sortedTransactions.map(t => t.id)))}>{selectedIds.size > 0 ? <CheckSquare size={16} className="text-primary"/> : <Square size={16} className="text-slate-400"/>}</button>
                  </th>
                  <th className="px-4 py-5 text-center sticky top-0 left-[56px] z-[250] bg-white dark:bg-slate-900 border-b border-r border-slate-300 dark:border-slate-600 w-[56px] text-[9px] font-black text-slate-500 uppercase tracking-widest">EDIT</th>
                  <th className="px-4 py-5 text-center sticky top-0 left-[112px] z-[250] bg-white dark:bg-slate-900 border-b border-r border-slate-300 dark:border-slate-600 w-[56px] text-[9px] font-black text-slate-500 uppercase tracking-widest">TRASH</th>
                  <th className="px-4 py-5 text-center sticky top-0 left-[168px] z-[250] bg-white dark:bg-slate-900 border-b border-r border-slate-300 dark:border-slate-600 w-[56px] text-[9px] font-black text-slate-500 uppercase tracking-widest">LINK</th>
                  <ResizableTh colKey="year" label="YEAR" style={{ left: `224px` }} />
                  <ResizableTh colKey="project" label="PROJECT" style={{ left: `${stickyX.project}px` }} />
                  <ResizableTh colKey="client" label="CLIENT" />
                  <ResizableTh colKey="inv" label="INV #" />
                  <ResizableTh colKey="cStatus" align="center" label="CLIENT STATUS" />
                  <ResizableTh colKey="lStatus" align="center" label="LADLY STATUS" />
                  <ResizableTh colKey="amount" align="right" label="GROSS AMOUNT" />
                  <ResizableTh colKey="vat" align="right" label="VAT" />
                  <ResizableTh colKey="net" align="right" label="NET" />
                  <ResizableTh colKey="fee" align="right" label="FEE" />
                  <ResizableTh colKey="payable" align="right" label="TO LAILA" />
                  <ResizableTh colKey="paid" align="right" label="LM TRANSFER" />
                  <ResizableTh colKey="paymentDate" align="center" label="DATE PAID" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 dark:divide-slate-600 text-[11px]">
                {sortedTransactions.map((t) => (
                  <tr key={t.id} onClick={() => setSelectedDetailId(t.id)} className={`group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all ${selectedDetailId === t.id ? 'bg-primary/5 shadow-inner' : ''}`}>
                    <td className="px-6 py-4 text-center sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 z-[100] border-r border-slate-300 dark:border-slate-600" onClick={(e) => { e.stopPropagation(); const s = new Set(selectedIds); if (s.has(t.id)) s.delete(t.id); else s.add(t.id); setSelectedIds(s); }}><div className={selectedIds.has(t.id) ? 'text-primary' : 'text-slate-400'}>{selectedIds.has(t.id) ? <CheckSquare size={16} /> : <Square size={16} />}</div></td>
                    <td className="px-4 py-4 text-center sticky left-[56px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 z-[100] border-r border-slate-300 dark:border-slate-600"><button onClick={(e) => { e.stopPropagation(); setFormData(t); setEditingId(t.id); setIsModalOpen(true); }} className="text-slate-400 hover:text-primary transition-colors"><Edit size={16}/></button></td>
                    <td className="px-4 py-4 text-center sticky left-[112px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 z-[100] border-r border-slate-300 dark:border-slate-600"><button onClick={(e) => handleDelete(t.id, e)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td>
                    <td className="px-4 py-4 text-center sticky left-[168px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 z-[100] border-r border-slate-300 dark:border-slate-600"><button onClick={(e) => { e.stopPropagation(); setSelectedDetailId(t.id); }} className={`relative transition-all ${(t.referenceNumber || t.paymentToLmRef) ? 'text-[#009A92]' : 'text-slate-400'}`}><LinkIcon size={16}/></button></td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-black sticky bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 z-[100] border-r border-slate-300 dark:border-slate-600" style={{ left: `224px` }}>{t.year}</td>
                    <td className="px-8 py-4 sticky bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 z-[100] border-r border-slate-300 dark:border-slate-600 truncate" style={{ left: `${stickyX.project}px`, width: columnWidths.project || 200 }}>
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-black text-slate-900 dark:text-white group-hover:text-primary transition-all text-xs uppercase tracking-tight truncate block">{t.project}</span>
                        {/* Verification Badge restored here */}
                        {/* Fix: Wrap ShieldCheck in a span to provide a tooltip since title is not a valid prop for Lucide components */}
                        {t.referenceNumber && (
                          <span title="Reconciled with bank record" className="shrink-0 flex items-center">
                            <ShieldCheck size={14} className="text-[#009A92]" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-slate-700 dark:text-slate-400 font-bold truncate max-w-[180px] border-r border-slate-300 dark:border-slate-600">{t.customerName || '-'}</td>
                    <td className="px-8 py-4 font-mono font-black text-primary border-r border-slate-300 dark:border-slate-600">{t.invoiceNumber || '-'}</td>
                    
                    <td className="px-4 py-4 text-center min-w-[150px] border-r border-slate-300 dark:border-slate-600" onClick={e => e.stopPropagation()}>
                        <select className={`w-full px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer outline-none appearance-none text-center ${getStatusBadgeStyle(t.clientStatus)}`} value={t.clientStatus} onChange={(e) => handleUpdateStatus(t.id, 'clientStatus', e.target.value as StatusOption)}>
                          {FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{opt.toUpperCase()}</option>)}
                        </select>
                    </td>

                    <td className="px-4 py-4 text-center min-w-[150px] border-r border-slate-300 dark:border-slate-600" onClick={e => e.stopPropagation()}>
                        <select className={`w-full px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer outline-none appearance-none text-center ${getStatusBadgeStyle(t.ladlyStatus)}`} value={t.ladlyStatus} onChange={(e) => handleUpdateStatus(t.id, 'ladlyStatus', e.target.value as StatusOption)}>
                          {FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{opt.toUpperCase()}</option>)}
                        </select>
                    </td>

                    <td className="px-8 py-4 text-right font-black text-slate-900 dark:text-slate-200 border-r border-slate-300 dark:border-slate-600">{formatCurrency(t.amount, t.currency)}</td>
                    <td className="px-8 py-4 text-right text-slate-500 font-medium border-r border-slate-300 dark:border-slate-600">{formatCurrency(t.vat || 0, t.currency)}</td>
                    <td className="px-8 py-4 text-right font-bold text-slate-900 dark:text-slate-200 border-r border-slate-300 dark:border-slate-600">{formatCurrency(t.net || 0, t.currency)}</td>
                    <td className="px-8 py-4 text-right text-rose-500 font-bold border-r border-slate-300 dark:border-slate-600">{formatCurrency(t.fee || 0, t.currency)}</td>
                    <td className="px-8 py-4 text-right font-black text-slate-900 dark:text-slate-200 border-r border-slate-300 dark:border-slate-600">{formatCurrency(t.payable || 0, t.currency)}</td>
                    <td className="px-8 py-4 text-right font-black text-[#009A92] border-r border-slate-300 dark:border-slate-600">{formatCurrency(t.clientPayment || 0, t.currency)}</td>
                    <td className="px-8 py-4 text-center text-slate-500 font-bold uppercase text-[10px]">{t.clientPaymentDate ? formatDate(t.clientPaymentDate) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedTransaction && (
          <div className="w-[400px] bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-600 flex flex-col shrink-0 animate-in slide-in-from-right-10 duration-500 z-[500] shadow-[0_0_80px_rgba(0,0,0,0.1)]">
             <div className="p-8 border-b border-slate-300 dark:border-slate-600 flex justify-between items-center bg-slate-50/40 dark:bg-slate-800/40">
                <div className="flex items-center gap-4"><div className="p-3 bg-[#009A92]/10 text-[#009A92] rounded-2xl"><Info size={24} strokeWidth={2.5}/></div><h3 className="font-black text-sm uppercase tracking-[0.2em] text-slate-900 dark:text-white">Detail</h3></div>
                <button onClick={() => setSelectedDetailId(null)} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><X size={24}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                <div className="space-y-4"><p className="text-[10px] font-black text-[#009A92] uppercase tracking-[0.3em] mb-2">Reference</p><h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-tight tracking-tight">{selectedTransaction.project}</h4><div className="flex flex-wrap gap-2 pt-2"><span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black text-[#009A92] uppercase tracking-widest">{selectedTransaction.invoiceNumber || 'NO INVOICE'}</span></div></div>
                <div className="space-y-4 pt-6 border-t border-slate-300 dark:border-slate-700"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pb-2">Financials</p>{[{ l: 'Gross Capital', v: formatCurrency(selectedTransaction.amount, selectedTransaction.currency), c: 'text-slate-900 dark:text-white font-black' }, { l: 'VAT (5%)', v: formatCurrency(selectedTransaction.vat || 0, selectedTransaction.currency), c: 'text-slate-500 font-bold' }, { l: 'Agency Fee (15%)', v: formatCurrency(selectedTransaction.fee || 0, selectedTransaction.currency), c: 'text-rose-500 font-bold' }, { l: 'Payable to Laila', v: formatCurrency(selectedTransaction.payable || 0, selectedTransaction.currency), c: 'text-[#009A92] font-black text-xl pt-2' },].map((row, i) => (<div key={i} className="flex justify-between items-center text-[12px]"><span className="font-bold text-slate-400 uppercase tracking-tight">{row.l}</span><span className={`${row.c}`}>{row.v}</span></div>))}</div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-300 dark:border-slate-700 space-y-4"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Refs</p><div className="space-y-3"><div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Inward Bank</p><p className="text-[11px] font-mono font-bold text-primary truncate">{selectedTransaction.referenceNumber || '---'}</p></div><div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Outward LM</p><p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 truncate">{selectedTransaction.paymentToLmRef || '---'}</p></div></div></div>
             </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}>
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
              <div className="px-12 py-10 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 border-b border-slate-300 dark:border-slate-700"><div className="flex items-center gap-5"><div className="p-4 bg-[#009A92] text-white rounded-[1.8rem] shadow-xl"><Package size={28}/></div><div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] leading-none">{editingId ? 'EDIT' : 'NEW REGISTRY'}</h2><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Manual Entry</p></div></div><button onClick={() => setIsModalOpen(false)} className="p-4 text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full transition-all hover:bg-white"><X size={32} /></button></div>
              <form onSubmit={handleSubmit} className="p-12 space-y-12 overflow-y-auto custom-scrollbar max-h-[75vh]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">PROJECT</label><input required className="w-full bg-[#F3F6F9] dark:bg-slate-800 border-none rounded-[2rem] px-8 py-5 font-black text-sm dark:text-white shadow-inner focus:ring-4 focus:ring-[#009A92]/10 transition-all outline-none" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} placeholder="e.g. DYSON V15" /></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">CLIENT</label><input className="w-full bg-[#F3F6F9] dark:bg-slate-800 border-none rounded-[2rem] px-8 py-5 font-black text-sm dark:text-white shadow-inner focus:ring-4 focus:ring-[#009A92]/10 transition-all outline-none" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} placeholder="e.g. DYSON ME" /></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">DATE</label><div className="relative"><input type="date" required className="w-full bg-[#F3F6F9] dark:bg-slate-800 border-none rounded-[2rem] px-8 py-5 font-black text-sm dark:text-white shadow-inner focus:ring-4 focus:ring-[#009A92]/10 transition-all outline-none appearance-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /><CalendarIcon className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20} /></div></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">GROSS (AED)</label><input type="number" step="0.01" required className="w-full bg-[#F3F6F9] dark:bg-slate-800 border-none rounded-[2rem] px-8 py-5 font-black text-sm dark:text-white shadow-inner focus:ring-4 focus:ring-[#009A92]/10 transition-all outline-none" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} placeholder="0.00" /></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">INV #</label><input className="w-full bg-[#F3F6F9] dark:bg-slate-800 border-none rounded-[2rem] px-8 py-5 font-black text-sm dark:text-white shadow-inner focus:ring-4 focus:ring-[#009A92]/10 transition-all outline-none" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} placeholder="LM-2025-XXX" /></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">CATEGORY</label><select className="w-full bg-[#F3F6F9] dark:bg-slate-800 border-none rounded-[2rem] px-8 py-5 font-black text-[11px] dark:text-white shadow-inner focus:ring-4 focus:ring-[#009A92]/10 outline-none uppercase appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}</select></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">CLIENT STATUS</label><select className="w-full bg-[#F3F6F9] dark:bg-slate-800 border-none rounded-[2rem] px-8 py-5 font-black text-[11px] dark:text-white shadow-inner focus:ring-4 focus:ring-[#009A92]/10 outline-none uppercase appearance-none" value={formData.clientStatus} onChange={e => setFormData({...formData, clientStatus: e.target.value as StatusOption})}>{FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}</select></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">INTERNAL STATUS</label><select className="w-full bg-[#F3F6F9] dark:bg-slate-800 border-none rounded-[2rem] px-8 py-5 font-black text-[11px] dark:text-white shadow-inner focus:ring-4 focus:ring-[#009A92]/10 outline-none uppercase appearance-none" value={formData.ladlyStatus} onChange={e => setFormData({...formData, ladlyStatus: e.target.value as StatusOption})}>{FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}</select></div>
                 </div>
                 <div className="pt-10 flex gap-6"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 bg-[#F3F6F9] dark:bg-slate-800 text-slate-400 font-black uppercase tracking-[0.3em] text-[11px] rounded-[2.5rem] hover:text-slate-900 transition-all shadow-sm">CANCEL</button><button type="submit" className="flex-[1.5] py-6 bg-[#009A92] text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,154,146,0.3)] hover:opacity-95 transition-all active:scale-95 flex items-center justify-center gap-3">SAVE <ArrowRight size={20} /></button></div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default FinanceTracker;