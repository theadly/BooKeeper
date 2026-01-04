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
  ZohoConfig, Entity, ParsedRateItem
} from './types';
import { INITIAL_TRANSACTIONS, INITIAL_CONTACTS, RATE_CARD_SERVICES } from './constants';
import { parseBankStatement } from './services/geminiService';
import { fetchZohoInvoices } from './services/zohoService';
import * as XLSX from 'xlsx';
import { CONFIG } from './config';

const STORAGE_VERSION = '1.2.2';
const generateId = () => crypto.randomUUID();
const DEFAULT_ENTITY: Entity = { id: 'e1', name: 'Laila Mourad', initials: 'LM', color: 'bg-primary' };

const getActiveEntityId = () => localStorage.getItem('app_active_entity_id') || 'e1';

const safeLoad = <T,>(key: string, fallback: T): T => {
  const entityId = getActiveEntityId();
  const fullKey = `entity_${entityId}_${key}`;
  const val = localStorage.getItem(fullKey);
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch (e) {
    return fallback;
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('app_auth') === 'true');
  const [currentEntityId] = useState(getActiveEntityId);
  
  const [entities, setEntities] = useState<Entity[]>(() => {
    const saved = localStorage.getItem('app_entities');
    try { return saved ? JSON.parse(saved) : [DEFAULT_ENTITY]; } catch { return [DEFAULT_ENTITY]; }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => safeLoad('transactions', INITIAL_TRANSACTIONS));
  const [history, setHistory] = useState<Transaction[][]>([]);
  const [future, setFuture] = useState<Transaction[][]>([]);

  const [contacts, setContacts] = useState<Contact[]>(() => safeLoad('contacts', INITIAL_CONTACTS));
  const [campaignMetadata, setCampaignMetadata] = useState<Record<string, Campaign>>(() => safeLoad('campaignMetadata', {}));
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => safeLoad('bankTransactions', []));
  const [resources, setResources] = useState(() => safeLoad('resources', { mediaKit: null, rateCard: null }));
  const [parsedRateCardData, setParsedRateCardData] = useState<ParsedRateItem[]>(() => safeLoad('parsedRateCard', RATE_CARD_SERVICES));
  const [chatHistory, setChatHistory] = useState<AIChatMessage[]>(() => safeLoad('chatHistory', []));
  const [zohoConfig, setZohoConfig] = useState<ZohoConfig>(() => safeLoad('zohoConfig', { accessToken: '', organizationId: '', apiDomain: 'https://www.zohoapis.com' }));
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
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
  const [bankingProgress, setBankingProgress] = useState(0);
  const [bankingStatus, setBankingStatus] = useState('');

  const diskSave = useCallback((subKey: string, data: any) => {
    const entityId = getActiveEntityId();
    const fullKey = `entity_${entityId}_${subKey}`;
    localStorage.setItem(fullKey, JSON.stringify(data));
    localStorage.setItem('app_storage_version', STORAGE_VERSION);
  }, []);

  // Centralized State Update Utility to fix Delete/Undo/Redo inconsistencies
  const updateLedger = useCallback((updater: (prev: Transaction[]) => Transaction[], saveToHistory = true) => {
    setTransactions(prev => {
      const next = updater(prev);
      if (saveToHistory) {
        setHistory(h => [prev, ...h].slice(0, 50));
        setFuture([]);
      }
      diskSave('transactions', next);
      return next;
    });
  }, [diskSave]);

  const handleUndo = useCallback(() => {
    setHistory(prevH => {
      if (prevH.length === 0) return prevH;
      const previous = prevH[0];
      setFuture(f => [transactions, ...f]);
      setTransactions(previous);
      diskSave('transactions', previous);
      return prevH.slice(1);
    });
  }, [transactions, diskSave]);

  const handleRedo = useCallback(() => {
    setFuture(prevF => {
      if (prevF.length === 0) return prevF;
      const next = prevF[0];
      setHistory(h => [transactions, ...h]);
      setTransactions(next);
      diskSave('transactions', next);
      return prevF.slice(1);
    });
  }, [transactions, diskSave]);

  const handleAddTransaction = (t: Transaction) => updateLedger(prev => [t, ...prev]);
  const handleUpdateTransaction = (updated: Transaction) => updateLedger(prev => prev.map(t => t.id === updated.id ? updated : t));
  const handleDeleteTransaction = (id: string) => updateLedger(prev => prev.filter(t => t.id !== id));
  const handleBulkDeleteTransactions = (ids: string[]) => updateLedger(prev => prev.filter(t => !ids.includes(t.id)));
  const handleBulkUpdateTransactions = (ids: string[], updates: Partial<Transaction>) => updateLedger(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...updates } : t));

  const autoDiscoveredCampaigns = useMemo(() => {
    const list: Record<string, Campaign> = { ...campaignMetadata };
    transactions.forEach(t => {
      if (t.project && !list[t.project]) {
        list[t.project] = { projectName: t.project, files: [], deliverables: [] };
      }
    });
    return Object.values(list);
  }, [transactions, campaignMetadata]);

  const handleZohoSync = async () => {
    if (!zohoConfig.accessToken || !zohoConfig.organizationId) {
      alert("Please configure Zoho API credentials in Settings first.");
      return;
    }
    setIsSyncingZoho(true);
    try {
      const zohoInvoices = await fetchZohoInvoices(zohoConfig);
      updateLedger(prev => {
        const next = [...prev];
        zohoInvoices.forEach(zi => {
          const idx = next.findIndex(t => (t.zohoInvoiceId === zi.zohoInvoiceId) || (t.invoiceNumber === zi.invoiceNumber));
          if (idx > -1) next[idx] = { ...next[idx], clientStatus: zi.clientStatus, amount: zi.amount, currency: zi.currency, zohoInvoiceId: zi.zohoInvoiceId };
          else next.unshift(zi);
        });
        return next;
      });
      const updatedConfig = { ...zohoConfig, lastSync: new Date().toLocaleString() };
      setZohoConfig(updatedConfig);
      diskSave('zohoConfig', updatedConfig);
    } catch (err) {
      alert(`Sync Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSyncingZoho(false);
    }
  };

  const handleStatementUpload = async (files: File[]) => {
    setIsProcessingBanking(true);
    setBankingProgress(0);
    setBankingStatus('Analyzing Statements...');
    let allParsed: BankTransaction[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBankingStatus(`Reading ${file.name}...`);
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const extracted = await parseBankStatement(base64, file.type);
        allParsed = [...allParsed, ...extracted];
        setBankingProgress(Math.round(((i + 1) / files.length) * 100));
      }
      if (allParsed.length > 0) {
        setBankTransactions(prev => {
          const existing = new Set(prev.map(b => `${b.date}_${b.amount}_${b.description.toLowerCase()}`));
          const filtered = allParsed.filter(b => !existing.has(`${b.date}_${b.amount}_${b.description.toLowerCase()}`));
          const next = [...filtered, ...prev];
          diskSave('bankTransactions', next);
          return next;
        });
      }
    } catch (err) { setBankingStatus('Import error.'); } finally { setTimeout(() => { setIsProcessingBanking(false); setBankingStatus(''); }, 2000); }
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
        currency: 'AED',
        category: category,
        type: TransactionType.EXPENSE,
        clientStatus: 'Paid',
        ladlyStatus: 'Paid',
        paymentToLmRef: bankTx.id
    };
    updateLedger(prev => [newExpense, ...prev]);
    setBankTransactions(prev => {
      const next = prev.map(bt => bt.id === bankTx.id ? { ...bt, matchedTransactionId: expenseId, category: category } : bt);
      diskSave('bankTransactions', next);
      return next;
    });
  }, [updateLedger, diskSave]);

  const handleLinkBankToLedger = useCallback((bankId: string, ledgerIds: string | string[]) => {
    const targetLedgerIds = Array.isArray(ledgerIds) ? ledgerIds : [ledgerIds];
    const bankItem = bankTransactions.find(b => b.id === bankId);
    if (!bankItem) return;
    const type = bankItem.type === 'credit' ? 'client' : 'laila';

    setBankTransactions(prevBanks => {
      const nextBanks = prevBanks.map(b => b.id === bankId ? { ...b, matchedTransactionId: targetLedgerIds.join(', ') } : b);
      diskSave('bankTransactions', nextBanks);
      return nextBanks;
    });

    updateLedger(prev => prev.map(t => {
      if (targetLedgerIds.includes(t.id)) {
        const updated = { ...t };
        if (type === 'client') {
          updated.clientStatus = 'Paid';
          const existingRefs = updated.referenceNumber ? updated.referenceNumber.split(', ') : [];
          if (!existingRefs.includes(bankId)) updated.referenceNumber = [...existingRefs, bankId].join(', ');
        } else {
          updated.ladlyStatus = 'Paid';
          const existingRefs = updated.paymentToLmRef ? updated.paymentToLmRef.split(', ') : [];
          if (!existingRefs.includes(bankId)) updated.paymentToLmRef = [...existingRefs, bankId].join(', ');
        }
        return updated;
      }
      return t;
    }));
  }, [bankTransactions, updateLedger, diskSave]);

  const processExcelFile = async (file: File) => {
    setIsProcessingExcel(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        if (!evt.target?.result) return;
        const dataArr = new Uint8Array(evt.target.result as ArrayBuffer);
        const wb = XLSX.read(dataArr, { type: 'array', cellDates: true });
        const rawRows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });
        if (!rawRows || rawRows.length < 1) return;
        let headerIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
           const rowStr = (rawRows[i] || []).join(' ').toLowerCase();
           if (rowStr.includes('project') || rowStr.includes('invamt') || rowStr.includes('amount') || rowStr.includes('client')) { headerIndex = i; break; }
        }
        const headers = rawRows[headerIndex].map((h: any) => (h || '').toString().toLowerCase().trim());
        const dataRows = rawRows.slice(headerIndex + 1);
        const findIdx = (keywords: string[]) => headers.findIndex((h: string) => h && keywords.some(k => h.includes(k)));
        const idx = {
          year: findIdx(['year']), project: findIdx(['project', 'campaign', 'folder']),
          client: findIdx(['client', 'customer', 'brand']), amount: findIdx(['invamt', 'invoice amt', 'amount', 'total', 'gross']),
          date: findIdx(['date', 'day']), inv: findIdx(['inv #', 'invoice number', 'inv']),
          cStatus: findIdx(['client status', 'cstatus', 'status']), lStatus: findIdx(['ladly status', 'lstatus']),
          pDate: findIdx(['payment date', 'paid date', 'date paid'])
        };
        const mapStatus = (val: any): StatusOption => {
          const s = String(val || '').trim().toLowerCase();
          if (s.includes('paid to per')) return 'Paid to personal account';
          if (s.includes('paid')) return 'Paid';
          if (s.includes('unpaid')) return 'Unpaid';
          if (s.includes('overdue')) return 'Overdue';
          if (s.includes('void')) return 'Void';
          if (s.includes('draft')) return 'Draft';
          return 'Pending';
        };
        const newItems: Transaction[] = dataRows
          .filter(r => (idx.project >= 0 && r[idx.project]) || (idx.amount >= 0 && r[idx.amount]))
          .map(r => {
            const amount = typeof r[idx.amount] === 'number' ? r[idx.amount] : parseFloat(String(r[idx.amount] || '0').replace(/[^0-9.-]+/g,"")) || 0;
            const net = amount / (1 + CONFIG.VAT_RATE);
            const vat = amount - net;
            const adlyFee = net * CONFIG.ADLY_FEE_RATE;
            const payableLm = net - adlyFee;
            const transferToLm = payableLm * (1 + CONFIG.VAT_RATE);
            const dateStr = r[idx.date] instanceof Date ? r[idx.date].toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const yearVal = idx.year >= 0 && r[idx.year] ? parseInt(String(r[idx.year])) : new Date(dateStr).getFullYear();
            return {
              id: generateId(), year: isNaN(yearVal) ? new Date().getFullYear() : yearVal, date: dateStr,
              project: String(r[idx.project] || r[idx.client] || 'New Campaign'), customerName: String(r[idx.client] || ''),
              invoiceNumber: idx.inv >= 0 ? String(r[idx.inv] || '') : undefined, amount: Number(amount.toFixed(2)),
              vat: Number(vat.toFixed(2)), net: Number(net.toFixed(2)), fee: Number(adlyFee.toFixed(2)),
              payable: Number(payableLm.toFixed(2)), clientPayment: Number(transferToLm.toFixed(2)),
              type: TransactionType.INCOME, currency: 'AED', category: Category.FREELANCE,
              clientStatus: mapStatus(idx.cStatus >= 0 ? r[idx.cStatus] : 'Pending'),
              ladlyStatus: mapStatus(idx.lStatus >= 0 ? r[idx.lStatus] : 'Pending'),
              clientPaymentDate: idx.pDate >= 0 ? String(r[idx.pDate] || '') : undefined
            } as Transaction;
          });
        if (newItems.length > 0) updateLedger(prev => [...newItems, ...prev]);
      } catch (err) { console.error("Excel Parsing Error:", err); } finally { setIsProcessingExcel(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-dark-mode', isDarkMode.toString());
    localStorage.setItem('app-font-size', fontSize);
    localStorage.setItem('app-show-aed-equiv', showAedEquivalent.toString());
    localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
    localStorage.setItem('columnLabels', JSON.stringify(columnLabels));
    localStorage.setItem('dismissedTips', JSON.stringify(dismissedTips));
    document.documentElement.className = `theme-${theme} ${isDarkMode ? 'dark' : ''}`;
    document.documentElement.style.setProperty('--root-font-size', `${fontSize}px`);
  }, [theme, isDarkMode, fontSize, showAedEquivalent, columnWidths, columnLabels, dismissedTips]);

  if (!isAuthenticated) return <SignIn onSignIn={() => { setIsAuthenticated(true); localStorage.setItem('app_auth', 'true'); }} isDarkMode={isDarkMode} onToggleDarkMode={setIsDarkMode} />;

  const activeEntity = entities.find(e => e.id === currentEntityId) || entities[0];

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} isAnyProcessing={isProcessingExcel || isProcessingBanking || isSyncingZoho} 
      isAiOpen={isAiOpen} onToggleAi={() => setIsAiOpen(!isAiOpen)} onOpenSettings={() => setIsSettingsOpen(true)} onSignOut={() => { setIsAuthenticated(false); localStorage.setItem('app_auth', 'false'); }} 
      entities={entities} activeEntity={activeEntity} onSwitchEntity={(id) => { localStorage.setItem('app_active_entity_id', id); window.location.reload(); }}
      onCreateEntity={(n, l) => { const id = generateId(); const next = [...entities, { id, name: n, logo: l, initials: n.substring(0,2).toUpperCase(), color: 'bg-primary' }]; setEntities(next); localStorage.setItem('app_entities', JSON.stringify(next)); }} 
      onUpdateEntity={(id, u) => { const next = entities.map(e => e.id === id ? {...e, ...u} : e); setEntities(next); localStorage.setItem('app_entities', JSON.stringify(next)); }} 
      onDeleteEntity={(id) => { if (entities.length > 1) { const next = entities.filter(e => e.id !== id); setEntities(next); localStorage.setItem('app_entities', JSON.stringify(next)); } }}
      ledgerCount={transactions.length} bankTxCount={bankTransactions.length}
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
          onUndo={handleUndo} onRedo={handleRedo} canUndo={history.length > 0} canRedo={future.length > 0}
          isProcessing={isProcessingExcel} columnWidths={columnWidths} onColumnWidthChange={setColumnWidths} 
          columnLabels={columnLabels} onUpdateColumnLabel={(k, l) => setColumnLabels(p => ({...p, [k]: l}))} 
          showAedEquivalent={showAedEquivalent} bankTransactions={bankTransactions} 
          onReconcile={(tId, bIds, type) => {
            updateLedger(prev => prev.map(t => {
              if (t.id === tId) {
                const updated = { ...t };
                if (type === 'client') { updated.clientStatus = 'Paid'; updated.referenceNumber = bIds.join(', '); }
                else { updated.ladlyStatus = 'Paid'; updated.paymentToLmRef = bIds.join(', '); }
                return updated;
              }
              return t;
            }));
            setBankTransactions(prev => {
              const nextB = prev.map(bt => bIds.includes(bt.id) ? { ...bt, matchedTransactionId: tId } : bt);
              diskSave('bankTransactions', nextB);
              return nextB;
            });
          }} 
          onUnlink={(tId, type) => {
            let matchedRefs = '';
            updateLedger(prev => prev.map(t => {
              if (t.id === tId) {
                const updated = { ...t };
                matchedRefs = (type === 'client' ? t.referenceNumber : t.paymentToLmRef) || '';
                if (type === 'client') { updated.referenceNumber = undefined; updated.clientStatus = 'Pending'; }
                else { updated.paymentToLmRef = undefined; updated.ladlyStatus = 'Pending'; }
                return updated;
              }
              return t;
            }));
            const bIds = matchedRefs.split(', ').filter(Boolean);
            setBankTransactions(prev => {
              const nextB = prev.map(bt => bIds.includes(bt.id) ? { ...bt, matchedTransactionId: undefined } : bt);
              diskSave('bankTransactions', nextB);
              return nextB;
            });
          }} 
        />
      )}
      {activeTab === 'banking' && (
        <BankingComponent 
          bankTransactions={bankTransactions} transactions={transactions} 
          onUpdateBankTransaction={(bt) => { setBankTransactions(prev => { const next = prev.map(i => i.id === bt.id ? bt : i); diskSave('bankTransactions', next); return next; }); }} 
          onUpdateTransaction={handleUpdateTransaction} 
          onClearBankTransactions={() => { setBankTransactions([]); diskSave('bankTransactions', []); }} 
          onAddExpenseFromBank={handleAddExpenseFromBank} onLinkBankToLedger={handleLinkBankToLedger}
          onUnlinkBank={(bankId) => {
             let tId: string | undefined;
             setBankTransactions(prev => {
               const bankTx = prev.find(b => b.id === bankId);
               tId = bankTx?.matchedTransactionId;
               const next = prev.map(b => b.id === bankId ? { ...b, matchedTransactionId: undefined } : b);
               diskSave('bankTransactions', next);
               return next;
             });
             if (tId) {
               const tIds = tId.split(', ').filter(Boolean);
               updateLedger(prev => prev.map(t => {
                 if (tIds.includes(t.id)) {
                   const updated = { ...t };
                   const cleanRef = (str?: string) => { if (!str) return undefined; const ids = str.split(', ').filter(id => id !== bankId); return ids.length > 0 ? ids.join(', ') : undefined; };
                   updated.referenceNumber = cleanRef(updated.referenceNumber);
                   updated.paymentToLmRef = cleanRef(updated.paymentToLmRef);
                   if (!updated.referenceNumber) updated.clientStatus = 'Pending';
                   if (!updated.paymentToLmRef) updated.ladlyStatus = 'Pending';
                   return updated;
                 }
                 return t;
               }));
             }
          }}
          onStatementUpload={handleStatementUpload} 
          isProcessing={isProcessingBanking} progress={bankingProgress} statusMsg={bankingStatus} showAedEquivalent={showAedEquivalent} 
        />
      )}
      {activeTab === 'tax' && <VatCenter transactions={transactions} showAedEquivalent={showAedEquivalent} dismissedTips={dismissedTips} onDismissTip={(id) => setDismissedTips(p => [...p, id])} onOpenAi={() => setIsAiOpen(true)} />}
      {activeTab === 'campaigns' && (
        <CampaignTracker 
          transactions={transactions} campaigns={autoDiscoveredCampaigns} rateCard={parsedRateCardData} 
          onUpdateCampaign={(n, m) => { setCampaignMetadata(prev => { const next: Record<string, Campaign> = { ...prev, [n]: { projectName: n, ...(prev[n] || {}), ...m } as Campaign }; diskSave('campaignMetadata', next); return next; }); }} 
          onMergeCampaigns={(s, t) => { updateLedger(prev => prev.map(tr => s.includes(tr.project) ? {...tr, project: t, mergedFrom: tr.project !== t ? tr.project : tr.mergedFrom} : tr)); }} 
          onAddCampaign={(n) => { setCampaignMetadata(prev => { const next = {...prev, [n]: {projectName: n}}; diskSave('campaignMetadata', next); return next; }); }} 
          onRenameCampaign={(o, n) => { 
            updateLedger(prev => prev.map(t => t.project === o ? {...t, project: n} : t));
            setCampaignMetadata(prev => { const nextM = {...prev}; if (nextM[o]) { nextM[n] = {...nextM[o], projectName: n}; delete nextM[o]; } diskSave('campaignMetadata', nextM); return nextM; });
          }} 
          selectedProjectName={null} setSelectedProjectName={() => {}} showAedEquivalent={showAedEquivalent} 
        />
      )}
      {activeTab === 'crm' && <CRM contacts={contacts} onAddContact={(c) => { setContacts(prev => { const next = [c, ...prev]; diskSave('contacts', next); return next; }); }} onDeleteContact={(id) => { setContacts(prev => { const next = prev.filter(c => c.id !== id); diskSave('contacts', next); return next; }); }} onUpdateStatus={(id, s) => { setContacts(prev => { const next = prev.map(c => c.id === id ? {...c, status: s} : c); diskSave('contacts', next); return next; }); }} dismissedTips={dismissedTips} onDismissTip={(id) => setDismissedTips(p => [...p, id])} />}
      {activeTab === 'resources' && <Resources resources={resources} rateCardData={parsedRateCardData} onUpdateResources={(u) => { setResources(prev => { const next = {...prev, ...u}; diskSave('resources', next); return next; }); }} onUpdateRateCardData={(d) => { setParsedRateCardData(d); diskSave('parsedRateCard', d); }} />}

      <Settings 
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={zohoConfig} onSaveConfig={(c) => { setZohoConfig(c); diskSave('zohoConfig', c); }} onSync={handleZohoSync} isSyncing={isSyncingZoho} 
        onClearData={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = window.location.origin; }} 
        onExport={() => {
          const exportData = { version: STORAGE_VERSION, timestamp: new Date().toISOString(), entityId: currentEntityId, entities, data: { transactions, contacts, campaignMetadata, bankTransactions, resources, parsedRateCardData, chatHistory, zohoConfig }, ui: { theme, isDarkMode, fontSize, showAedEquivalent, columnWidths, columnLabels, dismissedTips } };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `bookeeper_backup_${new Date().toISOString().split('T')[0]}.json`; link.click(); URL.revokeObjectURL(url);
        }} 
        onImport={(file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const backup = JSON.parse(e.target?.result as string);
              if (backup.data) {
                const { data, ui, entities: impEntities } = backup;
                if (data.transactions) setTransactions(data.transactions);
                if (data.bankTransactions) { setBankTransactions(data.bankTransactions); diskSave('bankTransactions', data.bankTransactions); }
                if (data.contacts) { setContacts(data.contacts); diskSave('contacts', data.contacts); }
                if (data.campaignMetadata) { setCampaignMetadata(data.campaignMetadata); diskSave('campaignMetadata', data.campaignMetadata); }
                if (data.resources) { setResources(data.resources); diskSave('resources', data.resources); }
                if (data.parsedRateCardData) { setParsedRateCardData(data.parsedRateCardData); diskSave('parsedRateCard', data.parsedRateCardData); }
                if (data.chatHistory) { setChatHistory(data.chatHistory); diskSave('chatHistory', data.chatHistory); }
                if (data.zohoConfig) { setZohoConfig(data.zohoConfig); diskSave('zohoConfig', data.zohoConfig); }
                if (impEntities) { setEntities(impEntities); localStorage.setItem('app_entities', JSON.stringify(impEntities)); }
                if (ui) { setTheme(ui.theme || 'teal'); setIsDarkMode(!!ui.isDarkMode); setFontSize(ui.fontSize || '14'); setShowAedEquivalent(ui.showAedEquivalent !== false); setColumnWidths(ui.columnWidths || {}); setColumnLabels(ui.columnLabels || {}); setDismissedTips(ui.dismissedTips || []); }
                alert("Global system restore successful.");
              }
            } catch (err) { alert("Import failed: Corrupted or invalid backup file."); }
          };
          reader.readAsText(file);
        }} 
        theme={theme} onSetTheme={setTheme} isDarkMode={isDarkMode} onSetDarkMode={setIsDarkMode} fontSize={fontSize} onSetFontSize={setFontSize} showAedEquivalent={showAedEquivalent} onSetShowAedEquivalent={setShowAedEquivalent} 
      />

      <AIChat 
        isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} transactions={transactions} contacts={contacts} campaigns={autoDiscoveredCampaigns} bankTransactions={bankTransactions} 
        history={chatHistory} onUpdateHistory={(h) => { setChatHistory(h); diskSave('chatHistory', h); }} onNavigateToCampaign={() => { setActiveTab('campaigns'); setIsAiOpen(false); }} 
        onUpdateLedgerStatus={(ids, field, status) => { 
            updateLedger(prev => prev.map(t => ids.includes(t.project) ? {...t, [field]: status} : t));
        }} 
        onReconcile={(pName, bId) => {
           const ledgerItem = transactions.find(t => t.project === pName);
           if (ledgerItem) handleLinkBankToLedger(bId, ledgerItem.id);
        }} 
      />
    </Layout>
  );
};

export default App;