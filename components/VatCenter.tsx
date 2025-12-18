
import React from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, USD_TO_AED } from '../constants';
import { ShieldCheck, Info, FileText, Download, TrendingDown, TrendingUp, AlertCircle, X } from 'lucide-react';
import DirhamSymbol from './DirhamSymbol';

interface VatCenterProps {
  transactions: Transaction[];
  showAedEquivalent: boolean;
  dismissedTips: string[];
  onDismissTip: (tipId: string) => void;
  onOpenAi: () => void;
}

const VatCenter: React.FC<VatCenterProps> = ({ transactions, showAedEquivalent, dismissedTips, onDismissTip, onOpenAi }) => {
  const currentYear = new Date().getFullYear();
  const showKnowledgeBase = !dismissedTips.includes('vat-knowledge-tip');

  const getAmountInAED = (t: Transaction) => {
    return t.currency === 'USD' ? t.amount * USD_TO_AED : t.amount;
  };

  const getVatInAED = (t: Transaction) => {
    return t.currency === 'USD' ? (t.vat || 0) * USD_TO_AED : (t.vat || 0);
  };
  
  const paidIncome = transactions.filter(t => 
    t.type === TransactionType.INCOME && 
    (t.clientStatus === 'Paid' || t.clientStatus === 'Paid to personal account')
  );

  const pendingIncome = transactions.filter(t => 
    t.type === TransactionType.INCOME && 
    ['Unpaid', 'Pending', 'Overdue'].includes(t.clientStatus)
  );

  const totalVatCollected = paidIncome.reduce((sum, t) => sum + getVatInAED(t), 0);
  const totalVatPending = pendingIncome.reduce((sum, t) => sum + getVatInAED(t), 0);
  
  const totalVatPaid = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + getVatInAED(t), 0);

  const netVatLiability = totalVatCollected - totalVatPaid;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Tax Center</h1>
          <p className="text-gray-500 font-medium">VAT liability tracking (Standard 5% Rate). All amounts in AED.</p>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 px-4 py-2 rounded-xl transition-all font-bold shadow-sm">
                <Download size={16} />
                Generate Return
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-emerald-100 dark:text-emerald-800/10 transform rotate-12"><TrendingUp size={120} /></div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 relative z-10">Output Tax (Collected)</p>
          <p className="text-3xl font-black text-emerald-900 dark:text-emerald-200 relative z-10">{formatCurrency(totalVatCollected, 'AED')}</p>
        </div>

        <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-2xl border border-rose-100 dark:border-rose-800/30 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-rose-100 dark:text-rose-800/10 transform rotate-12"><TrendingDown size={120} /></div>
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2 relative z-10">Input Tax (Paid)</p>
          <p className="text-3xl font-black text-rose-900 dark:text-rose-200 relative z-10">{formatCurrency(totalVatPaid, 'AED')}</p>
        </div>

        <div className="bg-primary p-6 rounded-2xl shadow-xl text-primary-foreground relative overflow-hidden">
           <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2 relative z-10">Net Balance (AED)</p>
           <p className="text-3xl font-black relative z-10">{formatCurrency(netVatLiability, 'AED')}</p>
           <div className="mt-3 flex items-center gap-2 relative z-10">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${netVatLiability >= 0 ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black'}`}>
                {netVatLiability >= 0 ? 'Tax Payable' : 'Tax Refund'}
              </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">FTA Return Summary</h3>
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                 <ShieldCheck size={14} /> Compliance Verified
              </div>
           </div>
           <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800"><span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Supplies Subject to 5% VAT</span><span className="font-black text-slate-900 dark:text-white">{formatCurrency(totalVatCollected, 'AED')}</span></div>
              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800"><span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Tax Recoverable on Expenses</span><span className="font-black text-slate-900 dark:text-white">{formatCurrency(totalVatPaid, 'AED')}</span></div>
              <div className="flex justify-between items-center p-5 bg-primary rounded-2xl border border-white/5 text-primary-foreground mt-4 shadow-xl"><span className="text-sm font-black uppercase tracking-widest">Net Payable to FTA</span><span className="text-xl font-black">{formatCurrency(netVatLiability, 'AED')}</span></div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider mb-6">Upcoming Exposure</h3>
              <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                 <AlertCircle className="text-amber-500 shrink-0" size={24} />
                 <div><p className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight">Accrued Liability (Pending)</p><p className="text-sm text-amber-700 dark:text-amber-400 font-medium leading-tight">Accrued <span className="font-bold">{formatCurrency(totalVatPending, 'AED')}</span> from pending receivables. Not due until settled.</p></div>
              </div>
           </div>

           {showKnowledgeBase && (
             <div className="bg-primary p-8 rounded-3xl shadow-xl text-primary-foreground relative overflow-hidden group">
                <button onClick={() => onDismissTip('vat-knowledge-tip')} className="absolute top-6 right-6 opacity-40 hover:opacity-100 transition-opacity z-[20]"><X size={18} /></button>
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-125 transition-all"></div>
                <div className="relative z-10"><div className="flex items-center gap-3 mb-4"><div className="p-2 bg-white/20 rounded-xl"><FileText size={20} /></div><h3 className="font-black text-lg">Tax Knowledge Base</h3></div><p className="opacity-80 text-sm font-medium mb-6">Ask Jarvis for expert advice on VAT-exempt versus zero-rated supplies in the UAE.</p><button onClick={onOpenAi} className="bg-white text-primary font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg hover:bg-slate-100 active:scale-95 transition-all">Consult Jarvis</button></div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default VatCenter;
