
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, TransactionType, Contact, BankTransaction } from '../types';
import { 
  TrendingUp, Clock, Briefcase, Receipt, 
  ArrowUpRight, ArrowDownRight, AlertCircle, 
  ChevronRight, Calendar, Calculator, Loader2,
  FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Cell, TooltipProps
} from 'recharts';
import { formatCurrency, USD_TO_AED } from '../constants';
import DirhamSymbol from './DirhamSymbol';
import LadlyLogo from './LadlyLogo';

interface DashboardProps {
  transactions: Transaction[];
  contacts?: Contact[];
  bankTransactions?: BankTransaction[];
  showAedEquivalent: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, showAedEquivalent }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  const getAmountInAED = (t: Transaction) => {
    return t.currency === 'USD' ? t.amount * USD_TO_AED : t.amount;
  };

  // --- REVENUE CALCULATIONS ---
  const revenueByYear = useMemo(() => {
    const map: Record<number, number> = {};
    transactions
      .filter(t => t.type === TransactionType.INCOME)
      .forEach(t => {
        const year = t.year || new Date(t.date).getFullYear();
        map[year] = (map[year] || 0) + getAmountInAED(t);
      });
    return Object.entries(map)
      .map(([year, revenue]) => ({ year: parseInt(year), revenue }))
      .sort((a, b) => a.year - b.year);
  }, [transactions]);

  const revenueThisYear = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.INCOME && t.year === currentYear)
      .reduce((acc, t) => acc + getAmountInAED(t), 0);
  }, [transactions, currentYear]);

  const revenueLastYear = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.INCOME && t.year === currentYear - 1)
      .reduce((acc, t) => acc + getAmountInAED(t), 0);
  }, [transactions, currentYear]);

  const projectedRevenue = useMemo(() => {
    if (revenueThisYear === 0) return 0;
    // Simple linear projection
    return (revenueThisYear / currentMonth) * 12;
  }, [revenueThisYear, currentMonth]);

  const growthRate = useMemo(() => {
    if (revenueLastYear === 0) return 0;
    return ((revenueThisYear - revenueLastYear) / revenueLastYear) * 100;
  }, [revenueThisYear, revenueLastYear]);

  // --- PENDING INVOICES ---
  const pendingInvoices = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.INCOME && ['Unpaid', 'Pending', 'Overdue'].includes(t.clientStatus))
      .sort((a, b) => {
        if (a.clientStatus === 'Overdue' && b.clientStatus !== 'Overdue') return -1;
        if (a.clientStatus !== 'Overdue' && b.clientStatus === 'Overdue') return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      })
      .slice(0, 6);
  }, [transactions]);

  const totalOutstanding = transactions
    .filter(t => t.type === TransactionType.INCOME && ['Unpaid', 'Pending', 'Overdue'].includes(t.clientStatus))
    .reduce((acc, t) => acc + getAmountInAED(t), 0);

  const totalVAT = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + (t.vat || 0), 0);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length && payload[0].value !== undefined) {
      return (
        <div className="bg-bg-card p-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Year {label}</p>
          <div className="flex items-center gap-2 text-primary font-black text-lg">
             <DirhamSymbol className="h-4 w-4" />
             <span>{Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 rounded-2xl flex flex-col min-h-0 overflow-visible">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Financial Overview</h1>
          <p className="text-slate-500 font-medium text-sm">Revenue performance, year-end projections, and collections.</p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm px-4">
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Growth vs Last Year</span>
                <div className={`flex items-center gap-1 font-black ${growthRate >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {growthRate >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="text-sm">{Math.abs(growthRate).toFixed(1)}%</span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <div className="bg-bg-card p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Revenue {currentYear}</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(revenueThisYear, 'AED')}</p>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-primary"><TrendingUp size={20} /></div>
          </div>
        </div>

        <div className="bg-bg-card p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Projected Year-End</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-primary">{formatCurrency(projectedRevenue, 'AED')}</p>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600"><Calculator size={20} /></div>
          </div>
        </div>

        <div className="bg-primary p-6 rounded-2xl shadow-xl text-primary-foreground relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2 relative z-10">Total Outstanding</p>
          <div className="flex items-center justify-between relative z-10">
            <p className="text-2xl font-black">{formatCurrency(totalOutstanding, 'AED')}</p>
            <Clock size={20} className="text-white/40" />
          </div>
        </div>

        <div className="bg-bg-card p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">VAT Liability</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalVAT, 'AED')}</p>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-400"><Receipt size={20} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <div className="bg-bg-card p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-[400px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Revenue Comparison</h3>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actuals</span>
                </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full relative">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%" debounce={1}>
                <BarChart data={revenueByYear} margin={{ left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.05} />
                  <XAxis 
                    dataKey="year" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'currentColor', opacity: 0.6, fontSize: 10, fontWeight: 800}}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'currentColor', fillOpacity: 0.05}} />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40}>
                    {revenueByYear.map((entry, index) => (
                      <Cell key={`cell-${index}`} fillOpacity={entry.year === currentYear ? 1 : 0.4} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-xl">
                <Loader2 className="animate-spin text-slate-300" size={24} />
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Historical Growth</span>
            <span className="text-slate-900 dark:text-white font-black">{revenueByYear.length} Years Tracked</span>
          </div>
        </div>

        <div className="bg-bg-card p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-[400px] flex flex-col overflow-hidden">
           <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Pending Collections</h3>
                <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg uppercase tracking-widest">Action Required</span>
           </div>
           <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {pendingInvoices.length > 0 ? pendingInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-bg-page/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary transition-all group">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border shadow-sm transition-transform group-hover:scale-105 ${inv.clientStatus === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-bg-card text-primary border-slate-200'}`}>
                         {inv.clientStatus === 'Overdue' ? <AlertCircle size={18} /> : <FileText size={18} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{inv.project}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-[120px]">{inv.customerName || 'No Client'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{inv.year}</span>
                        </div>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(getAmountInAED(inv), 'AED')}</p>
                      <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${inv.clientStatus === 'Overdue' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`}></div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${inv.clientStatus === 'Overdue' ? 'text-rose-600' : 'text-amber-600'}`}>{inv.clientStatus}</span>
                      </div>
                   </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 border-2 border-dashed border-slate-50 dark:border-slate-800/50 rounded-3xl">
                   <div className="p-4 bg-emerald-50 rounded-full text-emerald-500"><TrendingUp size={32} /></div>
                   <div className="text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-1">Clear Horizon</p>
                    <p className="text-[9px] font-bold text-slate-400 max-w-[200px]">All outstanding invoices have been settled.</p>
                   </div>
                </div>
              )}
           </div>
           <button className="mt-4 w-full py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-all flex items-center justify-center gap-2">
                View Ledger Details <ChevronRight size={14} />
           </button>
        </div>
      </div>

      {/* Branded Home Page Footer */}
      <footer className="pt-12 pb-20 flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity duration-700">
        <LadlyLogo className="h-8" />
        <div className="flex flex-col items-center text-center gap-1.5">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
            All rights reserved Ladly Media FZ LLC 2025
          </p>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            Corporate Financial Management Systems
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
