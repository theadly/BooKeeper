
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, Category, StatusOption } from '../types';
import { FINANCE_STATUS_OPTIONS, formatDate, formatCurrency } from '../constants';
import { Plus, Search, Trash2, FileSpreadsheet, Edit, X, CheckSquare, Square, ChevronUp, ChevronDown, ArrowUpDown, ChevronRight, Edit3, Check } from 'lucide-react';
import DirhamSymbol from './DirhamSymbol';

interface FinanceTrackerProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onBulkUpdateTransactions?: (ids: string[], updates: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onBulkDeleteTransactions?: (ids: string[]) => void;
  onExcelImport: (file: File) => void;
  isProcessing?: boolean;
  columnWidths: Record<string, number>;
  onColumnWidthChange: (widths: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  columnLabels: Record<string, string>;
  onUpdateColumnLabel: (key: string, label: string) => void;
  showAedEquivalent: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc' | null;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

const FinanceTracker: React.FC<FinanceTrackerProps> = ({ 
  transactions, 
  onAddTransaction, 
  onUpdateTransaction, 
  onBulkUpdateTransactions,
  onDeleteTransaction,
  onBulkDeleteTransactions,
  onExcelImport,
  isProcessing,
  columnWidths,
  onColumnWidthChange,
  columnLabels,
  onUpdateColumnLabel,
  showAedEquivalent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizingCol = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const initialFormData: Partial<Transaction> = {
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.INCOME,
    category: Category.FREELANCE,
    amount: 0,
    project: '',
    description: '',
    currency: 'AED',
    clientStatus: 'Pending',
    ladlyStatus: 'Pending',
    vat: 0,
    net: 0,
    fee: 0,
    payable: 0,
    transferWithVat: 0,
    clientPayment: 0,
    clientPaymentDate: '',
    paymentDateToLaila: ''
  };

  const [formData, setFormData] = useState<Partial<Transaction>>(initialFormData);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingCol.current) return;
      const delta = e.clientX - resizingCol.current.startX;
      const newWidth = Math.max(50, resizingCol.current.startWidth + delta);
      onColumnWidthChange(prev => ({ ...prev, [resizingCol.current!.key]: newWidth }));
    };
    const handleMouseUp = () => {
      resizingCol.current = null;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onColumnWidthChange]);

  const startResizing = (key: string, e: React.MouseEvent) => {
    resizingCol.current = { key, startX: e.clientX, startWidth: columnWidths[key] };
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRequestSort = (key: string) => {
    if (editingLabelKey) return;
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const sortedTransactions = useMemo(() => {
    let list = transactions.filter(t => {
      const searchParts = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
      const matchesSearch = searchParts.length === 0 || searchParts.every(part => 
        t.project.toLowerCase().includes(part) || 
        (t.customerName?.toLowerCase().includes(part)) ||
        (t.invoiceNumber?.toLowerCase().includes(part))
      );
      const matchesYear = yearFilter === 'All' || t.year.toString() === yearFilter;
      const matchesStatus = statusFilter === 'All' || t.clientStatus === statusFilter;
      return matchesSearch && matchesYear && matchesStatus;
    });

    if (sortConfig.key && sortConfig.direction) {
      list.sort((a, b) => {
        let valA: any, valB: any;
        switch (sortConfig.key) {
          case 'year': valA = a.year; valB = b.year; break;
          case 'project': valA = a.project.toLowerCase(); valB = b.project.toLowerCase(); break;
          case 'client': valA = (a.customerName || '').toLowerCase(); valB = (b.customerName || '').toLowerCase(); break;
          case 'inv': valA = (a.invoiceNumber || '').toLowerCase(); valB = (b.invoiceNumber || '').toLowerCase(); break;
          case 'cStatus': valA = a.clientStatus.toLowerCase(); valB = b.clientStatus.toLowerCase(); break;
          case 'lStatus': valA = a.ladlyStatus.toLowerCase(); valB = b.ladlyStatus.toLowerCase(); break;
          case 'invAmt': valA = a.amount; valB = b.amount; break;
          case 'vat': valA = a.vat || 0; valB = b.vat || 0; break;
          case 'net': valA = a.net || 0; valB = b.net || 0; break;
          case 'fee': valA = a.fee || 0; valB = b.fee || 0; break;
          case 'payable': valA = a.payable || 0; valB = b.payable || 0; break;
          case 'paid': valA = a.clientPayment || 0; valB = b.clientPayment || 0; break;
          default: valA = 0; valB = 0;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [transactions, searchTerm, yearFilter, statusFilter, sortConfig]);

  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => { if (t.year) years.add(t.year.toString()); });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedTransactions.length && sortedTransactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedTransactions.map(t => t.id)));
    }
  };

  const handleUpdateLabel = (key: string) => {
    if (tempLabel.trim()) {
      onUpdateColumnLabel(key, tempLabel.trim().toUpperCase());
    }
    setEditingLabelKey(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project || !formData.amount) return;
    const tData: Transaction = {
      id: editingId || generateId(),
      year: Number(formData.year),
      date: formData.date || new Date().toISOString().split('T')[0],
      project: formData.project,
      description: formData.description || `${formData.project}`,
      amount: Number(formData.amount),
      vat: Number(formData.vat),
      net: Number(formData.net),
      fee: Number(formData.fee),
      payable: Number(formData.payable),
      transferWithVat: Number(formData.transferWithVat),
      clientPayment: formData.clientPayment ? Number(formData.clientPayment) : 0,
      clientPaymentDate: formData.clientPaymentDate,
      category: formData.category || Category.FREELANCE,
      type: TransactionType.INCOME,
      currency: (formData.currency as 'AED' | 'USD') || 'AED',
      clientStatus: (formData.clientStatus as StatusOption) || 'Pending',
      ladlyStatus: (formData.ladlyStatus as StatusOption) || 'Pending',
      invoiceNumber: formData.invoiceNumber,
      customerName: formData.customerName,
      notes: formData.notes,
    };
    if (editingId) onUpdateTransaction(tData);
    else onAddTransaction(tData);
    setIsModalOpen(false);
    setFormData(initialFormData);
    setEditingId(null);
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'Pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    const styles: Record<string, string> = {
      'Paid': 'bg-emerald-50 text-emerald-800 border-emerald-200',
      'Paid to personal account': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'Unpaid': 'bg-rose-50 text-rose-800 border-rose-200',
      'Overdue': 'bg-rose-100 text-rose-900 border-rose-300 font-black',
      'Void': 'bg-slate-100 text-slate-400 border-slate-200 line-through',
      'Draft': 'bg-slate-50 text-slate-500 border-slate-200',
    };
    return styles[status] || 'bg-slate-50 text-slate-500 border-slate-200';
  };

  const ResizableTh = ({ colKey, style = {}, align = 'left' }: { colKey: string; style?: React.CSSProperties; align?: 'left'|'center'|'right' }) => {
    const isSorted = sortConfig.key === colKey;
    const isEditing = editingLabelKey === colKey;
    const label = columnLabels[colKey] || colKey.toUpperCase();

    return (
      <th 
        className={`px-2 py-3 sticky top-0 bg-[#F9F7F2] border-b border-slate-100 z-[10] group relative select-none ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
        style={{ ...style, width: columnWidths[colKey] }}
      >
        <div 
          className={`flex items-center gap-1 overflow-hidden transition-colors ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}
        >
          {isEditing ? (
            <div className="flex items-center gap-1 w-full bg-white rounded shadow-sm border border-primary/30 p-0.5" onClick={e => e.stopPropagation()}>
              <input 
                autoFocus
                className="w-full bg-transparent border-none text-[8px] font-black uppercase outline-none px-1"
                value={tempLabel}
                onChange={e => setTempLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleUpdateLabel(colKey);
                  if (e.key === 'Escape') setEditingLabelKey(null);
                }}
              />
              <button onClick={() => handleUpdateLabel(colKey)} className="text-emerald-500"><Check size={10} /></button>
            </div>
          ) : (
            <>
              <span className="truncate cursor-pointer hover:text-slate-900" onClick={() => handleRequestSort(colKey)}>{label}</span>
              <button 
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-primary transition-all ml-0.5 shrink-0"
                onClick={(e) => { e.stopPropagation(); setEditingLabelKey(colKey); setTempLabel(label); }}
              >
                <Edit3 size={10} />
              </button>
              <div className={`transition-all duration-200 flex shrink-0 ${isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} onClick={() => handleRequestSort(colKey)}>
                {sortConfig.key === colKey && sortConfig.direction === 'asc' ? <ChevronUp size={10} className="text-primary" /> : sortConfig.key === colKey && sortConfig.direction === 'desc' ? <ChevronDown size={10} className="text-primary" /> : <ArrowUpDown size={10} />}
              </div>
            </>
          )}
        </div>
        <div onMouseDown={(e) => startResizing(colKey, e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-[15]" />
      </th>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 relative h-full">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div><h1 className="text-xl font-black text-gray-900 tracking-tight">Financial Ledger</h1></div>
        <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-all font-bold shadow-sm text-[10px] active:scale-95">
                <FileSpreadsheet size={14} /> Import Data
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && onExcelImport(e.target.files[0])} />
            <button onClick={() => { setEditingId(null); setFormData(initialFormData); setIsModalOpen(true); }} className="flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground px-3 py-1.5 rounded-xl transition-all font-bold shadow-lg text-[10px] active:scale-95">
                <Plus size={14} /> New Ledger Entry
            </button>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Search project, client or invoice..." className="w-full bg-white pl-8 pr-10 py-1.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none text-xs font-medium shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 p-1"><X size={12} /></button>}
        </div>
        <select className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-bold shadow-sm" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="All">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-bold shadow-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            {FINANCE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar relative">
          <table className="w-full text-left border-separate border-spacing-0 table-fixed">
            <thead>
              <tr className="text-slate-400 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                <th className="px-2 py-3 text-center sticky top-0 left-0 z-[100] bg-[#F9F7F2] border-b border-r border-slate-100 w-[40px]">
                    <button onClick={toggleSelectAll} className={`p-1 hover:bg-slate-200 rounded transition-colors ${selectedIds.size > 0 ? 'text-primary' : 'text-slate-300'}`}>
                        {selectedIds.size === sortedTransactions.length && sortedTransactions.length > 0 ? <CheckSquare size={12} /> : <Square size={12} />}
                    </button>
                </th>
                <th className="px-2 py-3 text-center sticky top-0 left-[40px] z-[100] bg-[#F9F7F2] border-b border-r border-slate-100 w-[40px]">EDIT</th>
                <ResizableTh colKey="year" style={{ left: '80px', zIndex: 90 }} />
                <ResizableTh colKey="project" style={{ left: `${80 + columnWidths.year}px`, zIndex: 90 }} />
                <ResizableTh colKey="client" />
                <ResizableTh colKey="inv" />
                <ResizableTh colKey="cStatus" align="center" />
                <ResizableTh colKey="lStatus" align="center" />
                <ResizableTh colKey="invAmt" align="right" />
                <ResizableTh colKey="vat" align="right" />
                <ResizableTh colKey="net" align="right" />
                <ResizableTh colKey="fee" align="right" />
                <ResizableTh colKey="payable" align="right" />
                <ResizableTh colKey="paid" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[10px] font-medium">
              {sortedTransactions.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50/80 transition-colors group ${selectedIds.has(t.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-2 py-2 text-center sticky left-0 bg-white group-hover:bg-slate-50 z-[20] border-r border-slate-100" onClick={(e) => { e.stopPropagation(); const s = new Set(selectedIds); if (s.has(t.id)) s.delete(t.id); else s.add(t.id); setSelectedIds(s); }}>
                    <div className={`transition-colors ${selectedIds.has(t.id) ? 'text-primary' : 'text-slate-200 group-hover:text-slate-400'}`}>{selectedIds.has(t.id) ? <CheckSquare size={12} /> : <Square size={12} />}</div>
                  </td>
                  <td className="px-2 py-2 text-center sticky left-[40px] bg-white group-hover:bg-slate-50 z-[20] border-r border-slate-100">
                    <button onClick={(e) => { e.stopPropagation(); setFormData(t); setEditingId(t.id); setIsModalOpen(true); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-primary transition-colors"><Edit size={10}/></button>
                  </td>
                  <td className="px-2 py-2 text-slate-400 font-bold sticky left-[80px] bg-white group-hover:bg-slate-50 z-[20] border-r border-slate-100">{t.year}</td>
                  <td className="px-3 py-2 font-black text-slate-900 sticky bg-white group-hover:bg-slate-50 z-[20] border-r border-slate-100 truncate" style={{ left: `${80 + columnWidths.year}px` }}>{t.project}</td>
                  <td className="px-3 py-2 text-slate-600 truncate">{t.customerName || '-'}</td>
                  <td className="px-2 py-2 font-mono text-[9px] text-slate-400">{t.invoiceNumber || '-'}</td>
                  <td className="px-1.5 py-2 text-center">
                    <div className="relative group/select">
                      <select 
                        value={t.clientStatus} 
                        onChange={(e) => onUpdateTransaction({...t, clientStatus: e.target.value as StatusOption})}
                        className={`w-full appearance-none px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${getStatusBadgeStyle(t.clientStatus)}`}
                      >
                        {FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-white text-slate-900 font-bold text-[10px]">{opt}</option>)}
                      </select>
                      <ChevronRight size={8} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none rotate-90" />
                    </div>
                  </td>
                  <td className="px-1.5 py-2 text-center">
                    <div className="relative group/select">
                      <select 
                        value={t.ladlyStatus} 
                        onChange={(e) => onUpdateTransaction({...t, ladlyStatus: e.target.value as StatusOption})}
                        className={`w-full appearance-none px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${getStatusBadgeStyle(t.ladlyStatus)}`}
                      >
                        {FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-white text-slate-900 font-bold text-[10px]">{opt}</option>)}
                      </select>
                      <ChevronRight size={8} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none rotate-90" />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-black text-slate-900">{formatCurrency(t.amount, t.currency, showAedEquivalent)}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{formatCurrency(t.vat || 0, t.currency, showAedEquivalent)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(t.net || 0, t.currency, showAedEquivalent)}</td>
                  <td className="px-3 py-2 text-right text-red-400">{formatCurrency(t.fee || 0, t.currency, showAedEquivalent)}</td>
                  <td className="px-3 py-2 text-right font-black text-slate-900 bg-slate-50/30">{formatCurrency(t.payable || 0, t.currency, showAedEquivalent)}</td>
                  <td className="px-3 py-2 text-right font-black">{formatCurrency(t.clientPayment || 0, t.currency, showAedEquivalent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-[#F9F7F2]/50 shrink-0">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{editingId ? 'Edit Entry' : 'New Entry'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1.5 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Identifier</label><input type="text" required className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary font-bold text-xs" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} /></div>
                <div><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Entity Name</label><input type="text" className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary font-bold text-xs" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Valuation</label><input type="number" required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary font-bold text-sm" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} /></div>
                <div><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Currency</label><select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary font-bold text-sm" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value as 'AED' | 'USD'})}><option value="AED">AED</option><option value="USD">USD</option></select></div>
              </div>
              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 text-[10px] border border-slate-200">Dismiss</button>
                <button type="submit" className="flex-1 bg-primary hover:opacity-90 text-primary-foreground px-4 py-3 rounded-xl font-black uppercase tracking-widest shadow-xl active:scale-95 text-[10px]">Commit Records</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceTracker;
