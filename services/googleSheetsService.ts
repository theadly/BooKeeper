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
  { key: 'amount', label: 'Invoice Amount', required: true },
  { key: 'currency', label: 'Currency' },
  { key: 'vat', label: 'VAT' },
  { key: 'fee', label: 'Fee (Adly)' },
  { key: 'payable', label: 'Net Payable' },
  { key: 'clientStatus', label: 'Client Status' },
  { key: 'ladlyStatus', label: 'Ladly Status' },
  { key: 'type', label: 'Type (Income/Expense)' },
  { key: 'notes', label: 'Notes' },
];

// Auto-detect patterns — ordered from most to least specific
const FIELD_PATTERNS: Record<string, RegExp> = {
  // Dates
  date: /^(date|invoice[\s_-]?date|issue[\s_-]?date|created[\s_-]?(at|date)|تاريخ)$/i,

  // Invoice number — very specific so it doesn't eat other fields
  invoiceNumber: /^(invoice[\s_-]?(num(ber)?|no\.?|#)|inv[\s_-]?(no\.?|num|#)|#invoice|رقم\s*الفاتورة)$/i,

  // Project / description
  project: /^(project|description|service|work|campaign|task|job|project[\s_-]name|المشروع|الوصف)$/i,

  // Customer
  customerName: /^(customer(\s*name)?|client(\s*name)?|company(\s*name)?|brand|العميل|الشركة)$/i,

  // Amount — must not match VAT/fee/payable columns
  amount: /^(amount|total|invoice[\s_-]?(total|amount|value)|gross[\s_-]?amount|gross|price|المبلغ|الإجمالي)$/i,

  // Currency
  currency: /^(currency|curr(ency)?|العملة)$/i,

  // VAT / tax
  vat: /^(vat|tax|vat[\s_-]?amount|tax[\s_-]?amount|ضريبة|ضريبة القيمة المضافة)$/i,

  // Fee
  fee: /^(fee|commission|adly[\s_-]?fee|agency[\s_-]?fee|adly|العمولة|رسوم)$/i,

  // Net payable to Laila
  payable: /^(payable|net[\s_-]?payable|to[\s_-]?transfer|laila[\s_-]?(amount|payable|total)|net|صافي)$/i,

  // Client payment status
  clientStatus: /^(client[\s_-]?status|payment[\s_-]?status|invoice[\s_-]?status|حالة[\s_-]?(الدفع|الفاتورة))$/i,

  // Internal / Ladly status
  ladlyStatus: /^(ladly[\s_-]?status|laila[\s_-]?status|internal[\s_-]?status|company[\s_-]?status|الحالة[\s_-]?الداخلية)$/i,

  // Income / Expense type
  type: /^(type|transaction[\s_-]?type|income[\s_-]?expense|النوع)$/i,

  // Notes
  notes: /^(notes?|remarks?|comments?|memo|ملاحظات)$/i,
};

/** Normalise a string for comparison — lowercase, collapse whitespace, strip punctuation */
function norm(s: string): string {
  return (s ?? '').toLowerCase().trim().replace(/[\s_\-\.]+/g, ' ').replace(/[^\w\s\u0600-\u06FF]/g, '');
}

/** Compute a stable 32-bit integer hash of a string */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0; // unsigned
}

/**
 * Generate a stable, deterministic ID for a sheet row.
 * Same project + amount + date → always the same ID → re-syncing never duplicates.
 */
function stableSheetId(project: string, amount: number, date: string, invNum?: string): string {
  const key = invNum
    ? `inv:${invNum.trim().toLowerCase()}`
    : `${date}|${norm(project)}|${Math.round(amount * 100)}`;
  return `sheet_${hashStr(key).toString(36)}`;
}

/** Extract the spreadsheet ID from any Google Sheets URL */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function extractGid(url: string): string | null {
  const match = url.match(/[#&?]gid=(\d+)/);
  return match ? match[1] : null;
}

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

/**
 * Auto-detect column mappings from header row.
 * Uses strict regex patterns and falls back to partial matching.
 */
export function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  // Pass 1: strict regex match
  for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
    const match = headers.find(h => !usedHeaders.has(h) && pattern.test(h.trim()));
    if (match) {
      mapping[field] = match;
      usedHeaders.add(match);
    }
  }

  // Pass 2: partial / fuzzy fallback for unmapped fields
  const fallbacks: Record<string, (h: string) => boolean> = {
    date:          h => /date/i.test(h),
    invoiceNumber: h => /inv/i.test(h) && /num|no|#/i.test(h),
    project:       h => /project|desc|service|campaign/i.test(h),
    customerName:  h => /client|customer|brand|company/i.test(h),
    amount:        h => /amount|total|price|value|gross/i.test(h) && !/vat|tax|fee|payable|net/i.test(h),
    currency:      h => /curr/i.test(h),
    vat:           h => /vat|tax/i.test(h),
    fee:           h => /fee|commission|adly/i.test(h),
    payable:       h => /payable|net|laila/i.test(h),
    clientStatus:  h => /status/i.test(h) && !/ladly|laila|internal/i.test(h),
    ladlyStatus:   h => /ladly|laila|internal/i.test(h),
    notes:         h => /note|remark|comment|memo/i.test(h),
  };

  for (const [field, test] of Object.entries(fallbacks)) {
    if (mapping[field]) continue; // already mapped
    const match = headers.find(h => !usedHeaders.has(h) && test(h.trim()));
    if (match) {
      mapping[field] = match;
      usedHeaders.add(match);
    }
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
  if (s === 'paid' || s === 'مدفوع') return 'Paid';
  if (s === 'pending' || s === 'معلق') return 'Pending';
  if (s === 'unpaid' || s === 'غير مدفوع') return 'Unpaid';
  if (s === 'overdue' || s === 'متأخر') return 'Overdue';
  if (s === 'void' || s === 'ملغي') return 'Void';
  if (s === 'draft' || s === 'مسودة') return 'Draft';
  return 'Unpaid';
}

function parseNum(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.-]/g, '')) || 0;
}

/** Parse a date cell into YYYY-MM-DD, handling many common formats */
function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const s = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  // MM/DD/YYYY (US format — only if month <= 12 and day > 12 is ambiguous so treat as DD/MM)
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const m = parseInt(mdy[1]), d = parseInt(mdy[2]), y = mdy[3];
    if (m <= 12 && d <= 31) return `${y}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  }

  // "Jan 2025", "January 2025", "Jan-25"
  const mon = s.match(/^([A-Za-z]+)[\s\-](\d{2,4})$/);
  if (mon) {
    const months: Record<string, string> = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
    const mKey = mon[1].toLowerCase().slice(0, 3);
    const year = mon[2].length === 2 ? `20${mon[2]}` : mon[2];
    if (months[mKey]) return `${year}-${months[mKey]}-01`;
  }

  // Native Date parsing fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return s;
}

export interface SheetSyncResult {
  added: number;
  updated: number;
  skipped: number;
  total: number;
  error?: string;
  transactions: Transaction[];
}

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
      const msg = res.status === 403
        ? 'Sheet is private — set sharing to "Anyone with the link can view"'
        : `HTTP ${res.status}`;
      return { added: 0, updated: 0, skipped: 0, total: 0, error: msg, transactions: existing };
    }
    rows = parseCsv(await res.text());
  } catch (e: any) {
    return { added: 0, updated: 0, skipped: 0, total: 0, error: e.message, transactions: existing };
  }

  if (rows.length < 2) return { added: 0, updated: 0, skipped: 0, total: 0, transactions: existing };

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const colIdx: Record<string, number> = {};
  headers.forEach((h, i) => { colIdx[h] = i; });

  const getCell = (row: string[], field: string): string => {
    const colName = columnMapping[field];
    if (!colName) return '';
    const idx = colIdx[colName];
    return idx !== undefined ? (row[idx] ?? '').trim() : '';
  };

  let added = 0, updated = 0, skipped = 0;
  const updatedExisting = [...existing];

  for (const row of dataRows) {
    if (row.every(c => !c.trim())) { skipped++; continue; }

    const rawAmount  = getCell(row, 'amount');
    const rawDate    = getCell(row, 'date');
    const rawProject = getCell(row, 'project') || getCell(row, 'customerName');
    if (!rawAmount && !rawProject) { skipped++; continue; }

    const invNum      = getCell(row, 'invoiceNumber');
    const customer    = getCell(row, 'customerName');
    const project     = getCell(row, 'project') || customer;
    const dateStr     = parseDate(rawDate);
    const year        = new Date(dateStr).getFullYear() || new Date().getFullYear();
    const amount      = parseNum(rawAmount);
    const rawCurr     = getCell(row, 'currency').toUpperCase();
    const currency    = rawCurr === 'USD' ? 'USD' : 'AED';
    const vat         = parseNum(getCell(row, 'vat'));
    const fee         = parseNum(getCell(row, 'fee'));
    const payable     = parseNum(getCell(row, 'payable'));
    const rawCS       = getCell(row, 'clientStatus');
    const clientStatus: StatusOption = rawCS ? parseStatus(rawCS) : 'Unpaid';
    const rawLS       = getCell(row, 'ladlyStatus');
    const ladlyStatus: StatusOption = rawLS ? parseStatus(rawLS) : 'Unpaid';
    const rawType     = getCell(row, 'type').toLowerCase();
    const type        = rawType.includes('expense') ? TransactionType.EXPENSE : TransactionType.INCOME;
    const notes       = getCell(row, 'notes');

    // Compute the stable ID this row would have if previously synced
    const stableId = stableSheetId(project, amount, dateStr, invNum || undefined);
    const normProject = norm(project);

    // ── 5-tier duplicate detection ──────────────────────────────────────────
    // 1. Stable deterministic ID (catches re-syncs of same row)
    let matchIdx = updatedExisting.findIndex(t => t.id === stableId);

    // 2. Invoice number exact match
    if (matchIdx === -1 && invNum) {
      matchIdx = updatedExisting.findIndex(t =>
        t.invoiceNumber && norm(t.invoiceNumber) === norm(invNum)
      );
    }

    // 3. Normalised project name + date
    if (matchIdx === -1 && normProject && dateStr) {
      matchIdx = updatedExisting.findIndex(t =>
        t.date === dateStr && norm(t.project || '') === normProject
      );
    }

    // 4. Normalised project name + amount (catches date format differences)
    if (matchIdx === -1 && normProject && amount > 0) {
      matchIdx = updatedExisting.findIndex(t =>
        norm(t.project || '') === normProject &&
        Math.abs((t.amount || 0) - amount) < 0.01 &&
        t.type === type
      );
    }

    // 5. Date + amount + type (last resort)
    if (matchIdx === -1 && dateStr && amount > 0) {
      matchIdx = updatedExisting.findIndex(t =>
        t.date === dateStr &&
        Math.abs((t.amount || 0) - amount) < 0.01 &&
        t.type === type
      );
    }

    if (matchIdx !== -1) {
      updatedExisting[matchIdx] = {
        ...updatedExisting[matchIdx],
        // Keep original id — changing it would create a new DB record
        date: dateStr,
        year,
        project: project || updatedExisting[matchIdx].project,
        customerName: customer || updatedExisting[matchIdx].customerName,
        amount,
        currency,
        ...(vat     > 0  ? { vat }     : {}),
        ...(fee     > 0  ? { fee }     : {}),
        ...(payable > 0  ? { payable } : {}),
        clientStatus,
        ladlyStatus,
        type,
        ...(notes  ? { notes }  : {}),
        // Always write invoiceNumber from sheet if present (core fix)
        ...(invNum ? { invoiceNumber: invNum } : {}),
      };
      updated++;
    } else {
      updatedExisting.push({
        id: stableId,
        date: dateStr,
        year,
        project: project || 'Untitled',
        description: project || '',
        customerName: customer,
        amount,
        currency,
        vat:     vat     || undefined,
        fee:     fee     || undefined,
        payable: payable || undefined,
        clientStatus,
        ladlyStatus,
        type,
        category: type === TransactionType.INCOME ? Category.FREELANCE : Category.OTHER,
        invoiceNumber: invNum || undefined,
        notes:   notes   || undefined,
      });
      added++;
    }
  }

  return { added, updated, skipped, total: dataRows.length, transactions: updatedExisting };
}

// ────────────────────────────────────────────────────────────────────────────
// Deduplication
// ────────────────────────────────────────────────────────────────────────────

function txScore(t: Transaction): number {
  return [
    t.invoiceNumber, t.zohoInvoiceId, t.customerName,
    t.vat, t.fee, t.payable, t.notes, t.referenceNumber, t.codeToLm,
  ].filter(Boolean).length;
}

/**
 * Build a dedup fingerprint.
 * Priority: invoiceNumber → zohoId → stable sheet ID → project+amount+type → date+amount+type
 *
 * Identical project names with the same amount & type are always treated as duplicates.
 */
function txFingerprint(t: Transaction): string {
  if (t.invoiceNumber?.trim())
    return `inv:${norm(t.invoiceNumber)}`;
  if (t.zohoInvoiceId?.trim())
    return `zoho:${t.zohoInvoiceId.trim()}`;
  if (t.id?.startsWith('sheet_'))
    return `id:${t.id}`;

  const normProj = norm(t.project || '');
  const amt = Math.round((t.amount || 0) * 100);

  // If project name is non-empty, use project + amount + type as the key
  // This ensures identical project names with same amount are always merged
  if (normProj)
    return `proj:${normProj}|${amt}|${t.type}`;

  // Fallback: date + amount + type
  return `amt:${t.date}|${amt}|${t.type}`;
}

export interface DeduplicateResult {
  kept: Transaction[];
  removed: number;
  duplicateGroups: Array<{ keep: Transaction; discard: Transaction[] }>;
}

export function deduplicateTransactions(transactions: Transaction[]): DeduplicateResult {
  const seen   = new Map<string, Transaction>();
  const groups = new Map<string, Transaction[]>();

  for (const t of transactions) {
    const fp = txFingerprint(t);
    const existing = seen.get(fp);
    if (!existing) {
      seen.set(fp, t);
      groups.set(fp, []);
    } else {
      if (txScore(t) > txScore(existing)) {
        groups.get(fp)!.push(existing);
        seen.set(fp, t);
      } else {
        groups.get(fp)!.push(t);
      }
    }
  }

  const kept = Array.from(seen.values());
  const removed = transactions.length - kept.length;
  const duplicateGroups = Array.from(seen.entries())
    .filter(([fp]) => (groups.get(fp)?.length ?? 0) > 0)
    .map(([, keep]) => ({ keep, discard: groups.get(txFingerprint(keep))! }));

  return { kept, removed, duplicateGroups };
}
