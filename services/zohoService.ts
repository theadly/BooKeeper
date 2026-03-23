
import { Contact, Transaction, TransactionType, Category, LeadStatus, ZohoConfig, StatusOption, ZohoContactResponse, ZohoInvoiceResponse } from '../types';
import { CONFIG } from '../config';

const getBaseUrl = () => import.meta.env.DEV ? '/api/zoho' : 'https://www.zohoapis.com';
const getAccountsUrl = () => import.meta.env.DEV ? '/api/zoho-accounts' : 'https://accounts.zoho.com';

// Refresh the access token using the refresh token
export const refreshZohoToken = async (config: ZohoConfig): Promise<string | null> => {
  if (!config.refreshToken || !config.clientId || !config.clientSecret) return null;
  try {
    const params = new URLSearchParams({
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    });
    const response = await fetch(`${getAccountsUrl()}/oauth/v2/token?${params}`, { method: 'POST' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token || null;
  } catch {
    return null;
  }
};

// Fields that Zoho owns — always overwritten on sync
const ZOHO_OWNED_FIELDS = ['amount', 'date', 'year', 'clientStatus', 'customerName', 'invoiceNumber', 'currency', 'project', 'description'] as const;

// Smart merge: update Zoho-owned fields but preserve local edits
export const mergeZohoInvoice = (incoming: Transaction, existing: Transaction): Transaction => {
  const merged = { ...existing };
  for (const field of ZOHO_OWNED_FIELDS) {
    (merged as any)[field] = (incoming as any)[field];
  }
  // Always update zohoInvoiceId
  merged.zohoInvoiceId = incoming.zohoInvoiceId;
  return merged;
};

export const fetchZohoContacts = async (config: ZohoConfig): Promise<Contact[]> => {
  if (!config.organizationId || !config.accessToken) return [];

  try {
    const response = await fetch(`${getBaseUrl()}/books/v3/contacts?organization_id=${config.organizationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Zoho API Error: ${response.statusText}`);
    }

    const data = await response.json() as { code: number; message: string; contacts: ZohoContactResponse[] };
    if (data.code !== 0) throw new Error(data.message);

    return (data.contacts || []).map((c: ZohoContactResponse) => ({
      id: `zoho-contact-${c.contact_id}`,
      name: c.contact_name,
      company: c.company_name || '',
      email: c.email || '',
      phone: c.phone || c.mobile || '',
      status: LeadStatus.CONTACTED,
      potentialValue: 0, 
      lastContactDate: new Date().toISOString().split('T')[0],
      notes: 'Imported from Zoho Books',
      zohoContactId: c.contact_id
    }));

  } catch (error) {
    console.error("Zoho Sync Error (Contacts):", error);
    throw error;
  }
};

export const fetchZohoInvoices = async (config: ZohoConfig): Promise<Transaction[]> => {
  if (!config.organizationId) return [];
  if (!config.accessToken) { console.warn('fetchZohoInvoices: no accessToken'); return []; }

  try {
    // Note: In a production app, we'd handle multiple pages. Zoho default is 200 per page.
    const response = await fetch(`${getBaseUrl()}/books/v3/invoices?organization_id=${config.organizationId}&sort_column=date&sort_order=D`, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Zoho API Error: ${response.statusText}`);
    }

    const data = await response.json() as { code: number; message: string; invoices: ZohoInvoiceResponse[] };
    if (data.code !== 0) throw new Error(data.message);

    return (data.invoices || []).map((inv: ZohoInvoiceResponse) => {
      // Map Zoho status to our internal StatusOption
      let status: StatusOption = 'Pending';
      const zStatus = String(inv.status).toLowerCase();
      if (zStatus === 'paid') status = 'Paid';
      else if (zStatus === 'overdue') status = 'Overdue';
      else if (zStatus === 'draft') status = 'Draft';
      else if (zStatus === 'void') status = 'Void';
      else if (zStatus === 'unpaid' || zStatus === 'sent') status = 'Unpaid';

      const invoiceDate = new Date(inv.date);

      const campaign = (inv as any).cf_campaign || (inv as any).custom_field_hash?.cf_campaign || '';

      return {
        id: `zoho-inv-${inv.invoice_id}`,
        year: invoiceDate.getFullYear() || new Date().getFullYear(),
        date: inv.date,
        project: campaign || (inv.invoice_number ? `Invoice #${inv.invoice_number}` : 'Zoho Invoice'),
        description: `Imported from Zoho Books - ${inv.customer_name}`,
        amount: Number(inv.total) || 0,
        category: Category.FREELANCE,
        type: TransactionType.INCOME,
        currency: inv.currency_code === 'USD' ? 'USD' : 'AED',
        invoiceNumber: inv.invoice_number,
        clientStatus: status,
        ladlyStatus: status,
        customerName: inv.customer_name,
        zohoInvoiceId: inv.invoice_id
      };
    });

  } catch (error) {
    console.error("Zoho Sync Error (Invoices):", error);
    throw error;
  }
};
