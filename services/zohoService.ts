import { Contact, Transaction, TransactionType, Category, LeadStatus, ZohoConfig, StatusOption } from '../types';

export const fetchZohoContacts = async (config: ZohoConfig): Promise<Contact[]> => {
  if (!config.accessToken) return [];

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

    const data = await response.json();
    if (data.code !== 0) throw new Error(data.message);

    return data.contacts.map((c: any) => ({
      id: `zoho-${c.contact_id}`,
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
    if (!config.accessToken) return [];
  
    try {
      const response = await fetch(`${config.apiDomain}/books/v3/invoices?organization_id=${config.organizationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Zoho-oauthtoken ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
          throw new Error(`Zoho API Error: ${response.statusText}`);
      }
  
      const data = await response.json();
      if (data.code !== 0) throw new Error(data.message);
  
      return data.invoices.map((inv: any) => {
        // Map Zoho status to our internal StatusOption
        let status: StatusOption = 'Pending';
        if (inv.status === 'paid') status = 'Paid';
        else if (inv.status === 'overdue') status = 'Overdue';
        else if (inv.status === 'draft') status = 'Draft';
        else if (inv.status === 'void') status = 'Void';
        else if (inv.status === 'unpaid') status = 'Unpaid';

        return {
            id: `zoho-inv-${inv.invoice_id}`,
            year: new Date(inv.date).getFullYear(),
            date: inv.date,
            project: `Invoice #${inv.invoice_number}`, // Zoho might not have project field easily accessible without more calls
            description: `Zoho Import - ${inv.customer_name}`,
            amount: inv.total,
            category: Category.BUSINESS,
            type: TransactionType.INCOME,
            currency: inv.currency_code === 'USD' ? 'USD' : 'AED',
            invoiceNumber: inv.invoice_number,
            clientStatus: status,
            ladlyStatus: status, // Default to same status
            customerName: inv.customer_name,
            zohoInvoiceId: inv.invoice_id
        };
      });
  
    } catch (error) {
      console.error("Zoho Sync Error (Invoices):", error);
      throw error;
    }
  };