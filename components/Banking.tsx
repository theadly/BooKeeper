import React, { useState, useRef, useMemo } from 'react';
import { BankTransaction, Transaction, Category, TransactionType } from '../types';
import { 
  RefreshCw, Check, UploadCloud, Trash2, Search, X, 
  Loader, CheckSquare, Square, Layers, Calendar, 
  ArrowUpRight, ArrowDownLeft, ChevronRight, AlertCircle, 
  Sparkles, Filter, Info, Tag, Link, Link2Off, Plus, CheckCircle2, Activity, Wallet, ArrowRight, ShieldCheck, FileText, Landmark
} from 'lucide-react';
import { formatDate, formatCurrency, CATEGORY_OPTIONS } from '../constants';
import DirhamSymbol from './DirhamSymbol';

interface BankingProps {
  bankTransactions: BankTransaction[];
  transactions: Transaction[];
  onUpdateBankTransaction: (b: BankTransaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onClearBankTransactions: () => void;
  onUnlinkBank: (bankId: string) => void;
  onStatementUpload: (files: File[]) => void;
  onAddExpenseFromBank: (bankTx: BankTransaction, category: Category) => void;
  onLinkBankToLedger: (bankId: string, ledgerIds: string[]) => void;
  isProcessing: boolean;
  progress: number;
  statusMsg?: string;
  showAedEquivalent: boolean;
}

const Banking: React.FC<BankingProps> = ({ 
  bankTransactions, transactions, onUpdateBankTransaction, onUpdateTransaction, 
  onClearBankTransactions, onUnlinkBank, onStatementUpload, onAddExpenseFromBank, onLinkBankToLedger, isProcessing, progress, statusMsg, showAedEquivalent 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'matched' | 'unmatched'>('unmatched');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inward' | 'outward'>('all');
  
  // States for interactive features
  const [activeCategorizationId, setActiveCategorizationId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.OTHER);
  const [activeMatchBankId, setActiveMatchBankId] = useState<string | null>(null);
  const [matchSearch, setMatchSearch] = useState('');
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<Set<string>>(new Set());
  
  const statementInputRef = useRef<HTMLInputElement>(null);

  const processedBankItems = useMemo(() => {
    let list = bankTransactions;
    if (statusFilter === 'matched') list = list.filter(t => !!t.matchedTransactionId);
    else if (statusFilter === 'unmatched') list = list.filter(t => !t.matchedTransactionId);
    
    if (directionFilter === 'inward') list = list.filter(t => t.type === 'credit');
    else if (directionFilter === 'outward') list = list.filter(t => t.type === 'debit');

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(t => t.description.toLowerCase().includes(s) || (t.vendor && t.vendor.toLowerCase().includes(s)));
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bankTransactions, statusFilter, directionFilter, searchTerm]);

  const bankTxToMatch = useMemo(() => 
    activeMatchBankId ? bankTransactions.find(b => b.id === activeMatchBankId) : null
  , [activeMatchBankId, bankTransactions]);

  const isAlreadyMatched = !!bankTxToMatch?.matchedTransactionId;

  const potentialLedgerMatches = useMemo(() => {
    if (!bankTxToMatch) return [];

    const targetType = bankTxToMatch.type === 'credit' ? TransactionType.INCOME : TransactionType.EXPENSE;
    const s = matchSearch.toLowerCase();

    return transactions
      .filter(t => t.type === targetType)
      .filter(t => {
        if (!s) return true;
        return t.project.toLowerCase().includes(s) || (t.customerName && t.customerName.toLowerCase().includes(s));
      })
      .map(t => {
        let score = 0;
        if (Math.abs(t.amount - bankTxToMatch.amount) < 0.01) score += 500;
        
        const bankDesc = bankTxToMatch.description.toLowerCase();
        const bankVendor = (bankTxToMatch.vendor || '').toLowerCase();
        const projectWords = t.project.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        
        projectWords.forEach(w => {
          if (bankDesc.includes(w) || bankVendor.includes(w)) score += 100;
        });

        const isCurrentMatch = bankTxToMatch.matchedTransactionId?.split(', ').includes(t.id);
        
        return { ...t, matchScore: score, isCurrentMatch };
      })
      .sort((a, b) => {
        if (a.isCurrentMatch) return -1;
        if (b.isCurrentMatch) return 1;
        return b.matchScore - a.matchScore;
      });
  }, [bankTxToMatch, transactions, matchSearch]);

  const toggleLedgerSelection = (ledgerId: string) => {
    if (isAlreadyMatched) return;
    const newSet = new Set(selectedLedgerIds);
    if (newSet.has(ledgerId)) newSet.delete(ledgerId); else newSet.add(ledgerId);
    setSelectedLedgerIds(newSet);
  };

  const handleConfirmReconciliation = () => {
    if (!activeMatchBankId || selectedLedgerIds.size === 0) return;
    onLinkBankToLedger(activeMatchBankId, Array.from(selectedLedgerIds));
    setActiveMatchBankId(null);
    setSelectedLedgerIds(new Set());
    setMatchSearch('');
  };

  const handleUnmatch = () => {
    if (activeMatchBankId && confirm("Unmatch this record from the ledger?")) {
      onUnlinkBank(activeMatchBankId);
      setActiveMatchBankId(null);
      setSelectedLedgerIds(new Set());
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 h-full w-full">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 px-1">
        <div>
          <h1 className="font-serif text-2xl text-on-background leading-none">Banking Feed</h1>
          {isProcessing ? (
            <div className="flex items-center gap-2 mt-1">
              <Activity size={10} className="text-primary animate-pulse" />
              <p className="text-[9px] font-medium text-primary uppercase tracking-widest">{statusMsg || 'Processing...'}</p>
            </div>
          ) : (
            <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">Reconcile Ledger vs Statement</p>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {isProcessing && (
            <div className="flex-1 sm:w-32 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden h-9 relative border border-slate-200 dark:border-slate-700">
               <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
               <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-600 dark:text-slate-300">{progress}%</span>
            </div>
          )}
          <button onClick={() => { if(confirm("Clear banking data?")) onClearBankTransactions(); }} className="bg-surface-container-low border-none text-on-surface-variant hover:text-error px-3 py-2 rounded-full font-medium shadow-sm flex items-center gap-2 text-[10px]"><Trash2 size={14} /></button>
          <button onClick={() => !isProcessing && statementInputRef.current?.click()} disabled={isProcessing} className="bg-primary text-on-primary px-4 py-2 rounded-full font-medium shadow-sm flex items-center gap-2 text-[10px] uppercase tracking-wider hover:bg-primary-dim transition-colors">
            {isProcessing ? <Loader size={14} className="animate-spin" /> : <UploadCloud size={14} />} Import
          </button>
          <input type="file" ref={statementInputRef} className="hidden" accept=".pdf,image/*" multiple onChange={(e) => e.target.files && onStatementUpload(Array.from(e.target.files))} />
        </div>
      </header>

      <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-3 flex flex-col xl:flex-row gap-3 shadow-sm shrink-0 mx-1">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={13} />
          <input type="text" placeholder="Search entries..." className="w-full pl-9 py-2.5 bg-surface-container-low border-none rounded-full text-[10px] font-medium text-on-background outline-none focus:ring-2 focus:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex bg-surface-container-low p-1 rounded-full shrink-0">
                <button onClick={() => setStatusFilter('unmatched')} className={`px-4 py-1 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${statusFilter === 'unmatched' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>Unmatched</button>
                <button onClick={() => setStatusFilter('matched')} className={`px-4 py-1 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${statusFilter === 'matched' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>Matched</button>
                <button onClick={() => setStatusFilter('all')} className={`px-4 py-1 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${statusFilter === 'all' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>All</button>
            </div>
            <div className="flex bg-surface-container-low p-1 rounded-full shrink-0">
                <button onClick={() => setDirectionFilter('all')} className={`px-4 py-1 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${directionFilter === 'all' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>All</button>
                <button onClick={() => setDirectionFilter('inward')} className={`px-4 py-1 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${directionFilter === 'inward' ? 'bg-surface-container-lowest text-emerald-600 shadow-sm' : 'text-on-surface-variant'}`}>Inward</button>
                <button onClick={() => setDirectionFilter('outward')} className={`px-4 py-1 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${directionFilter === 'outward' ? 'bg-surface-container-lowest text-rose-500 shadow-sm' : 'text-on-surface-variant'}`}>Outward</button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-32">
        <div className="grid gap-3">
          {processedBankItems.map(bt => {
            const isMatched = !!bt.matchedTransactionId;
            const matchedIds = bt.matchedTransactionId?.split(', ').filter(Boolean) || [];
            const firstMatchedInvoice = isMatched ? transactions.find(t => t.id === matchedIds[0]) : null;
            const isDebit = bt.type === 'debit';
            const isCategorizing = activeCategorizationId === bt.id;

            return (
              <div key={bt.id} className={`rounded-xl border p-4 shadow-sm flex flex-col gap-4 transition-all ${isMatched ? 'bg-emerald-50/30 border-emerald-100' : 'bg-surface-container-lowest border-surface-container'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bt.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {bt.type === 'credit' ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center"><p className="font-semibold text-on-background text-xs uppercase truncate leading-none">{bt.vendor || 'Bank Transaction'}</p><p className={`font-serif text-sm ${bt.type === 'credit' ? 'text-emerald-600' : 'text-on-background'}`}>{formatCurrency(bt.amount, bt.currency)}</p></div>
                    <div className="flex items-center gap-2 mt-1.5"><span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">{formatDate(bt.date)}</span><span className="w-0.5 h-0.5 rounded-full bg-surface-container-high"></span><p className="text-[8px] text-on-surface-variant truncate max-w-[250px]">{bt.description}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => { setSelectedLedgerIds(new Set(matchedIds)); setActiveMatchBankId(bt.id); setMatchSearch(''); }}
                            className={`group/match px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all min-w-[100px] justify-center ${isMatched ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-primary text-white border-primary shadow-sm'}`}
                        >
                            {isMatched ? (
                                <>
                                    <ShieldCheck size={12} strokeWidth={3}/>
                                    <span className="text-[9px] font-medium uppercase truncate max-w-[80px]">{matchedIds.length > 1 ? `${matchedIds.length} Entries` : firstMatchedInvoice?.project || 'Matched'}</span>
                                </>
                            ) : (
                                <>
                                    <Link size={12} strokeWidth={3}/>
                                    <span className="text-[9px] font-medium uppercase">Reconcile</span>
                                </>
                            )}
                        </button>
                        {!isMatched && isDebit && (
                            <button
                                onClick={() => { setActiveCategorizationId(isCategorizing ? null : bt.id); setSelectedCategory(Category.OTHER); }}
                                className={`px-3 py-1.5 rounded-full font-medium text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all ${isCategorizing ? 'bg-rose-50 text-rose-600' : 'bg-surface-container text-on-surface-variant hover:bg-rose-50 hover:text-rose-500'}`}
                            >
                                <Tag size={12}/> {isCategorizing ? 'Cancel' : 'Expense'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Inline Expense Tracking UI */}
                {isCategorizing && !isMatched && (
                    <div className="animate-in slide-in-from-top-2 duration-200 pt-3 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="p-2 bg-rose-50 rounded-lg text-rose-500"><Wallet size={14}/></div>
                            <div className="flex-1 sm:flex-none">
                                <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider mb-1">Select Expense Category</p>
                                <select
                                    className="w-full sm:w-48 bg-surface-container-low border-none rounded-lg px-3 py-2 text-[10px] font-medium text-on-background focus:ring-1 focus:ring-primary/20 outline-none"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value as Category)}
                                >
                                    {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={() => { onAddExpenseFromBank(bt, selectedCategory); setActiveCategorizationId(null); }}
                            className="w-full sm:w-auto bg-rose-500 text-white px-5 py-2.5 rounded-full font-medium text-[9px] uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-rose-600"
                        >
                            Track as Expense <ArrowRight size={12}/>
                        </button>
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Match Selector Modal */}
      {activeMatchBankId && bankTxToMatch && (
        <div className="fixed inset-0 z-[4000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveMatchBankId(null)}>
           <div className="bg-surface-container-lowest rounded-xl w-full max-w-2xl shadow-xl border border-surface-container overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-8 py-6 border-b border-surface-container flex justify-between items-center">
                 <div className="flex items-center gap-3">
                   <div className="bg-primary p-2 rounded-lg text-on-primary"><Link size={16}/></div>
                   <div>
                     <h2 className="font-serif text-xl text-on-background leading-none">Reconcile Bank</h2>
                     <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider mt-1">{bankTxToMatch.vendor || 'Statement Entry'} · {formatDate(bankTxToMatch.date)}</p>
                   </div>
                 </div>
                 <button onClick={() => setActiveMatchBankId(null)} className="text-on-surface-variant hover:text-on-background transition-colors"><X size={18} /></button>
              </div>

              {isAlreadyMatched && (
                <div className="mx-8 mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between gap-4">
                   <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-500" size={16} /><p className="text-[9px] font-medium uppercase text-emerald-700 tracking-wider">This record is already matched with the ledger.</p></div>
                   <button onClick={handleUnmatch} className="bg-white px-3 py-1.5 rounded-full border border-emerald-200 text-[9px] font-medium uppercase text-emerald-600 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all flex items-center gap-1.5"><Link2Off size={11}/> Unmatch</button>
                </div>
              )}

              <div className="bg-surface-container-low px-8 py-4 border-b border-surface-container flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-medium uppercase text-on-surface-variant tracking-wider mb-1">Bank Statement Amount</p>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-surface-container-lowest rounded-md shadow-sm border border-surface-container text-primary"><Landmark size={12}/></div>
                    <span className="font-serif text-lg text-on-background">{formatCurrency(bankTxToMatch.amount, 'AED')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-medium uppercase text-on-surface-variant tracking-wider mb-1">Selected Ledger Total</p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-serif text-lg text-on-background">
                        {/* Fix: Added explicit number cast to handle potential unknown inference on the total result */}
                        {formatCurrency(Array.from(selectedLedgerIds).reduce((sum: number, id: string) => {
                          const t = transactions.find(tx => tx.id === id);
                          return sum + (t?.amount || 0);
                        }, 0) as number, 'AED')}
                    </span>
                    {(selectedLedgerIds.size > 0 || isAlreadyMatched) && (<div className="p-1 bg-emerald-500 rounded-md text-white shadow-sm"><Check size={12} strokeWidth={3}/></div>)}
                  </div>
                </div>
              </div>

              <div className="p-8">
                 <div className="relative mb-6 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={15} />
                    <input
                      autoFocus
                      disabled={isAlreadyMatched}
                      type="text"
                      placeholder={isAlreadyMatched ? "Locked while matched" : "Search ledger by project or client..."}
                      className="w-full bg-surface-container-low border-none rounded-full pl-11 pr-4 py-3 text-[11px] font-medium text-on-background focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                      value={matchSearch}
                      onChange={(e) => setMatchSearch(e.target.value)}
                    />
                 </div>

                 <div className="max-h-[40vh] overflow-y-auto custom-scrollbar space-y-2 px-1">
                    <p className="text-[9px] font-medium uppercase text-on-surface-variant tracking-widest mb-3">Available Ledger Entries</p>
                    {potentialLedgerMatches.length > 0 ? potentialLedgerMatches.map(t => (
                      <button
                        key={t.id}
                        disabled={isAlreadyMatched && !t.isCurrentMatch}
                        onClick={() => toggleLedgerSelection(t.id)}
                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between group transition-all shadow-sm active:scale-[0.98] ${selectedLedgerIds.has(t.id) || t.isCurrentMatch ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-surface-container-lowest hover:bg-surface-container-low border-surface-container'}`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                           <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${selectedLedgerIds.has(t.id) || t.isCurrentMatch ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-surface-container text-primary border-surface-container group-hover:bg-primary group-hover:text-on-primary'}`}>
                              {selectedLedgerIds.has(t.id) || t.isCurrentMatch ? <Check size={16} strokeWidth={3}/> : <FileText size={16}/>}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold uppercase leading-tight mb-1 truncate ${selectedLedgerIds.has(t.id) || t.isCurrentMatch ? 'text-emerald-900' : 'text-on-background'}`}>{t.project}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider truncate">{t.customerName || 'Client'}</p>
                                <span className="w-0.5 h-0.5 rounded-full bg-surface-container-high shrink-0" />
                                <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider">{formatDate(t.date)}</p>
                              </div>
                           </div>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                           <p className={`font-serif text-sm mb-1 ${selectedLedgerIds.has(t.id) || t.isCurrentMatch ? 'text-emerald-700' : 'text-on-background'}`}>{formatCurrency(t.amount, 'AED')}</p>
                           {t.isCurrentMatch ? (
                             <span className="inline-block text-[8px] font-medium uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 tracking-wider">Matched</span>
                           ) : Math.abs(t.amount - bankTxToMatch.amount) < 0.01 && (
                             <span className="inline-block text-[8px] font-medium uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 tracking-wider">Exact</span>
                           )}
                        </div>
                      </button>
                    )) : (
                      <div className="py-16 text-center border-2 border-dashed border-surface-container rounded-xl bg-surface-container-lowest/50">
                         <div className="bg-surface-container w-12 h-12 rounded-xl flex items-center justify-center text-on-surface-variant mx-auto mb-3 border border-surface-container"><Landmark size={20} /></div>
                         <p className="text-[9px] font-medium uppercase text-on-surface-variant tracking-widest">No available ledger items</p>
                      </div>
                    )}
                 </div>
              </div>
              <div className="px-8 py-5 bg-surface-container-low border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="text-center sm:text-left">
                    <p className="text-[8px] font-medium uppercase text-on-surface-variant tracking-widest">Reconciliation Summary</p>
                    <div className="flex items-center gap-3 mt-1">
                       <p className="font-serif text-xl text-on-background">
                           {formatCurrency((isAlreadyMatched ? (bankTxToMatch?.amount || 0) : Array.from(selectedLedgerIds).reduce((sum: number, id: string) => {
                             const t = transactions.find(tx => tx.id === id);
                             return sum + (t?.amount || 0);
                           }, 0)) as number, 'AED')}
                       </p>
                       {!isAlreadyMatched && selectedLedgerIds.size > 0 && <span className="text-[9px] font-medium text-primary uppercase tracking-wider">{selectedLedgerIds.size} Selected</span>}
                    </div>
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setActiveMatchBankId(null)} className="flex-1 sm:flex-none px-6 py-2.5 text-[10px] font-medium uppercase tracking-wider text-on-surface-variant hover:text-on-background transition-all">Cancel</button>
                    <button
                      disabled={isAlreadyMatched || selectedLedgerIds.size === 0}
                      onClick={handleConfirmReconciliation}
                      className={`flex-1 sm:flex-none px-8 py-2.5 rounded-full text-[10px] font-medium uppercase tracking-wider transition-all ${isAlreadyMatched ? 'bg-surface-container text-on-surface-variant cursor-default' : selectedLedgerIds.size > 0 ? 'bg-primary text-on-primary shadow-sm hover:opacity-90 active:scale-95' : 'bg-surface-container text-on-surface-variant cursor-not-allowed'}`}
                    >
                      {isAlreadyMatched ? 'Record Locked' : selectedLedgerIds.size > 0 ? `Confirm ${selectedLedgerIds.size} Items` : 'Select Items'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Banking;