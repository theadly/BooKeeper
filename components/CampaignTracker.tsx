
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
    const colors = [
      'bg-blue-50 text-blue-600 border-blue-100',
      'bg-indigo-50 text-indigo-600 border-indigo-100',
      'bg-teal-50 text-teal-600 border-teal-100',
      'bg-rose-50 text-rose-600 border-rose-100',
      'bg-amber-50 text-amber-600 border-amber-100',
      'bg-violet-50 text-violet-600 border-violet-100',
      'bg-emerald-50 text-emerald-600 border-emerald-100'
    ];
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
  if (error || !name) return (
    <div className={`${sizeClasses[size]} ${getAvatarColor(name || 'B')} border flex items-center justify-center font-bold shadow-sm shrink-0`}>
      {initials}
    </div>
  );
  return (
    <div className={`${sizeClasses[size]} bg-surface-container-lowest border border-surface-container flex items-center justify-center shadow-sm overflow-hidden shrink-0 transition-all duration-500`}>
      <img src={logoUrl} alt={name} className="w-full h-full object-contain p-1" onError={() => setError(true)} />
    </div>
  );
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
    if (e) { e.preventDefault(); e.stopPropagation(); }
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
          explodedDeliverables.push({ ...item, id: crypto.randomUUID(), name: `${cleanName}${suffix}`, quantity: 1, rate: unitRate, isCompleted: false, status: 'Pending' });
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
      const newFile: CampaignFile = { id: crypto.randomUUID(), name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, type: file.type, date: new Date().toISOString().split('T')[0], isContract, parsed: false, base64 };
      const campaign = campaigns.find(c => c.projectName === selectedProjectName);
      const currentFiles = Array.isArray(campaign?.files) ? campaign!.files : [];
      onUpdateCampaign(selectedProjectName, { files: [...currentFiles, newFile] });
      if (isContract) performScan(selectedProjectName, newFile.id, base64, file.type);
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
    const updated = deliverables.map((d: Deliverable) => d && d.id === id ? { ...d, ...updates } : d);
    onUpdateCampaign(selectedProjectName, { deliverables: updated });
  };

  const handleDeliverableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectName || !deliverableForm.name) return;
    const quantity = Math.max(1, Number(deliverableForm.quantity));
    const newDeliverables: Deliverable[] = [];
    for (let i = 0; i < quantity; i++) {
      const name = quantity > 1 ? `${deliverableForm.name} ${i + 1}/${quantity}` : deliverableForm.name;
      newDeliverables.push({ id: crypto.randomUUID(), name, rate: Number(deliverableForm.rate), quantity: 1, currency: deliverableForm.currency, platform: deliverableForm.platform, status: 'Pending', isCompleted: false });
    }
    const campaign = campaigns.find(c => c.projectName === selectedProjectName);
    const existingDeliverables: Deliverable[] = (campaign?.deliverables || []) as Deliverable[];
    onUpdateCampaign(selectedProjectName, { deliverables: [...existingDeliverables, ...newDeliverables] });
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

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) { onAddCampaign(newProjectName.trim()); setIsAddModalOpen(false); setNewProjectName(''); }
  };

  const filteredCampaigns = useMemo<Campaign[]>(() => {
    const list = campaigns.filter((c: Campaign) => {
      const matchesSearch = !searchQuery.trim() || c.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      const mergedSources = c.mergedSources || [];
      const projectLines: Transaction[] = transactions.filter((t: Transaction) => t.project === c.projectName || mergedSources.includes(t.project));
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
    if (selectedFolders.size > 0) toggleFolderSelection(projectName);
    else setSelectedProjectName(projectName);
  };

  // ── CAMPAIGN DETAIL VIEW ──────────────────────────────────────────────────
  if (selectedCampaignData) {
    const { projectName, groupedLines, totals, metadata, tracking } = selectedCampaignData;
    const billingGap = totals.deliverablesValue - totals.amount;
    const currency = 'AED';
    return (
      <div className="h-full flex flex-col space-y-5 animate-in slide-in-from-right-10 duration-300 overflow-hidden pb-10 px-1">

        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedProjectName(null)} className="p-2 hover:bg-surface-container rounded-xl transition-all text-on-surface-variant hover:text-on-background">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <BrandAvatar name={projectName} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-xl text-on-background leading-none truncate max-w-[200px] sm:max-w-none">{projectName}</h1>
                  <button onClick={() => { setEditProjectName(projectName); setIsRenameModalOpen(true); }} className="p-1 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-primary transition-all">
                    <Edit3 size={13} />
                  </button>
                </div>
                <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">Campaign Folder</p>
              </div>
            </div>
          </div>
        </header>

        {/* Rename Modal */}
        {isRenameModalOpen && (
          <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsRenameModalOpen(false)}>
            <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-xl p-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-xl text-on-background">Rename</h2>
                <button onClick={() => setIsRenameModalOpen(false)} className="text-on-surface-variant hover:text-on-background"><X size={18}/></button>
              </div>
              <form onSubmit={handleRenameSubmit} className="space-y-4">
                <input autoFocus required className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-medium text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={editProjectName} onChange={e => setEditProjectName(e.target.value)} />
                <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-full font-semibold text-sm shadow-sm hover:bg-primary-dim transition-colors">Update Globally</button>
              </form>
            </div>
          </div>
        )}

        {/* Add Deliverable Modal */}
        {isDeliverableModalOpen && (
          <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsDeliverableModalOpen(false)}>
            <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-xl p-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-xl text-on-background">Add Deliverable</h2>
                <button onClick={() => setIsDeliverableModalOpen(false)} className="text-on-surface-variant hover:text-on-background"><X size={18}/></button>
              </div>
              <form onSubmit={handleDeliverableSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Service Name</label>
                  <input required className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-medium text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={deliverableForm.name} onChange={e => setDeliverableForm({...deliverableForm, name: e.target.value})} placeholder="e.g. IG Reel" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Qty</label>
                    <input type="number" min="1" required className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-medium text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={deliverableForm.quantity} onChange={e => setDeliverableForm({...deliverableForm, quantity: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Rate</label>
                    <input type="number" required className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-medium text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={deliverableForm.rate} onChange={e => setDeliverableForm({...deliverableForm, rate: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-full font-semibold text-sm shadow-sm hover:bg-primary-dim transition-colors">Add to Tracker</button>
              </form>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Invoiced', val: totals.amount, color: 'text-on-background', sub: 'Total on Record' },
            { label: 'Planned', val: totals.deliverablesValue, color: 'text-primary', sub: 'Scope Value' },
            { label: 'Delta', val: Math.abs(billingGap), color: billingGap > 0 ? 'text-error' : 'text-emerald-600', sub: billingGap > 0 ? 'Under-billed' : 'Over-billed' },
          ].map((kpi, i) => (
            <div key={i} className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container shadow-sm">
              <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider mb-2">{kpi.label}</p>
              <p className={`font-serif text-lg ${kpi.color}`}>{formatCurrency(kpi.val, currency, showAedEquivalent)}</p>
              <p className="text-[8px] text-on-surface-variant mt-1">{kpi.sub}</p>
            </div>
          ))}
          <div className="bg-gradient-to-br from-primary to-primary-dim p-4 rounded-xl shadow-sm text-on-primary">
            <p className="text-[8px] font-medium text-on-primary/70 uppercase tracking-wider mb-2">Settled</p>
            <p className="font-serif text-lg">{formatCurrency(totals.paid, currency, showAedEquivalent)}</p>
            <p className="text-[8px] text-on-primary/60 mt-1">Received</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-10 space-y-5">
          {/* Scope Tracking */}
          <section className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-surface-container flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full">
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="p-2 bg-surface-container rounded-lg text-on-surface-variant"><PackageCheck size={16} /></div>
                  <div>
                    <h3 className="font-serif text-base text-on-background">Scope Tracking</h3>
                    <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">Deliverables</p>
                  </div>
                </div>
                {tracking.totalCount > 0 && (
                  <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                    <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden max-w-[160px]">
                      <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${tracking.progress}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-on-background">{Math.round(tracking.progress)}%</span>
                    <span className="hidden sm:inline text-[9px] text-on-surface-variant truncate max-w-[180px]">{tracking.summaryText}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button onClick={handleManualScan} disabled={isScanning} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[9px] font-medium uppercase px-4 py-2 rounded-full border border-surface-container-high hover:bg-surface-container text-on-surface-variant transition-all">
                  {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />} Scan
                </button>
                <button onClick={() => setIsDeliverableModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[9px] font-medium uppercase bg-primary text-on-primary px-4 py-2 rounded-full shadow-sm hover:bg-primary-dim transition-colors">
                  <Plus size={12} /> Add Item
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {(() => {
                const itemsList: Deliverable[] = (metadata?.deliverables || []) as Deliverable[];
                if (itemsList.length > 0) {
                  return itemsList.map((item: Deliverable) => (
                    item && (
                      <div key={item.id} className="flex flex-col gap-3 p-4 rounded-xl border border-surface-container bg-surface-container-lowest hover:bg-surface-container-low transition-all">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button onClick={() => toggleDeliverableCompletion(item.id)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border shrink-0 ${item.isCompleted ? 'bg-primary border-primary text-on-primary' : 'bg-surface-container border-surface-container-high text-transparent hover:border-primary/40'}`}>
                              <CheckCircle2 size={14} className={item.isCompleted ? 'opacity-100' : 'opacity-0'} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <input
                                className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium leading-tight outline-none ${item.isCompleted ? 'text-on-surface-variant line-through' : 'text-on-background'}`}
                                value={item.name}
                                onChange={(e) => updateDeliverableTracking(item.id, { name: e.target.value })}
                              />
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] text-on-surface-variant uppercase tracking-wider">{item.currency || 'AED'}</span>
                                <input
                                  type="number"
                                  className="w-20 bg-surface-container rounded px-1.5 py-0.5 text-[9px] font-medium focus:ring-1 focus:ring-primary/20 text-on-background outline-none border-none"
                                  value={item.rate}
                                  onChange={(e) => updateDeliverableTracking(item.id, { rate: Number(e.target.value) })}
                                />
                              </div>
                            </div>
                          </div>
                          <button onClick={() => removeDeliverable(item.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-surface-container">
                          <div className="space-y-1">
                            <label className="block text-[8px] font-medium uppercase text-on-surface-variant tracking-wider">Asset Link</label>
                            <div className="relative">
                              <Link size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                              <input type="text" placeholder="Paste URL..." className="w-full bg-surface-container-low border-none rounded-lg pl-8 pr-3 py-2 text-[10px] font-medium focus:ring-1 focus:ring-primary/20 text-on-background outline-none" value={item.assetLink || ''} onChange={(e) => updateDeliverableTracking(item.id, { assetLink: e.target.value })} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[8px] font-medium uppercase text-on-surface-variant tracking-wider">Published</label>
                            <div className="relative">
                              <Calendar size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                              <input type="date" className="w-full bg-surface-container-low border-none rounded-lg pl-8 pr-3 py-2 text-[10px] font-medium focus:ring-1 focus:ring-primary/20 text-on-background outline-none appearance-none" value={item.postedDate || ''} onChange={(e) => updateDeliverableTracking(item.id, { postedDate: e.target.value })} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ));
                }
                return (
                  <div className="py-12 text-center flex flex-col items-center gap-3">
                    <PackageCheck size={32} className="text-on-surface-variant opacity-20" />
                    <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">No deliverables tracked yet</p>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Consolidated Ledger */}
          <section className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-surface-container flex items-center gap-2.5">
              <div className="p-2 bg-surface-container rounded-lg text-on-surface-variant"><Folder size={16} /></div>
              <div>
                <h3 className="font-serif text-base text-on-background">Consolidated Ledger</h3>
                <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider">Linked invoices</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {(Object.entries(groupedLines) as [string, Transaction[]][]).map(([groupName, lines]) => (
                <div key={groupName} className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-medium uppercase text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg tracking-wider">
                      {groupName === projectName ? 'Direct' : `From: ${groupName}`}
                    </span>
                    <div className="h-px bg-surface-container flex-1" />
                  </div>
                  {lines.map(line => (
                    <div key={line.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-on-background text-xs truncate">{line.customerName || 'Internal'}</p>
                        <p className="text-[9px] text-on-surface-variant font-medium mt-0.5">{line.invoiceNumber || 'No Inv'} · {formatDate(line.date)}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="font-serif text-sm text-on-background">{formatCurrency(line.amount, line.currency, showAedEquivalent)}</p>
                        <p className={`text-[8px] font-semibold uppercase mt-0.5 ${line.clientStatus === 'Paid' ? 'text-primary' : 'text-amber-600'}`}>{line.clientStatus}</p>
                      </div>
                    </div>
                  ))}
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

  // ── CAMPAIGNS LIST VIEW ───────────────────────────────────────────────────
  return (
    <div className="space-y-5 h-full flex flex-col overflow-hidden px-1 relative">

      {/* Page Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-serif text-2xl text-on-background leading-none">Campaigns</h1>
          <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">{filteredCampaigns.length} Projects</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={13} />
            <input type="text" placeholder="Search campaigns..." className="w-full bg-surface-container-low pl-9 pr-4 py-2.5 border-none rounded-full focus:ring-2 focus:ring-primary/20 outline-none text-[10px] font-medium text-on-background placeholder-on-surface-variant" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select className="flex-1 sm:flex-none bg-surface-container-low border-none rounded-full px-4 py-2.5 text-[10px] font-medium text-on-background focus:outline-none focus:ring-2 focus:ring-primary/20" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortType)}>
              <option value="name">Sort: Name</option>
              <option value="year">Sort: Year</option>
              <option value="revenue">Sort: Revenue</option>
            </select>
            <div className="hidden sm:flex bg-surface-container-low p-1 rounded-full items-center gap-0.5 shrink-0">
              <button onClick={() => setViewType('grid')} className={`p-1.5 rounded-full transition-all ${viewType === 'grid' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-background'}`}><LayoutGrid size={12} /></button>
              <button onClick={() => setViewType('list')} className={`p-1.5 rounded-full transition-all ${viewType === 'list' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-background'}`}><List size={12} /></button>
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-primary text-on-primary px-4 py-2.5 rounded-full font-medium shadow-sm hover:bg-primary-dim transition-colors text-[10px] uppercase tracking-wider whitespace-nowrap">
              <Plus size={13} /> New Folder
            </button>
          </div>
        </div>
      </header>

      {/* Campaigns by Year */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-32 space-y-8">
        {campaignsByYear.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-xl border border-surface-container">
            <Search size={28} className="text-on-surface-variant opacity-20" />
            <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">No campaigns found</p>
          </div>
        ) : (
          campaignsByYear.map(([year, campaignsList]: [string, Campaign[]]) => (
            <div key={year} className="space-y-3">
              {/* Year Divider */}
              <div className="flex items-center gap-3 sticky top-0 bg-bg-page z-20 py-2">
                <span className="font-serif text-lg text-on-background">{year}</span>
                <div className="h-px bg-surface-container flex-1" />
                <span className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider bg-surface-container-lowest border border-surface-container px-2.5 py-1 rounded-full">
                  {campaignsList.length} campaign{campaignsList.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className={`grid gap-3 ${viewType === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                {campaignsList.map((campaign: Campaign) => {
                  const merged = campaign.mergedSources || [];
                  const lines: Transaction[] = transactions.filter(t => t.project === campaign.projectName || merged.includes(t.project));
                  const total = lines.reduce((sum, t) => sum + t.amount, 0);
                  const isSelected = selectedFolders.has(campaign.projectName);
                  const clientName = lines.length > 0 ? (lines[0] as Transaction).customerName : '—';

                  if (viewType === 'grid') {
                    return (
                      <div
                        key={campaign.projectName}
                        onClick={() => handleCardClick(campaign.projectName)}
                        className={`group bg-surface-container-lowest border rounded-xl shadow-sm overflow-hidden flex flex-col transition-all duration-200 cursor-pointer relative ${isSelected ? 'border-primary ring-2 ring-primary/20 scale-[0.97]' : 'border-surface-container hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5'}`}
                      >
                        <div className="p-4 flex-1 relative">
                          <button onClick={(e) => toggleFolderSelection(campaign.projectName, e)} className={`absolute top-3 right-3 p-1 rounded-lg transition-all ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-primary'}`}>
                            {isSelected ? <CheckSquare size={11} /> : <Square size={11} />}
                          </button>
                          <div className="mb-3"><BrandAvatar name={campaign.projectName} size="md" /></div>
                          <h3 className="text-[11px] font-semibold text-on-background mb-0.5 tracking-tight group-hover:text-primary transition-colors truncate pr-7">{campaign.projectName}</h3>
                          <p className="text-[9px] font-medium text-on-surface-variant mb-3 uppercase truncate">{clientName}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="text-[7px] font-medium text-on-surface-variant uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-full">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
                            {merged.length > 0 && <span className="text-[7px] font-medium text-primary uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-full">{merged.length} merged</span>}
                          </div>
                        </div>
                        <div className="px-4 py-3 bg-surface-container-low border-t border-surface-container flex items-center justify-between">
                          <p className="font-serif text-sm text-on-background">{formatCurrency(total, 'AED', showAedEquivalent)}</p>
                          <span className="text-[8px] font-medium text-on-surface-variant flex items-center gap-1 group-hover:text-primary transition-colors">Open <ArrowRight size={8}/></span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={campaign.projectName}
                      onClick={() => handleCardClick(campaign.projectName)}
                      className={`p-3.5 rounded-xl border shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer group ${isSelected ? 'bg-primary/5 border-primary' : 'bg-surface-container-lowest border-surface-container hover:border-primary/20 hover:shadow-md'}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button onClick={(e) => toggleFolderSelection(campaign.projectName, e)} className={`p-1 rounded-lg transition-all shrink-0 ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-primary'}`}>
                          {isSelected ? <CheckSquare size={11} /> : <Square size={11} />}
                        </button>
                        <BrandAvatar name={campaign.projectName} size="xs" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-on-background text-[11px] tracking-tight group-hover:text-primary transition-colors truncate">{campaign.projectName}</h4>
                          <p className="text-[8px] font-medium text-on-surface-variant uppercase truncate">{clientName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden xs:block">
                          <p className="font-serif text-[11px] text-on-background">{formatCurrency(total, 'AED', showAedEquivalent)}</p>
                          <p className="text-[8px] font-medium text-on-surface-variant uppercase">{lines.length} Lines</p>
                        </div>
                        <ChevronRight size={14} className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Consolidate Floating Bar */}
      {selectedFolders.size > 0 && (
        <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-bottom-5 duration-300 w-full max-w-sm px-4 sm:px-0" onClick={(e) => e.stopPropagation()}>
          <div className="bg-primary p-2 rounded-2xl shadow-2xl flex items-center gap-1 pr-2">
            <div className="px-4 py-2 flex items-center gap-3 text-on-primary">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center font-semibold text-[10px]">{selectedFolders.size}</div>
              <div>
                <span className="text-[8px] font-medium opacity-60 uppercase tracking-widest block leading-none">Selected</span>
                <span className="text-[10px] font-semibold leading-none mt-0.5 block">Campaigns</span>
              </div>
            </div>
            <button type="button" onClick={(e) => handleMerge(e)} className="flex-1 flex items-center justify-center gap-2 bg-white text-primary px-5 py-2.5 rounded-xl font-semibold text-[10px] uppercase shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
              <Layers size={14} /> Consolidate
            </button>
            <button type="button" onClick={() => setSelectedFolders(new Set())} className="p-2 text-on-primary opacity-50 hover:opacity-100 transition-opacity">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Add Folder Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-xl p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-xl text-on-background">New Campaign</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-on-surface-variant hover:text-on-background"><X size={18}/></button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <input autoFocus required className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm font-medium text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g. Dyson V15 Launch" />
              <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-full font-semibold text-sm shadow-sm hover:bg-primary-dim transition-colors">Create Workspace</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignTracker;
