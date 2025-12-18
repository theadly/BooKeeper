
import React, { useRef, useState, useMemo } from 'react';
import { ResourceFile, ParsedRateItem, Deliverable } from '../types';
import { 
  FileText, Upload, Download, Eye, Trash2, Sparkles, FolderHeart, 
  Info, Clock, CheckCircle, X, Calculator, Plus, Send, Loader2, FileUp,
  ChevronRight, Tag, Zap, Edit3, Save, Share2, FileDown, Globe, Landmark,
  Instagram, Youtube, Mail, Music
} from 'lucide-react';
import { formatDate, USD_TO_AED } from '../constants';
import { generateQuote } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ResourcesProps {
  resources: {
    mediaKit: ResourceFile | null;
    rateCard: ResourceFile | null;
  };
  rateCardData: ParsedRateItem[];
  onUpdateResources: (updates: Partial<{ mediaKit: ResourceFile | null; rateCard: ResourceFile | null }>) => void;
  onUpdateRateCardData: (data: ParsedRateItem[]) => void;
}

const Resources: React.FC<ResourcesProps> = ({ resources, rateCardData, onUpdateResources, onUpdateRateCardData }) => {
  const mediaKitInputRef = useRef<HTMLInputElement>(null);
  const rateCardInputRef = useRef<HTMLInputElement>(null);
  const quoteDocInputRef = useRef<HTMLInputElement>(null);
  const exportTargetRef = useRef<HTMLDivElement>(null);
  
  const [activePreview, setActivePreview] = useState<{ name: string; base64: string; type: string } | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteInput, setQuoteInput] = useState('');
  const [quoteDoc, setQuoteDoc] = useState<{ name: string, base64: string, type: string } | null>(null);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<{ clientName: string, items: Deliverable[], total: number, notes: string } | null>(null);

  // Rate Card Extended Metadata
  const [permitNumber, setPermitNumber] = useState('3367151');
  const [userName, setUserName] = useState('Laila Mourad');
  const [userTags, setUserTags] = useState('LIFESTYLE, TRAVEL, BEAUTY');
  const [userBio, setUserBio] = useState('Laila is a lifestyle, travel content creator who uses her platforms to empower women. She connects with her audience by sharing her unfiltered daily life. Laila also often lends her voice and reach to various charitable organizations and campaigns.');

  const [isEditingRateCard, setIsEditingRateCard] = useState(false);
  const [tempRateCardData, setTempRateCardData] = useState<ParsedRateItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // Currency Toggle: Default to USD
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'AED'>('USD');

  const currentYear = new Date().getFullYear();

  const handleUpload = (type: 'mediaKit' | 'rateCard', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const resource: ResourceFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
        date: new Date().toISOString().split('T')[0],
        base64
      };
      onUpdateResources({ [type]: resource });
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleQuoteDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setQuoteDoc({ name: file.name, base64, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleGetQuote = async () => {
    setIsGeneratingQuote(true);
    try {
      const result = await generateQuote(quoteInput, quoteDoc?.base64 || null, quoteDoc?.type || null, rateCardData);
      setGeneratedQuote(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  const downloadFile = (resource: ResourceFile) => {
    const link = document.createElement('a');
    link.href = `data:${resource.type};base64,${resource.base64}`;
    link.download = resource.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditingRateCard = () => {
    setTempRateCardData([...rateCardData]);
    setIsEditingRateCard(true);
  };

  const saveRateCardData = () => {
    onUpdateRateCardData(tempRateCardData);
    setIsEditingRateCard(false);
  };

  const addRateCardItem = () => {
    setTempRateCardData([...tempRateCardData, { name: 'New Service', rate: 0, unit: 'Flat Fee' }]);
  };

  const removeRateCardItem = (index: number) => {
    setTempRateCardData(tempRateCardData.filter((_, i) => i !== index));
  };

  const updateTempItem = (index: number, updates: Partial<ParsedRateItem>) => {
    const newData = [...tempRateCardData];
    newData[index] = { ...newData[index], ...updates };
    setTempRateCardData(newData);
  };

  const formatRate = (rate: number) => {
    const finalRate = displayCurrency === 'AED' ? rate * USD_TO_AED : rate;
    return finalRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const exportAsPDF = async () => {
    if (!exportTargetRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(exportTargetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F9F7F2'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${displayCurrency}_Rate_Card_${currentYear}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in slide-in-from-right-10 duration-500 overflow-hidden pb-10 px-1">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 shrink-0">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Resource Hub</h1>
          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest opacity-60">Manage your essential business assets</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsQuoteModalOpen(true)}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-2xl flex items-center gap-2 shadow-xl hover:scale-105 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"
          >
            <Calculator size={16} /> Get a Quote
          </button>
          <div className="bg-primary/5 text-primary px-4 py-2 rounded-2xl border border-primary/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Brand Health</p>
              <p className="text-[10px] font-black">Ready for {currentYear} Pitches</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-20">
        {/* Media Kit Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-500">
          <div className="p-10 flex flex-col items-center text-center space-y-8 flex-1">
            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg ${resources.mediaKit ? 'bg-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-800 text-slate-300'}`}>
              {resources.mediaKit ? <FileText size={40} /> : <FolderHeart size={40} />}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-[0.2em]">Media Kit</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Brand Deck & Portfolio</p>
            </div>

            {resources.mediaKit ? (
              <div className="w-full space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-left relative overflow-hidden group/file">
                  <div className="absolute right-0 top-0 w-1 bg-primary h-full"></div>
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{resources.mediaKit.name}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} /> {formatDate(resources.mediaKit.date)}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {resources.mediaKit.size}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => downloadFile(resources.mediaKit!)}
                    className="flex items-center justify-center gap-2 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                  >
                    <Download size={16} /> Download
                  </button>
                  <button 
                    onClick={() => setActivePreview({ name: resources.mediaKit!.name, base64: resources.mediaKit!.base64, type: resources.mediaKit!.type })}
                    className="flex items-center justify-center gap-2 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                  >
                    <Eye size={16} /> Preview
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-14 flex flex-col items-center gap-4 border-4 border-dashed border-slate-50 dark:border-slate-800 rounded-[3rem] w-full bg-slate-50/30">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Ready for Upload</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => mediaKitInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-4.5 bg-primary text-primary-foreground rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all group-hover:bg-primary/90"
            >
              <Upload size={18} /> {resources.mediaKit ? 'Replace Document' : 'Upload Media Kit'}
            </button>
          </div>
        </div>

        {/* Dynamic Rate Card Component */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-500">
          <div className="p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${resources.rateCard ? 'bg-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-800 text-slate-300'}`}>
                    <Tag size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-widest">{currentYear} Rate Card</h3>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Aesthetic Export Template</p>
                  </div>
               </div>
               <div className="flex gap-2">
                  {!isEditingRateCard ? (
                    <>
                      <button 
                        onClick={startEditingRateCard}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-primary/10 hover:text-primary transition-all text-slate-400"
                        title="Edit Info & Services"
                      >
                        <Edit3 size={18}/>
                      </button>
                      <button 
                        onClick={exportAsPDF}
                        disabled={isExporting}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all text-slate-400 disabled:opacity-50"
                        title="Export Presentable PDF"
                      >
                        {isExporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18}/>}
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={saveRateCardData}
                      className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                      title="Save Changes"
                    >
                      <Save size={18}/>
                    </button>
                  )}
               </div>
            </div>

            {/* Currency Toggle Switch */}
            <div className="mb-6 flex justify-center">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-[1.25rem] flex items-center shadow-inner border border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setDisplayCurrency('USD')}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${displayCurrency === 'USD' ? 'bg-white dark:bg-slate-700 text-primary shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className="flex items-center gap-2">
                    <Globe size={14} /> USD
                  </div>
                </button>
                <button 
                  onClick={() => setDisplayCurrency('AED')}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${displayCurrency === 'AED' ? 'bg-white dark:bg-slate-700 text-primary shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className="flex items-center gap-2">
                    <Landmark size={14} /> AED
                  </div>
                </button>
              </div>
            </div>

            {(isEditingRateCard ? tempRateCardData : rateCardData).length > 0 ? (
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 min-h-[300px] mb-6">
                
                {isEditingRateCard && (
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4 mb-6">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Rate Card Identity</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Display Name</label>
                        <input className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs font-bold" value={userName} onChange={e => setUserName(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Permit #</label>
                        <input className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs font-bold" value={permitNumber} onChange={e => setPermitNumber(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Category Tags</label>
                      <input className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs font-bold" value={userTags} onChange={e => setUserTags(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Public Bio</label>
                      <textarea className="w-full h-24 bg-white dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-xs font-medium leading-relaxed custom-scrollbar" value={userBio} onChange={e => setUserBio(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                   <div className="h-px bg-slate-100 flex-1 opacity-50"></div>
                   <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Services Breakdown ({displayCurrency})</span>
                   <div className="h-px bg-slate-100 flex-1 opacity-50"></div>
                </div>
                {(isEditingRateCard ? tempRateCardData : rateCardData).map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all group/item ${isEditingRateCard ? 'bg-white border-primary/20 shadow-md' : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 hover:border-primary/20 hover:bg-white dark:hover:bg-slate-800'}`}>
                    <div className="flex items-center gap-5 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${isEditingRateCard ? 'bg-primary text-white' : 'bg-primary/5 text-primary group-hover/item:bg-primary group-hover/item:text-white'}`}>
                        {idx + 1}
                      </div>
                      {isEditingRateCard ? (
                        <div className="flex-1 space-y-2 pr-4">
                           <input 
                             className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-1.5 text-xs font-black"
                             value={item.name}
                             onChange={(e) => updateTempItem(idx, { name: e.target.value })}
                             placeholder="Service Name"
                           />
                           <input 
                             className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase"
                             value={item.unit || ''}
                             onChange={(e) => updateTempItem(idx, { unit: e.target.value })}
                             placeholder="Unit (e.g. Flat Fee, /hr)"
                           />
                        </div>
                      ) : (
                        <div>
                          <p className="text-[14px] font-black text-slate-900 dark:text-white leading-none mb-1.5">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit: {item.unit || 'Flat Fee'}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-4">
                       {isEditingRateCard ? (
                         <div className="flex flex-col items-end gap-2">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400">USD</span>
                             <input 
                               type="number"
                               className="w-24 bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-1.5 text-xs font-black text-right"
                               value={item.rate}
                               onChange={(e) => updateTempItem(idx, { rate: Number(e.target.value) })}
                             />
                           </div>
                           <button 
                             onClick={() => removeRateCardItem(idx)}
                             className="text-rose-500 hover:text-rose-600 p-1"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                       ) : (
                         <div className="animate-in fade-in duration-500">
                           <p className="text-base font-black text-primary">{displayCurrency === 'USD' ? '$' : 'AED '} {formatRate(item.rate)}</p>
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Starting Rate</p>
                         </div>
                       )}
                    </div>
                  </div>
                ))}
                
                {isEditingRateCard && (
                  <button 
                    onClick={addRateCardItem}
                    className="w-full py-5 border-2 border-dashed border-slate-100 rounded-[1.5rem] text-[10px] font-black uppercase text-slate-400 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Add Service
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-4 border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-[2rem] mb-6">
                 <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-200">
                    <Zap size={40} className="opacity-20" />
                 </div>
                 <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No Extraction Data</p>
                    <p className="text-[9px] text-slate-300 font-bold max-w-[200px]">Upload your rate card to automatically surface service pricing.</p>
                 </div>
              </div>
            )}

            <button 
              onClick={() => rateCardInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-4.5 bg-primary text-primary-foreground rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all group-hover:bg-primary/90 mt-auto"
            >
              <Upload size={18} /> {resources.rateCard ? 'Replace Rate Card' : 'Upload Document'}
            </button>
          </div>
        </div>

        <input type="file" ref={mediaKitInputRef} className="hidden" accept="application/pdf,image/*" onChange={(e) => handleUpload('mediaKit', e)} />
        <input type="file" ref={rateCardInputRef} className="hidden" accept="application/pdf,image/*" onChange={(e) => handleUpload('rateCard', e)} />
      </div>

      {/* Hidden Export Template - REPLICATING THE PROVIDED PDF DESIGN */}
      <div className="fixed -left-[10000px] top-0">
        <div 
          ref={exportTargetRef}
          className="w-[794px] min-h-[1123px] bg-[#F9F7F2] text-slate-900 relative p-12 overflow-hidden flex flex-col"
        >
          {/* Topographic Lines Background (SVG approximation) */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
            <svg viewBox="0 0 800 1200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0 200 Q 100 150 200 200 T 400 250 T 600 200 T 800 250" fill="none" stroke="#000" strokeWidth="1" />
              <path d="M 0 300 Q 150 250 300 300 T 600 350 T 800 300" fill="none" stroke="#000" strokeWidth="1" />
              <path d="M 0 450 Q 200 400 400 450 T 800 500" fill="none" stroke="#000" strokeWidth="1" />
              <path d="M 0 700 Q 300 650 600 700 T 800 750" fill="none" stroke="#000" strokeWidth="1" />
              <path d="M 0 900 Q 400 850 800 900" fill="none" stroke="#000" strokeWidth="1" />
              <path d="M -100 600 Q 200 1200 800 600" fill="none" stroke="#000" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col flex-1">
             {/* Header */}
             <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8">Advertiser Permit #<br/>{permitNumber}</p>
                  <h1 className="text-[90px] font-serif leading-[0.8] mb-4" style={{ fontFamily: 'Georgia, serif', color: '#634A3C' }}>
                    {userName.split(' ')[0]}<br/>{userName.split(' ')[1]}
                  </h1>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] mb-8" style={{ color: '#634A3C' }}>{userTags}</p>
                  <div className="max-w-md">
                     <p className="text-sm leading-relaxed font-medium text-slate-600 mb-12">
                        {userBio}
                     </p>
                  </div>
                </div>

                {/* Right Side Oval Portrait Layout */}
                <div className="flex flex-col gap-8 items-end pr-4">
                   <div className="w-48 h-64 rounded-full border border-slate-200 overflow-hidden shadow-xl bg-slate-100 flex items-center justify-center">
                      {/* Portrait Placeholder 1 */}
                      <span className="text-[40px] opacity-10 font-serif italic text-[#634A3C]">P1</span>
                   </div>
                   <div className="w-56 h-72 rounded-full border border-slate-200 overflow-hidden shadow-xl bg-slate-100 flex items-center justify-center -mr-12">
                      {/* Portrait Placeholder 2 */}
                      <span className="text-[40px] opacity-10 font-serif italic text-[#634A3C]">P2</span>
                   </div>
                   <div className="w-40 h-56 rounded-full border border-slate-200 overflow-hidden shadow-xl bg-slate-100 flex items-center justify-center">
                      {/* Portrait Placeholder 3 */}
                      <span className="text-[40px] opacity-10 font-serif italic text-[#634A3C]">P3</span>
                   </div>
                </div>
             </div>

             {/* Rates Section */}
             <div className="mt-12 mb-16">
                <h2 className="text-2xl font-black uppercase tracking-[0.3em] mb-8" style={{ color: '#634A3C' }}>SERVICES & RATES</h2>
                <div className="space-y-4 max-w-lg">
                   {rateCardData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-end border-b border-slate-200 pb-2 group">
                         <div className="flex flex-col">
                            <span className="text-lg font-bold text-slate-800">{item.name}</span>
                            {item.unit && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">({item.unit} per set)</span>}
                         </div>
                         <div className="text-right">
                            <span className="text-lg font-black text-slate-900">{displayCurrency === 'USD' ? '$' : 'AED '} {formatRate(item.rate)}</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Footer Disclaimers */}
             <div className="mt-auto">
                <p className="text-[10px] font-bold text-slate-400 italic mb-1">Rates are subject to change depending on content & campaign</p>
                <p className="text-[10px] font-bold text-slate-400 italic mb-12">**Usage rights & boosting to be agreed on and billed separately</p>

                {/* Social Footer */}
                <div className="flex items-center gap-10 border-t border-slate-200 pt-8">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400"><Instagram size={20}/></div>
                      <div className="w-12 h-12 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400"><Music size={20}/></div>
                      <div className="w-12 h-12 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400"><Youtube size={20}/></div>
                      <div className="w-12 h-12 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400"><Mail size={20}/></div>
                   </div>
                   <div className="h-10 w-px bg-slate-200" />
                   <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">GET IN TOUCH</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Quote Modal */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Calculator className="text-primary" />
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-widest">Generate Quote</h2>
              </div>
              <button onClick={() => { setIsQuoteModalOpen(false); setGeneratedQuote(null); setQuoteDoc(null); setQuoteInput(''); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {!generatedQuote ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Quotation Request (Brief/Text)</label>
                    <textarea 
                      placeholder="e.g. Dyson wants 3 Reels and 5 Stories for their 2025 launch. Include a shoot day if needed..."
                      className="w-full h-40 bg-slate-50 dark:bg-slate-800 border-none rounded-3xl p-6 text-sm font-bold focus:ring-2 focus:ring-primary outline-none custom-scrollbar"
                      value={quoteInput}
                      onChange={(e) => setQuoteInput(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Reference Document (Optional)</label>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => quoteDocInputRef.current?.click()}
                        className={`flex-1 flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-3xl transition-all ${quoteDoc ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-primary'}`}
                      >
                        {quoteDoc ? <CheckCircle className="text-emerald-500" /> : <FileUp className="text-slate-400" />}
                        <span className={`text-[11px] font-black uppercase tracking-widest ${quoteDoc ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {quoteDoc ? quoteDoc.name : 'Upload Brief/Contract'}
                        </span>
                      </button>
                      {quoteDoc && (
                        <button onClick={() => setQuoteDoc(null)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <input type="file" ref={quoteDocInputRef} className="hidden" accept="application/pdf,image/*" onChange={handleQuoteDocUpload} />
                  </div>

                  <button 
                    onClick={handleGetQuote}
                    disabled={isGeneratingQuote || (!quoteInput.trim() && !quoteDoc)}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {isGeneratingQuote ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    {isGeneratingQuote ? 'Analyzing Requirements...' : 'Generate Quote'}
                  </button>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{generatedQuote.clientName}</h3>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Quotation Breakdown</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-primary">AED {generatedQuote.total.toLocaleString()}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Grand Total</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {generatedQuote.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center font-black text-[10px] text-primary">{idx + 1}</div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{item.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Qty: {item.quantity} • AED {item.rate.toLocaleString()} ea.</p>
                          </div>
                        </div>
                        <p className="font-black text-slate-900 dark:text-white">AED {(item.rate * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  {generatedQuote.notes && (
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                      <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-widest mb-2 flex items-center gap-2"><Info size={14}/> Analyst Notes</p>
                      <p className="text-xs text-amber-800 dark:text-amber-200 font-bold leading-relaxed">{generatedQuote.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-4">
                    <button 
                      onClick={() => setGeneratedQuote(null)}
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                      Back to Editor
                    </button>
                    <button 
                      onClick={() => { /* Potential logic to create a campaign from quote */ setIsQuoteModalOpen(false); setGeneratedQuote(null); }}
                      className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-600 transition-all active:scale-95"
                    >
                      Export to Campaign
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activePreview && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-8" onClick={() => setActivePreview(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <FileText className="text-primary" />
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-widest">{activePreview.name}</h2>
              </div>
              <button onClick={() => setActivePreview(null)} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:scale-110 transition-transform">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden relative">
              {activePreview.type.startsWith('image/') ? (
                <div className="w-full h-full flex items-center justify-center p-10 overflow-auto">
                  <img src={`data:${activePreview.type};base64,${activePreview.base64}`} alt={activePreview.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                </div>
              ) : (
                <iframe 
                  src={`data:${activePreview.type};base64,${activePreview.base64}`}
                  className="w-full h-full border-none"
                  title="Document Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
