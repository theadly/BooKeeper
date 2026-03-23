
import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, TransactionType, Contact, BankTransaction, Category } from '../types';
import { 
  TrendingUp, Clock, Receipt, 
  ArrowUpRight, ArrowDownRight, AlertCircle, 
  ChevronRight, Calendar, Calculator, Loader2,
  FileText, Wallet, PieChart, Info, UserCheck, Percent,
  ArrowRight, Landmark, CreditCard, CheckCircle2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Cell, TooltipProps
} from 'recharts';
import { formatCurrency, USD_TO_AED } from '../constants';
import DirhamSymbol from './DirhamSymbol';

interface DashboardProps {
  transactions: Transaction[];
  contacts?: Contact[];
  bankTransactions?: BankTransaction[];
  showAedEquivalent: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, showAedEquivalent }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [activeMetricIndex, setActiveMetricIndex] = useState(0); 

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const getAedVal = (val?: number, currency?: string) => {
    if (!val) return 0;
    return currency === 'USD' ? val * USD_TO_AED : val;
  };

  const annualMetrics = useMemo(() => {
    const map: Record<number, { year: number, revenue: number, adlyFee: number, lailaTotal: number }> = {};
    transactions
      .filter(t => t.type === TransactionType.INCOME)
      .forEach(t => {
        const year = t.year || new Date(t.date).getFullYear();
        if (!map[year]) map[year] = { year, revenue: 0, adlyFee: 0, lailaTotal: 0 };
        map[year].revenue += getAedVal(t.amount, t.currency);
        map[year].adlyFee += getAedVal(t.fee, t.currency);
        map[year].lailaTotal += getAedVal(t.payable, t.currency);
      });
    return Object.values(map).sort((a, b) => a.year - b.year);
  }, [transactions]);

  const revenueThisYear = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.INCOME && t.year === currentYear)
      .reduce((acc, t) => acc + getAedVal(t.amount, t.currency), 0);
  }, [transactions, currentYear]);

  const expensesThisYear = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.year === currentYear)
      .reduce((acc, t) => acc + getAedVal(t.amount, t.currency), 0);
  }, [transactions, currentYear]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.year === currentYear)
      .forEach(t => {
        const cat = t.category || 'Other';
        map[cat] = (map[cat] || 0) + getAedVal(t.amount, t.currency);
      });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, currentYear]);

  const projectedRevenue = useMemo(() => {
    if (revenueThisYear === 0) return 0;
    return (revenueThisYear / currentMonth) * 12;
  }, [revenueThisYear, currentMonth]);

  const totalOutstanding = transactions
    .filter(t => t.type === TransactionType.INCOME && ['Unpaid', 'Pending', 'Overdue'].includes(t.clientStatus))
    .reduce((acc, t) => acc + getAedVal(t.amount, t.currency), 0);

  const totalVAT = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + (t.vat || 0), 0);

  const metricConfigs = [
    { key: 'revenue', label: 'Gross', sub: 'Total Invoiced', color: 'var(--primary)', icon: <TrendingUp size={14} />, bg: 'bg-primary/10' },
    { key: 'lailaTotal', label: 'Laila', sub: 'Net Earnings', color: '#4f46e5', icon: <UserCheck size={14} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { key: 'adlyFee', label: 'Adly', sub: 'Management Cost', color: '#0d9488', icon: <Percent size={14} />, bg: 'bg-teal-50 dark:bg-teal-900/20' },
  ];

  const currentConfig = metricConfigs[activeMetricIndex];

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length && payload[0].value !== undefined) {
      return (
        <div className="bg-bg-card p-3 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <div className="flex items-center gap-1.5 font-black text-base" style={{ color: currentConfig.color }}>
             <DirhamSymbol className="h-3 w-3" />
             <span>{Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in p-1 sm:p-2 flex flex-col min-h-0 h-full">
      {/* Metrics Bar - High Density */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 shrink-0">
        {[
          { label: 'Revenue', val: revenueThisYear, color: 'text-emerald-600', icon: <TrendingUp size={14}/>, sub: 'This Year' },
          { label: 'Expenses', val: expensesThisYear, color: 'text-rose-600', icon: <CreditCard size={14}/>, sub: 'This Year' },
          { label: 'Forecast', val: projectedRevenue, color: 'text-indigo-600', icon: <Calculator size={14}/>, sub: 'Projected Y/E' },
          { label: 'Receivables', val: totalOutstanding, color: 'text-white', icon: <Clock size={14}/>, sub: 'Outstanding', isPrimary: true },
          { label: 'Tax', val: totalVAT, color: 'text-slate-900', icon: <Receipt size={14}/>, sub: 'VAT Liability' },
        ].map((kpi, idx) => (
          <div key={idx} className={`p-5 rounded-xl shadow-sm transition-all hover:shadow-md duration-300 flex flex-col justify-between ${kpi.isPrimary ? 'bg-gradient-to-br from-primary to-primary-dim text-on-primary' : 'bg-surface-container-lowest'}`}>
            <div className="flex justify-between items-start mb-3">
               <p className={`text-[9px] font-semibold uppercase tracking-wider ${kpi.isPrimary ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>{kpi.label}</p>
               <div className={`p-1.5 rounded-lg shrink-0 ${kpi.isPrimary ? 'bg-white/15 text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{kpi.icon}</div>
            </div>
            <div>
              <p className={`font-serif text-2xl ${kpi.isPrimary ? 'text-on-primary' : 'text-on-background'}`}>{formatCurrency(kpi.val, 'AED')}</p>
              <p className={`text-[9px] font-medium mt-1 ${kpi.isPrimary ? 'text-on-primary/60' : 'text-on-surface-variant'}`}>{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Analysis & Spend Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 flex-1">
        
        {/* Wider Charts Hub (8/12) */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm flex flex-col group/card relative">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 shrink-0 gap-6">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-xl transition-all duration-500 shadow-sm ${currentConfig.bg}`} style={{ color: currentConfig.color }}>
                 {currentConfig.icon}
               </div>
               <div>
                  <h3 className="font-serif text-lg text-on-background">Financial Intelligence</h3>
                  <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">Growth & Distributions</p>
               </div>
            </div>
            
            {/* Premium Segmented Switcher */}
            <div className="relative flex bg-surface-container p-1.5 rounded-xl w-full xl:w-auto self-center">
              {/* Sliding Background Pill */}
              <div
                className="absolute top-1.5 bottom-1.5 bg-surface-container-lowest rounded-lg shadow-sm transition-all duration-300 ease-out"
                style={{ 
                  left: `${(activeMetricIndex * 100) / metricConfigs.length}%`,
                  width: `${100 / metricConfigs.length}%`,
                  marginLeft: '0px'
                }}
              />
              
              {metricConfigs.map((cfg, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveMetricIndex(idx)}
                  className={`relative z-10 flex-1 xl:px-6 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-colors duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${activeMetricIndex === idx ? 'text-on-background' : 'text-on-surface-variant hover:text-on-background'}`}
                >
                  <span className={`transition-transform duration-300 ${activeMetricIndex === idx ? 'scale-110' : 'scale-100'}`}>{cfg.icon}</span>
                  <span className="hidden sm:inline">{cfg.label}</span>
                  <span className="sm:hidden">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full relative">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualMetrics} margin={{ top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.5, fontSize: 10, fontWeight: 800}} dy={10} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'currentColor', fillOpacity: 0.03}} />
                  <Bar dataKey={currentConfig.key} fill={currentConfig.color} radius={[8, 8, 0, 0]} barSize={40}>
                    {annualMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fillOpacity={entry.year === currentYear ? 1 : 0.3} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-200" size={24} /></div>
            )}
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-8 shrink-0">
             {annualMetrics.slice(-4).map((m: any) => (
               <div key={m.year} className={`flex flex-col items-center p-2 rounded-lg transition-all ${m.year === currentYear ? 'bg-primary/5 px-4 ring-1 ring-primary/10' : ''}`}>
                  <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mb-1">{m.year}</span>
                  <span className={`text-[10px] font-semibold transition-colors ${m.year === currentYear ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {formatCurrency(m[currentConfig.key], 'AED')}
                  </span>
               </div>
             ))}
          </div>
        </div>

        {/* Categories Panel (4/12) */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm flex flex-col overflow-hidden">
           <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="p-2 bg-surface-container rounded-lg text-on-surface-variant"><PieChart size={18} /></div>
                <div>
                  <h3 className="font-serif text-lg text-on-background">Spend Distribution</h3>
                  <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">Monthly allocation</p>
                </div>
           </div>
           
           <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {expensesByCategory.length > 0 ? (
                <div className="space-y-4">
                  {expensesByCategory.map((cat, idx) => {
                    const percentage = (cat.value / expensesThisYear) * 100;
                    return (
                      <div key={idx} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                           <span className="text-[10px] font-semibold text-on-background uppercase truncate">{cat.name}</span>
                           <span className="text-[10px] font-semibold text-on-surface-variant">{formatCurrency(cat.value, 'AED')}</span>
                        </div>
                        <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                           <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-20"><Wallet size={32} /></div>
              )}
           </div>
        </div>
      </div>

      {/* Receivables Radar */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm overflow-hidden shrink-0">
           <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="font-serif text-xl text-on-background">Receivables Radar</h3>
                <span className="text-[8px] font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-wider">Action Needed</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {transactions
                .filter(t => t.type === TransactionType.INCOME && ['Unpaid', 'Pending', 'Overdue'].includes(t.clientStatus))
                .slice(0, 8)
                .map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl group hover:shadow-md hover:bg-surface-container-lowest transition-all cursor-pointer">
                   <div className="flex items-center gap-3 truncate">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${inv.clientStatus === 'Overdue' ? 'bg-error/10 text-error' : 'bg-primary-container/40 text-primary'}`}>
                         <FileText size={14} />
                      </div>
                      <div className="truncate">
                        <p className="text-[10px] font-semibold text-on-background truncate">{inv.project}</p>
                        <p className="text-[8px] text-on-surface-variant font-medium uppercase">{inv.customerName || 'Client'}</p>
                      </div>
                   </div>
                   <div className="text-right shrink-0 ml-2">
                      <p className="font-serif text-sm text-on-background">{formatCurrency(getAedVal(inv.amount, inv.currency), 'AED')}</p>
                      <p className="text-[7px] font-semibold text-amber-600 uppercase">{inv.clientStatus}</p>
                   </div>
                </div>
              ))}
           </div>
      </div>
    </div>
  );
};

export default Dashboard;
