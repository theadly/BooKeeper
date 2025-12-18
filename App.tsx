
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
  TransactionType, Category, AIChatMessage, 
  ZohoConfig, HistoryAction, AppStateSnapshot, LeadStatus, ResourceFile, Entity, ParsedRateItem
} from './types';
import { INITIAL_TRANSACTIONS, INITIAL_CONTACTS, RATE_CARD_SERVICES } from './constants';
import { parseBankStatement, parseRateCard } from './services/geminiService';
import * as XLSX from 'xlsx';
import { Undo2, X } from 'lucide-react';
import { CONFIG } from './config';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

const DEFAULT_COLUMN_WIDTHS = {
  year: 60, project: 180, client: 150, inv: 80, cStatus: 110, lStatus: 110, invAmt: 90, vat: 70, net: 90, fee: 80, payable: 100, paid: 90
};

const DEFAULT_COLUMN_LABELS = {
  year: 'YEAR',
  project: 'PROJECT',
  client: 'CLIENT',
  inv: 'INV #',
  cStatus: 'CLIENT STATUS',
  lStatus: 'LADLY STATUS',
  invAmt: 'INVOICE AMT',
  vat: 'VAT (5%)',
  net: 'NET',
  fee: 'ADLY FEE',
  payable: 'PAYABLE LM',
  paid: 'PAID AMT'
};

const ENTITY_COLORS = [
  'bg-teal-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 
  'bg-violet-500', 'bg-blue-500', 'bg-pink-500'
];

const DEFAULT_ENTITY: Entity = {
  id: 'e1',
  name: 'Laila Mourad',
  initials: 'LM',
  color: 'bg-primary'
};

const App: React.FC = () => {
  const safeParse = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      return JSON.parse(saved) as T;
    } catch (error) {
      console.error(`Local storage parse error for key "${key}":`, error);
      return fallback;
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('app_auth') === 'true');

  // Entity Management
  const [entities, setEntities] = useState<Entity[]>(() => safeParse('app_entities', [DEFAULT_ENTITY]));
  const [currentEntityId, setCurrentEntityId] = useState(() => localStorage.getItem('app_active_entity_id') || 'e1');
  const activeEntity = useMemo(() => entities.find(e => e.id === currentEntityId) || entities[0], [entities, currentEntityId]);

  // Data Keys Prefixed by Entity
  const getEntityKey = (base: string) => `entity_${currentEntityId}_${base}`;

  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCampaignProject, setSelectedCampaignProject] = useState<string | null>(null);
  
  // Scoped Entity Data
  const [transactions, setTransactions] = useState<Transaction[]>(() => safeParse(getEntityKey('transactions'), INITIAL_TRANSACTIONS));
  const [contacts, setContacts] = useState<Contact[]>(() => safeParse(getEntityKey('contacts'), INITIAL_CONTACTS));
  const [campaignMetadata, setCampaignMetadata] = useState<Record<string, Campaign>>(() => safeParse(getEntityKey('campaignMetadata'), {}));
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => safeParse(getEntityKey('bankTransactions'), []));
  const [resources, setResources] = useState<{ mediaKit: ResourceFile | null; rateCard: ResourceFile | null }>(() => safeParse(getEntityKey('resources'), { mediaKit: null, rateCard: null }));
  const [parsedRateCardData, setParsedRateCardData] = useState<ParsedRateItem[]>(() => safeParse(getEntityKey('parsedRateCard'), RATE_CARD_SERVICES));
  const [chatHistory, setChatHistory] = useState<AIChatMessage[]>(() => safeParse(getEntityKey('chatHistory'), []));
  const [zohoConfig, setZohoConfig] = useState<ZohoConfig>(() => safeParse(getEntityKey('zohoConfig'), { accessToken: '', organizationId: '', apiDomain: 'https://www.zohoapis.com' }));
  
  // App-wide Preferences (Not scoped to entity)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => safeParse('columnWidths', DEFAULT_COLUMN_WIDTHS));
  const [columnLabels, setColumnLabels] = useState<Record<string, string>>(() => safeParse('columnLabels', DEFAULT_COLUMN_LABELS));
  const [dismissedTips, setDismissedTips] = useState<string[]>(() => safeParse('dismissedTips', []));
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'teal');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app-dark-mode') === 'true');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('app-font-size') || '14');
  const [showAedEquivalent, setShowAedEquivalent] = useState(() => localStorage.getItem('app-show-aed-equiv') === 'true');

  const [isProcessingBank, setIsProcessingBank] = useState(false);
  const [bankProgress, setBankProgress] = useState(0);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [isParsingRateCard, setIsParsingRateCard] = useState(false);

  const [historyStack, setHistoryStack] = useState<HistoryAction[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Sync Persistence
  useEffect(() => { localStorage.setItem(getEntityKey('transactions'), JSON.stringify(transactions)); }, [transactions, currentEntityId]);
  useEffect(() => { localStorage.setItem(getEntityKey('contacts'), JSON.stringify(contacts)); }, [contacts, currentEntityId]);
  useEffect(() => { localStorage.setItem(getEntityKey('campaignMetadata'), JSON.stringify(campaignMetadata)); }, [campaignMetadata, currentEntityId]);
  useEffect(() => { localStorage.setItem(getEntityKey('bankTransactions'), JSON.stringify(bankTransactions)); }, [bankTransactions, currentEntityId]);
  useEffect(() => { localStorage.setItem(getEntityKey('resources'), JSON.stringify(resources)); }, [resources, currentEntityId]);
  useEffect(() => { localStorage.setItem(getEntityKey('parsedRateCard'), JSON.stringify(parsedRateCardData)); }, [parsedRateCardData, currentEntityId]);
  useEffect(() => { localStorage.setItem(getEntityKey('chatHistory'), JSON.stringify(chatHistory)); }, [chatHistory, currentEntityId]);
  useEffect(() => { localStorage.setItem(getEntityKey('zohoConfig'), JSON.stringify(zohoConfig)); }, [zohoConfig, currentEntityId]);
  
  useEffect(() => { 
    localStorage.setItem('app_entities', JSON.stringify(entities));
    localStorage.setItem('app_active_entity_id', currentEntityId);
    localStorage.setItem('columnLabels', JSON.stringify(columnLabels));
  }, [entities, currentEntityId, columnLabels]);

  useEffect(() => {
    localStorage.setItem('app_auth', isAuthenticated.toString());
  }, [isAuthenticated]);

  // Handle Switch Entity
  const handleSwitchEntity = (id: string) => {
    setCurrentEntityId(id);
    // Reload state from new entity namespace
    setTransactions(safeParse(`entity_${id}_transactions`, INITIAL_TRANSACTIONS));
    setContacts(safeParse(`entity_${id}_contacts`, INITIAL_CONTACTS));
    setCampaignMetadata(safeParse(`entity_${id}_campaignMetadata`, {}));
    setBankTransactions(safeParse(`entity_${id}_bankTransactions`, []));
    setResources(safeParse(`entity_${id}_resources`, { mediaKit: null, rateCard: null }));
    setParsedRateCardData(safeParse(`entity_${id}_parsedRateCard`, RATE_CARD_SERVICES));
    setChatHistory(safeParse(`entity_${id}_chatHistory`, []));
    setZohoConfig(safeParse(`entity_${id}_zohoConfig`, { accessToken: '', organizationId: '', apiDomain: 'https://www.zohoapis.com' }));
    
    // Reset view specific state
    setSelectedCampaignProject(null);
    setHistoryStack([]);
    setShowUndoToast(false);
  };

  const handleCreateEntity = (name: string, logo?: string) => {
    const id = generateId();
    const initials = name.split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase();
    const color = ENTITY_COLORS[entities.length % ENTITY_COLORS.length];
    
    const newEntity: Entity = { id, name, initials, color, logo };
    setEntities(prev => [...prev, newEntity]);
    handleSwitchEntity(id);
  };

  const handleUpdateEntity = (id: string, updates: Partial<Entity>) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleDeleteEntity = (id: string) => {
    if (entities.length <= 1) {
      alert("System safety: At least one corporate profile must remain active.");
      return;
    }
    if (confirm("Archiving this profile will hide its history but retain local storage keys. Proceed?")) {
      const remaining = entities.filter(e => e.id !== id);
      setEntities(remaining);
      if (currentEntityId === id) {
        handleSwitchEntity(remaining[0].id);
      }
    }
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
  };

  useEffect(() => {
    document.documentElement.className = `theme-${theme} ${isDarkMode ? 'dark' : ''}`;
    document.documentElement.style.setProperty('--root-font-size', `${fontSize}px`);
    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-dark-mode', isDarkMode.toString());
    localStorage.setItem('app-font-size', fontSize);
    localStorage.setItem('app-show-aed-equiv', showAedEquivalent.toString());
  }, [theme, isDarkMode, fontSize, showAedEquivalent]);

  const recordHistory = useCallback((description: string) => {
    const snapshot: AppStateSnapshot = {
      transactions: [...transactions],
      contacts: [...contacts],
      campaignMetadata: { ...campaignMetadata },
      bankTransactions: [...bankTransactions],
      resources: { ...resources }
    };
    const newAction: HistoryAction = {
      id: generateId(),
      description,
      timestamp: Date.now(),
      snapshot
    };
    setHistoryStack(prev => [newAction, ...prev].slice(0, 20));
    setShowUndoToast(true);
    const timer = setTimeout(() => setShowUndoToast(false), 10000);
    return () => clearTimeout(timer);
  }, [transactions, contacts, campaignMetadata, bankTransactions, resources]);

  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    const [lastAction, ...remainingStack] = historyStack;
    const { snapshot } = lastAction;
    setTransactions(snapshot.transactions);
    setContacts(snapshot.contacts);
    setCampaignMetadata(snapshot.campaignMetadata);
    setBankTransactions(snapshot.bankTransactions);
    setResources(snapshot.resources);
    setHistoryStack(remainingStack);
    if (remainingStack.length === 0) setShowUndoToast(false);
  }, [historyStack]);

  const handleUpdateResources = async (updates: Partial<{ mediaKit: ResourceFile | null; rateCard: ResourceFile | null }>) => {
    recordHistory(`Updated resources`);
    setResources(prev => ({ ...prev, ...updates }));

    if (updates.rateCard) {
      setIsParsingRateCard(true);
      try {
        const parsed = await parseRateCard(updates.rateCard.base64, updates.rateCard.type);
        if (parsed.length > 0) {
          setParsedRateCardData(parsed);
        }
      } catch (err) {
        console.error("Failed to parse rate card:", err);
      } finally {
        setIsParsingRateCard(false);
      }
    }
  };

  const handleStatementUpload = async (file: File) => {
    setIsProcessingBank(true);
    setBankProgress(10);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setBankProgress(30);
        const readerResult = reader.result as string;
        const base64 = readerResult.split(',')[1];
        const extracted = await parseBankStatement(base64, file.type);
        setBankProgress(80);
        const newBankItems: BankTransaction[] = extracted.map(item => ({
          ...item,
          id: generateId()
        }));
        if (newBankItems.length > 0) {
          recordHistory(`Imported ${newBankItems.length} bank transactions`);
          setBankTransactions(prev => [...newBankItems, ...prev]);
        }
        setBankProgress(100);
      } catch (error) {
        console.error("Statement Parsing Error:", error);
        alert("Failed to parse statement.");
      } finally {
        setTimeout(() => {
          setIsProcessingBank(false);
          setBankProgress(0);
        }, 500);
      }
    };
    reader.readAsDataURL(file);
  };

  const processExcelFile = async (file: File) => {
    setIsProcessingExcel(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: true });
        if (!data || data.length < 1) return;
        
        const headerRow = data[0];
        const headers = headerRow.map(h => (h || '').toString().toLowerCase().trim());
        const rows = data.slice(1);
        const findIdx = (keywords: string[]) => headers.findIndex(h => h && keywords.some(k => h.includes(k)));
        
        const idx = {
          year: findIdx(['year']), project: findIdx(['project', 'campaign', 'name', 'item', 'description']),
          client: findIdx(['client', 'customer', 'brand']), invNo: findIdx(['invoice #', 'inv #', 'invoice number', 'ref']),
          amount: findIdx(['invoice amt', 'invoice amount', 'amount', 'total', 'price', 'value']), date: findIdx(['date', 'payment date', 'created'])
        };

        const newTransactions: Transaction[] = rows
          .filter(row => {
            if (!row || row.length === 0) return false;
            const projectVal = idx.project !== -1 ? (row[idx.project]?.toString() || '').trim() : '';
            const amountVal = idx.amount !== -1 ? (parseFloat(String(row[idx.amount])) || 0) : 0;
            return projectVal !== '' && amountVal !== 0;
          })
          .map(row => {
            const amount = parseFloat(String(idx.amount !== -1 ? row[idx.amount] : 0)) || 0;
            const net = amount / (1 + CONFIG.VAT_RATE);
            let dateStr = new Date().toISOString().split('T')[0];
            const rawDate = idx.date !== -1 ? row[idx.date] : null;
            
            if (rawDate instanceof Date) {
              dateStr = rawDate.toISOString().split('T')[0];
            } else if (typeof rawDate === 'number') {
              const d = new Date((rawDate - (25567 + 1)) * 86400 * 1000);
              dateStr = d.toISOString().split('T')[0];
            }

            return {
              id: generateId(), 
              year: parseInt(String(idx.year !== -1 ? row[idx.year] : '')) || new Date().getFullYear(), 
              date: dateStr,
              project: (idx.project !== -1 ? row[idx.project] : 'Imported')?.toString().trim() || 'Imported',
              customerName: (idx.client !== -1 ? row[idx.client] : '')?.toString() || '', 
              description: '',
              invoiceNumber: (idx.invNo !== -1 ? row[idx.invNo] : '')?.toString() || '', 
              clientStatus: 'Pending', 
              ladlyStatus: 'Pending',
              amount: amount, 
              vat: Number((amount - net).toFixed(2)), 
              net: Number(net.toFixed(2)), 
              fee: Number((net * CONFIG.ADLY_FEE_RATE).toFixed(2)),
              payable: Number((net * (1 - CONFIG.ADLY_FEE_RATE)).toFixed(2)), 
              type: TransactionType.INCOME, 
              currency: 'AED', 
              category: Category.FREELANCE
            };
          });

        if (newTransactions.length > 0) {
          recordHistory(`Imported ${newTransactions.length} Excel rows`);
          setTransactions(prev => [...newTransactions, ...prev]);
        }
      } catch (error) { 
        console.error("Excel Import Error:", error); 
      } finally { 
        setIsProcessingExcel(false); 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMergeCampaigns = (sourceNames: string[], targetName: string) => {
    recordHistory(`Merged campaigns into ${targetName}`);
    setTransactions(prevT => prevT.map(t => {
      if (sourceNames.includes(t.project)) return { ...t, project: targetName, mergedFrom: t.mergedFrom || t.project };
      return t;
    }));
    setCampaignMetadata(prevMeta => {
      const newMeta = { ...prevMeta };
      const mergedData: Campaign = { projectName: targetName, notes: '', files: [], deliverables: [] };
      sourceNames.forEach(name => {
        const data = newMeta[name];
        if (data) {
          if (data.notes) mergedData.notes += (mergedData.notes ? '\n\n' : '') + data.notes;
          if (data.files) mergedData.files = [...(mergedData.files || []), ...data.files];
          if (data.deliverables) mergedData.deliverables = [...(mergedData.deliverables || []), ...data.deliverables];
          delete newMeta[name];
        }
      });
      newMeta[targetName] = mergedData;
      return newMeta;
    });
    if (selectedCampaignProject && sourceNames.includes(selectedCampaignProject)) setSelectedCampaignProject(targetName);
  };

  const handleUpdateCampaignMetadata = (projectName: string, metadata: Partial<Campaign>) => {
    recordHistory(`Updated campaign: ${projectName}`);
    setCampaignMetadata(prev => {
      if (metadata.projectName && metadata.projectName !== projectName) {
        const newName = metadata.projectName;
        const newMeta = { ...prev };
        const oldData = newMeta[projectName] || { projectName, notes: '', files: [], deliverables: [] };
        setTransactions(prevT => prevT.map(t => t.project === projectName ? { ...t, project: newName } : t));
        newMeta[newName] = { ...oldData, ...metadata, projectName: newName };
        delete newMeta[projectName];
        if (selectedCampaignProject === projectName) setSelectedCampaignProject(newName);
        return newMeta;
      }
      return { ...prev, [projectName]: { projectName, notes: metadata.notes ?? prev[projectName]?.notes ?? '', files: metadata.files ?? prev[projectName]?.files ?? [], deliverables: metadata.deliverables ?? prev[projectName]?.deliverables ?? [] } };
    });
  };

  const handleAddTransaction = (t: Transaction) => { recordHistory(`Added: ${t.project}`); setTransactions(prev => [t, ...prev]); };
  const handleUpdateTransaction = useCallback((updatedT: Transaction) => { recordHistory(`Updated: ${updatedT.project}`); setTransactions(prev => prev.map(t => t.id === updatedT.id ? updatedT : t)); }, [recordHistory]);
  const handleDeleteTransaction = (id: string) => { const t = transactions.find(item => item.id === id); recordHistory(`Deleted: ${t?.project}`); setTransactions(prev => prev.filter(t => t.id !== id)); };
  const handleAddContact = (c: Contact) => { recordHistory(`Added contact: ${c.name}`); setContacts(prev => [c, ...prev]); };
  const handleDeleteContact = (id: string) => { const c = contacts.find(item => item.id === id); recordHistory(`Deleted contact: ${c?.name}`); setContacts(prev => prev.filter(c => c.id !== id)); };
  const handleUpdateContactStatus = (id: string, status: LeadStatus) => { recordHistory(`Updated status`); setContacts(prev => prev.map(c => c.id === id ? { ...c, status } : c)); };
  const handleNavigateToCampaign = (projectName: string) => { setSelectedCampaignProject(projectName); setActiveTab('campaigns'); setIsAiOpen(false); };
  const handleBulkUpdateTransactions = (ids: string[], updates: Partial<Transaction>) => { recordHistory(`Bulk update`); const idSet = new Set(ids); setTransactions(prev => prev.map(t => idSet.has(t.id) ? { ...t, ...updates } : t)); };
  const handleBulkDeleteTransactions = (ids: string[]) => { recordHistory(`Bulk delete`); const idSet = new Set(ids); setTransactions(prev => prev.filter(t => !idSet.has(t.id))); };
  const handleAddCampaign = (projectName: string) => { recordHistory(`New folder: ${projectName}`); handleUpdateCampaignMetadata(projectName, { notes: '', files: [], deliverables: [] }); };
  const handleDismissTip = (tipId: string) => { setDismissedTips(prev => [...prev, tipId]); };
  const handleUpdateColumnLabel = (key: string, label: string) => { setColumnLabels(prev => ({ ...prev, [key]: label })); };

  const derivedCampaigns = useMemo(() => {
    const projectNames = new Set<string>();
    transactions.forEach(t => projectNames.add(t.project));
    Object.keys(campaignMetadata).forEach(name => projectNames.add(name));
    return Array.from(projectNames).map(name => ({ projectName: name, ...(campaignMetadata[name] || { notes: '', files: [], deliverables: [] }) }));
  }, [transactions, campaignMetadata]);

  if (!isAuthenticated) {
    return <SignIn onSignIn={() => setIsAuthenticated(true)} />;
  }

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} isAnyProcessing={isProcessingBank || isProcessingExcel || isParsingRateCard}
      isAiOpen={isAiOpen} onToggleAi={() => setIsAiOpen(!isAiOpen)} onOpenSettings={() => setIsSettingsOpen(true)}
      onSignOut={handleSignOut}
      entities={entities} activeEntity={activeEntity} onSwitchEntity={handleSwitchEntity} onCreateEntity={handleCreateEntity}
      onUpdateEntity={handleUpdateEntity} onDeleteEntity={handleDeleteEntity}
    >
      {activeTab === 'dashboard' && <Dashboard transactions={transactions} contacts={contacts} bankTransactions={bankTransactions} showAedEquivalent={showAedEquivalent} />}
      {activeTab === 'finance' && <FinanceTracker transactions={transactions} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onBulkUpdateTransactions={handleBulkUpdateTransactions} onDeleteTransaction={handleDeleteTransaction} onBulkDeleteTransactions={handleBulkDeleteTransactions} onExcelImport={processExcelFile} isProcessing={isProcessingExcel} columnWidths={columnWidths} onColumnWidthChange={setColumnWidths} columnLabels={columnLabels} onUpdateColumnLabel={handleUpdateColumnLabel} showAedEquivalent={showAedEquivalent} />}
      {activeTab === 'banking' && <BankingComponent bankTransactions={bankTransactions} transactions={transactions} onUpdateBankTransaction={(bt) => { recordHistory(`Reconciled: ${bt.vendor}`); setBankTransactions(prev => prev.map(item => item.id === bt.id ? bt : item)); }} onUpdateTransaction={handleUpdateTransaction} onClearBankTransactions={() => { recordHistory("Cleared bank items"); setBankTransactions([]); }} onStatementUpload={handleStatementUpload} isProcessing={isProcessingBank} progress={bankProgress} showAedEquivalent={showAedEquivalent} />}
      {activeTab === 'tax' && <VatCenter transactions={transactions} showAedEquivalent={showAedEquivalent} dismissedTips={dismissedTips} onDismissTip={handleDismissTip} onOpenAi={() => setIsAiOpen(true)} />}
      {activeTab === 'campaigns' && <CampaignTracker transactions={transactions} campaigns={derivedCampaigns} rateCard={parsedRateCardData} onUpdateCampaign={handleUpdateCampaignMetadata} onMergeCampaigns={handleMergeCampaigns} onAddCampaign={handleAddCampaign} selectedProjectName={selectedCampaignProject} setSelectedProjectName={setSelectedCampaignProject} showAedEquivalent={showAedEquivalent} />}
      {activeTab === 'crm' && <CRM contacts={contacts} onAddContact={handleAddContact} onDeleteContact={handleDeleteContact} onUpdateStatus={handleUpdateContactStatus} dismissedTips={dismissedTips} onDismissTip={handleDismissTip} />}
      {activeTab === 'resources' && <Resources resources={resources} rateCardData={parsedRateCardData} onUpdateResources={handleUpdateResources} onUpdateRateCardData={setParsedRateCardData} />}

      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={zohoConfig} onSaveConfig={setZohoConfig} onSync={async () => {}} isSyncing={false} onClearData={() => { setTransactions([]); setContacts([]); setCampaignMetadata({}); setBankTransactions([]); setResources({ mediaKit: null, rateCard: null }); }} onExport={() => {}} onImport={() => {}} theme={theme} onSetTheme={setTheme} isDarkMode={isDarkMode} onSetDarkMode={setIsDarkMode} fontSize={fontSize} onSetFontSize={setFontSize} showAedEquivalent={showAedEquivalent} onSetShowAedEquivalent={setShowAedEquivalent} />
      <AIChat isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} transactions={transactions} contacts={contacts} campaigns={derivedCampaigns} history={chatHistory} onUpdateHistory={setChatHistory} onNavigateToCampaign={handleNavigateToCampaign} />

      {showUndoToast && historyStack.length > 0 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top-10 duration-500 w-fit">
          <div className="bg-primary backdrop-blur-md text-primary-foreground px-4 py-2 rounded-full shadow-2xl flex items-center gap-4 border border-white/10 min-w-[280px]">
             <div className="flex-1 min-w-0"><p className="text-[10px] font-black opacity-50 uppercase tracking-widest leading-none mb-1">Undo Last Action</p><p className="text-[11px] font-bold truncate">{historyStack[0].description}</p></div>
             <div className="flex items-center gap-1.5 shrink-0"><button onClick={handleUndo} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg active:scale-95"><Undo2 size={12} />Undo</button><button onClick={() => setShowUndoToast(false)} className="p-1.5 opacity-50 hover:opacity-100 transition-opacity"><X size={14} /></button></div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
