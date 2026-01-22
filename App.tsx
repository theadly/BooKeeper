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
import { RATE_CARD_SERVICES } from './constants';
import { parseBankStatement } from './services/geminiService';
import { fetchZohoInvoices } from './services/zohoService';
import * as XLSX from 'xlsx';
import { CONFIG } from './config';

const generateId = () => crypto.randomUUID();
const DEFAULT_ENTITY: Entity = { id: 'e1', name: 'Laila Mourad', initials: 'LM', color: 'bg-primary' };

// Mock User for Local Mode
const MOCK_USER = {
  uid: 'local-admin',
  displayName: 'Laila Mourad',
  email: 'admin@bookeeper.com',
  photoURL: null
};

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
  
  // UI Preferences
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

  // --- Local Storage Persistence ---
  
  // Load data on mount
  useEffect(() => {
    const load = <T,>(key: string, setter: React.Dispatch<React.SetStateAction<T>>, defaultVal: T) => {
      const saved = localStorage.getItem(`bk_${key}`);
      if (saved) {
        try {
          setter(JSON.parse(saved));
        } catch (e) {
          console.error(`Failed to load ${key}`, e);
          setter(defaultVal);
        }
      } else {
        setter(defaultVal);
      }
    };

    // Simulate auth check delay
    setTimeout(() => {
      const savedUser = localStorage.getItem('bk_user_session');
      if (savedUser) setUser(JSON.parse(savedUser));
      setIsAuthChecking(false);
    }, 500);

    load('entities', setEntities, [DEFAULT_ENTITY]);
    load('transactions', setTransactions, []);
    load('contacts', setContacts, []);
    load('campaignMetadata', setCampaignMetadata, {});
    load('bankTransactions', setBankTransactions, []);
    load('resources', setResources, { mediaKit: null, rateCard: null });
    load('parsedRateCard', setParsedRateCardData, RATE_CARD_SERVICES);
    load('chatHistory', setChatHistory, []);
    load('zohoConfig', setZohoConfig, { accessToken: '', organizationId: '', apiDomain: 'https://www.zohoapis.com' });
  }, []);

  // Save helpers
  const save = (key: string, data: any) => {
    localStorage.setItem(`bk_${key}`, JSON.stringify(data));
  };

  const handleSignIn = () => {
    setUser(MOCK_USER);
    localStorage.setItem('bk_user_session', JSON.stringify(MOCK_USER));
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('bk_user_session');
  };

  // --- Logic Handlers (Updated to use local State + LocalStorage) ---

  const handleAddTransaction = (t: Transaction) => {
    const newData = [...transactions, { ...t, createdAt: new Date().toISOString() }];
    setTransactions(newData);
    save('transactions', newData);
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    const newData = transactions.map(t => t.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : t);
    setTransactions(newData);
    save('transactions', newData);
  };

  const handleDeleteTransaction = (id: string) => {
    const newData = transactions.filter(t => t.id !== id);
    setTransactions(newData);
    save('transactions', newData);
  };

  const handleBulkUpdateTransactions = (ids: string[], updates: Partial<Transaction>) => {
    const newData = transactions.map(t => ids.includes(t.id) ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    setTransactions(newData);
    save('transactions', newData);
  };

  const handleBulkDeleteTransactions = (ids: string[]) => {
    const newData = transactions.filter(t => !ids.includes(t.id));
    setTransactions(newData);
    save('transactions', newData);
  };

  const handleAddContact = (c: Contact) => {
    const newData = [...contacts, { ...c, createdAt: new Date().toISOString() }];
    setContacts(newData);
    save('contacts', newData);
  };

  const handleUpdateContactStatus = (id: string, status: any) => {
    const newData = contacts.map(c => c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c);
    setContacts(newData);
    save('contacts', newData);
  };

  const handleDeleteContact = (id: string) => {
    const newData = contacts.filter(c => c.id !== id);
    setContacts(newData);
    save('contacts', newData);
  };

  const processExcelFile = async (file: File) => {
    setIsProcessingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const newTransactions: Transaction[] = jsonData.map((row) => {
        const id = generateId();
        const amount = Number(row.Amount || row.Total || 0);
        const net = amount / (1 + CONFIG.VAT_RATE);
        const vat = amount - net;
        const fee = net * CONFIG.ADLY_FEE_RATE;
        const payable = net - fee;

        return {
          id,
          year: Number(row.Year) || new Date().getFullYear(),
          date: row.Date || new Date().toISOString().split('T')[0],
          project: row.Project || row.Description || 'Imported Project',
          description: row.Description || 'Imported from Excel',
          amount,
          currency: (row.Currency === 'USD' ? 'USD' : 'AED'),
          vat: Number(vat.toFixed(2)),
          net: Number(net.toFixed(2)),
          fee: Number(fee.toFixed(2)),
          payable: Number(payable.toFixed(2)),
          category: row.Category || Category.OTHER,
          type: (row.Type === 'Expense' ? TransactionType.EXPENSE : TransactionType.INCOME),
          clientStatus: (row.Status || 'Pending') as StatusOption,
          ladlyStatus: (row.Status || 'Pending') as StatusOption,
          invoiceNumber: row.InvoiceNumber || row['Invoice #'] || '',
          customerName: row.Customer || row.Client || '',
          createdAt: new Date().toISOString()
        };
      });

      const updated = [...transactions, ...newTransactions];
      setTransactions(updated);
      save('transactions', updated);
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
      const newData = [...bankTransactions, ...allExtracted.map(b => ({ ...b, createdAt: new Date().toISOString() }))];
      setBankTransactions(newData);
      save('bankTransactions', newData);
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
    const updatedLedger = [...transactions, newExpense];
    setTransactions(updatedLedger);
    save('transactions', updatedLedger);

    // Update Bank
    const updatedBank = bankTransactions.map(b => b.id === bankTx.id ? { ...b, matchedTransactionId: expenseId, category } : b);
    setBankTransactions(updatedBank);
    save('bankTransactions', updatedBank);
  }, [transactions, bankTransactions]);

  const handleLinkBankToLedger = useCallback((bankId: string, ledgerIds: string[]) => {
    const bankItem = bankTransactions.find(b => b.id === bankId);
    if (!bankItem) return;
    
    const type = bankItem.type === 'credit' ? 'client' : 'laila';
    
    // Update Bank
    const updatedBank = bankTransactions.map(b => b.id === bankId ? { ...b, matchedTransactionId: ledgerIds.join(', ') } : b);
    setBankTransactions(updatedBank);
    save('bankTransactions', updatedBank);
    
    // Update Ledger
    const updatedLedger = transactions.map(t => {
      if (ledgerIds.includes(t.id)) {
        const updates: any = {};
        if (type === 'client') {
            updates.clientStatus = 'Paid';
            updates.referenceNumber = bankId;
        } else {
            updates.ladlyStatus = 'Paid';
            updates.paymentToLmRef = bankId;
        }
        return { ...t, ...updates };
      }
      return t;
    });
    setTransactions(updatedLedger);
    save('transactions', updatedLedger);
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

  // Effects for UI Preferences
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
  if (!user) return <SignIn onSignIn={handleSignIn} isDarkMode={isDarkMode} onToggleDarkMode={setIsDarkMode} />;

  const activeEntity = entities.find(e => e.id === currentEntityId) || entities[0];

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} isAnyProcessing={isProcessingExcel || isProcessingBanking || isSyncingZoho} 
      isAiOpen={isAiOpen} onToggleAi={() => setIsAiOpen(!isAiOpen)} onOpenSettings={() => setIsSettingsOpen(true)} onSignOut={handleSignOut} 
      entities={entities} activeEntity={activeEntity} onSwitchEntity={(id) => setCurrentEntityId(id)}
      onCreateEntity={(n, l) => { 
        const id = generateId(); 
        const next = [...entities, { id, name: n, logo: l, initials: n.substring(0,2).toUpperCase(), color: 'bg-primary' }]; 
        setEntities(next); 
        save('entities', next); 
      }} 
      onUpdateEntity={(id, u) => { 
        const next = entities.map(e => e.id === id ? {...e, ...u} : e); 
        setEntities(next); 
        save('entities', next); 
      }} 
      onDeleteEntity={(id) => { 
        if (entities.length > 1) { 
          const next = entities.filter(e => e.id !== id); 
          setEntities(next); 
          save('entities', next); 
        } 
      }}
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
            const newData = bankTransactions.map(b => b.id === bt.id ? bt : b);
            setBankTransactions(newData);
            save('bankTransactions', newData);
          }} 
          onUpdateTransaction={handleUpdateTransaction} 
          onClearBankTransactions={() => {
              setBankTransactions([]);
              save('bankTransactions', []);
          }} 
          onAddExpenseFromBank={handleAddExpenseFromBank} onLinkBankToLedger={handleLinkBankToLedger}
          onUnlinkBank={(bankId) => {
             const newData = bankTransactions.map(b => b.id === bankId ? { ...b, matchedTransactionId: undefined } : b);
             setBankTransactions(newData);
             save('bankTransactions', newData);
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
            const next = {...campaignMetadata, [n]: {...(campaignMetadata[n] || {}), ...m, projectName: n}}; 
            setCampaignMetadata(next); 
            save('campaignMetadata', next); 
          }} 
          onMergeCampaigns={(sources, target) => {
            const sourcesWithoutTarget = sources.filter(s => s !== target);
            const existingMetadata = campaignMetadata[target] || { projectName: target, files: [], deliverables: [], mergedSources: [] };
            const newMergedSources = Array.from(new Set([...(existingMetadata.mergedSources || []), ...sourcesWithoutTarget]));
            const next = { ...campaignMetadata, [target]: { ...existingMetadata, mergedSources: newMergedSources } };
            setCampaignMetadata(next);
            save('campaignMetadata', next);
          }} 
          onAddCampaign={(n) => { 
            const next = {...campaignMetadata, [n]: {projectName: n}}; 
            setCampaignMetadata(next); 
            save('campaignMetadata', next); 
          }} 
          onRenameCampaign={(oldN, newN) => {
            const updatedTransactions = transactions.map(t => t.project === oldN ? { ...t, project: newN } : t);
            setTransactions(updatedTransactions);
            save('transactions', updatedTransactions);
            
            const next = {...campaignMetadata}; 
            if (next[oldN]) { next[newN] = {...next[oldN], projectName: newN}; delete next[oldN]; }
            setCampaignMetadata(next); 
            save('campaignMetadata', next);
          }}
          selectedProjectName={null} setSelectedProjectName={() => {}} showAedEquivalent={showAedEquivalent} 
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
            save('resources', next); 
          }} 
          onUpdateRateCardData={(d) => { 
            setParsedRateCardData(d); 
            save('parsedRateCard', d); 
          }} 
        />
      )}

      <Settings 
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={zohoConfig} 
        onSaveConfig={(c) => { setZohoConfig(c); save('zohoConfig', c); }} 
        onSync={async () => {
            setIsSyncingZoho(true);
            try {
                const invoices = await fetchZohoInvoices(zohoConfig);
                const combined = [...transactions];
                invoices.forEach(inv => {
                    const idx = combined.findIndex(t => t.id === inv.id);
                    if (idx >= 0) combined[idx] = inv;
                    else combined.push(inv);
                });
                setTransactions(combined);
                save('transactions', combined);
                
                const nextConfig = { ...zohoConfig, lastSync: new Date().toLocaleString() };
                setZohoConfig(nextConfig); 
                save('zohoConfig', nextConfig);
            } finally { setIsSyncingZoho(false); }
        }} 
        isSyncing={isSyncingZoho} 
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
                    if(data.transactions) { setTransactions(data.transactions); save('transactions', data.transactions); }
                    if(data.contacts) { setContacts(data.contacts); save('contacts', data.contacts); }
                    if(data.campaignMetadata) { setCampaignMetadata(data.campaignMetadata); save('campaignMetadata', data.campaignMetadata); }
                    if(data.bankTransactions) { setBankTransactions(data.bankTransactions); save('bankTransactions', data.bankTransactions); }
                    if(data.resources) { setResources(data.resources); save('resources', data.resources); }
                    alert("Backup restored successfully.");
                } catch(err) { alert("Invalid backup file."); }
            };
            reader.readAsText(file);
        }} 
        theme={theme} onSetTheme={setTheme} isDarkMode={isDarkMode} onSetDarkMode={setIsDarkMode} fontSize={fontSize} onSetFontSize={setFontSize} showAedEquivalent={showAedEquivalent} onSetShowAedEquivalent={setShowAedEquivalent} 
      />

      <AIChat 
        isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} transactions={transactions} contacts={contacts} campaigns={autoDiscoveredCampaigns} bankTransactions={bankTransactions} 
        history={chatHistory} onUpdateHistory={(h) => { setChatHistory(h); save('chatHistory', h); }} onNavigateToCampaign={() => { setActiveTab('campaigns'); setIsAiOpen(false); }} 
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