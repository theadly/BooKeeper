import React from 'react';
import { Transaction, Contact, Category, LeadStatus, Campaign } from './types';
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
 * Unifies format to "DD MMM YYYY" (e.g., 25 NOV 2025)
 */
export const formatDate = (dateVal?: Date | string | null): string => {
  if (!dateVal) return '-';
  
  let date: Date;
  if (dateVal instanceof Date) {
    date = dateVal;
  } else {
    const dateStr = String(dateVal).trim();
    
    // Handle YYYY-MM-DD specifically which is common in input[type="date"] and standard ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.split('T')[0].split('-');
      date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } 
    // Handle DD/MM/YYYY or DD-MM-YYYY which is common in bank statements/user input
    else if (/^\d{2}[/-]\d{2}[/-]\d{4}/.test(dateStr)) {
      const parts = dateStr.split(/[/-]/);
      // Assume DD is index 0, MM is 1, YYYY is 2 for professional contexts
      date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    else {
      date = new Date(dateStr);
    }
  }

  if (isNaN(date.getTime())) return String(dateVal);

  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
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
      'span',
      { className: "flex flex-col items-end" },
      base,
      React.createElement(
        'span',
        { className: "text-[0.7em] text-slate-400 font-bold mt-0.5" },
        `≈ AED ${aedFormatted}`
      )
    );
  }

  return base;
};