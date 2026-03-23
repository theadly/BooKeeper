
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, USD_TO_AED } from '../constants';
import { ShieldCheck, FileText, Download, AlertCircle, X, Calendar } from 'lucide-react';

interface VatCenterProps {
  transactions: Transaction[];
  showAedEquivalent: boolean;
  dismissedTips: string[];
  onDismissTip: (tipId: string) => void;
  onOpenAi: () => void;
}

const QUARTERS = [
  { label: 'Q1 (Jan–Mar)', start: 0, end: 2 },
  { label: 'Q2 (Apr–Jun)', start: 3, end: 5 },
  { label: 'Q3 (Jul–Sep)', start: 6, end: 8 },
  { label: 'Q4 (Oct–Dec)', start: 9, end: 11 },
];

const VatCenter: React.FC<VatCenterProps> = ({ transactions, showAedEquivalent, dismissedTips, onDismissTip, onOpenAi }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  const showKnowledgeBase = !dismissedTips.includes('vat-knowledge-tip');

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const getNetInAED = (t: Transaction) => {
    const net = t.net || t.amount / 1.05;
    return t.currency === 'USD' ? net * USD_TO_AED : net;
  };

  const getVatInAED = (t: Transaction) => {
    return t.currency === 'USD' ? (t.vat || 0) * USD_TO_AED : (t.vat || 0);
  };

  // Filter transactions for selected period
  const periodTransactions = useMemo(() => {
    const q = QUARTERS[selectedQuarter];
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === selectedYear && d.getMonth() >= q.start && d.getMonth() <= q.end;
    });
  }, [transactions, selectedYear, selectedQuarter]);

  // VAT 201 Box Calculations
  const vatReturn = useMemo(() => {
    const income = periodTransactions.filter(t => t.type === TransactionType.INCOME);
    const expenses = periodTransactions.filter(t => t.type === TransactionType.EXPENSE);

    // Box 1: Standard rated supplies (5%) — all income with VAT > 0
    const standardRatedIncome = income.filter(t => (t.vat || 0) > 0);
    const box1Amount = standardRatedIncome.reduce((s, t) => s + getNetInAED(t), 0);
    const box1Vat = standardRatedIncome.reduce((s, t) => s + getVatInAED(t), 0);

    // Box 4: Zero-rated supplies — income with VAT = 0 (e.g. exports, international services)
    const zeroRatedIncome = income.filter(t => (t.vat || 0) === 0);
    const box4Amount = zeroRatedIncome.reduce((s, t) => s + getNetInAED(t), 0);

    // Box 5: Exempt supplies (none for typical content creator)
    const box5Amount = 0;

    // Box 8: Total outputs
    const box8Amount = box1Amount + box4Amount + box5Amount;
    const box8Vat = box1Vat;

    // Box 9: Standard rated expenses
    const standardRatedExpenses = expenses.filter(t => (t.vat || 0) > 0);
    const box9Amount = standardRatedExpenses.reduce((s, t) => s + getNetInAED(t), 0);
    const box9Vat = standardRatedExpenses.reduce((s, t) => s + getVatInAED(t), 0);

    // Box 11: Total inputs
    const box11Amount = box9Amount;
    const box11Vat = box9Vat;

    // Box 12: Total due tax (output)
    const box12 = box8Vat;
    // Box 13: Total recoverable tax (input)
    const box13 = box11Vat;
    // Box 14: Net payable
    const box14 = box12 - box13;

    // Pending exposure (not part of return but useful)
    const pendingIncome = income.filter(t => ['Unpaid', 'Pending', 'Overdue'].includes(t.clientStatus));
    const pendingVat = pendingIncome.reduce((s, t) => s + getVatInAED(t), 0);

    return {
      box1Amount, box1Vat,
      box4Amount,
      box5Amount,
      box8Amount, box8Vat,
      box9Amount, box9Vat,
      box11Amount, box11Vat,
      box12, box13, box14,
      pendingVat,
      incomeCount: income.length,
      expenseCount: expenses.length,
    };
  }, [periodTransactions]);

  const q = QUARTERS[selectedQuarter];
  const periodStart = new Date(selectedYear, q.start, 1);
  const periodEnd = new Date(selectedYear, q.end + 1, 0);
  const formatPeriodDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const years = Array.from(new Set(transactions.map(t => new Date(t.date).getFullYear()).concat(currentYear))).sort((a, b) => b - a);

  return (
    <div className="space-y-5 animate-fade-in px-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-2xl text-on-background leading-none">Tax Center</h1>
          <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">UAE VAT 201 · Standard 5% Rate · All amounts in AED</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-container-low p-1 rounded-full border border-surface-container">
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-[9px] font-medium text-on-background px-2 py-1 outline-none appearance-none cursor-pointer">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selectedQuarter} onChange={e => setSelectedQuarter(Number(e.target.value))} className="bg-transparent text-[9px] font-medium text-on-background px-2 py-1 outline-none appearance-none cursor-pointer">
              {QUARTERS.map((q, i) => <option key={i} value={i}>{q.label}</option>)}
            </select>
          </div>
          <button onClick={() => setShowReturnModal(true)} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-full transition-colors font-medium text-[10px] uppercase tracking-wider hover:bg-primary-dim shadow-sm">
            <Download size={13} /> Generate Return
          </button>
        </div>
      </div>

      {/* Period Banner */}
      <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full border border-surface-container text-[9px] font-medium text-on-surface-variant w-fit">
        <Calendar size={12} />
        <span>Tax Period: {formatPeriodDate(periodStart)} — {formatPeriodDate(periodEnd)}</span>
        <span className="text-outline-variant">·</span>
        <span>{vatReturn.incomeCount} supplies · {vatReturn.expenseCount} expenses</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-sm">
          <p className="text-[8px] font-medium text-emerald-600 uppercase tracking-wider mb-3">Output Tax (Box 12)</p>
          <p className="font-serif text-2xl text-on-background">{formatCurrency(vatReturn.box12, 'AED')}</p>
          <p className="text-[9px] text-on-surface-variant mt-1">on {formatCurrency(vatReturn.box8Amount, 'AED')} supplies</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-sm">
          <p className="text-[8px] font-medium text-rose-500 uppercase tracking-wider mb-3">Input Tax (Box 13)</p>
          <p className="font-serif text-2xl text-on-background">{formatCurrency(vatReturn.box13, 'AED')}</p>
          <p className="text-[9px] text-on-surface-variant mt-1">on {formatCurrency(vatReturn.box11Amount, 'AED')} expenses</p>
        </div>
        <div className="bg-gradient-to-br from-primary to-primary-dim p-5 rounded-xl shadow-sm text-on-primary">
          <p className="text-[8px] font-medium text-on-primary/70 uppercase tracking-wider mb-3">Net VAT Due (Box 14)</p>
          <p className="font-serif text-2xl">{formatCurrency(vatReturn.box14, 'AED')}</p>
          <span className={`mt-2 inline-block px-2.5 py-1 rounded-full text-[8px] font-medium uppercase tracking-wider ${vatReturn.box14 >= 0 ? 'bg-amber-400/90 text-amber-900' : 'bg-emerald-400/90 text-emerald-900'}`}>
            {vatReturn.box14 >= 0 ? 'Tax Payable' : 'Tax Refund'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* FTA Return Summary (VAT 201 Boxes) */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-base text-on-background">VAT 201 Return Preview</h3>
            <div className="flex items-center gap-1.5 text-[9px] font-medium text-emerald-600 uppercase tracking-wider">
              <ShieldCheck size={12} /> {QUARTERS[selectedQuarter].label} {selectedYear}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mb-2 px-1">Sales &amp; Outputs</p>
            <ReturnRow label="Box 1 — Standard Rated Supplies (5%)" amount={vatReturn.box1Amount} vat={vatReturn.box1Vat} />
            <ReturnRow label="Box 4 — Zero-Rated Supplies" amount={vatReturn.box4Amount} vat={0} />
            <ReturnRow label="Box 5 — Exempt Supplies" amount={vatReturn.box5Amount} vat={0} />
            <ReturnRow label="Box 8 — Total Sales & Outputs" amount={vatReturn.box8Amount} vat={vatReturn.box8Vat} highlight />

            <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-4 mb-2 px-1">Expenses &amp; Inputs</p>
            <ReturnRow label="Box 9 — Standard Rated Expenses (5%)" amount={vatReturn.box9Amount} vat={vatReturn.box9Vat} />
            <ReturnRow label="Box 11 — Total Expenses & Inputs" amount={vatReturn.box11Amount} vat={vatReturn.box11Vat} highlight />

            <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-4 mb-2 px-1">Net VAT Due</p>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary to-primary-dim rounded-xl text-on-primary">
              <span className="text-[10px] font-medium uppercase tracking-wider">Box 14 — Payable to FTA</span>
              <span className="font-serif text-lg">{formatCurrency(vatReturn.box14, 'AED')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Upcoming Exposure */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-sm">
            <h3 className="font-serif text-base text-on-background mb-4">Upcoming Exposure</h3>
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-[9px] font-semibold text-amber-800 uppercase tracking-wider">Accrued Liability (Pending)</p>
                <p className="text-[10px] text-amber-700 font-medium mt-1 leading-relaxed">
                  {formatCurrency(vatReturn.pendingVat, 'AED')} VAT accrued from pending receivables. Not due until payment is received.
                </p>
              </div>
            </div>
          </div>

          {/* Filing Deadline */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-sm">
            <h3 className="font-serif text-base text-on-background mb-3">Filing Deadline</h3>
            <div className="p-4 bg-surface-container-low rounded-xl">
              <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider mb-1">Return Due Date</p>
              <p className="font-serif text-lg text-on-background">28 {new Date(selectedYear, q.end + 1, 28).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
              <p className="text-[9px] text-on-surface-variant mt-1">File via EMARATAX portal (tax.gov.ae)</p>
            </div>
          </div>

          {/* Tax Knowledge Base */}
          {showKnowledgeBase && (
            <div className="bg-gradient-to-br from-primary to-primary-dim p-6 rounded-xl shadow-sm text-on-primary relative overflow-hidden">
              <button onClick={() => onDismissTip('vat-knowledge-tip')} className="absolute top-4 right-4 text-on-primary/50 hover:text-on-primary transition-colors"><X size={15} /></button>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/15 rounded-lg"><FileText size={16} /></div>
                <h3 className="font-serif text-base">Tax Knowledge Base</h3>
              </div>
              <p className="text-[10px] text-on-primary/80 mb-4 leading-relaxed">Ask Jarvis for expert advice on VAT-exempt versus zero-rated supplies in the UAE.</p>
              <button onClick={onOpenAi} className="bg-white text-primary font-medium text-[9px] uppercase tracking-wider px-4 py-2 rounded-full shadow-sm hover:bg-surface-container-low transition-colors">Consult Jarvis</button>
            </div>
          )}
        </div>
      </div>

      {/* VAT 201 Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-[4000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReturnModal(false)}>
          <div className="bg-surface-container-lowest rounded-xl w-full max-w-3xl max-h-[90vh] shadow-xl border border-surface-container overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-8 py-5 border-b border-surface-container flex justify-between items-center">
              <div>
                <h2 className="font-serif text-xl text-on-background">VAT Return Form 201</h2>
                <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider mt-0.5">
                  {QUARTERS[selectedQuarter].label} {selectedYear} · {formatPeriodDate(periodStart)} — {formatPeriodDate(periodEnd)}
                </p>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="p-2 text-on-surface-variant hover:text-on-background transition-colors"><X size={18} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {/* Section 1: Taxable Person */}
              <div>
                <p className="text-[8px] font-medium text-primary uppercase tracking-widest mb-3">Section 1 — Taxable Person Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-container-low rounded-xl">
                    <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">TRN</p>
                    <p className="text-sm font-semibold text-on-background mt-0.5">—</p>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-xl">
                    <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">Registrant Name</p>
                    <p className="text-sm font-semibold text-on-background mt-0.5">Ladly Media</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Period */}
              <div>
                <p className="text-[8px] font-medium text-primary uppercase tracking-widest mb-3">Section 2 — Tax Period</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-container-low rounded-xl">
                    <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">Period Start</p>
                    <p className="text-sm font-semibold text-on-background mt-0.5">{formatPeriodDate(periodStart)}</p>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-xl">
                    <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">Period End</p>
                    <p className="text-sm font-semibold text-on-background mt-0.5">{formatPeriodDate(periodEnd)}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Outputs */}
              <div>
                <p className="text-[8px] font-medium text-primary uppercase tracking-widest mb-3">Section 3 — VAT on Sales &amp; Outputs</p>
                <div className="border border-surface-container rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_120px_120px] bg-surface-container-low px-4 py-2 border-b border-surface-container">
                    <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">Description</span>
                    <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider text-right">Amount (AED)</span>
                    <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider text-right">VAT (AED)</span>
                  </div>
                  <FormRow label="1. Standard Rated Supplies" amount={vatReturn.box1Amount} vat={vatReturn.box1Vat} />
                  <FormRow label="2. Tax Refunds (Tourists)" amount={0} vat={0} />
                  <FormRow label="3. Reverse Charge Supplies" amount={0} vat={0} />
                  <FormRow label="4. Zero-Rated Supplies" amount={vatReturn.box4Amount} vat={0} />
                  <FormRow label="5. Exempt Supplies" amount={vatReturn.box5Amount} vat={0} />
                  <FormRow label="6. Goods Imported (Customs)" amount={0} vat={0} />
                  <FormRow label="7. Adjustments to Imports" amount={0} vat={0} />
                  <FormRow label="8. TOTAL SALES & OUTPUTS" amount={vatReturn.box8Amount} vat={vatReturn.box8Vat} bold />
                </div>
              </div>

              {/* Section 4: Inputs */}
              <div>
                <p className="text-[8px] font-medium text-primary uppercase tracking-widest mb-3">Section 4 — VAT on Expenses &amp; Inputs</p>
                <div className="border border-surface-container rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_120px_120px] bg-surface-container-low px-4 py-2 border-b border-surface-container">
                    <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">Description</span>
                    <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider text-right">Amount (AED)</span>
                    <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider text-right">Recoverable (AED)</span>
                  </div>
                  <FormRow label="9. Standard Rated Expenses" amount={vatReturn.box9Amount} vat={vatReturn.box9Vat} />
                  <FormRow label="10. Reverse Charge (Input)" amount={0} vat={0} />
                  <FormRow label="11. TOTAL EXPENSES & INPUTS" amount={vatReturn.box11Amount} vat={vatReturn.box11Vat} bold />
                </div>
              </div>

              {/* Section 5: Net Due */}
              <div>
                <p className="text-[8px] font-medium text-primary uppercase tracking-widest mb-3">Section 5 — Net VAT Due</p>
                <div className="border border-surface-container rounded-xl overflow-hidden">
                  <FormRow label="12. Total Due Tax (Output)" amount={null} vat={vatReturn.box12} />
                  <FormRow label="13. Total Recoverable Tax (Input)" amount={null} vat={vatReturn.box13} />
                  <div className="grid grid-cols-[1fr_120px_120px] px-4 py-3 bg-gradient-to-r from-primary to-primary-dim text-on-primary">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">14. PAYABLE TAX</span>
                    <span />
                    <span className="font-serif text-base text-right">{formatCurrency(vatReturn.box14, 'AED')}</span>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-[9px] text-amber-800 font-medium leading-relaxed">
                  This is a draft preview for internal use only. The official return must be filed through the EMARATAX portal at tax.gov.ae by the 28th of the month following the end of the tax period. Consult your tax advisor before filing.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between">
              <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">Generated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <div className="flex gap-2">
                <button onClick={() => setShowReturnModal(false)} className="px-5 py-2 text-[10px] font-medium text-on-surface-variant uppercase tracking-wider hover:text-on-background transition-colors">Close</button>
                <button onClick={() => { window.print(); }} className="px-5 py-2 bg-primary text-on-primary rounded-full text-[10px] font-medium uppercase tracking-wider shadow-sm hover:bg-primary-dim transition-colors flex items-center gap-1.5">
                  <Download size={12} /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper components
const ReturnRow = ({ label, amount, vat, highlight }: { label: string; amount: number; vat: number; highlight?: boolean }) => (
  <div className={`flex justify-between items-center p-3 rounded-xl ${highlight ? 'bg-surface-container font-semibold' : 'bg-surface-container-low'}`}>
    <span className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-4">
      <span className="text-[10px] text-on-surface-variant w-24 text-right">{formatCurrency(amount, 'AED')}</span>
      <span className={`font-serif text-sm w-24 text-right text-on-background`}>{formatCurrency(vat, 'AED')}</span>
    </div>
  </div>
);

const FormRow = ({ label, amount, vat, bold }: { label: string; amount: number | null; vat: number; bold?: boolean }) => (
  <div className={`grid grid-cols-[1fr_120px_120px] px-4 py-2.5 border-b border-surface-container last:border-b-0 ${bold ? 'bg-surface-container-low font-semibold' : ''}`}>
    <span className={`text-[10px] ${bold ? 'font-semibold text-on-background uppercase tracking-wider' : 'font-medium text-on-surface-variant'}`}>{label}</span>
    <span className="font-serif text-xs text-right text-on-background">{amount !== null ? formatCurrency(amount, 'AED') : ''}</span>
    <span className={`font-serif text-xs text-right ${bold ? 'text-primary' : 'text-on-background'}`}>{formatCurrency(vat, 'AED')}</span>
  </div>
);

export default VatCenter;
