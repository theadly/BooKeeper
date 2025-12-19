
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, TransactionType, Contact, BankTransaction, Category } from '../types';
import { 
  TrendingUp, Clock, Briefcase, Receipt, 
  ArrowUpRight, ArrowDownRight, AlertCircle, 
  ChevronRight, Calendar, Calculator, Loader2,
  FileText, Wallet, PieChart
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

  const expensesThisYear = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.year === currentYear)
      .reduce((acc, t) => acc + getAmountInAED(t), 0);
  }, [transactions, currentYear]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.year === currentYear)
      .forEach(t => {
        const cat = t.category || 'Other';
        map[cat] = (map[cat] || 0) + getAmountInAED(t);
      });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, currentYear]);

  const revenueLastYear = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.INCOME && t.year === currentYear - 1)
      .reduce((acc, t) => acc + getAmountInAED(t), 0);
  }, [transactions, currentYear]);

  const projectedRevenue = useMemo(() => {
    if (revenueThisYear === 0) return 0;
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
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
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
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 rounded-2xl flex flex-col min-h-0 overflow-visible">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Overview</h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">Revenue performance and collections.</p>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-3 bg-white dark:bg-slate-800 p-3 sm:p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm px-4">
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full gap-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Growth vs LY</span>
                <div className={`flex items-center gap-1 font-black ${growthRate >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {growthRate >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="text-sm">{Math.abs(growthRate).toFixed(1)}%</span>
                </div>
            </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-4 shrink-0">
        <div className="bg-bg-card p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group">
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Revenue {currentYear}</p>
          <div className="flex items-center justify-between">
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{formatCurrency(revenueThisYear, 'AED')}</p>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-primary shrink-0"><TrendingUp size={16} /></div>
          </div>
        </div>

        <div className="bg-bg-card p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group border-l-4 border-l-rose-500">
          <p className="text-[9px] sm:text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Expenses {currentYear}</p>
          <div className="flex items-center justify-between">
            <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(expensesThisYear, 'AED')}</p>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 shrink-0"><Wallet size={16} /></div>
          </div>
        </div>

        <div className="bg-bg-card p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group">
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Projected Y/E</p>
          <div className="flex items-center justify-between">
            <p className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(projectedRevenue, 'AED')}</p>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 shrink-0"><Calculator size={16} /></div>
          </div>
        </div>

        <div className="bg-primary p-4 sm:p-5 rounded-2xl shadow-xl text-primary-foreground relative overflow-hidden group">
          <p className="text-[9px] sm:text-[10px] font-black opacity-60 uppercase tracking-widest mb-2 relative z-10">Outstanding</p>
          <div className="flex items-center justify-between relative z-10">
            <p className="text-lg sm:text-xl font-black">{formatCurrency(totalOutstanding, 'AED')}</p>
            <Clock size={16} className="text-white/40 shrink-0" />
          </div>
        </div>

        <div className="bg-bg-card p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group">
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">VAT Liability</p>
          <div className="flex items-center justify-between">
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{formatCurrency(totalVAT, 'AED')}</p>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-400 shrink-0"><Receipt size={16} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <div className="bg-bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-[350px] sm:h-[400px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Revenue Flow</h3>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actuals</span>
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
                    tick={{fill: 'currentColor', opacity: 0.6, fontSize: 9, fontWeight: 800}}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'currentColor', fillOpacity: 0.05}} />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={32}>
                    {revenueByYear.map((entry, index) => (
                      <Cell key={`cell-${index}`} fillOpacity={entry.year === currentYear ? 1 : 0.4} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">
                <Loader2 className="animate-spin text-slate-300" size={24} />
              </div>
            )}
          </div>
        </div>

        <div className="bg-bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-[400px] flex flex-col overflow-hidden">
           <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Spending Breakdown</h3>
                <span className="text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg uppercase tracking-widest">{currentYear}</span>
           </div>
           <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {expensesByCategory.length > 0 ? (
                <div className="space-y-6">
                  {expensesByCategory.map((cat, idx) => {
                    const percentage = (cat.value / expensesThisYear) * 100;
                    return (
                      <div key={idx} className="group">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 group-hover:scale-125 transition-transform"></div>
                              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{cat.name}</span>
                           </div>
                           <span className="text-[11px] font-black text-slate-900 dark:text-white">{formatCurrency(cat.value, 'AED')}</span>
                        </div>
                        <div className="h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div 
                              className="h-full bg-rose-500 transition-all duration-1000 ease-out" 
                              style={{ width: `${percentage}%` }}
                           />
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{percentage.toFixed(1)}% of annual spend</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 border-2 border-dashed border-slate-50 dark:border-slate-800/50 rounded-3xl">
                   <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-300"><Wallet size={28} /></div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em]">No expense records for {currentYear}</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Collections Row */}
      <div className="bg-bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
           <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Active Receivables</h3>
                <span className="text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg uppercase tracking-widest">Action Required</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingInvoices.length > 0 ? pendingInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3.5 bg-bg-page/40 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary transition-all group">
                   <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border shadow-sm shrink-0 ${inv.clientStatus === 'Overdue' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 border-rose-100 dark:border-rose-800' : 'bg-bg-card dark:bg-slate-700 text-primary border-slate-200 dark:border-slate-600'}`}>
                         {inv.clientStatus === 'Overdue' ? <AlertCircle size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{inv.project}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{inv.customerName || 'Client'} • {inv.year}</span>
                      </div>
                   </div>
                   <div className="text-right shrink-0 ml-3">
                      <p className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(getAmountInAED(inv), 'AED')}</p>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${inv.clientStatus === 'Overdue' ? 'text-rose-600' : 'text-amber-600'}`}>{inv.clientStatus}</span>
                   </div>
                </div>
              )) : (
                <div className="col-span-full py-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Horizon is clear</div>
              )}
           </div>
      </div>

      {/* Branded Home Page Footer */}
      <footer className="pt-8 sm:pt-12 pb-20 flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity duration-700">
        <LadlyLogo className="h-6 sm:h-8" />
        <div className="flex flex-col items-center text-center gap-1.5">
          <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
            © Ladly Media FZ LLC 2025
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
