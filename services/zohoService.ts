
import { Contact, Transaction, TransactionType, Category, LeadStatus, ZohoConfig, StatusOption, ZohoContactResponse, ZohoInvoiceResponse } from '../types';

export const fetchZohoContacts = async (config: ZohoConfig): Promise<Contact[]> => {
  if (!config.accessToken || !config.organizationId) return [];

  try {
    const response = await fetch(`${config.apiDomain}/books/v3/contacts?organization_id=${config.organizationId}`, {
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
  if (!config.accessToken || !config.organizationId) return [];

  try {
    // Note: In a production app, we'd handle multiple pages. Zoho default is 200 per page.
    const response = await fetch(`${config.apiDomain}/books/v3/invoices?organization_id=${config.organizationId}&sort_column=date&sort_order=descending`, {
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

      return {
        id: `zoho-inv-${inv.invoice_id}`,
        year: invoiceDate.getFullYear() || new Date().getFullYear(),
        date: inv.date,
        project: inv.invoice_number ? `Invoice #${inv.invoice_number}` : 'Zoho Invoice',
        description: `Imported from Zoho Books - ${inv.customer_name}`,
        amount: Number(inv.total) || 0,
        category: Category.FREELANCE, // Most revenue is freelance
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
