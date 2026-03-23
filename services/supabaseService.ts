import { createClient } from '@supabase/supabase-js';
import { Transaction, Contact, Campaign, BankTransaction, Entity } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth ───────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toDb(obj: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    transferWithVat: 'transfer_with_vat',
    clientPayment: 'client_payment',
    clientPaymentDate: 'client_payment_date',
    invoiceNumber: 'invoice_number',
    billNumber: 'bill_number',
    referenceNumber: 'reference_number',
    codeToLm: 'code_to_lm',
    paymentToLmRef: 'payment_to_lm_ref',
    clientStatus: 'client_status',
    ladlyStatus: 'ladly_status',
    isReconciled: 'is_reconciled',
    customerName: 'customer_name',
    paymentDateToLaila: 'payment_date_to_laila',
    zohoInvoiceId: 'zoho_invoice_id',
    mergedFrom: 'merged_from',
    potentialValue: 'potential_value',
    lastContactDate: 'last_contact_date',
    zohoContactId: 'zoho_contact_id',
    matchedTransactionId: 'matched_transaction_id',
    projectName: 'project_name',
    mergedSources: 'merged_sources',
  };
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'createdAt' || k === 'updatedAt') continue;
    result[map[k] ?? k] = v;
  }
  return result;
}

function fromDb(obj: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    transfer_with_vat: 'transferWithVat',
    client_payment: 'clientPayment',
    client_payment_date: 'clientPaymentDate',
    invoice_number: 'invoiceNumber',
    bill_number: 'billNumber',
    reference_number: 'referenceNumber',
    code_to_lm: 'codeToLm',
    payment_to_lm_ref: 'paymentToLmRef',
    client_status: 'clientStatus',
    ladly_status: 'ladlyStatus',
    is_reconciled: 'isReconciled',
    customer_name: 'customerName',
    payment_date_to_laila: 'paymentDateToLaila',
    zoho_invoice_id: 'zohoInvoiceId',
    merged_from: 'mergedFrom',
    potential_value: 'potentialValue',
    last_contact_date: 'lastContactDate',
    zoho_contact_id: 'zohoContactId',
    matched_transaction_id: 'matchedTransactionId',
    project_name: 'projectName',
    merged_sources: 'mergedSources',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  };
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    result[map[k] ?? k] = v;
  }
  return result;
}

// ── Entities ───────────────────────────────────────────────────────────────

export async function loadEntities(): Promise<Entity[]> {
  const { data, error } = await supabase.from('entities').select('*');
  if (error) throw error;
  return (data ?? []).map(fromDb) as Entity[];
}

export async function upsertEntity(entity: Entity): Promise<void> {
  const { error } = await supabase.from('entities').upsert(toDb(entity));
  if (error) throw error;
}

export async function deleteEntity(id: string): Promise<void> {
  const { error } = await supabase.from('entities').delete().eq('id', id);
  if (error) throw error;
}

// ── Transactions ───────────────────────────────────────────────────────────

export async function loadTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromDb) as Transaction[];
}

export async function upsertTransaction(t: Transaction): Promise<void> {
  const { error } = await supabase.from('transactions').upsert(toDb(t));
  if (error) throw error;
}

export async function upsertTransactions(ts: Transaction[]): Promise<void> {
  if (!ts.length) return;
  const { error } = await supabase.from('transactions').upsert(ts.map(toDb));
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteTransactions(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.from('transactions').delete().in('id', ids);
  if (error) throw error;
}

// ── Contacts ───────────────────────────────────────────────────────────────

export async function loadContacts(): Promise<Contact[]> {
  const { data, error } = await supabase.from('contacts').select('*');
  if (error) throw error;
  return (data ?? []).map(fromDb) as Contact[];
}

export async function upsertContact(c: Contact): Promise<void> {
  const { error } = await supabase.from('contacts').upsert(toDb(c));
  if (error) throw error;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}

// ── Campaigns ──────────────────────────────────────────────────────────────

export async function loadCampaigns(): Promise<Record<string, Campaign>> {
  const { data, error } = await supabase.from('campaigns').select('*');
  if (error) throw error;
  const result: Record<string, Campaign> = {};
  for (const row of data ?? []) {
    const c = fromDb(row) as any;
    result[c.projectName] = {
      projectName: c.projectName,
      notes: c.notes,
      files: c.files ?? [],
      deliverables: c.deliverables ?? [],
      mergedSources: c.mergedSources ?? [],
    };
  }
  return result;
}

export async function upsertCampaign(campaign: Campaign): Promise<void> {
  const { error } = await supabase.from('campaigns').upsert({
    project_name: campaign.projectName,
    notes: campaign.notes,
    files: campaign.files ?? [],
    deliverables: campaign.deliverables ?? [],
    merged_sources: campaign.mergedSources ?? [],
  });
  if (error) throw error;
}

export async function deleteCampaign(projectName: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('project_name', projectName);
  if (error) throw error;
}

// ── Bank Transactions ──────────────────────────────────────────────────────

export async function loadBankTransactions(): Promise<BankTransaction[]> {
  const { data, error } = await supabase.from('bank_transactions').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromDb) as BankTransaction[];
}

export async function upsertBankTransaction(bt: BankTransaction): Promise<void> {
  const { error } = await supabase.from('bank_transactions').upsert(toDb(bt));
  if (error) throw error;
}

export async function upsertBankTransactions(bts: BankTransaction[]): Promise<void> {
  if (!bts.length) return;
  const { error } = await supabase.from('bank_transactions').upsert(bts.map(toDb));
  if (error) throw error;
}

export async function clearBankTransactions(): Promise<void> {
  const { error } = await supabase.from('bank_transactions').delete().neq('id', '');
  if (error) throw error;
}

// ── App Settings (Supabase with localStorage fallback) ────────────────────

export async function loadSetting<T>(key: string, defaultVal: T): Promise<T> {
  try {
    const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).single();
    if (!error && data) return data.value as T;
  } catch { /* fall through */ }
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(`bk_${key}`);
    if (stored) return JSON.parse(stored) as T;
  } catch { /* ignore */ }
  return defaultVal;
}

export async function saveSetting(key: string, value: any): Promise<void> {
  try { localStorage.setItem(`bk_${key}`, JSON.stringify(value)); } catch { /* ignore */ }
  const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) console.warn('saveSetting Supabase error:', error.message);
}

// ── localStorage fallback helpers ─────────────────────────────────────────

function lsSave(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function lsLoad<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    if (s) return JSON.parse(s) as T;
  } catch { /* ignore */ }
  return null;
}

// ── Transactions ──────────────────────────────────────────────────────────

export async function saveTransactionsLocal(ts: Transaction[]): Promise<void> {
  lsSave('bk_transactions', ts);
}

export async function loadTransactionsLocal(): Promise<Transaction[] | null> {
  return lsLoad<Transaction[]>('bk_transactions');
}

// ── Contacts ──────────────────────────────────────────────────────────────

export function saveContactsLocal(contacts: Contact[]): void {
  lsSave('bk_contacts', contacts);
}

export function loadContactsLocal(): Contact[] | null {
  return lsLoad<Contact[]>('bk_contacts');
}

// ── Campaigns ─────────────────────────────────────────────────────────────

export function saveCampaignsLocal(campaigns: Record<string, Campaign>): void {
  lsSave('bk_campaigns', campaigns);
}

export function loadCampaignsLocal(): Record<string, Campaign> | null {
  return lsLoad<Record<string, Campaign>>('bk_campaigns');
}

// ── Bank Transactions ─────────────────────────────────────────────────────

export function saveBankTransactionsLocal(bts: BankTransaction[]): void {
  lsSave('bk_bank_transactions', bts);
}

export function loadBankTransactionsLocal(): BankTransaction[] | null {
  return lsLoad<BankTransaction[]>('bk_bank_transactions');
}
