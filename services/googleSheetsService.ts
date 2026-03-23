import { Transaction, TransactionType, Category, StatusOption } from '../types';

export interface GoogleSheetsConfig {
  sheetUrl: string;
  columnMapping: Record<string, string>; // bookeeper field -> sheet column header
  lastSync?: string;
  autoSync?: boolean;
}

// Fields we can map from a sheet
export const MAPPABLE_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'invoiceNumber', label: 'Invoice Number' },
  { key: 'project', label: 'Project / Description', required: true },
  { key: 'customerName', label: 'Customer / Client Name' },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'currency', label: 'Currency' },
  { key: 'vat', label: 'VAT' },
  { key: 'fee', label: 'Fee (Adly)' },
  { key: 'payable', label: 'Net Payable' },
  { key: 'clientStatus', label: 'Client Status' },
  { key: 'ladlyStatus', label: 'Ladly Status' },
  { key: 'type', label: 'Type (Income/Expense)' },
  { key: 'notes', label: 'Notes' },
];

// Auto-detect patterns for each field
const FIELD_PATTERNS: Record<string, RegExp> = {
  date:          /^date$|invoice[\s_-]?date|created[\s_-]?(?:at|date)|issue[\s_-]?date/i,
  invoiceNumber: /invoice[\s_-]?(?:num(?:ber)?|no|#)|inv[\s_-]?(?:no|num)|^inv#?$/i,
  project:       /^project$|^description$|^service$|^work$|project[\s_-]name|campaign/i,
  customerName:  /^customer$|client[\s_-]?name|company[\s_-]?name|^client$|^customer[\s_-]name$/i,
  amount:        /^amount$|^total$|invoice[\s_-]?(?:total|amount)|^price$|^value$/i,
  currency:      /^currency$|^curr$/i,
  vat:           /^vat$|^tax$|vat[\s_-]?amount|tax[\s_-]?amount/i,
  fee:           /^fee$|^commission$|adly[\s_-]?fee|agency[\s_-]?fee/i,
  payable:       /^payable$|net[\s_-]?payable|to[\s_-]?transfer|laila[\s_-]?(?:amount|payable)/i,
  clientStatus:  /client[\s_-]?status|payment[\s_-]?status|^status$|invoice[\s_-]?status/i,
  ladlyStatus:   /ladly[\s_-]?status|laila[\s_-]?status|company[\s_-]?status|internal[\s_-]?status/i,
  type:          /^type$|transaction[\s_-]?type|income[\s_-]?expense/i,
  notes:         /^notes?$|^remarks?$|^comments?$|^memo$/i,
};

/** Extract the spreadsheet ID from any Google Sheets URL */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/** Extract the GID (tab id) from a Google Sheets URL */
function extractGid(url: string): string | null {
  const match = url.match(/[#&?]gid=(\d+)/);
  return match ? match[1] : null;
}

/** Build a CSV export URL */
function buildCsvUrl(sheetId: string, gid?: string | null): string {
  let url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  if (gid && gid !== '0') url += `&gid=${gid}`;
  return url;
}

/** Minimal CSV parser that handles quoted fields */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  const lines = csv.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

/** Auto-detect column mappings from header row */
export function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
    const match = headers.find(h => pattern.test(h.trim()));
    if (match) mapping[field] = match;
  }
  return mapping;
}

/** Fetch the headers from a Google Sheet */
export async function fetchSheetHeaders(url: string): Promise<{ headers: string[]; error?: string }> {
  const sheetId = extractSheetId(url);
  if (!sheetId) return { headers: [], error: 'Invalid Google Sheets URL. Make sure it contains /spreadsheets/d/...' };

  const gid = extractGid(url);
  const csvUrl = buildCsvUrl(sheetId, gid);

  try {
    const res = await fetch(csvUrl);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { headers: [], error: 'Sheet is private. Set sharing to "Anyone with the link can view" first.' };
      }
      return { headers: [], error: `Failed to fetch sheet (${res.status})` };
    }
    const text = await res.text();
    const rows = parseCsv(text);
    return { headers: rows[0] ?? [] };
  } catch (e: any) {
    return { headers: [], error: e.message };
  }
}

/** Normalise a status string to a StatusOption */
function parseStatus(raw: string): StatusOption {
  const s = raw.trim().toLowerCase();
  if (s.includes('paid to personal') || s.includes('personal')) return 'Paid to personal account';
  if (s === 'paid') return 'Paid';
  if (s === 'pending') return 'Pending';
  if (s === 'unpaid') return 'Unpaid';
  if (s === 'overdue') return 'Overdue';
  if (s === 'void') return 'Void';
  if (s === 'draft') return 'Draft';
  return 'Unpaid'; // fallback
}

/** Parse a numeric value from a cell (strips currency symbols, commas etc.) */
function parseNum(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.-]/g, '')) || 0;
}

/** Parse a date cell into YYYY-MM-DD */
function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  // Try native Date parsing
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return raw;
}

export interface SheetSyncResult {
  added: number;
  updated: number;
  skipped: number;
  total: number;
  error?: string;
  transactions: Transaction[];
}

/**
 * Fetch the sheet, map rows to Transactions, then merge with existing transactions.
 * - Matches by invoiceNumber first, then by date+project
 * - Updates status / amount on existing rows
 * - Appends new rows
 */
export async function syncSheetToTransactions(
  config: GoogleSheetsConfig,
  existing: Transaction[]
): Promise<SheetSyncResult> {
  const { sheetUrl, columnMapping } = config;

  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) return { added: 0, updated: 0, skipped: 0, total: 0, error: 'Invalid URL', transactions: existing };

  const gid = extractGid(sheetUrl);
  const csvUrl = buildCsvUrl(sheetId, gid);

  let rows: string[][];
  try {
    const res = await fetch(csvUrl);
    if (!res.ok) {
      const msg = res.status === 403 ? 'Sheet is private — set sharing to "Anyone with the link can view"' : `HTTP ${res.status}`;
      return { added: 0, updated: 0, skipped: 0, total: 0, error: msg, transactions: existing };
    }
    rows = parseCsv(await res.text());
  } catch (e: any) {
    return { added: 0, updated: 0, skipped: 0, total: 0, error: e.message, transactions: existing };
  }

  if (rows.length < 2) return { added: 0, updated: 0, skipped: 0, total: 0, transactions: existing };

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Build header → column index lookup
  const colIdx: Record<string, number> = {};
  headers.forEach((h, i) => { colIdx[h] = i; });

  // Helper: get cell value by mapped field
  const getCell = (row: string[], field: string): string => {
    const colName = columnMapping[field];
    if (!colName) return '';
    const idx = colIdx[colName];
    return idx !== undefined ? (row[idx] ?? '').trim() : '';
  };

  let added = 0, updated = 0, skipped = 0;
  const updatedExisting = [...existing];

  for (const row of dataRows) {
    // Skip completely empty rows
    if (row.every(c => !c.trim())) { skipped++; continue; }

    const rawAmount = getCell(row, 'amount');
    const rawDate   = getCell(row, 'date');
    const rawProject = getCell(row, 'project') || getCell(row, 'customerName');

    if (!rawAmount && !rawProject) { skipped++; continue; }

    const invNum   = getCell(row, 'invoiceNumber');
    const customer = getCell(row, 'customerName');
    const project  = getCell(row, 'project') || customer;
    const dateStr  = parseDate(rawDate);
    const year     = new Date(dateStr).getFullYear() || new Date().getFullYear();
    const amount   = parseNum(rawAmount);
    const rawCurr  = getCell(row, 'currency').toUpperCase();
    const currency = rawCurr === 'USD' ? 'USD' : 'AED';
    const vat      = parseNum(getCell(row, 'vat'));
    const fee      = parseNum(getCell(row, 'fee'));
    const payable  = parseNum(getCell(row, 'payable'));
    const rawCS    = getCell(row, 'clientStatus');
    const clientStatus: StatusOption = rawCS ? parseStatus(rawCS) : 'Unpaid';
    const rawLS    = getCell(row, 'ladlyStatus');
    const ladlyStatus: StatusOption = rawLS ? parseStatus(rawLS) : 'Unpaid';
    const rawType  = getCell(row, 'type').toLowerCase();
    const type     = rawType.includes('expense') ? TransactionType.EXPENSE : TransactionType.INCOME;
    const notes    = getCell(row, 'notes');

    // Multi-tier duplicate detection:
    // 1. Invoice number (most reliable)
    // 2. Date + project name (case-insensitive, trimmed)
    // 3. Date + amount (catches same-day same-amount entries with different project names)
    let matchIdx = -1;
    if (invNum) {
      matchIdx = updatedExisting.findIndex(t =>
        t.invoiceNumber && t.invoiceNumber.trim() === invNum.trim()
      );
    }
    if (matchIdx === -1 && project && dateStr) {
      matchIdx = updatedExisting.findIndex(t =>
        t.date === dateStr &&
        t.project?.toLowerCase().trim() === project.toLowerCase().trim()
      );
    }
    if (matchIdx === -1 && dateStr && amount > 0) {
      matchIdx = updatedExisting.findIndex(t =>
        t.date === dateStr &&
        Math.abs((t.amount || 0) - amount) < 0.01 &&
        t.type === type
      );
    }

    if (matchIdx !== -1) {
      // Update existing — overwrite key fields from the sheet
      updatedExisting[matchIdx] = {
        ...updatedExisting[matchIdx],
        date: dateStr,
        year,
        project: project || updatedExisting[matchIdx].project,
        customerName: customer || updatedExisting[matchIdx].customerName,
        amount,
        currency,
        ...(vat ? { vat } : {}),
        ...(fee ? { fee } : {}),
        ...(payable ? { payable } : {}),
        clientStatus,
        ladlyStatus,
        type,
        ...(notes ? { notes } : {}),
        ...(invNum ? { invoiceNumber: invNum } : {}),
      };
      updated++;
    } else {
      // Add new transaction
      const newTx: Transaction = {
        id: `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        date: dateStr,
        year,
        project: project || 'Untitled',
        description: project || '',
        customerName: customer,
        amount,
        currency,
        vat: vat || undefined,
        fee: fee || undefined,
        payable: payable || undefined,
        clientStatus,
        ladlyStatus,
        type,
        category: type === TransactionType.INCOME ? Category.FREELANCE : Category.OTHER,
        invoiceNumber: invNum || undefined,
        notes: notes || undefined,
      };
      updatedExisting.push(newTx);
      added++;
    }
  }

  return {
    added,
    updated,
    skipped,
    total: dataRows.length,
    transactions: updatedExisting,
  };
}

/**
 * Build a stable fingerprint for a transaction used for duplicate detection.
 * Priority: invoiceNumber → zohoId → date+amount+type → date+project+type
 */
function txFingerprint(t: Transaction): string {
  if (t.invoiceNumber?.trim()) return `inv:${t.invoiceNumber.trim().toLowerCase()}`;
  if (t.zohoInvoiceId?.trim()) return `zoho:${t.zohoInvoiceId.trim()}`;
  const amt = Math.round((t.amount || 0) * 100); // cents, avoids float drift
  if (amt > 0) return `amt:${t.date}_${amt}_${t.type}`;
  const proj = (t.project || '').toLowerCase().trim().replace(/\s+/g, ' ');
  return `proj:${t.date}_${proj}_${t.type}`;
}

/** Score a transaction by how much data it has — used to pick the best duplicate to keep */
function txScore(t: Transaction): number {
  return [
    t.invoiceNumber, t.zohoInvoiceId, t.customerName, t.vat,
    t.fee, t.payable, t.notes, t.referenceNumber, t.codeToLm,
  ].filter(Boolean).length;
}

export interface DeduplicateResult {
  kept: Transaction[];
  removed: number;
  duplicateGroups: Array<{ keep: Transaction; discard: Transaction[] }>;
}

/**
 * Find and remove duplicate transactions from a list.
 * Keeps the entry with the most filled-in fields (highest score).
 * Returns the clean list and a summary of what was removed.
 */
export function deduplicateTransactions(transactions: Transaction[]): DeduplicateResult {
  const seen = new Map<string, Transaction>(); // fingerprint → best tx to keep
  const dupeGroups = new Map<string, Transaction[]>(); // fingerprint → discarded

  for (const t of transactions) {
    const fp = txFingerprint(t);
    const existing = seen.get(fp);
    if (!existing) {
      seen.set(fp, t);
      dupeGroups.set(fp, []);
    } else {
      // Keep whichever has more data
      if (txScore(t) > txScore(existing)) {
        dupeGroups.get(fp)!.push(existing);
        seen.set(fp, t);
      } else {
        dupeGroups.get(fp)!.push(t);
      }
    }
  }

  const kept = Array.from(seen.values());
  const removed = transactions.length - kept.length;

  const duplicateGroups = Array.from(seen.entries())
    .filter(([fp]) => (dupeGroups.get(fp)?.length ?? 0) > 0)
    .map(([fp, keep]) => ({ keep, discard: dupeGroups.get(fp)! }));

  return { kept, removed, duplicateGroups };
}
