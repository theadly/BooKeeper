
import React, { useState, useRef } from 'react';
import { Contact, LeadStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';
import { Plus, Search, Mail, Phone, Calendar, MoreVertical, Trash2, Building, FileUp, Loader2, Sparkles, X } from 'lucide-react';
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
        case LeadStatus.NEW: return 'bg-blue-100 text-blue-800 border-blue-200';
        case LeadStatus.CONTACTED: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case LeadStatus.PROPOSAL: return 'bg-primary/10 text-primary border-primary/20';
        case LeadStatus.NEGOTIATION: return 'bg-purple-100 text-purple-800 border-purple-200';
        case LeadStatus.CLOSED_WON: return 'bg-green-100 text-green-800 border-green-200';
        case LeadStatus.CLOSED_LOST: return 'bg-gray-100 text-gray-800 border-gray-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM & Contacts</h1>
          <p className="text-gray-500">Manage leads and business partners.</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors font-medium shadow-sm">
            <FileUp size={18} className="text-primary" /> Scan Identity
          </button>
          <button onClick={() => { setFormData({ status: LeadStatus.NEW, name: '', company: '', email: '', phone: '', potentialValue: 0, trn: '', notes: '' }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium shadow-sm">
            <Plus size={18} /> Add Contact
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
             <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Search contacts..." className="w-full bg-white dark:bg-slate-800 pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-gray-900 dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
             </div>
             <div className="overflow-y-auto flex-1 custom-scrollbar">
                {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Search size={48} className="mb-2 opacity-20" />
                        <p>No contacts found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {filteredContacts.map(contact => (
                            <div key={contact.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20 shrink-0">
                                        {contact.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                          <h3 className="font-bold text-gray-900 dark:text-white">{contact.name}</h3>
                                          {contact.trn && <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tracking-widest">TRN: {contact.trn}</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400 font-medium"><Building size={14}/> {contact.company}</div>
                                        <div className="flex wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500"><span className="flex items-center gap-1"><Mail size={12}/> {contact.email}</span>{contact.phone && <span className="flex items-center gap-1"><Phone size={12}/> {contact.phone}</span>}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border ${getStatusColor(contact.status)}`}>{contact.status}</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">${contact.potentialValue.toLocaleString()}</span>
                                    <button onClick={() => onDeleteContact(contact.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">Pipeline Status</h3>
                <div className="space-y-4">
                    {STATUS_OPTIONS.map(status => {
                        const count = contacts.filter(c => c.status === status).length;
                        const value = contacts.filter(c => c.status === status).reduce((acc, c) => acc + c.potentialValue, 0);
                        return (
                            <div key={status} className="flex items-center justify-between text-sm group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${count > 0 ? 'bg-primary shadow-[0_0_8px_var(--primary)]' : 'bg-gray-300'}`} />
                                    <span className="text-gray-700 dark:text-slate-300 font-medium group-hover:text-primary transition-colors">{status}</span>
                                </div>
                                <div className="text-right"><span className="font-bold text-gray-900 dark:text-white mr-2">{count}</span><span className="text-gray-400 text-xs font-medium">${value.toLocaleString()}</span></div>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            {showProTip && (
              <div className="bg-primary p-6 rounded-xl shadow-lg text-primary-foreground relative overflow-hidden group">
                  <button onClick={() => onDismissTip('crm-pro-tip')} className="absolute top-4 right-4 opacity-40 hover:opacity-100 transition-opacity z-[20]"><X size={16} /></button>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                  <h3 className="font-bold mb-2 text-lg relative z-10">Pro Tip</h3>
                  <p className="text-sm opacity-80 mb-4 leading-relaxed relative z-10">You can upload a trade license or VAT certificate to extract legal details into your CRM.</p>
                  <div className="flex items-center gap-2 text-xs font-semibold bg-white/10 p-2.5 rounded-lg inline-flex relative z-10 backdrop-blur-sm"><Sparkles size={14} className="animate-pulse" /> AI document extraction enabled</div>
              </div>
            )}
        </div>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-800">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Add Contact</h2>
                {isParsing && <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full animate-pulse"><Loader2 size={12} className="animate-spin" /><span className="text-[10px] font-black uppercase tracking-widest">Analyzing...</span></div>}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Name</label><input type="text" required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary text-gray-900 dark:text-white font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Company</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary text-gray-900 dark:text-white font-bold text-sm" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Email</label><input type="email" required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary text-gray-900 dark:text-white font-bold text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Phone</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary text-gray-900 dark:text-white font-bold text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Status</label><select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary text-gray-900 dark:text-white font-bold text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as LeadStatus})}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest">Potential ($)</label><input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary text-gray-900 dark:text-white font-bold text-sm" value={formData.potentialValue} onChange={e => setFormData({...formData, potentialValue: Number(e.target.value)})} /></div>
              </div>
              <div className="pt-2"><button type="submit" disabled={isParsing} className="w-full bg-primary hover:opacity-90 text-primary-foreground font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50">Save Record</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
