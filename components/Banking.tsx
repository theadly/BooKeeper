
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BankTransaction, Transaction } from '../types';
import { RefreshCw, Check, UploadCloud, Trash2, Search, X, Loader, CheckSquare, Square, Layers } from 'lucide-react';
import { formatDate, formatCurrency } from '../constants';

interface BankingProps {
  bankTransactions: BankTransaction[];
  transactions: Transaction[];
  onUpdateBankTransaction: (b: BankTransaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onClearBankTransactions: () => void;
  onStatementUpload: (file: File) => void;
  isProcessing: boolean;
  progress: number;
  showAedEquivalent: boolean;
}

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
type StatusFilter = 'all' | 'matched' | 'unmatched';

const Banking: React.FC<BankingProps> = ({ 
  bankTransactions, 
  transactions, 
  onUpdateBankTransaction, 
  onUpdateTransaction, 
  onClearBankTransactions,
  onStatementUpload,
  isProcessing,
  progress,
  showAedEquivalent
}) => {
  const [reconcileMatchingId, setReconcileMatchingId] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMatchOpen, setIsBulkMatchOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const statementInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setReconcileMatchingId(null);
        setDropdownSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const bulkMatchToInvoice = (transactionId: string) => {
    const invoice = transactions.find(t => t.id === transactionId);
    if (!invoice) return;
    let totalAmount = invoice.clientPayment || 0;
    selectedIds.forEach(id => {
        const bt = bankTransactions.find(b => b.id === id);
        if (bt && !bt.matchedTransactionId) {
            totalAmount += bt.amount;
            onUpdateBankTransaction({ ...bt, matchedTransactionId: transactionId });
        }
    });
    onUpdateTransaction({ ...invoice, clientStatus: 'Paid', clientPayment: totalAmount, isReconciled: true, notes: `${invoice.notes || ''} | Multi-matched (${selectedIds.size} records)` });
    setSelectedIds(new Set());
    setIsBulkMatchOpen(false);
  };

  const processedBankCredits = useMemo(() => {
    let list = bankTransactions;
    if (statusFilter === 'matched') list = list.filter(t => !!t.matchedTransactionId);
    else if (statusFilter === 'unmatched') list = list.filter(t => !t.matchedTransactionId);
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter(t => t.description.toLowerCase().includes(lowerSearch) || (t.vendor && t.vendor.toLowerCase().includes(lowerSearch)));
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date_asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        default: return 0;
      }
    });
    return list;
  }, [bankTransactions, statusFilter, searchTerm, sortBy]);

  const invoiceCandidates = useMemo(() => {
    return transactions.filter(t => t.type === 'Income').filter(t => !dropdownSearch || t.project.toLowerCase().includes(dropdownSearch.toLowerCase()) || (t.customerName && t.customerName.toLowerCase().includes(dropdownSearch.toLowerCase())));
  }, [transactions, dropdownSearch]);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 relative h-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
            <div><h1 className="text-xl font-black text-gray-900 tracking-tight">Reconciliation Ledger</h1></div>
            <div className="flex gap-2">
                 <button onClick={onClearBankTransactions} className="bg-white border border-gray-300 text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors font-bold shadow-sm flex items-center gap-2 text-[10px]"><Trash2 size={14} /> Clear Records</button>
                 <button onClick={() => !isProcessing && statementInputRef.current?.click()} disabled={isProcessing} className="bg-primary hover:opacity-90 text-primary-foreground px-3 py-1.5 rounded-xl transition-colors font-bold shadow-lg flex items-center gap-2 text-[10px]">
                    {isProcessing ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isProcessing ? `Parsing (${Math.round(progress)}%)` : 'Sync Statement'}
                </button>
                <input type="file" ref={statementInputRef} className="hidden" accept="application/pdf, image/*" onChange={(e) => e.target.files?.[0] && onStatementUpload(e.target.files[0])} />
            </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center shadow-sm shrink-0">
            <div className="relative flex-1 w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" placeholder="Filter by vendor or description..." className="w-full pl-8 pr-10 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:outline-none text-xs font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />{searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 p-1"><X size={12} /></button>}</div>
            <div className="flex items-center gap-2 w-full md:w-auto"><select className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-bold" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}><option value="all">Match Status</option><option value="matched">Matched</option><option value="unmatched">Unmatched</option></select><select className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-bold" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}><option value="date_desc">Chronological</option><option value="amount_desc">High Value</option></select></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-20">
            <div className="grid gap-2">
                {processedBankCredits.map(bt => {
                    const isMatched = !!bt.matchedTransactionId;
                    const isSelected = selectedIds.has(bt.id);
                    return (
                        <div key={bt.id} className={`bg-white rounded-xl border p-3 shadow-sm transition-all flex items-center gap-3 cursor-pointer hover:shadow-md ${isSelected ? 'border-primary ring-2 ring-primary/10 bg-primary/5' : 'border-gray-100'}`} onClick={() => toggleSelect(bt.id)}>
                            <div className={`shrink-0 transition-colors ${isSelected ? 'text-primary' : 'text-slate-200'}`}>{isSelected ? <CheckSquare size={16} /> : <Square size={16} />}</div>
                            <div className="flex-1 flex items-center gap-4">
                                <div className="min-w-[60px]"><p className="text-[8px] text-gray-400 font-black uppercase">Post Date</p><p className="font-bold text-gray-900 text-[10px]">{formatDate(bt.date)}</p></div>
                                <div className="flex-1"><div className="flex items-center gap-2"><p className="font-black text-slate-900 text-xs uppercase">{bt.vendor || bt.description}</p>{bt.category && <span className="text-[7px] font-black uppercase bg-slate-100 px-1 py-0.5 rounded text-slate-500 tracking-wider">{bt.category}</span>}</div><p className="text-[9px] text-gray-400 font-medium truncate max-w-[400px]">{bt.description}</p></div>
                                <div className="text-right min-w-[120px]"><p className={`text-xs font-black ${bt.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'}`}>{bt.type === 'debit' ? '-' : ''}{formatCurrency(bt.amount, bt.currency, showAedEquivalent)}</p></div>
                            </div>
                            <div className="flex justify-end min-w-[100px]">{isMatched ? <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1"><Check size={10}/> Matched</div> : <div className="text-[8px] text-slate-300 font-black uppercase tracking-widest italic">Open</div>}</div>
                        </div>
                    );
                })}
            </div>
        </div>

        {selectedIds.size > 0 && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-10 duration-500">
                <div className="bg-primary backdrop-blur-md p-2 rounded-[2rem] shadow-2xl flex items-center gap-1 bg-white/95">
                    <div className="flex items-center px-6 py-2 gap-4 text-primary-foreground"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-xs shadow-lg">{selectedIds.size}</div><span className="text-[10px] font-black uppercase tracking-widest opacity-80">Sync Selection</span></div>
                    <button onClick={() => setIsBulkMatchOpen(true)} className="flex items-center gap-3 bg-white text-primary px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase shadow-xl hover:scale-[1.02] transition-all"><Layers size={16}/> Reconcile with Invoice</button>
                    <button onClick={() => setSelectedIds(new Set())} className="p-3 text-primary-foreground opacity-50 hover:opacity-100"><X size={20} /></button>
                </div>
            </div>
        )}

        {isBulkMatchOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[310] p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[70vh]">
                    <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50"><h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Sync {selectedIds.size} Record{selectedIds.size > 1 ? 's' : ''}</h3><button onClick={() => setIsBulkMatchOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button></div>
                    <div className="p-3 border-b border-slate-100"><input type="text" placeholder="Search invoices..." className="w-full border-none bg-slate-50 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary font-medium" value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)} /></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {invoiceCandidates.map(inv => (
                            <button key={inv.id} onClick={() => bulkMatchToInvoice(inv.id)} className="w-full text-left p-4 hover:bg-primary/5 border-b border-slate-50 flex items-center justify-between transition-colors"><div><p className="font-black text-slate-900 text-xs">{inv.project}</p><p className="text-[10px] text-slate-500 font-bold">{inv.customerName}</p></div><div className="text-right font-black text-primary text-xs">{formatCurrency(inv.amount, inv.currency, showAedEquivalent)}</div></button>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Banking;
