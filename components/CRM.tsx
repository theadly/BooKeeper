
import React, { useState, useRef } from 'react';
import { Contact, LeadStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';
import { Plus, Search, Mail, Phone, Calendar, MoreVertical, Trash2, Building, FileUp, Loader2, Sparkles, X, ChevronRight, Briefcase, Save, User } from 'lucide-react';
import { parseCompanyDocument } from '../services/geminiService';

interface CRMProps {
  contacts: Contact[];
  onAddContact: (c: Contact) => void;
  onDeleteContact: (id: string) => void;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  dismissedTips: string[];
  onDismissTip: (tipId: string) => void;
}

const CRM: React.FC<CRMProps> = ({ contacts, onAddContact, onDeleteContact, onUpdateStatus, dismissedTips, onDismissTip }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const showProTip = !dismissedTips.includes('crm-pro-tip');

  const [formData, setFormData] = useState<Partial<Contact>>({
    status: LeadStatus.NEW,
    name: '',
    company: '',
    email: '',
    phone: '',
    potentialValue: 0,
    trn: '',
    notes: ''
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setIsModalOpen(true); 

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const extracted = await parseCompanyDocument(base64, file.type);
        
        setFormData(prev => ({
          ...prev,
          ...extracted,
          status: LeadStatus.NEW 
        }));
      } catch (error) {
        console.error("Auto-extraction failed", error);
      } finally {
        setIsParsing(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    onAddContact({
      id: crypto.randomUUID(),
      name: formData.name,
      company: formData.company || '',
      email: formData.email,
      phone: formData.phone || '',
      status: formData.status as LeadStatus,
      potentialValue: Number(formData.potentialValue),
      lastContactDate: new Date().toISOString().split('T')[0],
      trn: formData.trn || '',
      notes: formData.notes || ''
    });
    setIsModalOpen(false);
    setFormData({ status: LeadStatus.NEW, name: '', company: '', email: '', phone: '', potentialValue: 0, trn: '', notes: '' });
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: LeadStatus) => {
    switch(status) {
        case LeadStatus.NEW: return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
        case LeadStatus.CONTACTED: return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
        case LeadStatus.PROPOSAL: return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30';
        case LeadStatus.NEGOTIATION: return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
        case LeadStatus.CLOSED_WON: return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
        case LeadStatus.CLOSED_LOST: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">CRM</h1>
          <p className="text-gray-500 font-medium text-xs mt-1">Manage leads and business partners.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl transition-colors font-bold shadow-sm text-xs">
            <FileUp size={16} className="text-primary" /> <span className="hidden xs:inline">Scan Identity</span><span className="xs:hidden">Scan</span>
          </button>
          <button onClick={() => { setFormData({ status: LeadStatus.NEW, name: '', company: '', email: '', phone: '', potentialValue: 0, trn: '', notes: '' }); setIsModalOpen(true); }} className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground px-4 py-2.5 rounded-xl transition-colors font-bold shadow-lg text-xs">
            <Plus size={18} /> Add <span className="hidden xs:inline">Contact</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-[600px] mx-1">
             <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Search by name or company..." className="w-full bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-gray-900 dark:text-white text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
             </div>
             <div className="overflow-y-auto flex-1 custom-scrollbar">
                {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Search size={40} className="mb-2 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No entries found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {filteredContacts.map(contact => (
                            <div key={contact.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group relative">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl border border-primary/20 shrink-0">
                                        {contact.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="font-black text-gray-900 dark:text-white truncate">{contact.name}</h3>
                                          {contact.trn && <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tracking-widest">TRN: {contact.trn}</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400 font-bold mt-0.5"><Building size={12}/> {contact.company || 'Private Client'}</div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                                            <span className="flex items-center gap-1 shrink-0"><Mail size={10} className="text-primary/50" /> {contact.email}</span>
                                            {contact.phone && <span className="flex items-center gap-1 shrink-0"><Phone size={10} className="text-primary/50" /> {contact.phone}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-3 sm:pt-0 border-t sm:border-0 border-slate-50 dark:border-slate-800/50">
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] uppercase font-black tracking-wide border ${getStatusColor(contact.status)}`}>{contact.status}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-black text-gray-900 dark:text-white">${contact.potentialValue.toLocaleString()}</span>
                                        <button onClick={() => onDeleteContact(contact.id)} className="p-1.5 text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        </div>

        <div className="space-y-6 mx-1">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-200 dark:border-slate-800">
                <h3 className="font-black text-gray-900 dark:text-white mb-6 text-sm uppercase tracking-widest">Pipeline Health</h3>
                <div className="space-y-5">
                    {STATUS_OPTIONS.map(status => {
                        const count = contacts.filter(c => c.status === status).length;
                        const value = contacts.filter(c => c.status === status).reduce((acc, c) => acc + c.potentialValue, 0);
                        return (
                            <div key={status} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${count > 0 ? 'bg-primary shadow-[0_0_8px_var(--primary)]' : 'bg-gray-200 dark:bg-slate-800'}`} />
                                    <span className="text-xs text-gray-600 dark:text-slate-400 font-black uppercase tracking-tight group-hover:text-primary transition-colors">{status}</span>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    <span className="font-black text-gray-900 dark:text-white text-xs">{count}</span>
                                    <span className="text-slate-400 text-[10px] font-bold min-w-[50px]">${value.toLocaleString()}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            {showProTip && (
              <div className="bg-primary p-7 rounded-[2rem] shadow-xl text-primary-foreground relative overflow-hidden group">
                  <button onClick={() => onDismissTip('crm-pro-tip')} className="absolute top-5 right-5 opacity-40 hover:opacity-100 transition-opacity z-[20]"><X size={16} /></button>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                  <h3 className="font-black mb-2 text-lg relative z-10 leading-tight">Smart Extraction</h3>
                  <p className="text-xs opacity-80 mb-6 leading-relaxed relative z-10">Upload a trade license or VAT certificate to automatically update your partner database.</p>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 p-3 rounded-xl relative z-10 backdrop-blur-sm"><Sparkles size={14} className="animate-pulse" /> AI Extraction Active</div>
              </div>
            )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-[#F9F7F2]/30 dark:bg-slate-900/30">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary"><Plus size={24}/></div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">New Partner</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Lead & Contact registration</p>
                    </div>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all hover:bg-slate-50 dark:hover:bg-slate-800"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-2"><User size={12}/> Personal Info</p>
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Name</label><input type="text" required placeholder="e.g. John Doe" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label><input type="email" required placeholder="e.g. john@brand.com" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone (Optional)</label><input type="text" placeholder="+971 --- ---" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                    </div>
                    <div className="space-y-5">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-2"><Building size={12}/> Company Info</p>
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label><input type="text" placeholder="e.g. Dyson Media" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">VAT / TRN (Optional)</label><input type="text" placeholder="10034..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.trn} onChange={e => setFormData({...formData, trn: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Potential Deal Value</label><div className="relative group"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">AED</div><input type="number" placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.potentialValue} onChange={e => setFormData({...formData, potentialValue: Number(e.target.value)})} /></div></div>
                    </div>
                 </div>

                 <div className="space-y-1.5 pt-4">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Pipeline Status</label>
                    <div className="grid grid-cols-3 gap-2">
                       {STATUS_OPTIONS.map(s => (
                          <button key={s} type="button" onClick={() => setFormData({...formData, status: s})} className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${formData.status === s ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-primary/20'}`}>{s}</button>
                       ))}
                    </div>
                 </div>

                 <div className="pt-8 flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Discard</button>
                    <button type="submit" className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-[11px] flex items-center justify-center gap-2"><Save size={18}/> Create Record</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
