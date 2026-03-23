
import React, { useRef, useState, useEffect } from 'react';
import { ResourceFile, ParsedRateItem, Deliverable } from '../types';
import {
  FileText, Upload, Download, Eye, Trash2, Sparkles, FolderHeart,
  Clock, X, Calculator, Plus, Send, Loader2,
  Tag, Edit3, Save, FileDown, Globe, Landmark
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

  const [permitNumber, setPermitNumber] = useState(() => localStorage.getItem('rc_permit') || '3367151');
  const [userName, setUserName] = useState(() => localStorage.getItem('rc_name') || 'Laila Mourad');
  const [userTags, setUserTags] = useState(() => localStorage.getItem('rc_tags') || 'LIFESTYLE, TRAVEL, BEAUTY');
  const [userBio, setUserBio] = useState(() => localStorage.getItem('rc_bio') || 'Laila is a lifestyle, travel content creator who uses her platforms to empower women. She connects with her audience by sharing her unfiltered daily life.');

  useEffect(() => {
    localStorage.setItem('rc_permit', permitNumber);
    localStorage.setItem('rc_name', userName);
    localStorage.setItem('rc_tags', userTags);
    localStorage.setItem('rc_bio', userBio);
  }, [permitNumber, userName, userTags, userBio]);

  const [isEditingRateCard, setIsEditingRateCard] = useState(false);
  const [tempRateCardData, setTempRateCardData] = useState<ParsedRateItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'AED'>('USD');

  const currentYear = new Date().getFullYear();

  const handleUpload = (type: 'mediaKit' | 'rateCard', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For rate card: if it's a CSV or Excel file, parse it for rate items
    if (type === 'rateCard' && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      if (file.name.endsWith('.csv')) {
        const textReader = new FileReader();
        textReader.onload = () => {
          const text = textReader.result as string;
          const parsed = parseCSVRateCard(text);
          if (parsed.length > 0) onUpdateRateCardData(parsed);
        };
        textReader.readAsText(file);
      } else {
        // For Excel files, use xlsx library
        const arrayReader = new FileReader();
        arrayReader.onload = async () => {
          try {
            const XLSX = await import('xlsx');
            const wb = XLSX.read(arrayReader.result, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const parsed = parseExcelRateCard(rows);
            if (parsed.length > 0) onUpdateRateCardData(parsed);
          } catch (err) { console.error('Failed to parse Excel rate card:', err); }
        };
        arrayReader.readAsArrayBuffer(file);
      }
    }

    // Always store the file as a resource
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const resource: ResourceFile = {
        id: crypto.randomUUID(),
        name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, type: file.type, date: new Date().toISOString().split('T')[0], base64
      };
      onUpdateResources({ [type]: resource });
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const parseCSVRateCard = (text: string): ParsedRateItem[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const items: ParsedRateItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 2) {
        const name = cols[0];
        const rate = parseFloat(cols[1].replace(/[^0-9.]/g, ''));
        const unit = cols[2] || undefined;
        if (name && !isNaN(rate)) items.push({ name, rate, unit });
      }
    }
    return items;
  };

  const parseExcelRateCard = (rows: any[][]): ParsedRateItem[] => {
    if (rows.length < 2) return [];
    const items: ParsedRateItem[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      const name = String(row[0] || '').trim();
      const rate = parseFloat(String(row[1] || '').replace(/[^0-9.]/g, ''));
      const unit = row[2] ? String(row[2]).trim() : undefined;
      if (name && !isNaN(rate)) items.push({ name, rate, unit });
    }
    return items;
  };

  const handleQuoteDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setQuoteDoc({ name: file.name, base64: (reader.result as string).split(',')[1], type: file.type });
      reader.readAsDataURL(file);
    }
  };

  const handleGetQuote = async () => {
    setIsGeneratingQuote(true);
    try {
      const result = await generateQuote(quoteInput, quoteDoc?.base64 || null, quoteDoc?.type || null, rateCardData);
      setGeneratedQuote(result);
    } catch (err) { console.error(err); } finally { setIsGeneratingQuote(false); }
  };

  const downloadFile = (resource: ResourceFile) => {
    const link = document.createElement('a');
    link.href = `data:${resource.type};base64,${resource.base64}`; link.download = resource.name;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const startEditingRateCard = () => { setTempRateCardData([...rateCardData]); setIsEditingRateCard(true); };
  const saveRateCardData = () => { onUpdateRateCardData(tempRateCardData); setIsEditingRateCard(false); };
  const addRateCardItem = () => setTempRateCardData([...tempRateCardData, { name: 'New Service', rate: 0, unit: 'Flat Fee' }]);
  const removeRateCardItem = (index: number) => setTempRateCardData(tempRateCardData.filter((_, i) => i !== index));
  const updateTempItem = (index: number, updates: Partial<ParsedRateItem>) => {
    const newData = [...tempRateCardData]; newData[index] = { ...newData[index], ...updates }; setTempRateCardData(newData);
  };

  const formatRate = (rate: number) => {
    const finalRate = displayCurrency === 'AED' ? rate * USD_TO_AED : rate;
    return finalRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const exportAsPDF = async () => {
    if (!exportTargetRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportTargetRef.current, { scale: 2, useCORS: true, backgroundColor: '#F9F7F2' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${displayCurrency}_Rate_Card_${currentYear}.pdf`);
    } catch (err) { console.error(err); } finally { setIsExporting(false); }
  };

  const servicesToDisplay = isEditingRateCard ? tempRateCardData : rateCardData;

  return (
    <div className="h-full flex flex-col space-y-5 animate-fade-in overflow-hidden pb-10 px-1">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-serif text-2xl text-on-background leading-none">Resource Hub</h1>
          <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">Manage your essential business assets</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsQuoteModalOpen(true)} className="bg-primary text-on-primary px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm hover:bg-primary-dim transition-colors font-medium text-[10px] uppercase tracking-wider">
            <Calculator size={14} /> Get a Quote
          </button>
          <div className="bg-primary/5 text-primary px-4 py-2 rounded-xl border border-primary/10 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm"><Sparkles size={14} /></div>
            <div>
              <p className="text-[8px] font-medium uppercase tracking-widest text-on-surface-variant leading-none mb-0.5">Brand Health</p>
              <p className="text-[10px] font-semibold text-on-background">Ready for {currentYear} Pitches</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-20">
        {/* Media Kit Card */}
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 flex flex-col items-center text-center space-y-6 flex-1">
            <div className={`w-20 h-20 rounded-xl flex items-center justify-center transition-all shadow-sm ${resources.mediaKit ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
              {resources.mediaKit ? <FileText size={32} /> : <FolderHeart size={32} />}
            </div>
            <div>
              <h3 className="font-serif text-xl text-on-background mb-1">Media Kit</h3>
              <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">Brand Deck &amp; Portfolio</p>
            </div>
            {resources.mediaKit ? (
              <div className="w-full space-y-4 animate-fade-in">
                <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container text-left">
                  <p className="text-xs font-semibold text-on-background truncate">{resources.mediaKit.name}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> {formatDate(resources.mediaKit.date)}</span>
                    <span className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider">{resources.mediaKit.size}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => downloadFile(resources.mediaKit!)} className="flex items-center justify-center gap-2 py-3 bg-surface-container-low border border-surface-container rounded-xl text-[10px] font-medium uppercase tracking-wider hover:bg-surface-container transition-colors"><Download size={14} /> Download</button>
                  <button onClick={() => setActivePreview({ name: resources.mediaKit!.name, base64: resources.mediaKit!.base64, type: resources.mediaKit!.type })} className="flex items-center justify-center gap-2 py-3 bg-surface-container-low border border-surface-container rounded-xl text-[10px] font-medium uppercase tracking-wider hover:bg-surface-container transition-colors"><Eye size={14} /> Preview</button>
                </div>
              </div>
            ) : (
              <button onClick={() => mediaKitInputRef.current?.click()} className="py-12 flex flex-col items-center gap-3 border-2 border-dashed border-surface-container rounded-xl w-full hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                <Upload size={24} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest group-hover:text-primary transition-colors">Click to Upload Media Kit</p>
              </button>
            )}
          </div>
          <div className="p-5 bg-surface-container-low border-t border-surface-container">
            <button onClick={() => mediaKitInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-full text-[10px] font-medium uppercase tracking-wider shadow-sm hover:bg-primary-dim transition-colors">
              <Upload size={15} /> {resources.mediaKit ? 'Replace Document' : 'Upload Media Kit'}
            </button>
          </div>
        </div>

        {/* Rate Card */}
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${resources.rateCard ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}><Tag size={20} /></div>
                <div>
                  <h3 className="font-serif text-lg text-on-background leading-none">{currentYear} Rate Card</h3>
                  <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest mt-0.5">Aesthetic Export Template</p>
                </div>
              </div>
              <div className="flex gap-2">
                {!isEditingRateCard ? (
                  <>
                    <button onClick={startEditingRateCard} className="p-2.5 bg-surface-container-low rounded-xl hover:bg-primary/10 hover:text-primary transition-all text-on-surface-variant border border-surface-container" title="Edit Services"><Edit3 size={15}/></button>
                    <button onClick={exportAsPDF} disabled={isExporting} className="p-2.5 bg-surface-container-low rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all text-on-surface-variant disabled:opacity-50 border border-surface-container" title="Export PDF">{isExporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15}/>}</button>
                  </>
                ) : (
                  <button onClick={saveRateCardData} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-200" title="Save"><Save size={15}/></button>
                )}
              </div>
            </div>

            <div className="mb-5 flex justify-center shrink-0">
              <div className="bg-surface-container-low p-1 rounded-full flex items-center border border-surface-container">
                <button onClick={() => setDisplayCurrency('USD')} className={`px-6 py-2 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${displayCurrency === 'USD' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}><div className="flex items-center gap-1.5"><Globe size={12} /> USD</div></button>
                <button onClick={() => setDisplayCurrency('AED')} className={`px-6 py-2 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${displayCurrency === 'AED' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}><div className="flex items-center gap-1.5"><Landmark size={12} /> AED</div></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 px-1">
              {isEditingRateCard && (
                <div className="p-5 bg-surface-container-low rounded-xl border border-surface-container space-y-3 mb-5">
                  <p className="text-[9px] font-medium uppercase text-on-surface-variant tracking-widest">Rate Card Identity</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Name</label>
                      <input className="w-full bg-surface-container-lowest border border-surface-container rounded-lg px-3 py-2 text-xs font-medium text-on-background focus:ring-1 focus:ring-primary outline-none" value={userName} onChange={e => setUserName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Permit #</label>
                      <input className="w-full bg-surface-container-lowest border border-surface-container rounded-lg px-3 py-2 text-xs font-medium text-on-background focus:ring-1 focus:ring-primary outline-none" value={permitNumber} onChange={e => setPermitNumber(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Bio</label>
                    <textarea className="w-full h-20 bg-surface-container-lowest border border-surface-container rounded-lg px-3 py-2 text-xs font-medium text-on-background custom-scrollbar focus:ring-1 focus:ring-primary outline-none" value={userBio} onChange={e => setUserBio(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="space-y-2.5 pb-6">
                {servicesToDisplay.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isEditingRateCard ? 'bg-surface-container-low border-primary/20' : 'bg-surface-container-low border-surface-container'}`}>
                    <div className="flex-1 space-y-1.5">
                      {isEditingRateCard ? (
                        <>
                          <input className="w-full bg-surface-container-lowest border border-surface-container rounded-lg px-3 py-1.5 text-xs font-semibold text-on-background focus:ring-1 focus:ring-primary outline-none" value={item.name} onChange={(e) => updateTempItem(idx, { name: e.target.value })} />
                          <input className="w-full bg-surface-container-lowest border border-surface-container rounded-lg px-3 py-1.5 text-[9px] font-medium text-on-surface-variant uppercase focus:ring-1 focus:ring-primary outline-none" value={item.unit || ''} onChange={(e) => updateTempItem(idx, { unit: e.target.value })} placeholder="Unit (Flat, /hr)" />
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-on-background leading-none">{item.name}</p>
                          <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider">{item.unit || 'Flat Fee'}</p>
                        </>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      {isEditingRateCard ? (
                        <div className="flex flex-col items-end gap-2">
                          <input type="number" className="w-24 bg-surface-container-lowest border border-surface-container rounded-lg px-3 py-1.5 text-xs font-semibold text-on-background text-right focus:ring-1 focus:ring-primary outline-none" value={item.rate} onChange={(e) => updateTempItem(idx, { rate: Number(e.target.value) })} />
                          <button onClick={() => removeRateCardItem(idx)} className="text-error p-1 hover:bg-error/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                        </div>
                      ) : (
                        <div>
                          <p className="font-serif text-base text-primary">{displayCurrency === 'USD' ? '$' : 'AED '}{formatRate(item.rate)}</p>
                          <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider mt-0.5">Starting Rate</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isEditingRateCard && (
                  <button onClick={addRateCardItem} className="w-full py-4 border-2 border-dashed border-surface-container rounded-xl text-[9px] font-medium uppercase text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2">
                    <Plus size={14} /> Add Item
                  </button>
                )}
              </div>
            </div>

            {resources.rateCard && (
              <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container mt-4 shrink-0">
                <p className="text-xs font-semibold text-on-background truncate">{resources.rateCard.name}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> {formatDate(resources.rateCard.date)}</span>
                  <span className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider">{resources.rateCard.size}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button onClick={() => downloadFile(resources.rateCard!)} className="flex items-center justify-center gap-2 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl text-[10px] font-medium uppercase tracking-wider hover:bg-surface-container transition-colors"><Download size={14} /> Download</button>
                  <button onClick={() => setActivePreview({ name: resources.rateCard!.name, base64: resources.rateCard!.base64, type: resources.rateCard!.type })} className="flex items-center justify-center gap-2 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl text-[10px] font-medium uppercase tracking-wider hover:bg-surface-container transition-colors"><Eye size={14} /> Preview</button>
                </div>
              </div>
            )}
            <button onClick={() => rateCardInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-full text-[10px] font-medium uppercase tracking-wider shadow-sm mt-4 shrink-0 hover:bg-primary-dim transition-colors">
              <Upload size={15} /> {resources.rateCard ? 'Replace Card' : 'Upload Card'}
            </button>
          </div>
        </div>

        <input type="file" ref={mediaKitInputRef} className="hidden" accept="application/pdf,image/*" onChange={(e) => handleUpload('mediaKit', e)} />
        <input type="file" ref={rateCardInputRef} className="hidden" accept="application/pdf,image/*,.csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(e) => handleUpload('rateCard', e)} />
      </div>

      {/* Preview Modal */}
      {activePreview && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setActivePreview(null)}>
          <div className="bg-surface-container-lowest rounded-xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl border border-surface-container" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-container flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileText className="text-primary" size={16} />
                <h2 className="font-serif text-lg text-on-background">{activePreview.name}</h2>
              </div>
              <button onClick={() => setActivePreview(null)} className="p-2 bg-surface-container-low rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"><X size={16} /></button>
            </div>
            <div className="flex-1 bg-surface-container overflow-hidden">
              {activePreview.type.startsWith('image/') ? (
                <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
                  <img src={`data:${activePreview.type};base64,${activePreview.base64}`} alt={activePreview.name} className="max-w-full max-h-full object-contain rounded-xl shadow-lg" />
                </div>
              ) : (
                <iframe src={`data:${activePreview.type};base64,${activePreview.base64}`} className="w-full h-full border-none" title="Preview" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Target - Invisible */}
      <div className="fixed -left-[10000px] top-0">
        <div ref={exportTargetRef} className="w-[794px] min-h-[1123px] bg-[#F9F7F2] text-slate-900 relative p-12 flex flex-col">
          <div className="absolute inset-0 pointer-events-none opacity-[0.08]"><svg viewBox="0 0 800 1200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="M 0 200 Q 100 150 200 200 T 400 250 T 600 200 T 800 250" fill="none" stroke="#000" strokeWidth="1" /></svg></div>
          <div className="relative z-10 flex flex-col flex-1">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest mb-8">Advertiser Permit #<br/>{permitNumber}</p>
                <h1 className="text-[90px] font-serif leading-[0.8] mb-4" style={{ fontFamily: 'Georgia, serif', color: '#634A3C' }}>{userName.split(' ')[0]}<br/>{userName.split(' ')[1] || ''}</h1>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] mb-8" style={{ color: '#634A3C' }}>{userTags}</p>
                <div className="max-w-md"><p className="text-sm leading-relaxed font-medium text-slate-600 mb-12">{userBio}</p></div>
              </div>
              <div className="flex flex-col gap-8 items-end pr-4">
                <div className="w-48 h-64 rounded-full border border-slate-200 shadow-xl bg-slate-100"></div>
                <div className="w-56 h-72 rounded-full border border-slate-200 shadow-xl bg-slate-100 -mr-12"></div>
              </div>
            </div>
            <div className="mt-12 mb-16">
              <h2 className="text-2xl font-semibold uppercase tracking-[0.3em] mb-8" style={{ color: '#634A3C' }}>SERVICES & RATES</h2>
              <div className="space-y-4 max-w-lg">
                {rateCardData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-end border-b border-slate-200 pb-2">
                    <div className="flex flex-col"><span className="text-lg font-semibold text-slate-800">{item.name}</span>{item.unit && <span className="text-[10px] text-slate-400 font-medium uppercase">({item.unit})</span>}</div>
                    <div className="text-right"><span className="text-lg font-semibold text-slate-900">{displayCurrency === 'USD' ? '$' : 'AED '} {formatRate(item.rate)}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto pt-8 border-t border-slate-200 flex items-center justify-between">
              <p className="text-[10px] font-medium text-slate-400 italic">Rates are starting points and subject to scope.</p>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">LAILA MOURAD CONTENT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Modal */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setIsQuoteModalOpen(false)}>
          <div className="bg-surface-container-lowest rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl border border-surface-container" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-surface-container flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><Calculator size={15} /></div>
                <h2 className="font-serif text-xl text-on-background leading-none">Generate Quote</h2>
              </div>
              <button onClick={() => { setIsQuoteModalOpen(false); setGeneratedQuote(null); }} className="p-2 text-on-surface-variant hover:text-on-background transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {!generatedQuote ? (
                <div className="space-y-4">
                  <textarea
                    placeholder="Tell Jarvis what the client wants..."
                    className="w-full h-36 bg-surface-container-low border-none rounded-xl p-4 text-sm font-medium text-on-background focus:ring-2 focus:ring-primary/20 outline-none"
                    value={quoteInput}
                    onChange={(e) => setQuoteInput(e.target.value)}
                  />
                  <button onClick={() => quoteDocInputRef.current?.click()} className={`w-full p-4 border-2 border-dashed rounded-xl transition-all ${quoteDoc ? 'border-emerald-400 bg-emerald-50/50' : 'border-surface-container hover:border-primary/30'}`}>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">{quoteDoc ? quoteDoc.name : 'Upload Brief (PDF)'}</span>
                  </button>
                  <input type="file" ref={quoteDocInputRef} className="hidden" accept=".pdf" onChange={handleQuoteDocUpload} />
                  <button onClick={handleGetQuote} disabled={isGeneratingQuote || !quoteInput.trim()} className="w-full bg-primary text-on-primary py-3 rounded-full flex items-center justify-center gap-2 font-medium text-[10px] uppercase tracking-wider shadow-sm hover:bg-primary-dim transition-colors disabled:opacity-50">
                    {isGeneratingQuote ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Generate
                  </button>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex justify-between border-b border-surface-container pb-5">
                    <div>
                      <h3 className="font-serif text-2xl text-on-background">{generatedQuote.clientName}</h3>
                      <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider mt-1">Jarvis Analyst Result</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-3xl text-primary">AED {generatedQuote.total.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {generatedQuote.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between p-4 bg-surface-container-low rounded-xl border border-surface-container">
                        <div>
                          <p className="text-sm font-semibold text-on-background">{item.name}</p>
                          <p className="text-[9px] font-medium text-on-surface-variant mt-0.5">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-serif text-sm text-on-background">AED {(item.rate * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setIsQuoteModalOpen(false); setGeneratedQuote(null); }} className="w-full py-3 bg-emerald-500 text-white rounded-full font-medium text-[10px] uppercase tracking-wider hover:bg-emerald-600 transition-colors">
                    Create Campaign
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
