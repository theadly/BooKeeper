
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, Category, StatusOption, BankTransaction } from '../types';
import { 
  Plus, Search, Trash2, FileSpreadsheet, Edit, X, CheckSquare, 
  Square, ChevronUp, ChevronDown, ArrowUpDown, ChevronRight, 
  Edit3, Check, Filter, MoreVertical, CheckCircle2, Info, 
  Landmark, ShieldCheck, Link, Sparkles, Loader2, Zap, ArrowUpRight, ArrowDownLeft,
  User, Target, DollarSign, Calendar as CalendarIcon, Save, FileText, Wallet, Link2Off,
  ChevronDown as ChevronDownIcon, Calendar, Layers, PieChart, TrendingDown
} from 'lucide-react';
import { CONFIG } from '../config';
import { FINANCE_STATUS_OPTIONS, formatCurrency, formatDate } from '../constants';

interface FinanceTrackerProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onBulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onBulkDeleteTransactions: (ids: string[]) => void;
  onExcelImport: (file: File) => void;
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

const generateId = () => crypto.randomUUID();

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
  showAedEquivalent,
  bankTransactions,
  onReconcile,
  onUnlink
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string[]>([]); // Empty means All
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Default sorting: most recent year at top
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'year', direction: 'desc' });
  const resizingCol = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [activeReconcileId, setActiveReconcileId] = useState<string | null>(null);
  const [reconcileType, setReconcileType] = useState<'client' | 'laila'>('client');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormData: Partial<Transaction> = {
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.INCOME,
    category: Category.FREELANCE,
    amount: 0,
    project: '',
    customerName: '',
    description: '',
    currency: 'AED',
    clientStatus: 'Pending',
    ladlyStatus: 'Pending',
    vat: 0,
    net: 0,
    fee: 0,
    payable: 0,
    clientPayment: 0, 
    notes: '',
    clientPaymentDate: '',
    referenceNumber: '',
    paymentToLmRef: ''
  };

  const [formData, setFormData] = useState<Partial<Transaction>>(initialFormData);

  useEffect(() => {
    if (formData.amount !== undefined && formData.type === TransactionType.INCOME) {
      const gross = Number(formData.amount);
      const net = gross / (1 + CONFIG.VAT_RATE);
      const vat = gross - net;
      const adlyFee = net * CONFIG.ADLY_FEE_RATE;
      const payableLm = net - adlyFee;
      const transferToLm = payableLm * (1 + CONFIG.VAT_RATE);

      setFormData(prev => ({
        ...prev,
        net: Number(net.toFixed(2)),
        vat: Number(vat.toFixed(2)),
        fee: Number(adlyFee.toFixed(2)),
        payable: Number(payableLm.toFixed(2)),
        clientPayment: Number(transferToLm.toFixed(2))
      }));
    }
  }, [formData.amount, formData.type]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingCol.current) return;
      const delta = e.clientX - resizingCol.current.startX;
      const newWidth = Math.max(50, resizingCol.current.startWidth + delta);
      onColumnWidthChange(prev => ({ ...prev, [resizingCol.current!.key]: newWidth }));
    };
    const handleMouseUp = () => { resizingCol.current = null; document.body.style.cursor = 'default'; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [onColumnWidthChange]);

  const sortedTransactions = useMemo(() => {
    let list = transactions.filter(t => {
      const matchesSearch = !searchTerm || t.project.toLowerCase().includes(searchTerm.toLowerCase()) || (t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesYear = yearFilter.length === 0 || yearFilter.includes(t.year.toString());
      const matchesStatus = statusFilter === 'All' || t.clientStatus === statusFilter;
      const matchesType = typeFilter === 'All' || t.type === typeFilter;
      return matchesSearch && matchesYear && matchesStatus && matchesType;
    });

    if (sortConfig.key && sortConfig.direction) {
      list.sort((a, b) => {
        let valA: any = (a as any)[sortConfig.key];
        let valB: any = (b as any)[sortConfig.key];
        if (valA === undefined) valA = '';
        if (valB === undefined) valB = '';

        if (sortConfig.key === 'year' || sortConfig.key === 'amount' || sortConfig.key === 'net' || sortConfig.key === 'vat' || sortConfig.key === 'fee' || sortConfig.key === 'payable' || sortConfig.key === 'paid') {
          const numA = Number(valA) || 0;
          const numB = Number(valB) || 0;
          if (numA === numB) return new Date(b.date).getTime() - new Date(a.date).getTime();
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      list.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
    return list;
  }, [transactions, searchTerm, yearFilter, statusFilter, typeFilter, sortConfig]);

  const expenseSummary = useMemo(() => {
    if (typeFilter !== 'Expense') return null;
    const total = sortedTransactions.reduce((acc, t) => acc + t.amount, 0);
    const byCat: Record<string, number> = {};
    sortedTransactions.forEach(t => {
      const cat = t.category || 'Other';
      byCat[cat] = (byCat[cat] || 0) + t.amount;
    });
    return {
      total,
      breakdown: Object.entries(byCat).sort((a, b) => b[1] - a[1])
    };
  }, [sortedTransactions, typeFilter]);

  const uniqueYears = useMemo(() => {
    const years = Array.from(new Set(transactions.map(t => t.year.toString())));
    return years.sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const toggleYearFilter = (year: string) => {
    setYearFilter(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedTransactions.length && sortedTransactions.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedTransactions.map(t => t.id)));
  };

  const startResizing = (key: string, e: React.MouseEvent) => {
    resizingCol.current = { key, startX: e.clientX, startWidth: columnWidths[key] || 100 };
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  };

  const handleRequestSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const getStatusBadgeStyle = (status: string) => {
    const styles: Record<string, string> = {
      'Paid': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
      'Pending': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
      'Unpaid': 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
      'Draft': 'text-slate-400 bg-slate-50 dark:bg-slate-800',
    };
    return styles[status] || 'text-slate-400 bg-slate-50';
  };

  const ResizableTh = ({ colKey, style = {}, align = 'left' }: { colKey: string; style?: React.CSSProperties; align?: 'left'|'center'|'right' }) => {
    const label = columnLabels[colKey] || colKey.toUpperCase();
    const isSorted = sortConfig.key === colKey;
    return (
      <th className={`px-2 py-3 sticky top-0 bg-[#F9F7F2] dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-[10] group relative select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`} style={{ ...style, width: columnWidths[colKey] || 100 }}>
        <div className={`flex items-center gap-1 overflow-hidden transition-colors ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span className={`truncate cursor-pointer hover:text-slate-900 dark:hover:text-white ${isSorted ? 'text-primary' : ''}`} onClick={() => handleRequestSort(colKey)}>{label}</span>
          <div className={`${isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
            {isSorted ? (sortConfig.direction === 'asc' ? <ChevronUp size={10} className="text-primary" /> : <ChevronDown size={10} className="text-primary" />) : <ChevronDown size={8}/>}
          </div>
        </div>
        <div onMouseDown={(e) => startResizing(colKey, e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-[15]" />
      </th>
    );
  };

  const targetTransaction = useMemo(() => activeReconcileId ? transactions.find(t => t.id === activeReconcileId) : null, [activeReconcileId, transactions]);
  const targetAmountToMatch = targetTransaction?.amount || 0;
  const isMatchedOnThisSide = reconcileType === 'client' ? !!targetTransaction?.referenceNumber : !!targetTransaction?.paymentToLmRef;

  const eligibleBankItems = useMemo(() => {
    if (!activeReconcileId || !targetTransaction) return [];
    if (isMatchedOnThisSide) {
      const refString = reconcileType === 'client' ? (targetTransaction.referenceNumber || '') : (targetTransaction.paymentToLmRef || '');
      const refIds = refString.split(', ').filter(Boolean);
      return bankTransactions.filter(bt => refIds.includes(bt.id)).map(bt => ({ ...bt, matchScore: 1000, isLikely: true, isCurrentMatch: true }));
    }
    const targetAmount = targetAmountToMatch;
    const cleanProject = targetTransaction.project.toLowerCase();
    const projectWords = cleanProject.split(/\s+/).filter(w => w.length > 3 && !['global', 'media', 'the', 'limited', 'llc', 'fz'].includes(w));
    const cleanClient = (targetTransaction.customerName || '').toLowerCase();
    const mSearchLower = modalSearchTerm.toLowerCase();

    return bankTransactions
      .filter(bt => !bt.matchedTransactionId && (reconcileType === 'client' ? bt.type === 'credit' : bt.type === 'debit'))
      .filter(bt => !mSearchLower || bt.description.toLowerCase().includes(mSearchLower) || (bt.vendor || '').toLowerCase().includes(mSearchLower))
      .map(bt => {
        let score = 0;
        const descLower = bt.description.toLowerCase();
        const vendorLower = (bt.vendor || '').toLowerCase();
        if (Math.abs(bt.amount - targetAmount) < 0.01) score += 20;
        if (cleanProject && (descLower.includes(cleanProject) || vendorLower.includes(cleanProject))) score += 200;
        let hasTextMatch = false;
        projectWords.forEach(pWord => { if (descLower.includes(pWord) || vendorLower.includes(pWord)) { score += 100; hasTextMatch = true; } });
        if (cleanClient && (descLower.includes(cleanClient) || vendorLower.includes(cleanClient))) { score += 50; hasTextMatch = true; }
        return { ...bt, matchScore: score, isLikely: hasTextMatch, isCurrentMatch: false };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [bankTransactions, activeReconcileId, targetTransaction, targetAmountToMatch, modalSearchTerm, reconcileType, isMatchedOnThisSide]);

  const selectedBanksTotal = isMatchedOnThisSide ? eligibleBankItems.reduce((sum, item) => sum + item.amount, 0) : Array.from(selectedBankIds).reduce((sum, id) => sum + (bankTransactions.find(b => b.id === id)?.amount || 0), 0);
  const reconciliationDifference = targetAmountToMatch - selectedBanksTotal;

  const handleBankItemClick = (id: string) => {
    if (isMatchedOnThisSide) return;
    const newSet = new Set(selectedBankIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedBankIds(newSet);
  };

  const handleConfirmReconcile = () => {
    if (selectedBankIds.size === 0 || !activeReconcileId) return;
    onReconcile(activeReconcileId, Array.from(selectedBankIds), reconcileType);
    setIsReconcileModalOpen(false);
    setSelectedBankIds(new Set());
  };

  const handleUnlinkAction = () => {
    if (activeReconcileId && confirm(`Are you sure you want to unmatch the ${reconcileType} link?`)) {
      onUnlink(activeReconcileId, reconcileType);
      setIsReconcileModalOpen(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 relative w-full overflow-hidden pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 px-1">
        <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Financial Ledger</h1>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit mt-2">
                <button onClick={() => setTypeFilter('All')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === 'All' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}>All</button>
                <button onClick={() => setTypeFilter('Income')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === 'Income' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Income</button>
                <button onClick={() => setTypeFilter('Expense')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === 'Expense' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-400'}`}>Expenses</button>
            </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm"><FileSpreadsheet size={14} className="text-emerald-500" /> Import Excel</button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={(e) => e.target.files?.[0] && onExcelImport(e.target.files[0])} />
          <button onClick={() => { setFormData(initialFormData); setEditingId(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-1.5 rounded-xl font-bold text-[10px] shadow-lg"><Plus size={14} /> New Entry</button>
        </div>
      </header>

      {/* Expense Stats Bar - Dynamic injected when Expense Filter Active */}
      {expenseSummary && (
        <div className="mx-1 p-4 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl animate-in slide-in-from-top-2 duration-300 flex flex-col md:flex-row items-center gap-6">
           <div className="flex items-center gap-4 border-r border-rose-100 dark:border-rose-900/30 pr-6">
              <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><TrendingDown size={24}/></div>
              <div>
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] leading-none mb-1">Total Period Spend</p>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(expenseSummary.total, 'AED')}</p>
              </div>
           </div>
           <div className="flex-1 flex items-center gap-4 overflow-x-auto no-scrollbar">
              {expenseSummary.breakdown.map(([cat, val]) => (
                <div key={cat} className="flex flex-col gap-1 shrink-0 px-3 border-r border-slate-100 dark:border-slate-800 last:border-none">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{cat}</p>
                   <p className="text-[11px] font-black text-slate-900 dark:text-slate-100">{formatCurrency(val, 'AED')}</p>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="flex flex-col gap-3 shrink-0 px-1">
        <div className="flex gap-2 w-full">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" placeholder="Search projects..." className="w-full bg-white dark:bg-slate-800 pl-8 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-primary text-xs font-medium dark:text-white outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
        </div>

        {/* Dedicated Horizontal Year Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button 
                onClick={() => setYearFilter([])}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${yearFilter.length === 0 ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
            >
                All Years
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-1" />
            {uniqueYears.map(year => (
                <button 
                    key={year}
                    onClick={() => toggleYearFilter(year)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${yearFilter.includes(year) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                >
                    {year}
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 w-full flex flex-col relative">
        <div className="hidden md:flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-auto flex-1 custom-scrollbar relative w-full">
            <table className="w-full text-left border-separate border-spacing-0 min-w-max">
              <thead>
                <tr className="text-slate-400 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                  <th className="px-2 py-3 text-center sticky top-0 left-0 z-[100] bg-[#F9F7F2] dark:bg-slate-900 border-b border-r border-slate-100 dark:border-slate-800 w-[40px]">
                      <button onClick={toggleSelectAll} className={`p-1 rounded transition-colors ${selectedIds.size > 0 ? 'text-primary' : 'text-slate-300'}`}>
                          {selectedIds.size === sortedTransactions.length && sortedTransactions.length > 0 ? <CheckSquare size={12} /> : <Square size={12} />}
                      </button>
                  </th>
                  <th className="px-2 py-3 text-center sticky top-0 left-[40px] z-[100] bg-[#F9F7F2] dark:bg-slate-900 border-b border-r border-slate-100 dark:border-slate-800 w-[40px]">EDIT</th>
                  <th className="px-2 py-3 text-center sticky top-0 left-[80px] z-[100] bg-[#F9F7F2] dark:bg-slate-900 border-b border-r border-slate-100 dark:border-slate-800 w-[40px]">LINK</th>
                  <ResizableTh colKey="year" style={{ left: '120px', zIndex: 100 }} />
                  <ResizableTh colKey="project" style={{ left: `${120 + (columnWidths.year || 60)}px`, zIndex: 100 }} />
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
                  <ResizableTh colKey="paymentDate" align="center" />
                  <ResizableTh colKey="refCode" />
                  <ResizableTh colKey="lmRef" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-[10px]">
                {sortedTransactions.map((t) => (
                  <tr key={t.id} className={`group hover:bg-slate-50/80 transition-colors ${selectedIds.has(t.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-2 py-2 text-center sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 z-[20] border-r border-slate-100" onClick={() => { const s = new Set(selectedIds); if (s.has(t.id)) s.delete(t.id); else s.add(t.id); setSelectedIds(s); }}>
                      <div className={selectedIds.has(t.id) ? 'text-primary' : 'text-slate-200'}>{selectedIds.has(t.id) ? <CheckSquare size={12} /> : <Square size={12} />}</div>
                    </td>
                    <td className="px-2 py-2 text-center sticky left-[40px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 z-[20] border-r border-slate-100">
                      <button onClick={() => { setFormData(t); setEditingId(t.id); setIsModalOpen(true); }} className="p-1 text-slate-400 hover:text-primary"><Edit size={10}/></button>
                    </td>
                    <td className="px-2 py-2 text-center sticky left-[80px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 z-[20] border-r border-slate-100">
                      <button onClick={() => { setModalSearchTerm(''); setSelectedBankIds(new Set()); setReconcileType('client'); setActiveReconcileId(t.id); setIsReconcileModalOpen(true); }} className={`p-1 flex justify-center w-full relative transition-colors ${(t.referenceNumber || t.paymentToLmRef) ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}><Link size={12}/>{(t.referenceNumber || t.paymentToLmRef) && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm z-30 ring-1 ring-white"></div>}</button>
                    </td>
                    <td className="px-2 py-2 text-slate-400 font-bold sticky left-[120px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 z-[20] border-r border-slate-100">{t.year}</td>
                    <td className="px-3 py-2 font-black text-slate-900 dark:text-white sticky bg-white dark:bg-slate-900 group-hover:bg-slate-50 z-[20] border-r border-slate-100 truncate" style={{ left: `${120 + (columnWidths.year || 60)}px`, width: columnWidths.project || 180 }}><div className="flex items-center gap-2"><span className="truncate">{t.project}</span>{(t.referenceNumber || t.paymentToLmRef) && <ShieldCheck size={14} className="text-emerald-500 shrink-0" strokeWidth={3} />}</div></td>
                    <td className="px-3 py-2 text-slate-600 truncate">{t.customerName || '-'}</td>
                    <td className="px-2 py-2 font-mono text-[9px] text-slate-400">{t.invoiceNumber || '-'}</td>
                    <td className="px-1.5 py-2 text-center">
                       <select className={`w-full px-1 py-0.5 rounded-[4px] text-[8px] font-black uppercase border-none focus:ring-1 focus:ring-primary ${getStatusBadgeStyle(t.clientStatus)}`} value={t.clientStatus} onChange={(e) => onUpdateTransaction({ ...t, clientStatus: e.target.value as StatusOption })}>{FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                    </td>
                    <td className="px-1.5 py-2 text-center">
                       <select className={`w-full px-1 py-0.5 rounded-[4px] text-[8px] font-black uppercase border-none focus:ring-1 focus:ring-primary ${getStatusBadgeStyle(t.ladlyStatus)}`} value={t.ladlyStatus} onChange={(e) => onUpdateTransaction({ ...t, ladlyStatus: e.target.value as StatusOption })}>{FINANCE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                    </td>
                    <td className="px-3 py-2 text-right font-black">{formatCurrency(t.amount, t.currency)}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{formatCurrency(t.vat || 0, t.currency)}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(t.net || 0, t.currency)}</td>
                    <td className="px-3 py-2 text-right text-rose-500">{formatCurrency(t.fee || 0, t.currency)}</td>
                    <td className="px-3 py-2 text-right font-black">{formatCurrency(t.payable || 0, t.currency)}</td>
                    <td className="px-3 py-2 text-right font-black text-primary">{formatCurrency(t.clientPayment || 0, t.currency)}</td>
                    <td className="px-3 py-2 text-center text-[9px] font-bold text-slate-400">{t.clientPaymentDate ? formatDate(t.clientPaymentDate) : '-'}</td>
                    <td className="px-3 py-2 text-slate-400 truncate max-w-[100px]">{t.referenceNumber || '-'}</td>
                    <td className="px-3 py-2 text-slate-400 truncate max-w-[100px]">{t.paymentToLmRef || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-bottom-5 duration-300">
             <div className="bg-slate-900 text-white rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl ring-4 ring-slate-900/10 border border-white/10">
                <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                  <div className="bg-primary p-1.5 rounded-lg text-white"><CheckSquare size={16}/></div>
                  <p className="text-[10px] font-black uppercase tracking-widest">{selectedIds.size} Selected</p>
                </div>
                <div className="flex items-center gap-3">
                   <p className="text-[8px] font-black uppercase text-slate-400">Client:</p>
                   <div className="flex gap-1">{['Paid', 'Unpaid', 'Pending'].map(s => (<button key={s} onClick={() => { onBulkUpdateTransactions(Array.from(selectedIds), { clientStatus: s as StatusOption }); setSelectedIds(new Set()); }} className="px-3 py-1 bg-white/5 hover:bg-white/15 rounded-lg text-[9px] font-black uppercase transition-all">{s}</button>))}</div>
                </div>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <div className="flex items-center gap-3">
                   <p className="text-[8px] font-black uppercase text-slate-400">Ladly:</p>
                   <div className="flex gap-1">{['Paid', 'Unpaid', 'Pending'].map(s => (<button key={s} onClick={() => { onBulkUpdateTransactions(Array.from(selectedIds), { ladlyStatus: s as StatusOption }); setSelectedIds(new Set()); }} className="px-3 py-1 bg-white/5 hover:bg-white/15 rounded-lg text-[9px] font-black uppercase transition-all">{s}</button>))}</div>
                </div>
                <div className="h-6 w-px bg-white/10 mx-2" />
                <button onClick={() => { if (confirm("Delete selected entries?")) onBulkDeleteTransactions(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="text-rose-400 hover:text-rose-300 p-2"><Trash2 size={16}/></button>
                <button onClick={() => setSelectedIds(new Set())} className="text-white/40 hover:text-white"><X size={16}/></button>
             </div>
          </div>
        )}
      </div>

      {isReconcileModalOpen && (
        <div 
          className="fixed inset-0 z-[4000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" 
          onClick={() => setIsReconcileModalOpen(false)}
        >
           <div 
             className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-indigo-50 dark:bg-slate-900">
                 <div className="flex items-center gap-4">
                   <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><Link size={20}/></div>
                   <div>
                     <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-widest">Reconcile Ledger</h2>
                     <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{targetTransaction?.project}</span>
                        <span className="text-[8px] text-slate-400">•</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{targetTransaction?.customerName || 'No Client'}</span>
                     </div>
                   </div>
                 </div>
                 <button onClick={() => setIsReconcileModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-900 rounded-full transition-all"><X size={24} /></button>
              </div>
              {isMatchedOnThisSide && (
                <div className="mx-8 mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4">
                   <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-500" size={18} /><p className="text-[10px] font-black uppercase text-emerald-700">This side is already matched with bank record(s).</p></div>
                   <button onClick={handleUnlinkAction} className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-[9px] font-black uppercase text-emerald-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center gap-1.5"><Link2Off size={12}/> Unmatch</button>
                </div>
              )}
              <div className="bg-slate-50/50 dark:bg-slate-800/50 px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Target Ledger Amount</p>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-white dark:bg-slate-900 rounded-md shadow-sm border border-slate-100 dark:border-slate-700 text-indigo-600"><FileText size={12} strokeWidth={3}/></div>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(targetAmountToMatch, 'AED')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Current Selected Total</p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`text-lg font-black transition-colors ${Math.abs(reconciliationDifference) < 0.01 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{formatCurrency(selectedBanksTotal, 'AED')}</span>
                    {Math.abs(reconciliationDifference) > 0.01 && !isMatchedOnThisSide && (<span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${reconciliationDifference > 0 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>{reconciliationDifference > 0 ? 'Remaining' : 'Excess'}: {formatCurrency(Math.abs(reconciliationDifference), 'AED')}</span>)}
                    {Math.abs(reconciliationDifference) < 0.01 && (selectedBankIds.size > 0 || isMatchedOnThisSide) && (<div className="p-1 bg-emerald-500 rounded-md text-white shadow-sm"><Check size={12} strokeWidth={3}/></div>)}
                  </div>
                </div>
              </div>
              <div className="px-8 pt-6 flex gap-2">
                 <button onClick={() => { setReconcileType('client'); setSelectedBankIds(new Set()); setModalSearchTerm(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${reconcileType === 'client' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}><ArrowDownLeft size={14} /> Client Payment (In)</button>
                 <button onClick={() => { setReconcileType('laila'); setSelectedBankIds(new Set()); setModalSearchTerm(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${reconcileType === 'laila' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}><ArrowUpRight size={14} /> Laila Payment (Out)</button>
              </div>
              <div className="px-8 pt-4"><div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} /><input disabled={isMatchedOnThisSide} type="text" placeholder={isMatchedOnThisSide ? "Cannot add matches while linked" : `Search ${reconcileType === 'client' ? 'sender' : 'recipient'} or description...`} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 dark:text-white outline-none transition-all disabled:opacity-50" value={modalSearchTerm} onChange={(e) => setModalSearchTerm(e.target.value)}/></div></div>
              <div className="p-6 space-y-4 max-h-[35vh] overflow-y-auto custom-scrollbar">
                 <div className="flex items-center justify-between px-2"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{reconcileType === 'client' ? 'Inward Credits' : 'Outward Debits'}</p><div className="flex items-center gap-1.5"><Zap size={10} className="text-amber-500 fill-amber-500" /><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Smart Match 3.0 Active</span></div></div>
                 <div className="space-y-2">
                    {eligibleBankItems.length > 0 ? (eligibleBankItems as (BankTransaction & { matchScore: number, isLikely: boolean, isCurrentMatch: boolean })[]).map(bt => (
                      <button key={bt.id} disabled={isMatchedOnThisSide} onClick={() => handleBankItemClick(bt.id)} className={`w-full text-left bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 p-4 rounded-2xl border transition-all flex items-center justify-between group relative ${isMatchedOnThisSide ? 'cursor-default border-emerald-500 ring-2 ring-emerald-500/5 bg-emerald-50/10' : ''} ${(selectedBankIds.has(bt.id) || bt.isCurrentMatch) ? 'border-indigo-600 ring-2 ring-indigo-600/10 bg-indigo-50/20' : bt.matchScore >= 180 ? 'border-indigo-400 bg-indigo-50/10' : bt.isLikely ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-60'}`}><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm font-black text-[10px] transition-colors ${(selectedBankIds.has(bt.id) || bt.isCurrentMatch) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-indigo-600'}`}>{(selectedBankIds.has(bt.id) || bt.isCurrentMatch) ? <Check size={16} strokeWidth={3} /> : bt.date.split('-')[2]}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate max-w-[240px] leading-tight">{bt.vendor || bt.description}</p>{bt.isCurrentMatch && <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter shrink-0">Current Match</span>}{!bt.isCurrentMatch && bt.matchScore >= 180 && bt.isLikely && <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter shrink-0">Best Match</span>}{!bt.isCurrentMatch && bt.matchScore >= 80 && bt.isLikely && bt.matchScore < 180 && <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter shrink-0">Highly Likely</span>}</div><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">{formatDate(bt.date)} • {bt.description}</p></div></div><div className="text-right flex items-center gap-4"><div className="text-right"><p className={`text-sm font-black ${reconcileType === 'client' ? 'text-emerald-600' : 'text-rose-600'}`}>{reconcileType === 'laila' && '-'} {formatCurrency(bt.amount, bt.currency)}</p><p className="text-[8px] font-black uppercase tracking-widest opacity-50">{bt.type === 'credit' ? 'Transfer In' : 'Transfer Out'}</p></div>{!isMatchedOnThisSide && <ChevronRight size={16} className={`transition-transform ${selectedBankIds.has(bt.id) ? 'text-indigo-600' : 'text-indigo-200'}`} />}</div></button>)) : (<div className="py-20 text-center border-2 border-dashed border-slate-50 rounded-3xl"><Landmark size={40} className="mx-auto text-slate-100 mb-4"/><p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No matching bank records found</p></div>)}
                 </div>
              </div>
              <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-t border-indigo-100 dark:border-indigo-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="text-center sm:text-left"><p className="text-[8px] font-black uppercase text-indigo-400 tracking-widest">Reconciliation Summary</p><div className="flex items-center gap-3"><p className="text-xl font-black text-indigo-900 dark:text-indigo-200">{formatCurrency(selectedBanksTotal, 'AED')}</p><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">from {isMatchedOnThisSide ? eligibleBankItems.length : selectedBankIds.size} lines</span></div></div>
                 <div className="flex gap-2 w-full sm:w-auto"><button onClick={() => setIsReconcileModalOpen(false)} className="flex-1 sm:flex-none px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Cancel</button><button disabled={selectedBankIds.size === 0 || isMatchedOnThisSide} onClick={handleConfirmReconcile} className="flex-1 sm:flex-none px-8 py-3 bg-indigo-600 disabled:bg-slate-200 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95">{isMatchedOnThisSide ? 'Side Locked' : `Reconcile ${selectedBankIds.size} items`}</button></div>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4 sm:p-6" 
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-[#F9F7F2]/30 dark:bg-slate-900/30 shrink-0">
              <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-xl text-primary">{editingId ? <Edit3 size={24}/> : <Plus size={24}/>}</div><div><h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-widest">{editingId ? 'Edit Record' : 'New Ledger Entry'}</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Define campaign and financial scope</p></div></div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (editingId) onUpdateTransaction({ id: editingId, ...formData } as any); else onAddTransaction({ id: generateId(), ...formData } as any); setIsModalOpen(false); }} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-2"><Target size={12}/> Campaign Details</p>
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label><div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl"><button type="button" onClick={() => setFormData({...formData, type: TransactionType.INCOME, category: Category.FREELANCE})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.type === TransactionType.INCOME ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Income</button><button type="button" onClick={() => setFormData({...formData, type: TransactionType.EXPENSE, category: Category.OTHER})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.type === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-400'}`}>Expense</button></div></div>
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Campaign / Project Name</label><div className="relative group"><Target className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} /><input type="text" required placeholder="e.g. Hansaplast Launch" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} /></div></div>
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{formData.type === TransactionType.INCOME ? 'Client' : 'Vendor'} Name</label><div className="relative group"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} /><input type="text" placeholder={formData.type === TransactionType.INCOME ? "e.g. Hansaplast Global" : "e.g. Adobe Inc"} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} /></div></div>
                </div>
                <div className="space-y-5">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-2"><Wallet size={12}/> Financial Information</p>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gross AMT</label><div className="relative group"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary pointer-events-none"><span className="text-xs font-black">AED</span></div><input type="number" required placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-14 pr-4 py-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.amount === 0 ? '' : formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} /></div></div>
                     <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Record Date</label><div className="relative group"><CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} /><input type="date" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value, year: new Date(e.target.value).getFullYear()})} /></div></div>
                   </div>
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reference / INV #</label><div className="relative group"><FileSpreadsheet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} /><input type="text" placeholder="e.g. Hans-2025-01" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.invoiceNumber || ''} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} /></div></div>
                </div>
              </div>
              
              {formData.type === TransactionType.INCOME ? (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-6 text-center animate-in slide-in-from-bottom-2 duration-300">
                    <div><p className="text-[8px] font-black uppercase text-slate-400 mb-1">Net Base</p><p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(formData.net || 0, 'AED')}</p></div>
                    <div><p className="text-[8px] font-black uppercase text-slate-400 mb-1">VAT (5%)</p><p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(formData.vat || 0, 'AED')}</p></div>
                    <div><p className="text-[8px] font-black uppercase text-indigo-500 mb-1 tracking-widest">Adly Fee (15%)</p><p className="text-sm font-black text-indigo-600">{formatCurrency(formData.fee || 0, 'AED')}</p></div>
                </div>
              ) : (
                <div className="p-6 bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/30 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3"><div className="p-2 bg-rose-500 rounded-lg text-white"><Trash2 size={16}/></div><p className="text-[10px] font-black text-rose-900 dark:text-rose-200 uppercase tracking-widest">Business Expense Record</p></div>
                    <p className="text-xl font-black text-rose-600">{formatCurrency(formData.amount || 0, 'AED')}</p>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Discard</button><button type="submit" className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-[11px] flex items-center justify-center gap-2"><Save size={18}/> {editingId ? 'Update Record' : 'Save Ledger Entry'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceTracker;
