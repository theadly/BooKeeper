
export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense'
}

export enum Category {
  SALARY = 'Salary',
  FREELANCE = 'Freelance',
  INVESTMENT = 'Investments',
  HOUSING = 'Housing',
  FOOD = 'Food & Dining',
  TRANSPORT = 'Transportation',
  UTILITIES = 'Utilities',
  INSURANCE = 'Insurance',
  ENTERTAINMENT = 'Entertainment',
  SHOPPING = 'Shopping',
  HEALTH = 'Health',
  EDUCATION = 'Education',
  BUSINESS = 'Business Services',
  SOFTWARE = 'Software & Tech',
  SUBSCRIPTIONS = 'Online Subscriptions',
  LICENSE_RENEWAL = 'License Renewals',
  MARKETING = 'Marketing & Ads',
  OTHER = 'Other'
}

export type StatusOption = 'Paid' | 'Paid to personal account' | 'Pending' | 'Unpaid' | 'Overdue' | 'Void' | 'Draft';

export interface Transaction {
  id: string;
  year: number;
  date: string;
  project: string;
  description: string;
  
  // Financials
  amount: number;
  currency: 'AED' | 'USD';
  vat?: number;
  net?: number;
  fee?: number;
  payable?: number;
  transferWithVat?: number;
  clientPayment?: number;
  clientPaymentDate?: string;
  
  category: Category | string;
  type: TransactionType;
  
  // Identifiers
  invoiceNumber?: string;
  billNumber?: string;
  referenceNumber?: string;
  codeToLm?: string;
  
  // Statuses
  clientStatus: StatusOption;
  ladlyStatus: StatusOption;
  isReconciled?: boolean;
  
  customerName?: string;
  country?: string;
  
  // Dates & Notes
  paymentDateToLaila?: string;
  notes?: string;
  
  // Integration
  zohoInvoiceId?: string;

  // Tracking for merged folders
  mergedFrom?: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  category?: string;
  vendor?: string;
  matchedTransactionId?: string;
}

export interface CampaignFile {
  id: string;
  name: string;
  size: string;
  type: string;
  date: string;
  isContract?: boolean;
  parsed?: boolean;
  base64?: string;
}

export interface ResourceFile {
  id: string;
  name: string;
  size: string;
  type: string;
  date: string;
  base64: string;
}

export interface ParsedRateItem {
  name: string;
  rate: number;
  unit?: string;
}

export interface Quotation {
  id: string;
  clientName: string;
  date: string;
  items: Deliverable[];
  total: number;
  currency: string;
  notes?: string;
}

export interface Deliverable {
  id: string;
  name: string;
  rate: number;
  quantity: number;
  currency?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  // Enhanced tracking
  platform?: string;
  postedDate?: string;
  assetLink?: string;
  isCompleted?: boolean;
}

export interface Campaign {
  projectName: string;
  notes?: string;
  files?: CampaignFile[];
  deliverables?: Deliverable[];
}

export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  PROPOSAL = 'Proposal Sent',
  NEGOTIATION = 'Negotiation',
  CLOSED_WON = 'Closed Won',
  CLOSED_LOST = 'Closed Lost'
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: LeadStatus;
  potentialValue: number;
  lastContactDate: string;
  notes: string;
  trn?: string;
  zohoContactId?: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface ZohoConfig {
  accessToken: string;
  organizationId: string;
  apiDomain: string;
}

export interface Entity {
  id: string;
  name: string;
  initials: string;
  color: string;
  logo?: string; 
}

export interface AppStateSnapshot {
  transactions: Transaction[];
  contacts: Contact[];
  campaignMetadata: Record<string, Campaign>;
  bankTransactions: BankTransaction[];
  resources: {
    mediaKit: ResourceFile | null;
    rateCard: ResourceFile | null;
  };
}

export interface HistoryAction {
  id: string;
  description: string;
  timestamp: number;
  snapshot: AppStateSnapshot;
}

/** 
 * API Specific Response Interfaces 
 */
export interface BankStatementResponse {
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  category: string;
  vendor: string;
}

export interface QuotationResponse {
  clientName: string;
  items: Deliverable[];
  total: number;
  notes: string;
}

/** 
 * Zoho Specific Response Shapes 
 */
export interface ZohoContactResponse {
  contact_id: string;
  contact_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
}

export interface ZohoInvoiceResponse {
  invoice_id: string;
  invoice_number: string;
  date: string;
  total: number;
  currency_code: string;
  customer_name: string;
  status: 'paid' | 'overdue' | 'draft' | 'void' | 'unpaid' | string;
}
