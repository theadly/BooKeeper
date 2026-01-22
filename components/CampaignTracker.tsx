
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Campaign, Transaction, CampaignFile, Deliverable, ParsedRateItem } from '../types';
import { formatCurrency, formatDate, RATE_CARD_SERVICES } from '../constants';
import { parseContractForDeliverables } from '../services/geminiService';
import { 
  ArrowLeft, Clock, FileText, Upload, Trash2, 
  Paperclip, ChevronRight, Plus, X, LayoutGrid, List,
  PackageCheck, AlertCircle, Scan, Loader2, Search,
  Filter, ArrowUpDown, MoreHorizontal, FolderClosed, Layers, CheckSquare, Square, Edit3, ArrowRight, Folder, ChevronDown, 
  CheckCircle2, Globe, Instagram, Link, Calendar as CalendarIcon, ExternalLink, Calendar
} from 'lucide-react';

interface CampaignTrackerProps {
  transactions: Transaction[];
  campaigns: Campaign[];
  rateCard: ParsedRateItem[];
  onUpdateCampaign: (projectName: string, metadata: Partial<Campaign>) => void;
  onMergeCampaigns: (sourceNames: string[], targetName: string) => void;
  onAddCampaign: (projectName: string) => void;
  onRenameCampaign: (oldName: string, newName: string) => void;
  selectedProjectName: string | null;
  setSelectedProjectName: (name: string | null) => void;
  showAedEquivalent: boolean;
}

type ViewType = 'grid' | 'list';
type SortType = 'name' | 'year' | 'revenue' | 'client';

const BrandAvatar: React.FC<{ name: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }> = ({ name, size = 'md' }) => {
  const [error, setError] = useState(false);
  const domain = useMemo(() => {
    if (!name || typeof name !== 'string') return 'brand.com';
    const clean = name.toLowerCase().split(' x ')[0].split(' & ')[0].replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/)[0];
    return clean ? `${clean}.com` : 'brand.com';
  }, [name]);
  const initials = (name || 'B').substring(0, 1).toUpperCase();
  const getAvatarColor = (str: string) => {
    const colors = ['bg-blue-50 text-blue-600 border-blue-100', 'bg-indigo-50 text-indigo-600 border-indigo-100', 'bg-teal-50 text-teal-600 border-teal-100', 'bg-rose-50 text-rose-600 border-rose-100', 'bg-amber-50 text-amber-600 border-amber-100', 'bg-violet-50 text-violet-600 border-violet-100', 'bg-emerald-50 text-emerald-600 border-emerald-100'];
    let hash = 0;
    const s = str || 'brand';
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };
  const sizeClasses = { 
    xs: 'w-5 h-5 text-[7px] rounded',
    sm: 'w-6 h-6 text-[8px] rounded-md', 
    md: 'w-8 h-8 text-[10px] rounded-lg', 
    lg: 'w-10 h-10 text-xs rounded-xl', 
    xl: 'w-14 h-14 text-lg rounded-2xl' 
  };
  const logoUrl = `https://logo.clearbit.com/${domain}`;
  if (error || !name) return <div className={`${sizeClasses[size]} ${getAvatarColor(name || 'B')} border flex items-center justify-center font-black shadow-sm shrink-0 transition-transform duration-300`}>{initials}</div>;
  return <div className={`${sizeClasses[size]} bg-white border border-slate-100 flex items-center justify-center shadow-sm overflow-hidden shrink-0 group-hover:scale-105 transition-all duration-500`}><img src={logoUrl} alt={name} className="w-full h-full object-contain p-1" onError={() => setError(true)} /></div>;
};

const CampaignTracker: React.FC<CampaignTrackerProps> = ({ 
  transactions, campaigns, rateCard, onUpdateCampaign, onMergeCampaigns, onAddCampaign, onRenameCampaign,
  selectedProjectName, setSelectedProjectName, showAedEquivalent
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeliverableModalOpen, setIsDeliverableModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editProjectName, setEditProjectName] = useState('');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [clientFilter, setClientFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortType>('name');
  
  const [deliverableForm, setDeliverableForm] = useState({
    name: '',
    rate: 0,
    quantity: 1,
    currency: 'AED',
    platform: 'Instagram'
  });

  const selectedCampaignData = useMemo(() => {
    if (!selectedProjectName) return null;
    const metadata = campaigns.find(c => c.projectName === selectedProjectName);
    const mergedSources = metadata?.mergedSources || [];
    
    // Aggregating transactions from canonical name and all virtual sources
    const projectTransactions = transactions.filter(t => 
       t.project === selectedProjectName || mergedSources.includes(t.project)
    );

    const totalAmount = projectTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const totalPaid = projectTransactions.reduce((sum: number, t: Transaction) => sum + (t.clientPayment || 0), 0);
    const totalVat = projectTransactions.reduce((sum: number, t: Transaction) => sum + (t.vat || 0), 0);
    
    const campaignDeliverables: Deliverable[] = (metadata?.deliverables || []) as Deliverable[];
    const deliverablesValue = campaignDeliverables.reduce((sum: number, d: Deliverable) => sum + (d.rate * d.quantity), 0);
    
    const completedCount = campaignDeliverables.filter((d: Deliverable) => !!d.isCompleted).length;
    const totalCount = campaignDeliverables.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const groupedLines: Record<string, Transaction[]> = {};
    projectTransactions.forEach(t => {
      // Group by the actual project name in the ledger
      const key = t.project;
      if (!groupedLines[key]) groupedLines[key] = [];
      groupedLines[key].push(t);
    });

    const deliverableGroups: Record<string, { total: number, completed: number }> = {};
    campaignDeliverables.forEach((d: Deliverable) => {
      if (!d) return;
      const rawName = d.name || 'Item';
      const baseName = rawName.replace(/\s*\(?\d+\/\d+\)?/g, '').replace(/\s*\d+\/\d+/g, '').replace(/\s*Part\s*\d+/gi, '').trim();
      if (!deliverableGroups[baseName]) deliverableGroups[baseName] = { total: 0, completed: 0 };
      deliverableGroups[baseName].total += 1;
      if (d.isCompleted) deliverableGroups[baseName].completed += 1;
    });

    const summaryText = Object.entries(deliverableGroups)
      .map(([name, counts]) => `${counts.completed}/${counts.total} ${name}${counts.total > 1 ? 's' : ''}`)
      .join(', ');

    return { 
      projectName: selectedProjectName, 
      groupedLines,
      metadata, 
      totals: { amount: totalAmount, paid: totalPaid, vat: totalVat, outstanding: totalAmount - totalPaid, deliverablesValue },
      tracking: { completedCount, totalCount, progress, summaryText }
    };
  }, [selectedProjectName, transactions, campaigns]);

  const toggleFolderSelection = (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSet = new Set(selectedFolders);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelectedFolders(newSet);
  };

  const handleMerge = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (selectedFolders.size < 2) return;
    const foldersArray = Array.from(selectedFolders);
    const targetName = foldersArray.reduce((a: string, b: string) => a.length > b.length ? a : b);
    onMergeCampaigns(foldersArray, targetName);
    setSelectedFolders(new Set());
    setSelectedProjectName(targetName);
  };

  const performScan = useCallback(async (projectName: string, fileId: string, base64: string, type: string) => {
    setIsScanning(true);
    try {
      const extracted = await parseContractForDeliverables(base64, type);
      const campaign = campaigns.find(c => c.projectName === projectName);
      const existingDeliverables: Deliverable[] = (campaign?.deliverables || []) as Deliverable[];
      
      const explodedDeliverables: Deliverable[] = [];
      
      extracted.forEach(item => {
        const qty = Math.max(1, item.quantity);
        const unitRate = item.rate || 0;
        const cleanName = item.name.replace(/^[x\d]+\s*/, '').replace(/:\s*.*$/, '').trim();
        
        for (let i = 0; i < qty; i++) {
          const suffix = qty > 1 ? ` ${i + 1}/${qty}` : "";
          explodedDeliverables.push({
            ...item,
            id: crypto.randomUUID(),
            name: `${cleanName}${suffix}`,
            quantity: 1, 
            rate: unitRate,
            isCompleted: false,
            status: 'Pending'
          });
        }
      });

      onUpdateCampaign(projectName, { 
        deliverables: explodedDeliverables.length > 0 ? [...existingDeliverables, ...explodedDeliverables] : existingDeliverables,
        files: campaign?.files?.map(f => f.id === fileId ? { ...f, parsed: true } : f)
      });
    } finally { setIsScanning(false); }
  }, [campaigns, onUpdateCampaign]);

  const handleManualScan = () => {
    const filesList = (selectedCampaignData?.metadata?.files || []) as CampaignFile[];
    const unparsed = filesList.filter((f: CampaignFile) => f.isContract && !f.parsed);
    if (unparsed.length === 0) contractInputRef.current?.click();
    else unparsed.forEach(c => c.base64 && performScan(selectedProjectName!, c.id, c.base64, c.type));
  };

  const processFileUpload = async (file: File, isContract: boolean = false) => {
    if (!selectedProjectName) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const newFile: CampaignFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
        date: new Date().toISOString().split('T')[0],
        isContract,
        parsed: false,
        base64
      };
      const campaign = campaigns.find(c => c.projectName === selectedProjectName);
      const currentFiles = Array.isArray(campaign?.files) ? campaign!.files : [];
      onUpdateCampaign(selectedProjectName, { files: [...currentFiles, newFile] });
      if (isContract) {
        performScan(selectedProjectName, newFile.id, base64, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeDeliverable = (id: string) => { 
    if (selectedProjectName) {
      const deliverables: Deliverable[] = (selectedCampaignData?.metadata?.deliverables || []) as Deliverable[];
      onUpdateCampaign(selectedProjectName, { deliverables: deliverables.filter((d: Deliverable) => d.id !== id) }); 
    }
  };
  
  const toggleDeliverableCompletion = (id: string) => {
    if (!selectedProjectName) return;
    const campaign = campaigns.find(c => c.projectName === selectedProjectName);
    const deliverables: Deliverable[] = (campaign?.deliverables || []) as Deliverable[];
    const updated = deliverables.map((d: Deliverable) => 
      d && d.id === id ? { ...d, isCompleted: !d.isCompleted, status: !d.isCompleted ? 'Completed' : 'Pending' as any } : d
    );
    onUpdateCampaign(selectedProjectName, { deliverables: updated });
  };

  const updateDeliverableTracking = (id: string, updates: Partial<Deliverable>) => {
    if (!selectedProjectName) return;
    const campaign = campaigns.find(c => c.projectName === selectedProjectName);
    const deliverables: Deliverable[] = (campaign?.deliverables || []) as Deliverable[];
    const updated = deliverables.map((d: Deliverable) => 
      d && d.id === id ? { ...d, ...updates } : d
    );
    onUpdateCampaign(selectedProjectName, { deliverables: updated });
  };

  const handleDeliverableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectName || !deliverableForm.name) return;

    const quantity = Math.max(1, Number(deliverableForm.quantity));
    const newDeliverables: Deliverable[] = [];
    
    for (let i = 0; i < quantity; i++) {
      const name = quantity > 1 ? `${deliverableForm.name} ${i + 1}/${quantity}` : deliverableForm.name;
      newDeliverables.push({
        id: crypto.randomUUID(),
        name: name,
        rate: Number(deliverableForm.rate),
        quantity: 1, 
        currency: deliverableForm.currency,
        platform: deliverableForm.platform,
        status: 'Pending',
        isCompleted: false
      });
    }

    const campaign = campaigns.find(c => c.projectName === selectedProjectName);
    const existingDeliverables: Deliverable[] = (campaign?.deliverables || []) as Deliverable[];
    onUpdateCampaign(selectedProjectName, {
      deliverables: [...existingDeliverables, ...newDeliverables]
    });

    setIsDeliverableModalOpen(false);
    setDeliverableForm({ name: '', rate: 0, quantity: 1, currency: 'AED', platform: 'Instagram' });
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProjectName && editProjectName.trim() && editProjectName !== selectedProjectName) {
      onRenameCampaign(selectedProjectName, editProjectName.trim());
      setSelectedProjectName(editProjectName.trim());
      setIsRenameModalOpen(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => { e.preventDefault(); if (newProjectName.trim()) { onAddCampaign(newProjectName.trim()); setIsAddModalOpen(false); setNewProjectName(''); } };
  
  const filteredCampaigns = useMemo<Campaign[]>(() => {
    const list = campaigns.filter((c: Campaign) => {
      const matchesSearch = !searchQuery.trim() || c.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      const mergedSources = c.mergedSources || [];
      const projectLines: Transaction[] = transactions.filter((t: Transaction) => 
        t.project === c.projectName || mergedSources.includes(t.project)
      );
      return matchesSearch && 
             (yearFilter === 'All' || projectLines.some((t: Transaction) => t.year.toString() === yearFilter)) && 
             (clientFilter === 'All' || projectLines.some((t: Transaction) => t.customerName === clientFilter));
    });

    return list.sort((a: Campaign, b: Campaign) => {
      const mergedA = a.mergedSources || [];
      const linesA: Transaction[] = transactions.filter((t: Transaction) => t.project === a.projectName || mergedA.includes(t.project));
      const mergedB = b.mergedSources || [];
      const linesB: Transaction[] = transactions.filter((t: Transaction) => t.project === b.projectName || mergedB.includes(t.project));
      
      if (sortBy === 'name') return (a.projectName || '').localeCompare(b.projectName || '');
      if (sortBy === 'year') {
        const yearA = linesA.length > 0 ? Math.max(...linesA.map((t: Transaction) => t.year)) : 0;
        const yearB = linesB.length > 0 ? Math.max(...linesB.map((t: Transaction) => t.year)) : 0;
        return yearB - yearA;
      }
      if (sortBy === 'revenue') {
        const revA = linesA.reduce((sum, t) => sum + t.amount, 0);
        const revB = linesB.reduce((sum, t) => sum + t.amount, 0);
        return revB - revA;
      }
      if (sortBy === 'client') {
        const clientA = linesA.length > 0 ? (linesA[0] as Transaction).customerName || '' : '';
        const clientB = linesB.length > 0 ? (linesB[0] as Transaction).customerName || '' : '';
        return clientA.localeCompare(clientB);
      }
      return 0;
    });
  }, [campaigns, searchQuery, yearFilter, clientFilter, sortBy, transactions]);

  const campaignsByYear = useMemo<[string, Campaign[]][]>(() => {
    const grouped: Record<string, Campaign[]> = {};
    filteredCampaigns.forEach(c => {
      const merged = c.mergedSources || [];
      const lines: Transaction[] = transactions.filter((t: Transaction) => t.project === c.projectName || merged.includes(t.project));
      const year = lines.length > 0 
        ? Math.max(...lines.map((t: Transaction) => t.year)).toString() 
        : new Date().getFullYear().toString();
      
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(c);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])) as [string, Campaign[]][];
  }, [filteredCampaigns, transactions]);

  const handleCardClick = (projectName: string) => {
    if (selectedFolders.size > 0) {
      toggleFolderSelection(projectName);
    } else {
      setSelectedProjectName(projectName);
    }
  };

  if (selectedCampaignData) {
    const { projectName, groupedLines, totals, metadata, tracking } = selectedCampaignData;
    const billingGap = totals.deliverablesValue - totals.amount;
    const currency = 'AED'; 
    return (
      <div className="h-full flex flex-col space-y-4 animate-in slide-in-from-right-10 duration-500 overflow-hidden pb-10 px-1">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedProjectName(null)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm"><ArrowLeft size={18} className="text-slate-600 dark:text-slate-400" /></button>
            <div className="flex items-center gap-3">
              <BrandAvatar name={projectName} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none truncate max-w-[150px] sm:max-w-none">{projectName}</h1>
                  <button onClick={() => { setEditProjectName(projectName); setIsRenameModalOpen(true); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all"><Edit3 size={14} /></button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">Campaign Folder</span>
                </div>
              </div>
            </div>
          </div>
          <button className="hidden sm:block p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><MoreHorizontal size={18}/></button>
        </header>

        {isRenameModalOpen && (
          <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsRenameModalOpen(false)}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Rename Folder</h2>
                 <button onClick={() => setIsRenameModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
               </div>
               <form onSubmit={handleRenameSubmit} className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">New Project Name</label>
                   <input autoFocus required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold dark:text-white" value={editProjectName} onChange={e => setEditProjectName(e.target.value)} />
                 </div>
                 <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl active:scale-95 text-[10px]">Update Globally</button>
               </form>
            </div>
          </div>
        )}

        {isDeliverableModalOpen && (
          <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsDeliverableModalOpen(false)}>
             <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Add Deliverable</h2>
                 <button onClick={() => setIsDeliverableModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
               </div>
               <form onSubmit={handleDeliverableSubmit} className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Name</label>
                   <input required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold dark:text-white" value={deliverableForm.name} onChange={e => setDeliverableForm({...deliverableForm, name: e.target.value})} placeholder="e.g. IG Reel" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty</label><input type="number" min="1" required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold dark:text-white" value={deliverableForm.quantity} onChange={e => setDeliverableForm({...deliverableForm, quantity: parseInt(e.target.value)})} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate</label><input type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold dark:text-white" value={deliverableForm.rate} onChange={e => setDeliverableForm({...deliverableForm, rate: parseFloat(e.target.value)})} /></div>
                 </div>
                 <button type="submit" className="w-full bg-teal-600 text-white py-4 rounded-xl font-black uppercase shadow-xl active:scale-95 text-[10px]">Add to Tracker</button>
               </form>
             </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"><p className="text-[7px] font-black text-slate-400 uppercase mb-1">Record</p><div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">{formatCurrency(totals.amount, currency, showAedEquivalent)}</div></div>
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"><p className="text-[7px] font-black text-primary uppercase mb-1 opacity-70">Planned</p><div className="text-sm sm:text-base font-black text-primary">{formatCurrency(totals.deliverablesValue, currency, showAedEquivalent)}</div></div>
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"><p className="text-[7px] font-black text-slate-400 uppercase mb-1">Delta</p><div className={`text-sm sm:text-base font-black ${billingGap > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(Math.abs(billingGap), currency, showAedEquivalent)}</div></div>
          <div className="bg-primary p-3 sm:p-3.5 rounded-2xl shadow-xl text-primary-foreground relative overflow-hidden group"><div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8"></div><p className="text-[7px] font-black opacity-60 uppercase mb-1 relative z-10">Settled</p><div className="text-sm sm:text-base font-black relative z-10">{formatCurrency(totals.paid, currency, showAedEquivalent)}</div></div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-6">
          <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-900 gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 w-full"><div className="flex items-center gap-2 shrink-0 self-start"><PackageCheck size={20} className="text-teal-600" /><h3 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-widest whitespace-nowrap">Scope Tracking</h3></div>{tracking.totalCount > 0 && (<div className="flex items-center gap-4 flex-1 min-w-0 w-full"><div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[150px]"><div className="h-full bg-teal-600 transition-all duration-1000" style={{ width: `${tracking.progress}%` }}></div></div><div className="flex items-center gap-2 min-w-0"><span className="text-xs font-black text-slate-900 dark:text-white">{Math.round(tracking.progress)}%</span><span className="hidden xs:inline text-[10px] font-bold text-slate-400 truncate max-w-[200px]" title={tracking.summaryText}>({tracking.summaryText})</span></div></div>)}</div>
              <div className="flex items-center gap-2 w-full md:w-auto"><button onClick={handleManualScan} disabled={isScanning} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[9px] font-black uppercase px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white transition-all shadow-sm">{isScanning ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />} Scan</button><button onClick={() => setIsDeliverableModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[9px] font-black uppercase bg-teal-600 text-white px-4 py-2.5 rounded-xl shadow-lg hover:bg-teal-700 active:scale-95 transition-all"><Plus size={14} /> Add Item</button></div>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              {(() => {
                 const itemsList: Deliverable[] = (metadata?.deliverables || []) as Deliverable[];
                 if (itemsList.length > 0) {
                   return itemsList.map((item: Deliverable) => (
                     item && <div key={item.id} className={`flex flex-col gap-4 p-4 sm:p-6 rounded-[1.8rem] border transition-all duration-300 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:shadow-md relative`}>
                       <div className="flex items-center justify-between gap-3">
                         <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0"><button onClick={() => toggleDeliverableCompletion(item.id)} className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all border-2 shrink-0 ${item.isCompleted ? 'bg-teal-600 border-teal-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-transparent hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}><CheckCircle2 size={18} className={item.isCompleted ? 'opacity-100' : 'opacity-0'} /></button><div className="flex-1 min-w-0">
                           <input 
                             className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm sm:text-base font-black tracking-tight leading-tight ${item.isCompleted ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-900 dark:text-white'}`}
                             value={item.name}
                             onChange={(e) => updateDeliverableTracking(item.id, { name: e.target.value })}
                           />
                           <div className="flex items-center gap-3 mt-1">
                             <div className="flex items-center gap-1.5">
                               <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.currency || 'AED'}</span>
                               <input 
                                 type="number"
                                 className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold focus:ring-1 focus:ring-teal-500/20 dark:text-white outline-none"
                                 value={item.rate}
                                 onChange={(e) => updateDeliverableTracking(item.id, { rate: Number(e.target.value) })}
                               />
                             </div>
                           </div>
                         </div></div>
                         <div className="flex items-center gap-1 shrink-0"><button onClick={() => removeDeliverable(item.id)} className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"><Trash2 size={16} /></button></div>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                         <div className="space-y-1.5"><label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">Asset Link</label><div className="relative group"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600/60 group-focus-within:text-teal-600 transition-colors"><Link size={12} /></div><input type="text" placeholder="Paste URL..." className="w-full bg-slate-50/80 dark:bg-slate-800/50 border-none rounded-xl pl-8 pr-3 py-2.5 text-[10px] font-bold focus:ring-2 focus:ring-teal-500/20 dark:text-white transition-all outline-none" value={item.assetLink || ''} onChange={(e) => updateDeliverableTracking(item.id, { assetLink: e.target.value })} /></div></div>
                         <div className="space-y-1.5"><label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">Published</label><div className="relative group"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600/60 group-focus-within:text-teal-600 transition-colors pointer-events-none"><Calendar size={12} /></div><input type="date" className="w-full bg-slate-50/80 dark:bg-slate-800/50 border-none rounded-xl pl-8 pr-3 py-2.5 text-[10px] font-bold focus:ring-2 focus:ring-teal-500/20 dark:text-white transition-all outline-none appearance-none" value={item.postedDate || ''} onChange={(e) => updateDeliverableTracking(item.id, { postedDate: e.target.value })} /></div></div>
                       </div>
                     </div>
                   ))
                 } else {
                   return (<div className="py-16 text-center text-slate-300 dark:text-slate-700 font-black uppercase text-[10px] tracking-[0.2em] border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-[2rem] flex flex-col items-center gap-4"><PackageCheck size={40} className="opacity-10" /><p>No deliverables tracked yet</p></div>);
                 }
              })()}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-800/20"><div className="flex items-center gap-2"><Folder size={18} className="text-teal-600" /><h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Consolidated Ledger</h3></div></div>
             <div className="p-4 sm:p-6 space-y-6">
               {(Object.entries(groupedLines) as [string, Transaction[]][]).map(([groupName, lines]) => (
                 <div key={groupName} className="space-y-3">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md tracking-widest">
                       {groupName === projectName ? 'Folder Direct' : `Virtual Source: ${groupName}`}
                     </span>
                     <div className="h-px bg-slate-50 dark:bg-slate-800 flex-1" />
                   </div>
                   <div className="space-y-2">
                     {lines.map(line => (
                       <div key={line.id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50/30 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-500/10 transition-all">
                         <div className="flex-1 min-w-0">
                           <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{line.customerName || 'Internal'}</p>
                           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{line.invoiceNumber || 'No Inv'} • {formatDate(line.date)}</p>
                         </div>
                         <div className="text-right ml-3">
                           <p className="font-black text-slate-900 dark:text-white text-xs">{formatCurrency(line.amount, line.currency, showAedEquivalent)}</p>
                           <p className={`text-[8px] font-black uppercase mt-0.5 ${line.clientStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{line.clientStatus}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
          </section>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && processFileUpload(e.target.files[0], false)} />
        <input type="file" ref={contractInputRef} className="hidden" accept="application/pdf,image/*" onChange={(e) => e.target.files?.[0] && processFileUpload(e.target.files[0], true)} />
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full flex flex-col overflow-hidden px-1 relative">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
        <div className="space-y-0.5"><h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Campaigns</h1><p className="text-slate-500 font-medium text-[9px] uppercase tracking-widest opacity-60">Managing {filteredCampaigns.length} Projects</p></div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64 group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={14} /><input type="text" placeholder="Search folders..." className="w-full bg-white dark:bg-slate-800 pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-primary outline-none text-[10px] font-medium shadow-sm transition-all dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select className="flex-1 sm:flex-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2.5 sm:py-2 text-[10px] font-black uppercase tracking-widest shadow-sm focus:outline-none focus:ring-1 focus:ring-primary dark:text-white" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortType)}><option value="name">Sort: Project</option><option value="year">Sort: Year</option><option value="revenue">Sort: Revenue</option></select>
            <div className="hidden sm:flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg items-center shadow-sm shrink-0"><button onClick={() => setViewType('grid')} className={`p-1.5 rounded-md transition-all ${viewType === 'grid' ? 'bg-primary text-primary-foreground' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={12} /></button><button onClick={() => setViewType('list')} className={`p-1.5 rounded-md transition-all ${viewType === 'list' ? 'bg-primary text-primary-foreground' : 'text-slate-400 hover:text-slate-600'}`}><List size={12} /></button></div>
            <button onClick={() => setIsAddModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-primary hover:opacity-90 text-primary-foreground px-4 py-2.5 sm:py-2 rounded-xl transition-all font-black shadow-lg active:scale-95 text-[9px] uppercase tracking-widest whitespace-nowrap"><Plus size={14} /> New Folder</button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-32 space-y-8">
        {campaignsByYear.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 font-black uppercase text-[9px] tracking-[0.2em] border-2 border-dashed border-slate-100 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30"><Search size={32} className="mb-3 opacity-5" /><p>No Results Found</p></div>
        ) : (
          campaignsByYear.map(([year, campaignsList]: [string, Campaign[]]) => {
            const yearlyCampaigns = campaignsList;
            return (
              <div key={year} className="space-y-4">
                <div className="flex items-center gap-3 sticky top-0 bg-bg-page dark:bg-slate-950 z-20 py-2">
                  <span className="text-lg font-black text-slate-900 dark:text-white">{year}</span>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                    {yearlyCampaigns.length} Campaign{yearlyCampaigns.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={`grid gap-3 ${viewType === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' : 'grid-cols-1'}`}>
                  {yearlyCampaigns.map((campaign: Campaign) => {
                    const merged = campaign.mergedSources || [];
                    const lines: Transaction[] = transactions.filter(t => t.project === campaign.projectName || merged.includes(t.project));
                    const total = lines.reduce((sum, t) => sum + t.amount, 0);
                    const isSelected = selectedFolders.has(campaign.projectName);
                    const clientName = lines.length > 0 ? (lines[0] as Transaction).customerName : '-';
                    
                    if (viewType === 'grid') {
                      return (
                        <div 
                          key={campaign.projectName} 
                          onClick={() => handleCardClick(campaign.projectName)} 
                          className={`group bg-white dark:bg-slate-900 border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 cursor-pointer relative ${isSelected ? 'border-primary ring-2 ring-primary/20 scale-[0.97]' : 'border-slate-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-0.5'}`}
                        >
                          <div className="p-3.5 flex-1 relative">
                            <button onClick={(e) => toggleFolderSelection(campaign.projectName, e)} className={`absolute top-2.5 right-2.5 p-1 rounded-md transition-all ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-800 text-slate-200 dark:text-slate-600 hover:text-primary'}`}>{isSelected ? <CheckSquare size={12} /> : <Square size={12} />}</button>
                            <div className="mb-2.5"><BrandAvatar name={campaign.projectName} size="md" /></div>
                            <h3 className="text-[11px] font-black text-slate-900 dark:text-white mb-0.5 tracking-tight group-hover:text-primary transition-colors truncate pr-6">{campaign.projectName}</h3>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-tight">{clientName}</p>
                            <div className="flex wrap gap-1 mb-2.5">
                              <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">{lines.length} Line{lines.length !== 1 ? 's' : ''}</span>
                              {merged.length > 0 && <span className="text-[7px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded border border-teal-100 dark:border-teal-800">{merged.length} Consolidated</span>}
                            </div>
                            <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock size={10} /> {lines.length > 0 ? formatDate(lines[0]?.date) : 'Recently Created'}</div>
                          </div>
                          <div className="px-3.5 py-2.5 bg-slate-50/40 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between"><div className="text-[10px] font-black text-slate-900 dark:text-white">{formatCurrency(total, 'AED', showAedEquivalent)}</div><div className="text-7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">Open <ArrowRight size={8}/></div></div>
                        </div>
                      );
                    }
                    return (
                      <div 
                        key={campaign.projectName} 
                        onClick={() => handleCardClick(campaign.projectName)} 
                        className={`p-3 rounded-xl border shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer group ${isSelected ? 'bg-primary/5 border-primary' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-primary/20'}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0"><button onClick={(e) => toggleFolderSelection(campaign.projectName, e)} className={`p-1 rounded-md transition-all shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-800 text-slate-200 dark:text-slate-700 hover:text-primary'}`}>{isSelected ? <CheckSquare size={12} /> : <Square size={12} />}</button><BrandAvatar name={campaign.projectName} size="xs" /><div className="flex-1 min-w-0"><h4 className="font-black text-slate-900 dark:text-white text-[11px] tracking-tight group-hover:text-primary truncate">{campaign.projectName}</h4><p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">{clientName}</p></div></div>
                        <div className="flex items-center gap-4"><div className="text-right hidden xs:block"><p className="font-black text-slate-900 dark:text-white text-[11px]">{formatCurrency(total, 'AED', showAedEquivalent)}</p><p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">{lines.length} Lines</p></div><ChevronRight size={14} className="text-slate-300 dark:text-slate-700 group-hover:text-primary group-hover:translate-x-0.5 transition-all" /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedFolders.size > 0 && (
        <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-bottom-10 duration-500 w-full max-w-sm px-4 sm:px-0" onClick={(e) => e.stopPropagation()}>
          <div className="bg-primary dark:bg-slate-900 backdrop-blur-md p-2 rounded-[2rem] shadow-2xl flex items-center gap-1 border border-white/10 dark:border-slate-800 pr-2">
            <div className="px-4 py-2 flex items-center gap-3 text-primary-foreground"><div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-black text-[10px] shadow-xl">{selectedFolders.size}</div><div className="flex flex-col"><span className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-none">Selected</span><span className="text-[10px] font-bold leading-none mt-0.5">Folders</span></div></div>
            <button type="button" onClick={(e) => handleMerge(e)} className="flex-1 flex items-center justify-center gap-2 bg-white text-primary px-6 py-3 rounded-[1.6rem] font-black text-[10px] uppercase shadow-xl hover:scale-[1.03] active:scale-95 transition-all ring-4 ring-primary/20"><Layers size={18} /> Consolidate</button>
            <button type="button" onClick={() => setSelectedFolders(new Set())} className="p-2 text-primary-foreground opacity-50 hover:opacity-100 transition-opacity"><X size={20} /></button>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsAddModalOpen(false)}>
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">New Folder</h2><button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button></div>
             <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Identifier</label><input autoFocus required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold dark:text-white" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g. Dyson V15 Launch" /></div>
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase shadow-xl active:scale-95 text-[10px]">Create Workspace</button>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CampaignTracker;
