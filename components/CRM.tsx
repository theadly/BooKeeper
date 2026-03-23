
import React, { useState, useRef } from 'react';
import { Contact, LeadStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';
import { Plus, Search, Mail, Phone, Building, FileUp, Loader2, Sparkles, X, Trash2, Save, User } from 'lucide-react';
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
    name: '', company: '', email: '', phone: '', potentialValue: 0, trn: '', notes: ''
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
        setFormData(prev => ({ ...prev, ...extracted, status: LeadStatus.NEW }));
      } catch (error) {
        console.error('Auto-extraction failed', error);
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

  const getStatusStyle = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.NEW: return 'bg-blue-50 text-blue-700 border-blue-100';
      case LeadStatus.CONTACTED: return 'bg-amber-50 text-amber-700 border-amber-100';
      case LeadStatus.PROPOSAL: return 'bg-primary/5 text-primary border-primary/10';
      case LeadStatus.NEGOTIATION: return 'bg-violet-50 text-violet-700 border-violet-100';
      case LeadStatus.CLOSED_WON: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case LeadStatus.CLOSED_LOST: return 'bg-surface-container text-on-surface-variant border-surface-container-high';
      default: return 'bg-surface-container text-on-surface-variant border-surface-container-high';
    }
  };

  const getStatusDot = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.NEW: return 'bg-blue-500';
      case LeadStatus.CONTACTED: return 'bg-amber-500';
      case LeadStatus.PROPOSAL: return 'bg-primary';
      case LeadStatus.NEGOTIATION: return 'bg-violet-500';
      case LeadStatus.CLOSED_WON: return 'bg-emerald-500';
      case LeadStatus.CLOSED_LOST: return 'bg-on-surface-variant';
      default: return 'bg-on-surface-variant';
    }
  };

  return (
    <div className="space-y-5 h-full flex flex-col overflow-hidden px-1">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-serif text-2xl text-on-background leading-none">CRM</h1>
          <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">Manage leads and business partners</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-surface-container-low border-none text-on-surface-variant hover:text-primary px-4 py-2.5 rounded-full transition-colors font-medium text-[10px] uppercase tracking-wider">
            <FileUp size={14} className="text-primary" /> Scan Identity
          </button>
          <button onClick={() => { setFormData({ status: LeadStatus.NEW, name: '', company: '', email: '', phone: '', potentialValue: 0, trn: '', notes: '' }); setIsModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-full font-medium text-[10px] uppercase tracking-wider shadow-sm hover:bg-primary-dim transition-colors">
            <Plus size={14} /> Add Contact
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Contact List */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-container">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={13} />
              <input type="text" placeholder="Search by name or company..." className="w-full bg-surface-container-low border-none pl-9 pr-4 py-2.5 rounded-full focus:ring-2 focus:ring-primary/20 outline-none text-[10px] font-medium text-on-background placeholder-on-surface-variant" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Search size={28} className="text-on-surface-variant opacity-20" />
                <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-widest">No contacts found</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-container">
                {filteredContacts.map(contact => (
                  <div key={contact.id} className="p-4 sm:p-5 hover:bg-surface-container-low transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-semibold text-base border border-primary/10 shrink-0">
                        {contact.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-on-background truncate">{contact.name}</h3>
                          {contact.trn && <span className="text-[7px] font-medium uppercase text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-full tracking-wider">TRN: {contact.trn}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-medium mt-0.5">
                          <Building size={10} /> {contact.company || 'Private Client'}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[9px] text-on-surface-variant">
                          <span className="flex items-center gap-1"><Mail size={9} className="text-primary/50" /> {contact.email}</span>
                          {contact.phone && <span className="flex items-center gap-1"><Phone size={9} className="text-primary/50" /> {contact.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-3 sm:pt-0 border-t sm:border-0 border-surface-container">
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-medium uppercase tracking-wide border ${getStatusStyle(contact.status)}`}>{contact.status}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-serif text-sm text-on-background">{contact.potentialValue.toLocaleString()} <span className="text-[9px] text-on-surface-variant font-sans">AED</span></span>
                        <button onClick={() => onDeleteContact(contact.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Pipeline Health */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm p-6">
            <h3 className="font-serif text-base text-on-background mb-5">Pipeline Health</h3>
            <div className="space-y-4">
              {STATUS_OPTIONS.map(status => {
                const count = contacts.filter(c => c.status === status).length;
                const value = contacts.filter(c => c.status === status).reduce((acc, c) => acc + c.potentialValue, 0);
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${count > 0 ? getStatusDot(status as LeadStatus) : 'bg-surface-container-high'}`} />
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">{status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-on-background text-[11px]">{count}</span>
                      <span className="text-on-surface-variant text-[9px] min-w-[50px] text-right">{value > 0 ? value.toLocaleString() + ' AED' : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smart Extraction Tip */}
          {showProTip && (
            <div className="bg-gradient-to-br from-primary to-primary-dim p-6 rounded-xl shadow-sm text-on-primary relative overflow-hidden">
              <button onClick={() => onDismissTip('crm-pro-tip')} className="absolute top-4 right-4 text-on-primary/50 hover:text-on-primary transition-colors"><X size={15} /></button>
              <h3 className="font-serif text-base mb-2">Smart Extraction</h3>
              <p className="text-[10px] text-on-primary/80 mb-4 leading-relaxed">Upload a trade license or VAT certificate to automatically populate your partner database.</p>
              <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-wider bg-white/10 px-3 py-2 rounded-lg">
                <Sparkles size={12} className="animate-pulse" /> AI Extraction Active
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-surface-container flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/5 rounded-lg text-primary"><Plus size={18} /></div>
                <div>
                  <h2 className="font-serif text-xl text-on-background leading-none">New Contact</h2>
                  <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider mt-1">Lead & partner registration</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-background transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
              {isParsing && (
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl text-primary text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Extracting from document…</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-surface-container"><User size={11} /> Personal Info</p>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Contact Name</label>
                    <input type="text" required placeholder="e.g. John Doe" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Email Address</label>
                    <input type="email" required placeholder="e.g. john@brand.com" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Phone (Optional)</label>
                    <input type="text" placeholder="+971 --- ---" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-surface-container"><Building size={11} /> Company Info</p>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Company Name</label>
                    <input type="text" placeholder="e.g. Dyson Media" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">VAT / TRN (Optional)</label>
                    <input type="text" placeholder="10034..." className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={formData.trn} onChange={e => setFormData({...formData, trn: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Potential Deal Value (AED)</label>
                    <input type="number" placeholder="0.00" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={formData.potentialValue} onChange={e => setFormData({...formData, potentialValue: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Pipeline Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} type="button" onClick={() => setFormData({...formData, status: s})} className={`py-2 rounded-lg text-[8px] font-medium uppercase tracking-wider border transition-all ${formData.status === s ? 'bg-primary text-on-primary border-primary shadow-sm' : 'bg-surface-container-low border-surface-container text-on-surface-variant hover:border-primary/20'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-full font-medium text-[10px] uppercase tracking-wider hover:bg-surface-container transition-colors">Discard</button>
                <button type="submit" className="flex-[2] bg-primary text-on-primary py-3 rounded-full font-medium text-[10px] uppercase tracking-wider shadow-sm hover:bg-primary-dim transition-colors flex items-center justify-center gap-2"><Save size={14} /> Create Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
