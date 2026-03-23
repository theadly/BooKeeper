import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FinanceTracker from './components/FinanceTracker';
import CampaignTracker from './components/CampaignTracker';
import CRM from './components/CRM';
import AIChat from './components/AIChat';
import Settings from './components/Settings';
import BankingComponent from './components/Banking';
import VatCenter from './components/VatCenter';
import Resources from './components/Resources';
import SignIn from './components/SignIn';
import {
  Transaction, Contact, Campaign, BankTransaction,
  TransactionType, Category, AIChatMessage, StatusOption,
  ZohoConfig, GoogleSheetsConfig, Entity, ParsedRateItem
} from './types';
import { RATE_CARD_SERVICES } from './constants';
import { parseBankStatement } from './services/geminiService';
import { fetchZohoInvoices, mergeZohoInvoice, refreshZohoToken } from './services/zohoService';
import { syncSheetToTransactions, deduplicateTransactions } from './services/googleSheetsService';
import {
  supabase,
  signInWithGoogle, signOut as supabaseSignOut,
  loadEntities, upsertEntity, deleteEntity,
  loadTransactions, upsertTransaction, upsertTransactions, deleteTransaction, deleteTransactions,
  loadContacts, upsertContact, deleteContact,
  loadCampaigns, upsertCampaign, deleteCampaign,
  loadBankTransactions, upsertBankTransaction, upsertBankTransactions, clearBankTransactions,
  loadSetting, saveSetting,
  saveTransactionsLocal, loadTransactionsLocal,
  saveContactsLocal, loadContactsLocal,
  saveCampaignsLocal, loadCampaignsLocal,
  saveBankTransactionsLocal, loadBankTransactionsLocal,
} from './services/supabaseService';
import * as XLSX from 'xlsx';
import { CONFIG } from './config';

const generateId = () => crypto.randomUUID();
const DEFAULT_ENTITY: Entity = { id: 'e1', name: 'Laila Mourad', initials: 'LM', color: 'bg-primary' };


const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Data State
  const [entities, setEntities] = useState<Entity[]>([DEFAULT_ENTITY]);
  const [currentEntityId, setCurrentEntityId] = useState('e1');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaignMetadata, setCampaignMetadata] = useState<Record<string, Campaign>>({});
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [resources, setResources] = useState<{ mediaKit: any; rateCard: any }>({ mediaKit: null, rateCard: null });
  const [parsedRateCardData, setParsedRateCardData] = useState<ParsedRateItem[]>(RATE_CARD_SERVICES);
  const [chatHistory, setChatHistory] = useState<AIChatMessage[]>([]);
  const [zohoConfig, setZohoConfig] = useState<ZohoConfig>({ accessToken: '', organizationId: '', apiDomain: 'https://www.zohoapis.com' });
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<GoogleSheetsConfig>({ sheetUrl: '', columnMapping: {} });
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetSyncError, setSheetSyncError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ customName?: string; customPhoto?: string }>({});

  // UI Preferences
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCampaignName, setSelectedCampaignName] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'teal');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app-dark-mode') === 'true');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('app-font-size') || '14');
  const [showAedEquivalent, setShowAedEquivalent] = useState(() => localStorage.getItem('app-show-aed-equiv') !== 'false');
  const [columnWidths, setColumnWidths] = useState(() => JSON.parse(localStorage.getItem('columnWidths') || '{}'));
  const [columnLabels, setColumnLabels] = useState(() => JSON.parse(localStorage.getItem('columnLabels') || '{}'));
  const [dismissedTips, setDismissedTips] = useState(() => JSON.parse(localStorage.getItem('dismissedTips') || '[]'));

  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [isProcessingBanking, setIsProcessingBanking] = useState(false);
  const [isSyncingZoho, setIsSyncingZoho] = useState(false);
  const [zohoSyncError, setZohoSyncError] = useState<string | null>(null);
  const [bankingProgress, setBankingProgress] = useState(0);
  const [bankingStatus, setBankingStatus] = useState('');

  // --- Auth + Data Loading ---

  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadEntities().then(d => d.length ? setEntities(d) : null),
      // Load transactions from Supabase, fall back to localStorage
      loadTransactions().then(async (supabaseTxs) => {
        if (supabaseTxs.length > 0) { setTransactions(supabaseTxs); }
        else {
          const localTxs = await loadTransactionsLocal();
          if (localTxs && localTxs.length > 0) setTransactions(localTxs);
        }
      }),
      loadContacts().then(d => {
        if (d.length > 0) { setContacts(d); }
        else { const l = loadContactsLocal(); if (l && l.length > 0) setContacts(l); }
      }),
      loadCampaigns().then(d => {
        if (Object.keys(d).length > 0) { setCampaignMetadata(d); }
        else { const l = loadCampaignsLocal(); if (l && Object.keys(l).length > 0) setCampaignMetadata(l); }
      }),
      loadBankTransactions().then(d => {
        if (d.length > 0) { setBankTransactions(d); }
        else { const l = loadBankTransactionsLocal(); if (l && l.length > 0) setBankTransactions(l); }
      }),
      loadSetting('resources', { mediaKit: null, rateCard: null }).then(setResources),
      loadSetting('parsedRateCard', RATE_CARD_SERVICES).then(setParsedRateCardData),
      loadSetting('chatHistory', []).then(setChatHistory),
      loadSetting('zohoConfig', { accessToken: '', organizationId: '', apiDomain: 'https://www.zohoapis.com' }).then(setZohoConfig),
      loadSetting('googleSheetsConfig', { sheetUrl: '', columnMapping: {} }).then(setGoogleSheetsConfig),
      loadSetting('userProfile', {}).then(setUserProfile),
    ]).catch(console.error);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadAllData();
      }
      setIsAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (event === 'SIGNED_IN') loadAllData();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAllData]);

  // Auto-sync with Zoho on load when credentials are available
  const hasAutoSynced = React.useRef(false);
  useEffect(() => {
    if (hasAutoSynced.current || !zohoConfig.accessToken || !zohoConfig.organizationId || isSyncingZoho) return;
    hasAutoSynced.current = true;

    const autoSync = async () => {
      setIsSyncingZoho(true);
      try {
        let config = zohoConfig;
        // Try refresh token if we have one
        if (config.refreshToken && config.clientId && config.clientSecret) {
          const newToken = await refreshZohoToken(config);
          if (newToken) {
            config = { ...config, accessToken: newToken };
            setZohoConfig(config);
            saveSetting('zohoConfig', config).catch(console.error);
          }
        }
        const invoices = await fetchZohoInvoices(config);
        if (invoices.length > 0) {
          setTransactions(prev => {
            const combined = [...prev];
            invoices.forEach(inv => {
              const idx = combined.findIndex(t => t.id === inv.id);
              if (idx >= 0) combined[idx] = mergeZohoInvoice(inv, combined[idx]);
              else combined.push(inv);
            });
            saveTransactionsLocal(combined).catch(console.error);
            return combined;
          });
          upsertTransactions(invoices).catch(console.error);
          const nextConfig = { ...config, lastSync: new Date().toLocaleString() };
          setZohoConfig(nextConfig);
          saveSetting('zohoConfig', nextConfig).catch(console.error);
        }
      } catch (err) {
        console.error('Auto-sync failed:', err);
      } finally { setIsSyncingZoho(false); }
    };
    autoSync();
  }, [zohoConfig.accessToken, zohoConfig.organizationId]);

  // Auto-sync Google Sheet on load when autoSync is enabled
  const hasAutoSyncedSheets = React.useRef(false);
  useEffect(() => {
    if (hasAutoSyncedSheets.current || !googleSheetsConfig.sheetUrl || !googleSheetsConfig.autoSync || Object.keys(googleSheetsConfig.columnMapping).length === 0) return;
    hasAutoSyncedSheets.current = true;
    setIsSyncingSheets(true);
    setSheetSyncError(null);
    syncSheetToTransactions(googleSheetsConfig, transactions).then(result => {
      if (result.error) { setSheetSyncError(result.error); return; }
      setTransactions(result.transactions);
      upsertTransactions(result.transactions).catch(console.error);
      const nextConfig = { ...googleSheetsConfig, lastSync: new Date().toISOString() };
      setGoogleSheetsConfig(nextConfig);
      saveSetting('googleSheetsConfig', nextConfig).catch(console.error);
    }).catch(e => setSheetSyncError(e.message))
      .finally(() => setIsSyncingSheets(false));
  }, [googleSheetsConfig.sheetUrl, googleSheetsConfig.autoSync]);

  const handleSyncSheets = async (): Promise<{ added: number; updated: number; skipped: number } | void> => {
    if (!googleSheetsConfig.sheetUrl || Object.keys(googleSheetsConfig.columnMapping).length === 0) return;
    setIsSyncingSheets(true);
    setSheetSyncError(null);
    try {
      const result = await syncSheetToTransactions(googleSheetsConfig, transactions);
      if (result.error) { setSheetSyncError(result.error); return; }
      setTransactions(result.transactions);
      upsertTransactions(result.transactions).catch(console.error);
      const nextConfig = { ...googleSheetsConfig, lastSync: new Date().toISOString() };
      setGoogleSheetsConfig(nextConfig);
      saveSetting('googleSheetsConfig', nextConfig).catch(console.error);
      return { added: result.added, updated: result.updated, skipped: result.skipped };
    } catch (e: any) {
      setSheetSyncError(e.message);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleSignIn = () => {
    signInWithGoogle().catch(console.error);
  };

  const handleSignOut = () => {
    setUser(null);
    supabaseSignOut().catch(console.error);
  };

  // --- Logic Handlers (Updated to use local State + LocalStorage) ---

  // Persist all data to localStorage whenever they change (skip empty on first render)
  const hasLoadedData = React.useRef(false);
  useEffect(() => {
    if (transactions.length > 0) hasLoadedData.current = true;
    if (hasLoadedData.current) saveTransactionsLocal(transactions).catch(console.error);
  }, [transactions]);

  useEffect(() => {
    if (contacts.length > 0) saveContactsLocal(contacts);
  }, [contacts]);

  useEffect(() => {
    if (Object.keys(campaignMetadata).length > 0) saveCampaignsLocal(campaignMetadata);
  }, [campaignMetadata]);

  useEffect(() => {
    if (bankTransactions.length > 0) saveBankTransactionsLocal(bankTransactions);
  }, [bankTransactions]);

  const handleAddTransaction = (t: Transaction) => {
    setTransactions(prev => [...prev, t]);
    upsertTransaction(t).catch(console.error);
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    upsertTransaction(updated).catch(console.error);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    deleteTransaction(id).catch(console.error);
  };

  const handleBulkUpdateTransactions = (ids: string[], updates: Partial<Transaction>) => {
    const updated: Transaction[] = [];
    setTransactions(prev => prev.map(t => {
      if (ids.includes(t.id)) { const u = { ...t, ...updates }; updated.push(u); return u; }
      return t;
    }));
    upsertTransactions(updated).catch(console.error);
  };

  const handleBulkDeleteTransactions = (ids: string[]) => {
    setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
    deleteTransactions(ids).catch(console.error);
  };

  const handleAddContact = (c: Contact) => {
    setContacts(prev => [...prev, c]);
    upsertContact(c).catch(console.error);
  };

  const handleUpdateContactStatus = (id: string, status: any) => {
    let updated: Contact | undefined;
    setContacts(prev => prev.map(c => { if (c.id === id) { updated = { ...c, status }; return updated; } return c; }));
    if (updated) upsertContact(updated).catch(console.error);
  };

  const handleDeleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    deleteContact(id).catch(console.error);
  };

  // Convert Excel serial date number to ISO date string
  const excelDateToISO = (serial: any): string => {
    if (!serial) return new Date().toISOString().split('T')[0];
    if (serial instanceof Date) return serial.toISOString().split('T')[0];
    const num = Number(serial);
    if (!isNaN(num) && num > 10000) {
      // Excel serial date: days since 1900-01-01 (with the Lotus 1-2-3 leap year bug)
      const utcDays = Math.floor(num - 25569);
      const d = new Date(utcDays * 86400 * 1000);
      return d.toISOString().split('T')[0];
    }
    // Already a string date
    return String(serial);
  };

  // Normalize status values from Excel (trim whitespace, map synonyms)
  const normalizeStatus = (raw: any): StatusOption => {
    const s = String(raw || '').trim();
    const lower = s.toLowerCase();
    if (lower === 'paid') return 'Paid';
    if (lower === 'paid to personal account') return 'Paid to personal account';
    if (lower === 'pending') return 'Pending';
    if (lower === 'unpaid' || lower === 'invoiced' || lower === 'sent') return 'Unpaid';
    if (lower === 'overdue') return 'Overdue';
    if (lower === 'void' || lower === 'cancelled') return 'Void';
    if (lower === 'draft') return 'Draft';
    if (s === '') return 'Pending';
    return 'Pending';
  };

  const processExcelFile = async (file: File) => {
    setIsProcessingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const newTransactions: Transaction[] = jsonData.filter((row) => {
        const project = String(row.Campaign || row.Project || row.Description || '').trim();
        const amount = Number(row['INV Amount'] || row.Amount || row.Total || 0);
        const client = String(row.Client || row.Customer || '').trim();
        return project !== '' || amount > 0 || client !== '';
      }).map((row) => {
        const id = generateId();
        const amount = Number(row['INV Amount'] || row.Amount || row.Total || 0);
        // Use pre-calculated values from Excel if available, else derive
        const net = Number(row.Net) || Number((amount / (1 + CONFIG.VAT_RATE)).toFixed(2));
        const vat = Number(row.VAT) || Number((amount - net).toFixed(2));
        const fee = Number(row['Ladly Fee']) || Number((net * CONFIG.ADLY_FEE_RATE).toFixed(2));
        const payable = Number(row['Payable to LM']) || Number((net - fee).toFixed(2));
        const transferWithVat = Number(row['Transfer with VAT']) || 0;
        const rawDate = row['INV Date'] || row.Date;
        const date = excelDateToISO(rawDate);
        const dateObj = new Date(date);

        const clientStatus = normalizeStatus(row['Client Status'] || row.Status);
        const ladlyStatus = normalizeStatus(row['Ladly Status']);

        return {
          id,
          year: Number(row.Year) || (dateObj.getFullYear() || new Date().getFullYear()),
          date,
          project: String(row.Campaign || row.Project || row['Campaign Name'] || row.Description || 'Imported Project').trim(),
          description: row.Description || 'Imported from Excel',
          amount,
          currency: (row.Currency === 'USD' ? 'USD' : 'AED') as 'AED' | 'USD',
          vat: Number(vat.toFixed(2)),
          net: Number(net.toFixed(2)),
          fee: Number(fee.toFixed(2)),
          payable: Number(payable.toFixed(2)),
          transferWithVat,
          category: row.Category || Category.FREELANCE,
          type: (row.Type === 'Expense' ? TransactionType.EXPENSE : TransactionType.INCOME),
          clientStatus,
          ladlyStatus,
          invoiceNumber: String(row['INV #'] || row.InvoiceNumber || row['Invoice #'] || '').trim(),
          customerName: String(row.Client || row.Customer || '').trim(),
          country: String(row.C0untry || row.Country || '').trim(),
        };
      });

      setTransactions(prev => [...prev, ...newTransactions]);
      upsertTransactions(newTransactions).catch(console.error);
    } catch (error) {
      console.error("Excel processing error:", error);
      alert("Failed to process Excel file. Please ensure it follows the ledger format.");
    } finally {
      setIsProcessingExcel(false);
    }
  };

  const handleStatementUpload = async (files: File[]) => {
    setIsProcessingBanking(true);
    setBankingProgress(0);
    try {
      let allExtracted: BankTransaction[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const extracted = await parseBankStatement(base64, file.type);
        allExtracted = [...allExtracted, ...extracted];
        setBankingProgress(Math.round(((i + 1) / files.length) * 100));
      }
      const extracted = allExtracted.map(b => ({ ...b }));
      setBankTransactions(prev => [...prev, ...extracted]);
      upsertBankTransactions(extracted).catch(console.error);
    } catch (err) { 
      setBankingStatus('Import error.'); 
    } finally { 
      setTimeout(() => { setIsProcessingBanking(false); setBankingStatus(''); }, 1000); 
    }
  };

  const handleAddExpenseFromBank = useCallback((bankTx: BankTransaction, category: Category) => {
    const expenseId = generateId();
    const newExpense: Transaction = {
        id: expenseId,
        year: new Date(bankTx.date).getFullYear(),
        date: bankTx.date,
        project: bankTx.vendor || bankTx.description,
        customerName: bankTx.vendor,
        description: bankTx.description,
        amount: bankTx.amount,
        currency: 'AED' as any,
        category: category,
        type: TransactionType.EXPENSE,
        clientStatus: 'Paid',
        ladlyStatus: 'Paid',
        paymentToLmRef: bankTx.id,
    };
    
    // Update Ledger
    setTransactions(prev => [...prev, newExpense]);
    upsertTransaction(newExpense).catch(console.error);

    // Update Bank
    const updatedBankTx = { ...bankTx, matchedTransactionId: expenseId, category };
    setBankTransactions(prev => prev.map(b => b.id === bankTx.id ? updatedBankTx : b));
    upsertBankTransaction(updatedBankTx).catch(console.error);
  }, [transactions, bankTransactions]);

  const handleLinkBankToLedger = useCallback((bankId: string, ledgerIds: string[]) => {
    const bankItem = bankTransactions.find(b => b.id === bankId);
    if (!bankItem) return;
    
    const type = bankItem.type === 'credit' ? 'client' : 'laila';
    
    // Update Bank
    let updatedBt: BankTransaction | undefined;
    setBankTransactions(prev => prev.map(b => { if (b.id === bankId) { updatedBt = { ...b, matchedTransactionId: ledgerIds.join(', ') }; return updatedBt; } return b; }));
    if (updatedBt) upsertBankTransaction(updatedBt).catch(console.error);

    // Update Ledger
    const updatedLedgerItems: Transaction[] = [];
    setTransactions(prev => prev.map(t => {
      if (ledgerIds.includes(t.id)) {
        const updates: any = {};
        if (type === 'client') { updates.clientStatus = 'Paid'; updates.referenceNumber = bankId; }
        else { updates.ladlyStatus = 'Paid'; updates.paymentToLmRef = bankId; }
        const u = { ...t, ...updates };
        updatedLedgerItems.push(u);
        return u;
      }
      return t;
    }));
    upsertTransactions(updatedLedgerItems).catch(console.error);
  }, [bankTransactions, transactions]);

  const autoDiscoveredCampaigns = useMemo(() => {
    const list: Record<string, Campaign> = { ...campaignMetadata };
    transactions.forEach(t => {
      if (t.project && !list[t.project]) {
        list[t.project] = { projectName: t.project, files: [], deliverables: [], mergedSources: [] };
      }
    });
    const allMergedChildren = new Set<string>();
    Object.values(list).forEach(c => {
      if (c.mergedSources) {
        c.mergedSources.forEach(s => allMergedChildren.add(s));
      }
    });
    return Object.values(list).filter(c => !allMergedChildren.has(c.projectName));
  }, [transactions, campaignMetadata]);

  // Theme token maps — full Material Design 3 palettes per theme
  const THEME_TOKENS: Record<string, Record<string, string>> = {
    teal: {
      '--md-primary': '#006b62', '--md-primary-dim': '#005e56', '--md-on-primary': '#e2fff9',
      '--md-primary-container': '#89f5e7', '--md-on-primary-container': '#005c54',
      '--md-primary-fixed': '#89f5e7', '--md-primary-fixed-dim': '#7ae7d8',
      '--md-secondary': '#4b6460', '--md-on-secondary': '#e3fff9',
      '--md-secondary-container': '#cce8e3', '--md-on-secondary-container': '#3d5653',
      '--md-tertiary': '#346578', '--md-on-tertiary': '#f2faff',
      '--md-tertiary-container': '#b6e7fe', '--md-on-tertiary-container': '#235669',
      '--md-background': '#f6faf8', '--md-surface': '#f6faf8', '--md-surface-bright': '#f6faf8', '--md-surface-dim': '#d1dcd9',
      '--md-surface-container-lowest': '#ffffff', '--md-surface-container-low': '#eef5f3',
      '--md-surface-container': '#e7f0ed', '--md-surface-container-high': '#e1eae7', '--md-surface-container-highest': '#d9e5e2',
      '--md-surface-variant': '#d9e5e2',
      '--md-on-background': '#2a3433', '--md-on-surface': '#2a3433', '--md-on-surface-variant': '#56615f',
      '--md-outline': '#727d7b', '--md-outline-variant': '#a9b4b1',
    },
    indigo: {
      '--md-primary': '#4f46e5', '--md-primary-dim': '#4338ca', '--md-on-primary': '#eef2ff',
      '--md-primary-container': '#c7d2fe', '--md-on-primary-container': '#3730a3',
      '--md-primary-fixed': '#c7d2fe', '--md-primary-fixed-dim': '#a5b4fc',
      '--md-secondary': '#6366f1', '--md-on-secondary': '#eef2ff',
      '--md-secondary-container': '#e0e7ff', '--md-on-secondary-container': '#4338ca',
      '--md-tertiary': '#7c3aed', '--md-on-tertiary': '#f5f3ff',
      '--md-tertiary-container': '#ddd6fe', '--md-on-tertiary-container': '#5b21b6',
      '--md-background': '#f8f7ff', '--md-surface': '#f8f7ff', '--md-surface-bright': '#f8f7ff', '--md-surface-dim': '#d8d6e8',
      '--md-surface-container-lowest': '#ffffff', '--md-surface-container-low': '#f0eef8',
      '--md-surface-container': '#e8e6f2', '--md-surface-container-high': '#e2dfe8', '--md-surface-container-highest': '#dbd8e5',
      '--md-surface-variant': '#e2dfe8',
      '--md-on-background': '#1e1b4b', '--md-on-surface': '#1e1b4b', '--md-on-surface-variant': '#4c4672',
      '--md-outline': '#6b6494', '--md-outline-variant': '#a8a3c5',
    },
    slate: {
      '--md-primary': '#0f172a', '--md-primary-dim': '#1e293b', '--md-on-primary': '#f8fafc',
      '--md-primary-container': '#cbd5e1', '--md-on-primary-container': '#0f172a',
      '--md-primary-fixed': '#cbd5e1', '--md-primary-fixed-dim': '#94a3b8',
      '--md-secondary': '#334155', '--md-on-secondary': '#f1f5f9',
      '--md-secondary-container': '#e2e8f0', '--md-on-secondary-container': '#1e293b',
      '--md-tertiary': '#475569', '--md-on-tertiary': '#f8fafc',
      '--md-tertiary-container': '#e2e8f0', '--md-on-tertiary-container': '#334155',
      '--md-background': '#f8fafc', '--md-surface': '#f8fafc', '--md-surface-bright': '#f8fafc', '--md-surface-dim': '#dce1e6',
      '--md-surface-container-lowest': '#ffffff', '--md-surface-container-low': '#f1f5f9',
      '--md-surface-container': '#e2e8f0', '--md-surface-container-high': '#dce3eb', '--md-surface-container-highest': '#d5dce4',
      '--md-surface-variant': '#dce3eb',
      '--md-on-background': '#0f172a', '--md-on-surface': '#0f172a', '--md-on-surface-variant': '#475569',
      '--md-outline': '#64748b', '--md-outline-variant': '#94a3b8',
    },
    rose: {
      '--md-primary': '#be123c', '--md-primary-dim': '#9f1239', '--md-on-primary': '#fff1f2',
      '--md-primary-container': '#fecdd3', '--md-on-primary-container': '#9f1239',
      '--md-primary-fixed': '#fecdd3', '--md-primary-fixed-dim': '#fda4af',
      '--md-secondary': '#e11d48', '--md-on-secondary': '#fff1f2',
      '--md-secondary-container': '#ffe4e6', '--md-on-secondary-container': '#be123c',
      '--md-tertiary': '#c026d3', '--md-on-tertiary': '#fdf4ff',
      '--md-tertiary-container': '#f5d0fe', '--md-on-tertiary-container': '#86198f',
      '--md-background': '#fef7f8', '--md-surface': '#fef7f8', '--md-surface-bright': '#fef7f8', '--md-surface-dim': '#e8d5d8',
      '--md-surface-container-lowest': '#ffffff', '--md-surface-container-low': '#fceef0',
      '--md-surface-container': '#f5e6e9', '--md-surface-container-high': '#f0dfe2', '--md-surface-container-highest': '#ead9dc',
      '--md-surface-variant': '#f0dfe2',
      '--md-on-background': '#3a1520', '--md-on-surface': '#3a1520', '--md-on-surface-variant': '#6b4050',
      '--md-outline': '#8e5e6e', '--md-outline-variant': '#b89aa5',
    },
    amber: {
      '--md-primary': '#b45309', '--md-primary-dim': '#92400e', '--md-on-primary': '#fffbeb',
      '--md-primary-container': '#fde68a', '--md-on-primary-container': '#92400e',
      '--md-primary-fixed': '#fde68a', '--md-primary-fixed-dim': '#fbbf24',
      '--md-secondary': '#d97706', '--md-on-secondary': '#fffbeb',
      '--md-secondary-container': '#fef3c7', '--md-on-secondary-container': '#b45309',
      '--md-tertiary': '#ea580c', '--md-on-tertiary': '#fff7ed',
      '--md-tertiary-container': '#fed7aa', '--md-on-tertiary-container': '#c2410c',
      '--md-background': '#fefcf3', '--md-surface': '#fefcf3', '--md-surface-bright': '#fefcf3', '--md-surface-dim': '#e8e1cc',
      '--md-surface-container-lowest': '#ffffff', '--md-surface-container-low': '#faf6e8',
      '--md-surface-container': '#f3efe0', '--md-surface-container-high': '#eee9d9', '--md-surface-container-highest': '#e8e3d3',
      '--md-surface-variant': '#eee9d9',
      '--md-on-background': '#3b2506', '--md-on-surface': '#3b2506', '--md-on-surface-variant': '#6b5530',
      '--md-outline': '#8e7650', '--md-outline-variant': '#b8a17e',
    },
  };

  // Effects for UI Preferences
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-dark-mode', isDarkMode.toString());
    localStorage.setItem('app-font-size', fontSize);
    localStorage.setItem('app-show-aed-equiv', showAedEquivalent.toString());
    localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
    localStorage.setItem('columnLabels', JSON.stringify(columnLabels));
    localStorage.setItem('dismissedTips', JSON.stringify(dismissedTips));

    // Apply theme tokens as CSS variables
    const tokens = THEME_TOKENS[theme] || THEME_TOKENS.teal;
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
    root.className = isDarkMode ? 'dark' : '';
    root.style.setProperty('--root-font-size', `${fontSize}px`);
  }, [theme, isDarkMode, fontSize, showAedEquivalent, columnWidths, columnLabels, dismissedTips]);

  if (isAuthChecking) return <div className="h-screen flex items-center justify-center bg-bg-page"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div></div>;
  if (!user) return <SignIn onSignIn={handleSignIn} isDarkMode={isDarkMode} onToggleDarkMode={setIsDarkMode} />;

  const activeEntity = entities.find(e => e.id === currentEntityId) || entities[0];

  return (
    <Layout
      activeTab={activeTab} setActiveTab={setActiveTab} isAnyProcessing={isProcessingExcel || isProcessingBanking || isSyncingZoho}
      isAiOpen={isAiOpen} onToggleAi={() => setIsAiOpen(!isAiOpen)} onOpenSettings={() => setIsSettingsOpen(true)} onSignOut={handleSignOut}
      entities={entities} activeEntity={activeEntity} onSwitchEntity={(id) => setCurrentEntityId(id)}
      user={{ name: user?.user_metadata?.full_name || user?.user_metadata?.name, email: user?.email, avatarUrl: user?.user_metadata?.avatar_url }}
      userProfile={userProfile}
      onSaveUserProfile={(profile) => {
        setUserProfile(profile);
        saveSetting('userProfile', profile).catch(console.error);
      }}
      onCreateEntity={(n, l) => {
        const entity = { id: generateId(), name: n, logo: l, initials: n.substring(0,2).toUpperCase(), color: 'bg-primary' };
        setEntities(prev => [...prev, entity]);
        upsertEntity(entity).catch(console.error);
      }}
      onUpdateEntity={(id, u) => {
        let updated: Entity | undefined;
        setEntities(prev => prev.map(e => { if (e.id === id) { updated = {...e, ...u}; return updated; } return e; }));
        if (updated) upsertEntity(updated).catch(console.error);
      }}
      onDeleteEntity={(id) => {
        if (entities.length > 1) {
          setEntities(prev => prev.filter(e => e.id !== id));
          deleteEntity(id).catch(console.error);
        }
      }}
      ledgerCount={transactions.length} bankTxCount={bankTransactions.length}
      zohoConnected={!!(zohoConfig.refreshToken && zohoConfig.clientId && zohoConfig.clientSecret && zohoConfig.organizationId)}
      isSyncingZoho={isSyncingZoho}
      zohoLastSync={zohoConfig.lastSync}
      onZohoSync={async () => {
        setIsSyncingZoho(true);
        setZohoSyncError(null);
        try {
          let config = zohoConfig;
          if (config.refreshToken && config.clientId && config.clientSecret) {
            const newToken = await refreshZohoToken(config);
            if (newToken) { config = { ...config, accessToken: newToken }; setZohoConfig(config); saveSetting('zohoConfig', config).catch(console.error); }
          }
          const invoices = await fetchZohoInvoices(config);
          setTransactions(prev => {
            const combined = [...prev];
            invoices.forEach(inv => { const idx = combined.findIndex(t => t.id === inv.id); if (idx >= 0) combined[idx] = mergeZohoInvoice(inv, combined[idx]); else combined.push(inv); });
            saveTransactionsLocal(combined).catch(console.error);
            return combined;
          });
          upsertTransactions(invoices).catch(console.error);
          const nextConfig = { ...config, lastSync: new Date().toLocaleString() };
          setZohoConfig(nextConfig);
          saveSetting('zohoConfig', nextConfig).catch(console.error);
        } catch (err: any) { setZohoSyncError(err.message); }
        finally { setIsSyncingZoho(false); }
      }}
    >
      {activeTab === 'dashboard' && <Dashboard transactions={transactions} showAedEquivalent={showAedEquivalent} />}
      {activeTab === 'finance' && (
        <FinanceTracker 
          transactions={transactions} 
          onAddTransaction={handleAddTransaction} 
          onUpdateTransaction={handleUpdateTransaction} 
          onBulkUpdateTransactions={handleBulkUpdateTransactions} 
          onDeleteTransaction={handleDeleteTransaction} 
          onBulkDeleteTransactions={handleBulkDeleteTransactions} 
          onExcelImport={processExcelFile} 
          onUndo={() => {}} onRedo={() => {}} canUndo={false} canRedo={false}
          isProcessing={isProcessingExcel} columnWidths={columnWidths} onColumnWidthChange={setColumnWidths} 
          columnLabels={columnLabels} onUpdateColumnLabel={(k, l) => setColumnLabels(p => ({...p, [k]: l}))} 
          showAedEquivalent={showAedEquivalent} bankTransactions={bankTransactions} 
          onReconcile={(tId, bIds) => handleLinkBankToLedger(bIds[0], [tId])} 
          onUnlink={(tId, type) => {
            const tx = transactions.find(t => t.id === tId);
            if (tx) {
                const updates: any = {};
                if (type === 'client') { updates.referenceNumber = undefined; updates.clientStatus = 'Pending'; }
                else { updates.paymentToLmRef = undefined; updates.ladlyStatus = 'Pending'; }
                handleUpdateTransaction({ ...tx, ...updates });
            }
          }} 
        />
      )}
      {activeTab === 'banking' && (
        <BankingComponent 
          bankTransactions={bankTransactions} transactions={transactions} 
          onUpdateBankTransaction={(bt) => {
            setBankTransactions(prev => prev.map(b => b.id === bt.id ? bt : b));
            upsertBankTransaction(bt).catch(console.error);
          }}
          onUpdateTransaction={handleUpdateTransaction}
          onClearBankTransactions={() => {
            setBankTransactions([]);
            clearBankTransactions().catch(console.error);
          }}
          onAddExpenseFromBank={handleAddExpenseFromBank} onLinkBankToLedger={handleLinkBankToLedger}
          onUnlinkBank={(bankId) => {
            let updated: BankTransaction | undefined;
            setBankTransactions(prev => prev.map(b => { if (b.id === bankId) { updated = { ...b, matchedTransactionId: undefined }; return updated; } return b; }));
            if (updated) upsertBankTransaction(updated).catch(console.error);
          }}
          onStatementUpload={handleStatementUpload} 
          isProcessing={isProcessingBanking} progress={bankingProgress} statusMsg={bankingStatus} showAedEquivalent={showAedEquivalent} 
        />
      )}
      {activeTab === 'tax' && <VatCenter transactions={transactions} showAedEquivalent={showAedEquivalent} dismissedTips={dismissedTips} onDismissTip={(id) => setDismissedTips(p => [...p, id])} onOpenAi={() => setIsAiOpen(true)} />}
      {activeTab === 'campaigns' && (
        <CampaignTracker 
          transactions={transactions} campaigns={autoDiscoveredCampaigns} rateCard={parsedRateCardData} 
          onUpdateCampaign={(n, m) => {
            const updated = {...(campaignMetadata[n] || {}), ...m, projectName: n} as Campaign;
            setCampaignMetadata(prev => ({...prev, [n]: updated}));
            upsertCampaign(updated).catch(console.error);
          }}
          onMergeCampaigns={(sources, target) => {
            const sourcesWithoutTarget = sources.filter(s => s !== target);
            const existing = campaignMetadata[target] || { projectName: target, files: [], deliverables: [], mergedSources: [] };
            const merged = { ...existing, mergedSources: Array.from(new Set([...(existing.mergedSources || []), ...sourcesWithoutTarget])) };
            setCampaignMetadata(prev => ({...prev, [target]: merged}));
            upsertCampaign(merged).catch(console.error);
          }}
          onAddCampaign={(n) => {
            const c: Campaign = { projectName: n };
            setCampaignMetadata(prev => ({...prev, [n]: c}));
            upsertCampaign(c).catch(console.error);
          }}
          onRenameCampaign={(oldN, newN) => {
            const renamedTxs: Transaction[] = [];
            setTransactions(prev => prev.map(t => { if (t.project === oldN) { const u = { ...t, project: newN }; renamedTxs.push(u); return u; } return t; }));
            upsertTransactions(renamedTxs).catch(console.error);
            const oldCampaign = campaignMetadata[oldN];
            if (oldCampaign) {
              const renamed = { ...oldCampaign, projectName: newN };
              setCampaignMetadata(prev => { const next = {...prev}; delete next[oldN]; next[newN] = renamed; return next; });
              upsertCampaign(renamed).catch(console.error);
              deleteCampaign(oldN).catch(console.error);
            }
          }}
          selectedProjectName={selectedCampaignName} setSelectedProjectName={setSelectedCampaignName} showAedEquivalent={showAedEquivalent}
        />
      )}
      {activeTab === 'crm' && (
        <CRM 
          contacts={contacts} 
          onAddContact={handleAddContact}
          onDeleteContact={handleDeleteContact}
          onUpdateStatus={handleUpdateContactStatus}
          dismissedTips={dismissedTips} onDismissTip={(id) => setDismissedTips(p => [...p, id])} 
        />
      )}
      {activeTab === 'resources' && (
        <Resources 
          resources={resources} rateCardData={parsedRateCardData} 
          onUpdateResources={(u) => {
            const next = {...resources, ...u};
            setResources(next);
            saveSetting('resources', next).catch(console.error);
          }}
          onUpdateRateCardData={(d) => {
            setParsedRateCardData(d);
            saveSetting('parsedRateCard', d).catch(console.error);
          }} 
        />
      )}

      <Settings
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={zohoConfig}
        onSaveConfig={(c) => { setZohoConfig(c); saveSetting('zohoConfig', c).catch(console.error); }}
        user={{ name: user?.user_metadata?.full_name || user?.user_metadata?.name, email: user?.email, avatarUrl: user?.user_metadata?.avatar_url }}
        onSignOut={handleSignOut}
        onSync={async () => {
            setIsSyncingZoho(true);
            setZohoSyncError(null);
            try {
                let config = zohoConfig;
                // Try refresh token first
                if (config.refreshToken && config.clientId && config.clientSecret) {
                  const newToken = await refreshZohoToken(config);
                  if (newToken) {
                    config = { ...config, accessToken: newToken };
                    setZohoConfig(config);
                    saveSetting('zohoConfig', config).catch(console.error);
                  }
                }
                const invoices = await fetchZohoInvoices(config);
                const existingIds = new Set(transactions.map(t => t.id));
                const imported = invoices.filter(inv => !existingIds.has(inv.id)).length;
                const updated = invoices.filter(inv => existingIds.has(inv.id)).length;
                setTransactions(prev => {
                  const combined = [...prev];
                  invoices.forEach(inv => {
                    const idx = combined.findIndex(t => t.id === inv.id);
                    if (idx >= 0) combined[idx] = mergeZohoInvoice(inv, combined[idx]);
                    else combined.push(inv);
                  });
                  saveTransactionsLocal(combined).catch(console.error);
                  return combined;
                });
                upsertTransactions(invoices).catch(console.error);
                const nextConfig = { ...config, lastSync: new Date().toLocaleString() };
                setZohoConfig(nextConfig);
                saveSetting('zohoConfig', nextConfig).catch(console.error);
                return { imported, updated };
            } catch (err: any) {
                const msg = err?.message || 'Sync failed. Check your token and organization ID.';
                setZohoSyncError(msg);
                console.error('Zoho sync error:', err);
            } finally { setIsSyncingZoho(false); }
        }}
        isSyncing={isSyncingZoho}
        syncError={zohoSyncError}
        onClearData={() => {
            localStorage.clear();
            window.location.reload();
        }}
        onExport={() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                transactions, contacts, campaignMetadata, bankTransactions, resources, parsedRateCardData, zohoConfig
            }));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `bookeeper_backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }}
        onImport={(file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    if (data.transactions) { setTransactions(data.transactions); upsertTransactions(data.transactions).catch(console.error); }
                    if (data.contacts) { setContacts(data.contacts); data.contacts.forEach((c: Contact) => upsertContact(c).catch(console.error)); }
                    if (data.campaignMetadata) {
                      setCampaignMetadata(data.campaignMetadata);
                      Object.values(data.campaignMetadata as Record<string, Campaign>).forEach(c => upsertCampaign(c).catch(console.error));
                    }
                    if (data.bankTransactions) { setBankTransactions(data.bankTransactions); upsertBankTransactions(data.bankTransactions).catch(console.error); }
                    if (data.resources) { setResources(data.resources); saveSetting('resources', data.resources).catch(console.error); }
                    alert("Backup restored successfully.");
                } catch(err) { alert("Invalid backup file."); }
            };
            reader.readAsText(file);
        }} 
        theme={theme} onSetTheme={setTheme} isDarkMode={isDarkMode} onSetDarkMode={setIsDarkMode} fontSize={fontSize} onSetFontSize={setFontSize} showAedEquivalent={showAedEquivalent} onSetShowAedEquivalent={setShowAedEquivalent}
        googleSheetsConfig={googleSheetsConfig}
        onSaveGoogleSheetsConfig={(c) => { setGoogleSheetsConfig(c); saveSetting('googleSheetsConfig', c).catch(console.error); }}
        onSyncSheets={handleSyncSheets}
        isSyncingSheets={isSyncingSheets}
        sheetSyncError={sheetSyncError}
        onDeduplicate={async () => {
          const { kept, removed } = deduplicateTransactions(transactions);
          if (removed > 0) {
            setTransactions(kept);
            upsertTransactions(kept).catch(console.error);
            // Remove the discarded ones from Supabase
            const keptIds = new Set(kept.map(t => t.id));
            const removedIds = transactions.filter(t => !keptIds.has(t.id)).map(t => t.id);
            deleteTransactions(removedIds).catch(console.error);
          }
          return removed;
        }}
      />

      <AIChat 
        isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} transactions={transactions} contacts={contacts} campaigns={autoDiscoveredCampaigns} bankTransactions={bankTransactions} 
        history={chatHistory} onUpdateHistory={(h) => { setChatHistory(h); saveSetting('chatHistory', h).catch(console.error); }} onNavigateToCampaign={() => { setActiveTab('campaigns'); setIsAiOpen(false); }} 
        onUpdateLedgerStatus={(ids, field, status) => handleBulkUpdateTransactions(ids, { [field]: status })} 
        onReconcile={(pName, bId) => {
            const tx = transactions.find(t => t.project === pName);
            if (tx) handleLinkBankToLedger(bId, [tx.id]);
        }} 
      />
    </Layout>
  );
};

export default App;