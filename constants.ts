
import React from 'react';
import { Transaction, Contact, TransactionType, Category, LeadStatus, Campaign } from './types';
import DirhamSymbol from './components/DirhamSymbol';
import { CONFIG } from './config';

export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_CONTACTS: Contact[] = [];
export const INITIAL_CAMPAIGNS: Campaign[] = [];

export const CATEGORY_OPTIONS = Object.values(Category);
export const STATUS_OPTIONS = Object.values(LeadStatus);
export const FINANCE_STATUS_OPTIONS = ['Paid', 'Paid to personal account', 'Pending', 'Unpaid', 'Overdue', 'Void', 'Draft'];

export const USD_TO_AED = CONFIG.USD_TO_AED;

export const RATE_CARD_SERVICES = [
  { name: 'IG Static Image', rate: 8000 },
  { name: 'IG Reel', rate: 10000 },
  { name: 'IG Story (3-4 stories)', rate: 5000 },
  { name: 'Snapchat Story', rate: 3000 },
  { name: 'TikTok Video', rate: 7000 },
  { name: 'Event Attendance', rate: 6000 },
  { name: 'Photo/Video Shoot', rate: 1500, unit: '/hr' },
];

/**
 * Safely formats a date for display.
 * Handles string formats (YYYY-MM-DD) and native Date objects.
 */
export const formatDate = (dateVal?: Date | string | null): string => {
  if (!dateVal) return '-';
  
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '-';
    const d = dateVal.getDate().toString().padStart(2, '0');
    const m = (dateVal.getMonth() + 1).toString().padStart(2, '0');
    const y = dateVal.getFullYear();
    return `${d}/${m}/${y}`;
  }

  const dateStr = String(dateVal);
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  
  return dateStr;
};

export const formatCurrency = (amount: number, currency: string = 'AED', showEquivalent: boolean = false): React.ReactNode => {
  const formatted = (amount || 0).toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });

  if (currency === 'AED') {
    return React.createElement(
      'span',
      { className: "inline-flex items-center gap-1.5 whitespace-nowrap" },
      React.createElement(DirhamSymbol, { className: "h-[0.9em] w-[0.9em] text-inherit" }),
      React.createElement('span', null, formatted)
    );
  }

  const base = React.createElement(
    'span',
    { className: "whitespace-nowrap" },
    React.createElement('span', { className: "text-[0.8em] font-bold mr-1" }, currency),
    formatted
  );

  if (currency === 'USD' && showEquivalent) {
    const aedAmount = amount * USD_TO_AED;
    const aedFormatted = aedAmount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return React.createElement(
      'div',
      { className: "flex flex-col items-end leading-tight" },
      base,
      React.createElement(
        'span',
        { className: "text-[0.65em] text-slate-400 font-bold flex items-center gap-1 opacity-80" },
        React.createElement(DirhamSymbol, { className: "h-2 w-2" }),
        aedFormatted
      )
    );
  }

  return base;
};
