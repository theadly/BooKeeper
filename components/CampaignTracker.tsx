
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Campaign, Transaction, CampaignFile, Deliverable, ParsedRateItem } from '../types';
import { formatCurrency, formatDate, RATE_CARD_SERVICES } from '../constants';
import { parseContractForDeliverables } from '../services/geminiService';
import { 
  ArrowLeft, Clock, FileText, Upload, Trash2, 
  Paperclip, ChevronRight, Plus, X, LayoutGrid, List,
  PackageCheck, AlertTriangle, Scan, Loader2, Search,
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
  selectedProjectName: string | null;
  setSelectedProjectName: (name: string | null) => void;
  showAedEquivalent: boolean;
}

type ViewType = 'grid' | 'list';
type SortType = 'name' | 'year' | 'revenue' | 'client';

const PLATFORM_OPTIONS = ['Instagram', 'TikTok', 'Snapchat', 'YouTube', 'X / Twitter', 'Facebook', 'LinkedIn', 'Other'];

const BrandAvatar: React.FC<{ name: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }> = ({ name, size = 'md' }) => {
  const [error, setError] = useState(false);
  const domain = useMemo(() => {
    const clean = name.toLowerCase().split(' x ')[0].split(' & ')[0].replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/)[0];
    return `${clean}.com`;
  }, [name]);
  const initials = name.substring(0, 1).toUpperCase();
  const getAvatarColor = (str: string) => {
    const colors = ['bg-blue-50 text-blue-600 border-blue-100', 'bg-indigo-50 text-indigo-600 border-indigo-100', 'bg-teal-50 text-teal-600 border-teal-100', 'bg-rose-50 text-rose-600 border-rose-100', 'bg-amber-50 text-amber-600 border-amber-100', 'bg-violet-50 text-violet-600 border-violet-100', 'bg-emerald-50 text-emerald-600 border-emerald-100'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
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
  if (error) return <div className={`${sizeClasses[size]} ${getAvatarColor(name)} border flex items-center justify-center font-black shadow-sm shrink-0 transition-transform duration-300`}>{initials}</div>;
  return <div className={`${sizeClasses[size]} bg-white border border-slate-100 flex items-center justify-center shadow-sm overflow-hidden shrink-0 group-hover:scale-105 transition-all duration-500`}><img src={logoUrl} alt={name} className="w-full h-full object-contain p-1" onError={() => setError(true)} /></div>;
};

const CampaignTracker: React.FC<CampaignTrackerProps> = ({ 
  transactions, campaigns, rateCard, onUpdateCampaign, onMergeCampaigns, onAddCampaign,
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
  
  const [expandedDeliverableId, setExpandedDeliverableId] = useState<string | null>(null);

  // Deliverable Form State
  const [deliverableForm, setDeliverableForm] = useState({
    name: '',
    rate: 0,
    quantity: 1,
    currency: 'AED',
    platform: 'Instagram'
  });

  const selectedCampaignData = useMemo(() => {
    if (!selectedProjectName) return null;
    const projectTransactions = transactions.filter(t => t.project === selectedProjectName);
    const metadata = campaigns.find(c => c.projectName === selectedProjectName);
    const totalAmount = projectTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalPaid = projectTransactions.reduce((sum, t) => sum + (t.clientPayment || 0), 0);
    const totalVat = projectTransactions.reduce((sum, t) => sum + (t.vat || 0), 0);
    
    // Explicitly casting deliverables and ensuring it's an array to resolve 'unknown' type issues.
    const campaignDeliverables = (metadata?.deliverables as Deliverable[]) || [];
    const deliverablesValue = campaignDeliverables.reduce((sum, d: Deliverable) => sum + (d.rate * d.quantity), 0);
    
    const completedCount = campaignDeliverables.filter((d: Deliverable) => !!d.isCompleted).length;
    // Fix: Using explicit cast to ensure campaignDeliverables is not unknown.
    const totalCount = campaignDeliverables.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const groupedLines: Record<string, Transaction[]> = {};
    projectTransactions.forEach(t => {
      const key = t.mergedFrom || 'Original';
      if (!groupedLines[key]) groupedLines[key] = [];
      groupedLines[key].push(t);
    });

    const deliverableGroups: Record<string, { total: number, completed: number }> = {};
    campaignDeliverables.forEach((d: Deliverable) => {
      const baseName = d.name.replace(/\s*\(?\d+\/\d+\)?/g, '').replace(/\s*Part\s*\d+/gi, '').trim();
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
    const targetName = foldersArray.reduce((a, b) => a.length > b.length ? a : b);
    onMergeCampaigns(foldersArray, targetName);
    setSelectedFolders(new Set());
    setSelectedProjectName(targetName);
  };

  const performScan = useCallback(async (projectName: string, fileId: string, base64: string, type: string) => {
    setIsScanning(true);
    try {
      const extracted = await parseContractForDeliverables(base64, type);
      const campaign = campaigns.find(c => c.projectName === projectName);
      // Explicitly casting deliverables
      const existingDeliverables = (campaign?.deliverables as Deliverable[]) || [];
      onUpdateCampaign(projectName, { 
        deliverables: extracted.length > 0 ? [...existingDeliverables, ...extracted] : existingDeliverables,
        files: campaign?.files?.map(f => f.id === fileId ? { ...f, parsed: true } : f)
      });
    } finally { setIsScanning(false); }
  }, [campaigns, onUpdateCampaign]);

  const handleManualScan = () => {
    const unparsed = selectedCampaignData?.metadata?.files?.filter(f => f.isContract && !f.parsed) || [];
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
      onUpdateCampaign(selectedProjectName, { files: [...(campaign?.files || []), newFile] });
      if (isContract) {
        performScan(selectedProjectName, newFile.id, base64, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeDeliverable = (id: string) => { 
    if (selectedProjectName) {
      // Explicitly casting deliverables
      const deliverables = (selectedCampaignData?.metadata?.deliverables as Deliverable[]) || [];
      onUpdateCampaign(selectedProjectName, { deliverables: deliverables.filter((d: Deliverable) => d.id !== id) }); 
    }
  };
  
  const toggleDeliverableCompletion = (id: string) => {
    if (!selectedProjectName) return;
    const campaign = campaigns.find(c => c.projectName === selectedProjectName);
    // Explicitly casting deliverables
    const deliverables = (campaign?.deliverables as Deliverable[]) || [];
    const updated = deliverables.map((d: Deliverable) => 
      d.id === id ? { ...d, isCompleted: !d.isCompleted, status: !d.isCompleted ? 'Completed' : 'Pending' as any } : d
    );
    onUpdateCampaign(selectedProjectName, { deliverables: updated });
  };

  const updateDeliverableTracking = (id: string, updates: Partial<Deliverable>) => {
    if (!selectedProjectName) return;
    const campaign = campaigns.find(c => c.projectName === selectedProjectName);
    // Explicitly casting deliverables
    const deliverables = (campaign?.deliverables as Deliverable[]) || [];
    const updated = deliverables.map((d: Deliverable) => 
      d.id === id ? { ...d, ...updates } : d
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
    // Explicitly casting deliverables
    const existingDeliverables = (campaign?.deliverables as Deliverable[]) || [];
    onUpdateCampaign(selectedProjectName, {
      deliverables: [...existingDeliverables, ...newDeliverables]
    });

    setIsDeliverableModalOpen(false);
    setDeliverableForm({ name: '', rate: 0, quantity: 1, currency: 'AED', platform: 'Instagram' });
  };

  const handleAddSubmit = (e: React.FormEvent) => { e.preventDefault(); if (newProjectName.trim()) { onAddCampaign(newProjectName.trim()); setIsAddModalOpen(false); setNewProjectName(''); } };
  
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => { if (t.year) years.add(t.year.toString()); });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const uniqueClients = useMemo(() => {
    const clients = new Set<string>();
    transactions.forEach(t => { if (t.customerName) clients.add(t.customerName); });
    return Array.from(clients).sort();
  }, [transactions]);

  const filteredCampaigns = useMemo<Campaign[]>(() => {
    let list = campaigns.filter(c => {
      const matchesSearch = !searchQuery.trim() || c.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      const projectLines = transactions.filter(t => t.project === c.projectName);
      return matchesSearch && 
             (yearFilter === 'All' || projectLines.some(t => t.year.toString() === yearFilter)) && 
             (clientFilter === 'All' || projectLines.some(t => t.customerName === clientFilter));
    });

    return list.sort((a, b) => {
      const linesA = transactions.filter(t => t.project === a.projectName);
      const linesB = transactions.filter(t => t.project === b.projectName);
      
      if (sortBy === 'name') return a.projectName.localeCompare(b.projectName);
      if (sortBy === 'year') {
        const yearA = linesA.length > 0 ? Math.max(...linesA.map(t => t.year)) : 0;
        const yearB = linesB.length > 0 ? Math.max(...linesB.map(t => t.year)) : 0;
        return yearB - yearA;
      }
      if (sortBy === 'revenue') {
        const revA = linesA.reduce((sum, t) => sum + t.amount, 0);
        const revB = linesB.reduce((sum, t) => sum + t.amount, 0);
        return revB - revA;
      }
      if (sortBy === 'client') {
        const clientA = linesA.length > 0 ? linesA[0].customerName || '' : '';
        const clientB = linesB.length > 0 ? linesB[0].customerName || '' : '';
        return clientA.localeCompare(clientB);
      }
      return 0;
    });
  }, [campaigns, searchQuery, yearFilter, clientFilter, sortBy, transactions]);

  if (selectedCampaignData) {
    const { projectName, groupedLines, totals, metadata, tracking } = selectedCampaignData;
    const billingGap = totals.deliverablesValue - totals.amount;
    const currency = 'AED'; 
    return (
      <div className="h-full flex flex-col space-y-4 animate-in slide-in-from-right-10 duration-500 overflow-hidden pb-10 px-1">
        <header className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedProjectName(null)} className="p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"><ArrowLeft size={18} className="text-slate-600" /></button>
            <div className="flex items-center gap-3">
              <BrandAvatar name={projectName} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">{projectName}</h1>
                  <button onClick={() => setIsRenameModalOpen(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-primary transition-all"><Edit3 size={14} /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">Campaign Folder</span>
                </div>
              </div>
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><MoreHorizontal size={18}/></button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[7px] font-black text-slate-400 uppercase mb-1">Revenue Record</p><div className="text-base font-black text-slate-900">{formatCurrency(totals.amount, currency, showAedEquivalent)}</div></div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[7px] font-black text-primary uppercase mb-1 opacity-70">Planned Value</p><div className="text-base font-black text-primary">{formatCurrency(totals.deliverablesValue, currency, showAedEquivalent)}</div></div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[7px] font-black text-slate-400 uppercase mb-1">Delta</p><div className={`text-base font-black ${billingGap > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(Math.abs(billingGap), currency, showAedEquivalent)}</div></div>
          <div className="bg-primary p-3.5 rounded-2xl shadow-xl text-primary-foreground relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8"></div>
            <p className="text-[7px] font-black opacity-60 uppercase mb-1 relative z-10">Settled Total</p>
            <div className="text-base font-black relative z-10">{formatCurrency(totals.paid, currency, showAedEquivalent)}</div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-6 border-b border-slate-50 flex items-center justify-between bg-white flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-[280px]">
                <div className="flex items-center gap-2 shrink-0">
                  <PackageCheck size={20} className="text-teal-600" />
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">Scope Tracking</h3>
                </div>
                {tracking.totalCount > 0 && (
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[150px]">
                      <div className="h-full bg-teal-600 transition-all duration-1000" style={{ width: `${tracking.progress}%` }}></div>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                       <span className="text-xs font-black text-slate-900">{Math.round(tracking.progress)}%</span>
                       <span className="text-[10px] font-bold text-slate-400 truncate max-w-[300px]" title={tracking.summaryText}>({tracking.summaryText})</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleManualScan} disabled={isScanning} className="flex items-center gap-2 text-[9px] font-black uppercase px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-900 transition-all shadow-sm">
                  {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />} Scan
                </button>
                <button onClick={() => setIsDeliverableModalOpen(true)} className="flex items-center gap-2 text-[9px] font-black uppercase bg-teal-600 text-white px-4 py-2 rounded-xl shadow-lg hover:bg-teal-700 active:scale-95 transition-all">
                  <Plus size={14} /> Add Item
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {(() => {
                 // Explicitly casting deliverables and ensuring it's an array to resolve 'unknown' type issues.
                 const deliverables = (metadata?.deliverables as Deliverable[]) || [];
                 if (deliverables.length > 0) {
                   // Fix: Explicitly ensuring deliverables is an array before calling map to avoid 'unknown' type issues.
                   return (deliverables as Deliverable[]).map((item: Deliverable) => (
                     <div key={item.id} className={`flex flex-col gap-5 p-6 rounded-[1.8rem] border transition-all duration-300 bg-white border-slate-100 hover:shadow-md relative`}>
                       <div className="flex items-center justify-between gap-4">
                         <div className="flex items-center gap-4 flex-1 min-w-0">
                           <button 
                             onClick={() => toggleDeliverableCompletion(item.id)}
                             className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-2 shrink-0 ${item.isCompleted ? 'bg-teal-600 border-teal-600 text-white shadow-lg' : 'bg-white border-slate-100 text-transparent hover:border-teal-500 hover:bg-teal-50'}`}
                           >
                             <CheckCircle2 size={20} className={item.isCompleted ? 'opacity-100' : 'opacity-0'} />
                           </button>
                           <div className="flex-1 min-w-0">
                             <h4 className={`text-base font-black tracking-tight leading-tight ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.name}</h4>
                             <div className="flex items-center gap-3 mt-1">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.currency || 'AED'} {Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => { setDeliverableForm({ name: item.name, rate: item.rate, quantity: 1, currency: item.currency || 'AED', platform: item.platform || 'Instagram' }); setIsDeliverableModalOpen(true); }} className="p-2 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
                              <Edit3 size={18} />
                            </button>
                            <button onClick={() => removeDeliverable(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                              <Trash2 size={18} />
                            </button>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-50/50">
                         <div className="space-y-2">
                           <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Asset Link</label>
                           <div className="relative group">
                             <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-600/60 group-focus-within:text-teal-600 transition-colors">
                               <Link size={14} />
                             </div>
                             <input 
                               type="text" 
                               placeholder="Paste post URL..." 
                               className="w-full bg-slate-50/80 border-none rounded-xl pl-10 pr-3 py-3 text-xs font-bold focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all outline-none"
                               value={item.assetLink || ''}
                               onChange={(e) => updateDeliverableTracking(item.id, { assetLink: e.target.value })}
                             />
                             {item.assetLink && (
                               <a href={item.assetLink} target="_blank" rel="noopener noreferrer" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-all">
                                 <ExternalLink size={12} />
                               </a>
                             )}
                           </div>
                         </div>
                         <div className="space-y-2">
                           <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Date Published</label>
                           <div className="relative group">
                             <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-600/60 group-focus-within:text-teal-600 transition-colors pointer-events-none">
                               <Calendar size={14} />
                             </div>
                             <input 
                               type="date" 
                               className="w-full bg-slate-50/80 border-none rounded-xl pl-10 pr-8 py-3 text-xs font-bold focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all outline-none appearance-none"
                               value={item.postedDate || ''}
                               onChange={(e) => updateDeliverableTracking(item.id, { postedDate: e.target.value })}
                             />
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                                <CalendarIcon size={14} />
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))
                 } else {
                   return (
                    <div className="py-16 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] border-2 border-dashed border-slate-50 rounded-[2rem] flex flex-col items-center gap-4">
                      <PackageCheck size={48} className="opacity-10" />
                      <p>No deliverables tracked yet</p>
                    </div>
                  );
                 }
              })()}
            </div>
          </section>

          <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/20"><div className="flex items-center gap-2"><Folder size={18} className="text-teal-600" /><h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Consolidated Ledger</h3></div></div>
             <div className="p-6 space-y-6">
               {Object.entries(groupedLines).map(([groupName, lines]) => (
                 <div key={groupName} className="space-y-3">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md tracking-widest">Source: {groupName}</span>
                     <div className="h-px bg-slate-50 flex-1" />
                   </div>
                   <div className="space-y-2">
                     {lines.map(line => (
                       <div key={line.id} className="flex items-center justify-between p-4 bg-slate-50/30 rounded-xl border border-slate-100 hover:border-teal-500/10 hover:bg-white transition-all">
                         <div className="flex-1 min-w-0">
                           <p className="font-bold text-slate-900 text-xs">{line.customerName || 'Internal'}</p>
                           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{line.invoiceNumber || 'No Invoice'} • {formatDate(line.date)}</p>
                         </div>
                         <div className="text-right">
                           <p className="font-black text-slate-900 text-xs">{formatCurrency(line.amount, line.currency, showAedEquivalent)}</p>
                           <p className={`text-[8px] font-black uppercase mt-0.5 ${line.clientStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{line.clientStatus}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
          </section>

          <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4"><Paperclip size={18} className="text-teal-600" /> Campaign Assets</h3>
            <div className="space-y-2.5">
              {metadata?.files?.map(file => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-teal-500/10 hover:bg-white transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm shrink-0"><FileText size={16} /></div>
                  <div className="flex-1 min-w-0"><p className="text-[11px] font-black text-slate-900 truncate">{file.name}</p><p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">{file.size} • {formatDate(file.date)}</p></div>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="w-full mt-2 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-teal-500/30 hover:text-teal-600 transition-all"><Upload size={14}/> Upload Asset</button>
            </div>
          </section>
        </div>

        {/* Add Scope Item Modal */}
        {isDeliverableModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-md overflow-hidden border border-slate-100">
              <div className="p-7 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase tracking-widest">Add Scope Item</h2>
                <button onClick={() => setIsDeliverableModalOpen(false)} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all"><X size={18} /></button>
              </div>
              <form onSubmit={handleDeliverableSubmit} className="p-7 space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Service Type</label>
                    <div className="relative group">
                      <select 
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-teal-500 font-bold text-sm appearance-none"
                        onChange={(e) => {
                          const service = rateCard.find(s => s.name === e.target.value) || RATE_CARD_SERVICES.find(s => s.name === e.target.value);
                          if (service) {
                            setDeliverableForm({ ...deliverableForm, name: service.name, rate: service.rate });
                          } else if (e.target.value === 'Custom') {
                            setDeliverableForm({ ...deliverableForm, name: '', rate: 0 });
                          }
                        }}
                      >
                        <option value="">Select a service...</option>
                        {rateCard.length > 0 ? (
                           <>
                             <optgroup label="Extracted from Rate Card">
                               {rateCard.map(s => <option key={s.name} value={s.name}>{s.name} (AED {s.rate})</option>)}
                             </optgroup>
                             <optgroup label="Standard Services">
                               {RATE_CARD_SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                             </optgroup>
                           </>
                        ) : (
                          RATE_CARD_SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)
                        )}
                        <option value="Custom">Custom Service...</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Platform</label>
                    <div className="relative group">
                      <select 
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-teal-500 font-bold text-sm appearance-none"
                        value={deliverableForm.platform}
                        onChange={(e) => setDeliverableForm({...deliverableForm, platform: e.target.value})}
                      >
                        {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Branded Reel" 
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-teal-500 font-bold text-sm" 
                      value={deliverableForm.name} 
                      onChange={e => setDeliverableForm({...deliverableForm, name: e.target.value})} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Unit Rate</label>
                      <input 
                        type="number" 
                        required 
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-teal-500 font-bold text-sm" 
                        value={deliverableForm.rate} 
                        onChange={e => setDeliverableForm({...deliverableForm, rate: Number(e.target.value)})} 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                      <input 
                        type="number" 
                        required 
                        min="1"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-teal-500 font-bold text-sm" 
                        value={deliverableForm.quantity} 
                        onChange={e => setDeliverableForm({...deliverableForm, quantity: Number(e.target.value)})} 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-xl active:scale-95 text-[10px]">Confirm Item(s)</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && processFileUpload(e.target.files[0], false)} />
        <input type="file" ref={contractInputRef} className="hidden" accept="application/pdf,image/*" onChange={(e) => e.target.files?.[0] && processFileUpload(e.target.files[0], true)} />
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full flex flex-col overflow-hidden px-1 relative">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 shrink-0">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">Campaign Folders</h1>
          <p className="text-slate-500 font-medium text-[9px] uppercase tracking-widest opacity-60">Managing {filteredCampaigns.length} Environments</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap xl:flex-nowrap">
          <div className="relative flex-1 sm:w-56 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={14} />
            <input type="text" placeholder="Search folders..." className="w-full bg-white pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none text-[10px] font-medium shadow-sm transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          
          <select 
            className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
          >
            <option value="name">Sort: Project</option>
            <option value="year">Sort: Year</option>
            <option value="client">Sort: Client</option>
            <option value="revenue">Sort: Revenue</option>
          </select>

          <select 
            className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="All">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select 
            className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm focus:outline-none focus:ring-1 focus:ring-primary max-w-[150px]"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="All">All Clients</option>
            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="bg-white border border-slate-200 p-0.5 rounded-lg flex items-center shadow-sm shrink-0">
            <button onClick={() => setViewType('grid')} className={`p-1.5 rounded-md transition-all ${viewType === 'grid' ? 'bg-primary text-primary-foreground' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={12} /></button>
            <button onClick={() => setViewType('list')} className={`p-1.5 rounded-md transition-all ${viewType === 'list' ? 'bg-primary text-primary-foreground' : 'text-slate-400 hover:text-slate-600'}`}><List size={12} /></button>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1.5 bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-xl transition-all font-black shadow-lg active:scale-95 text-[9px] uppercase tracking-widest"><Plus size={14} /> New Folder</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-32">
        {filteredCampaigns.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-300 font-black uppercase text-[9px] tracking-[0.2em] border-2 border-dashed border-slate-100 rounded-2xl bg-white/30">
            <Search size={32} className="mb-3 opacity-5" />
            <p>No Results Found</p>
          </div>
        ) : (
          <div className={`grid gap-3 ${viewType === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' : 'grid-cols-1'}`}>
            {filteredCampaigns.map(campaign => {
              const lines = transactions.filter(t => t.project === campaign.projectName);
              const total = lines.reduce((sum, t) => sum + t.amount, 0);
              const isSelected = selectedFolders.has(campaign.projectName);
              const clientName = lines.length > 0 ? lines[0].customerName : '-';
              
              if (viewType === 'grid') {
                return (
                  <div 
                    key={campaign.projectName} 
                    onClick={() => selectedFolders.size > 0 ? toggleFolderSelection(campaign.projectName) : setSelectedProjectName(campaign.projectName)} 
                    className={`group bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 cursor-pointer relative ${isSelected ? 'border-primary ring-2 ring-primary/20 scale-[0.97]' : 'border-slate-100 hover:shadow-lg hover:-translate-y-0.5'}`}
                  >
                    <div className="p-3.5 flex-1 relative">
                      <button onClick={(e) => toggleFolderSelection(campaign.projectName, e)} className={`absolute top-2.5 right-2.5 p-1 rounded-md transition-all ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-slate-50 text-slate-200 hover:text-primary hover:bg-slate-100'}`}>{isSelected ? <CheckSquare size={12} /> : <Square size={12} />}</button>
                      <div className="mb-2.5"><BrandAvatar name={campaign.projectName} size="md" /></div>
                      <h3 className="text-[11px] font-black text-slate-900 mb-0.5 tracking-tight group-hover:text-primary transition-colors truncate pr-6">{campaign.projectName}</h3>
                      <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-tight">{clientName}</p>
                      <div className="flex wrap gap-1 mb-2.5">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{lines.length} Line{lines.length !== 1 ? 's' : ''}</span>
                        {(() => {
                          // Explicitly casting deliverables and ensuring it's an array to resolve 'unknown' type issues in the folder view.
                          const deliverables = (campaign.deliverables as Deliverable[]) || [];
                          if (deliverables.length > 0) {
                            return (
                              <span className="text-[7px] font-black text-primary uppercase tracking-widest bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{(deliverables as Deliverable[]).length} Deliverables</span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="text-[8px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10} /> {lines.length > 0 ? formatDate(lines[0]?.date) : 'Recently Created'}</div>
                    </div>
                    <div className="px-3.5 py-2.5 bg-slate-50/40 border-t border-slate-100 flex items-center justify-between"><div className="text-[10px] font-black text-slate-900">{formatCurrency(total, 'AED', showAedEquivalent)}</div><div className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Open <ArrowRight size={8}/></div></div>
                  </div>
                );
              }

              return (
                <div 
                  key={campaign.projectName} 
                  onClick={() => selectedFolders.size > 0 ? toggleFolderSelection(campaign.projectName) : setSelectedProjectName(campaign.projectName)} 
                  className={`p-2 rounded-xl border shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer group ${isSelected ? 'bg-primary/5 border-primary' : 'bg-white border-slate-100 hover:border-primary/20'}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={(e) => toggleFolderSelection(campaign.projectName, e)} className={`p-1 rounded-md transition-all shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-slate-50 text-slate-200 hover:text-primary'}`}>{isSelected ? <CheckSquare size={12} /> : <Square size={12} />}</button>
                    <BrandAvatar name={campaign.projectName} size="xs" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 text-[11px] tracking-tight group-hover:text-primary truncate">{campaign.projectName}</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">{clientName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="font-black text-slate-900 text-[11px]">{formatCurrency(total, 'AED', showAedEquivalent)}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{lines.length} Transactions</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedFolders.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-primary backdrop-blur-md p-2 rounded-[2rem] shadow-2xl flex items-center gap-1 border border-white/10 pr-2">
            <div className="px-5 py-2 flex items-center gap-3 text-primary-foreground"><div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-black text-[10px] shadow-xl">{selectedFolders.size}</div><div className="flex flex-col"><span className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-none">Folders</span><span className="text-[10px] font-bold leading-none mt-0.5">Selected</span></div></div>
            <button 
              type="button" 
              onClick={(e) => handleMerge(e)} 
              className="flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-[1.6rem] font-black text-[10px] uppercase shadow-xl hover:scale-[1.03] active:scale-95 transition-all ring-4 ring-primary/20"
            >
              <Layers size={18} /> Consolidate
            </button>
            <button type="button" onClick={() => setSelectedFolders(new Set())} className="p-2 text-primary-foreground opacity-50 hover:opacity-100 transition-opacity"><X size={20} /></button>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[1.8rem] shadow-2xl w-full max-sm overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50"><h2 className="text-lg font-black text-slate-900 tracking-tight uppercase tracking-widest">New Folder</h2><button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all"><X size={18} /></button></div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4"><div><label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Folder Name</label><input type="text" autoFocus required placeholder="e.g. Dyson Squad 2025" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary font-bold text-sm" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} /></div><button type="submit" className="w-full bg-primary hover:opacity-90 text-primary-foreground font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-xl text-[9px]">Create Folder</button></form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignTracker;
