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
import { INITIAL_TRANSACTIONS, RATE_CARD_SERVICES } from './constants';
import { parseBankStatement } from './services/geminiService';
import { fetchZohoInvoices } from './services/zohoService';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  doc, onSnapshot, setDoc, collection, 
  query, deleteDoc, writeBatch, updateDoc
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { CONFIG } from './config';

const generateId = () => crypto.randomUUID();
const DEFAULT_ENTITY: Entity = { id: 'e1', name: 'Laila Mourad', initials: 'LM', color: 'bg-primary' };

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [entities, setEntities] = useState<Entity[]>([DEFAULT_ENTITY]);
  const [currentEntityId, setCurrentEntityId] = useState('e1');

  // --- Core Data State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<Transaction[][]>([]);
  const [future, setFuture] = useState<Transaction[][]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaignMetadata, setCampaignMetadata] = useState<Record<string, Campaign>>({});
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [resources, setResources] = useState<{ mediaKit: any; rateCard: any }>({ mediaKit: null, rateCard: null });
  const [parsedRateCardData, setParsedRateCardData] = useState<ParsedRateItem[]>(RATE_CARD_SERVICES);
  const [chatHistory, setChatHistory] = useState<AIChatMessage[]>([]);
  const [zohoConfig, setZohoConfig] = useState<ZohoConfig>({ accessToken: '', organizationId: '', apiDomain: 'https://www.zohoapis.com' });
  
  // UI Preferences (Persisted locally as they are per-device)
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

  // Authentication Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthChecking(false);
    });
  }, []);

  // Firestore Real-time Listeners
  useEffect(() => {
    if (!user) return;

    // Requested Paths
    const metadataRef = doc(db, `users/${user.uid}/metadata/global`);
    const transactionsRef = collection(db, `users/${user.uid}/ledger`);
    const contactsRef = collection(db, `users/${user.uid}/contacts`);
    const bankRef = collection(db, `users/${user.uid}/bankTransactions`);

    const unsubMetadata = onSnapshot(metadataRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.zohoConfig) setZohoConfig(data.zohoConfig);
        if (data.resources) setResources(data.resources);
        if (data.parsedRateCard) setParsedRateCardData(data.parsedRateCard);
        if (data.chatHistory) setChatHistory(data.chatHistory);
        if (data.campaignMetadata) setCampaignMetadata(data.campaignMetadata);
        if (data.entities) setEntities(data.entities);
      }
    });

    const unsubTransactions = onSnapshot(query(transactionsRef), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
      setTransactions(docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    const unsubContacts = onSnapshot(query(contactsRef), (snapshot) => {
      setContacts(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Contact)));
    });

    const unsubBank = onSnapshot(query(bankRef), (snapshot) => {
      setBankTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as BankTransaction)));
    });

    return () => {
      unsubMetadata();
      unsubTransactions();
      unsubContacts();
      unsubBank();
    };
  }, [user]);

  // Persistence Helpers
  const saveMetadata = useCallback(async (updates: any) => {
    if (!user) return;
    await setDoc(doc(db, `users/${user.uid}/metadata/global`), updates, { merge: true });
  }, [user]);

  const handleAddTransaction = async (t: Transaction) => {
    if (!user) return;
    setHistory(prev => [transactions, ...prev].slice(0, 50));
    setFuture([]);
    await setDoc(doc(db, `users/${user.uid}/ledger/${t.id}`), t);
  };

  const handleUpdateTransaction = async (updated: Transaction) => {
    if (!user) return;
    await setDoc(doc(db, `users/${user.uid}/ledger/${updated.id}`), updated);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    setHistory(prev => [transactions, ...prev].slice(0, 50));
    setFuture([]);
    await deleteDoc(doc(db, `users/${user.uid}/ledger/${id}`));
  };

  const handleBulkDeleteTransactions = async (ids: string[]) => {
    if (!user) return;
    setHistory(prev => [transactions, ...prev].slice(0, 50));
    setFuture([]);
    const batch = writeBatch(db);
    ids.forEach(id => batch.delete(doc(db, `users/${user.uid}/ledger/${id}`)));
    await batch.commit();
  };

  const handleBulkUpdateTransactions = async (ids: string[], updates: Partial<Transaction>) => {
    if (!user) return;
    const batch = writeBatch(db);
    ids.forEach(id => batch.update(doc(db, `users/${user.uid}/ledger/${id}`), updates));
    await batch.commit();
  };

  const handleUndo = useCallback(async () => {
    if (history.length === 0 || !user) return;
    const previousSnapshot = history[0];
    const currentSnapshot = [...transactions];
    
    setFuture(f => [currentSnapshot, ...f]);
    
    const batch = writeBatch(db);
    // Remove currently existing transactions not in previous snapshot
    currentSnapshot.forEach(t => {
      if (!previousSnapshot.find(p => p.id === t.id)) {
        batch.delete(doc(db, `users/${user.uid}/ledger/${t.id}`));
      }
    });
    // Restore or update from previous snapshot
    previousSnapshot.forEach(t => {
      batch.set(doc(db, `users/${user.uid}/ledger/${t.id}`), t);
    });
    
    await batch.commit();
    setHistory(h => h.slice(1));
  }, [history, transactions, user]);

  const handleRedo = useCallback(async () => {
    if (future.length === 0 || !user) return;
    const nextSnapshot = future[0];
    const currentSnapshot = [...transactions];

    setHistory(h => [currentSnapshot, ...h]);

    const batch = writeBatch(db);
    // Remove currently existing transactions not in next snapshot
    currentSnapshot.forEach(t => {
      if (!nextSnapshot.find(n => n.id === t.id)) {
        batch.delete(doc(db, `users/${user.uid}/ledger/${t.id}`));
      }
    });
    // Restore or update from next snapshot
    nextSnapshot.forEach(t => {
      batch.set(doc(db, `users/${user.uid}/ledger/${t.id}`), t);
    });
    
    await batch.commit();
    setFuture(f => f.slice(1));
  }, [future, transactions, user]);

  const processExcelFile = async (file: File) => {
    if (!user) return;
    setIsProcessingExcel(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
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

        const batch = writeBatch(db);
        dataRows.forEach(r => {
            if (!(idx.project >= 0 && r[idx.project]) && !(idx.amount >= 0 && r[idx.amount])) return;
            
            const id = generateId();
            const rawAmount = r[idx.amount];
            const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount || '0').replace(/[^0-9.-]+/g,"")) || 0;
            const net = amount / (1 + CONFIG.VAT_RATE);
            const vat = amount - net;
            const adlyFee = net * CONFIG.ADLY_FEE_RATE;
            const payableLm = net - adlyFee;
            const transferToLm = payableLm * (1 + CONFIG.VAT_RATE);
            const rawDate = r[idx.date];
            const dateStr = rawDate instanceof Date ? rawDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const yearVal = idx.year >= 0 && r[idx.year] ? parseInt(String(r[idx.year])) : new Date(dateStr).getFullYear();

            const item: Transaction = {
              id, year: isNaN(yearVal) ? new Date().getFullYear() : yearVal, date: dateStr,
              project: String(r[idx.project] || r[idx.client] || 'New Campaign'), customerName: String(r[idx.client] || ''),
              invoiceNumber: idx.inv >= 0 ? String(r[idx.inv] || '') : undefined, amount: Number(amount.toFixed(2)),
              vat: Number(vat.toFixed(2)), net: Number(net.toFixed(2)), fee: Number(adlyFee.toFixed(2)),
              payable: Number(payableLm.toFixed(2)), clientPayment: Number(transferToLm.toFixed(2)),
              type: TransactionType.INCOME, currency: 'AED', category: Category.FREELANCE,
              clientStatus: mapStatus(idx.cStatus >= 0 ? r[idx.cStatus] : 'Pending'),
              ladlyStatus: mapStatus(idx.lStatus >= 0 ? r[idx.lStatus] : 'Pending'),
              description: 'Imported via Excel'
            };
            batch.set(doc(db, `users/${user.uid}/ledger/${id}`), item);
        });
        
        await batch.commit();
      } catch (err) { console.error("Excel Parsing Error:", err); } finally { setIsProcessingExcel(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleStatementUpload = async (files: File[]) => {
    if (!user) return;
    setIsProcessingBanking(true);
    setBankingProgress(0);
    setBankingStatus('Analyzing Statements...');
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
        const batch = writeBatch(db);
        extracted.forEach(bt => {
            batch.set(doc(db, `users/${user.uid}/bankTransactions/${bt.id}`), bt);
        });
        await batch.commit();
        setBankingProgress(Math.round(((i + 1) / files.length) * 100));
      }
    } catch (err) { setBankingStatus('Import error.'); } finally { setTimeout(() => { setIsProcessingBanking(false); setBankingStatus(''); }, 2000); }
  };

  const handleAddExpenseFromBank = useCallback(async (bankTx: BankTransaction, category: Category) => {
    if (!user) return;
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
        paymentToLmRef: bankTx.id
    };
    const batch = writeBatch(db);
    batch.set(doc(db, `users/${user.uid}/ledger/${expenseId}`), newExpense);
    batch.update(doc(db, `users/${user.uid}/bankTransactions/${bankTx.id}`), { matchedTransactionId: expenseId, category });
    await batch.commit();
  }, [user]);

  const handleLinkBankToLedger = useCallback(async (bankId: string, ledgerIds: string[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    const bankItem = bankTransactions.find(b => b.id === bankId);
    if (!bankItem) return;
    
    const type = bankItem.type === 'credit' ? 'client' : 'laila';
    batch.update(doc(db, `users/${user.uid}/bankTransactions/${bankId}`), { matchedTransactionId: ledgerIds.join(', ') });
    
    ledgerIds.forEach(id => {
        const tx = transactions.find(t => t.id === id);
        if (tx) {
            const updates: any = {};
            if (type === 'client') {
                updates.clientStatus = 'Paid';
                updates.referenceNumber = bankId;
            } else {
                updates.ladlyStatus = 'Paid';
                updates.paymentToLmRef = bankId;
            }
            batch.update(doc(db, `users/${user.uid}/ledger/${id}`), updates);
        }
    });
    await batch.commit();
  }, [user, bankTransactions, transactions]);

  const autoDiscoveredCampaigns = useMemo(() => {
    const list: Record<string, Campaign> = { ...campaignMetadata };
    transactions.forEach(t => {
      if (t.project && !list[t.project]) {
        list[t.project] = { projectName: t.project, files: [], deliverables: [] };
      }
    });
    return Object.values(list);
  }, [transactions, campaignMetadata]);

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

  if (isAuthChecking) return <div className="h-screen flex items-center justify-center bg-bg-page"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div></div>;
  if (!user) return <SignIn onSignIn={() => {}} isDarkMode={isDarkMode} onToggleDarkMode={setIsDarkMode} />;

  const activeEntity = entities.find(e => e.id === currentEntityId) || entities[0];

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} isAnyProcessing={isProcessingExcel || isProcessingBanking || isSyncingZoho} 
      isAiOpen={isAiOpen} onToggleAi={() => setIsAiOpen(!isAiOpen)} onOpenSettings={() => setIsSettingsOpen(true)} onSignOut={() => signOut(auth)} 
      entities={entities} activeEntity={activeEntity} onSwitchEntity={(id) => setCurrentEntityId(id)}
      onCreateEntity={(n, l) => { const id = generateId(); const next = [...entities, { id, name: n, logo: l, initials: n.substring(0,2).toUpperCase(), color: 'bg-primary' }]; setEntities(next); saveMetadata({ entities: next }); }} 
      onUpdateEntity={(id, u) => { const next = entities.map(e => e.id === id ? {...e, ...u} : e); setEntities(next); saveMetadata({ entities: next }); }} 
      onDeleteEntity={(id) => { if (entities.length > 1) { const next = entities.filter(e => e.id !== id); setEntities(next); saveMetadata({ entities: next }); } }}
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
          onReconcile={(tId, bIds, type) => handleLinkBankToLedger(bIds[0], [tId])} 
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
          onUpdateBankTransaction={(bt) => setDoc(doc(db, `users/${user.uid}/bankTransactions/${bt.id}`), bt)} 
          onUpdateTransaction={handleUpdateTransaction} 
          onClearBankTransactions={async () => {
              const batch = writeBatch(db);
              bankTransactions.forEach(bt => batch.delete(doc(db, `users/${user.uid}/bankTransactions/${bt.id}`)));
              await batch.commit();
          }} 
          onAddExpenseFromBank={handleAddExpenseFromBank} onLinkBankToLedger={handleLinkBankToLedger}
          onUnlinkBank={async (bankId) => {
             const bt = bankTransactions.find(b => b.id === bankId);
             if (bt) await updateDoc(doc(db, `users/${user.uid}/bankTransactions/${bt.id}`), { matchedTransactionId: null });
          }}
          onStatementUpload={handleStatementUpload} 
          isProcessing={isProcessingBanking} progress={bankingProgress} statusMsg={bankingStatus} showAedEquivalent={showAedEquivalent} 
        />
      )}
      {activeTab === 'tax' && <VatCenter transactions={transactions} showAedEquivalent={showAedEquivalent} dismissedTips={dismissedTips} onDismissTip={(id) => setDismissedTips(p => [...p, id])} onOpenAi={() => setIsAiOpen(true)} />}
      {activeTab === 'campaigns' && (
        <CampaignTracker 
          transactions={transactions} campaigns={autoDiscoveredCampaigns} rateCard={parsedRateCardData} 
          onUpdateCampaign={(n, m) => { const next = {...campaignMetadata, [n]: {...(campaignMetadata[n] || {}), ...m, projectName: n}}; setCampaignMetadata(next); saveMetadata({ campaignMetadata: next }); }} 
          onMergeCampaigns={async (sources, target) => {
            const batch = writeBatch(db);
            transactions.forEach(t => {
                if (sources.includes(t.project)) {
                    batch.update(doc(db, `users/${user.uid}/ledger/${t.id}`), { project: target, mergedFrom: t.project });
                }
            });
            await batch.commit();
          }} 
          onAddCampaign={(n) => { const next = {...campaignMetadata, [n]: {projectName: n}}; setCampaignMetadata(next); saveMetadata({ campaignMetadata: next }); }} 
          onRenameCampaign={async (oldN, newN) => {
            const batch = writeBatch(db);
            transactions.forEach(t => { if (t.project === oldN) batch.update(doc(db, `users/${user.uid}/ledger/${t.id}`), { project: newN }); });
            await batch.commit();
            const next = {...campaignMetadata}; if (next[oldN]) { next[newN] = {...next[oldN], projectName: newN}; delete next[oldN]; }
            setCampaignMetadata(next); saveMetadata({ campaignMetadata: next });
          }}
          selectedProjectName={null} setSelectedProjectName={() => {}} showAedEquivalent={showAedEquivalent} 
        />
      )}
      {activeTab === 'crm' && (
        <CRM 
          contacts={contacts} 
          onAddContact={(c) => setDoc(doc(db, `users/${user.uid}/contacts/${c.id}`), c)} 
          onDeleteContact={(id) => deleteDoc(doc(db, `users/${user.uid}/contacts/${id}`))} 
          onUpdateStatus={(id, s) => updateDoc(doc(db, `users/${user.uid}/contacts/${id}`), { status: s })} 
          dismissedTips={dismissedTips} onDismissTip={(id) => setDismissedTips(p => [...p, id])} 
        />
      )}
      {activeTab === 'resources' && (
        <Resources 
          resources={resources} rateCardData={parsedRateCardData} 
          onUpdateResources={(u) => { const next = {...resources, ...u}; setResources(next); saveMetadata({ resources: next }); }} 
          onUpdateRateCardData={(d) => { setParsedRateCardData(d); saveMetadata({ parsedRateCard: d }); }} 
        />
      )}

      <Settings 
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={zohoConfig} 
        onSaveConfig={(c) => { setZohoConfig(c); saveMetadata({ zohoConfig: c }); }} 
        onSync={async () => {
            setIsSyncingZoho(true);
            try {
                const invoices = await fetchZohoInvoices(zohoConfig);
                const batch = writeBatch(db);
                invoices.forEach(inv => batch.set(doc(db, `users/${user.uid}/ledger/${inv.id}`), inv));
                await batch.commit();
                const nextConfig = { ...zohoConfig, lastSync: new Date().toLocaleString() };
                setZohoConfig(nextConfig); saveMetadata({ zohoConfig: nextConfig });
            } finally { setIsSyncingZoho(false); }
        }} 
        isSyncing={isSyncingZoho} 
        onClearData={async () => {
            const batch = writeBatch(db);
            transactions.forEach(t => batch.delete(doc(db, `users/${user.uid}/ledger/${t.id}`)));
            await batch.commit();
        }} 
        onExport={() => {}} onImport={(file) => {}} 
        theme={theme} onSetTheme={setTheme} isDarkMode={isDarkMode} onSetDarkMode={setIsDarkMode} fontSize={fontSize} onSetFontSize={setFontSize} showAedEquivalent={showAedEquivalent} onSetShowAedEquivalent={setShowAedEquivalent} 
      />

      <AIChat 
        isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} transactions={transactions} contacts={contacts} campaigns={autoDiscoveredCampaigns} bankTransactions={bankTransactions} 
        history={chatHistory} onUpdateHistory={(h) => { setChatHistory(h); saveMetadata({ chatHistory: h }); }} onNavigateToCampaign={() => { setActiveTab('campaigns'); setIsAiOpen(false); }} 
        onUpdateLedgerStatus={(ids, field, status) => handleBulkUpdateTransactions(ids, { [field]: status })} 
        onReconcile={(pName, bId) => handleLinkBankToLedger(bId, [transactions.find(t => t.project === pName)?.id || ''])} 
      />
    </Layout>
  );
};

export default App;