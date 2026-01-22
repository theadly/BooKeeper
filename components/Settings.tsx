import React, { useState, useRef, useEffect } from 'react';
import { ZohoConfig } from '../types';
import { 
  Save, RefreshCw, CheckCircle, Trash2, Download, 
  UploadCloud, Palette, Moon, Sun, X, AlertTriangle, ShieldCheck, Database, Lock, Mail, Key, Eye, EyeOff, Globe, Type, User
} from 'lucide-react';
import { CONFIG } from '../config';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: ZohoConfig;
  onSaveConfig: (config: ZohoConfig) => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onClearData: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  theme: string;
  onSetTheme: (theme: string) => void;
  isDarkMode: boolean;
  onSetDarkMode: (isDark: boolean) => void;
  fontSize: string;
  onSetFontSize: (size: string) => void;
  showAedEquivalent: boolean;
  onSetShowAedEquivalent: (show: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  isOpen, onClose, config, onSaveConfig, onSync, onClearData, onExport, onImport,
  theme, onSetTheme, isDarkMode, onSetDarkMode, fontSize, onSetFontSize,
  showAedEquivalent, onSetShowAedEquivalent, isSyncing
}) => {
  const [formData, setFormData] = useState<ZohoConfig>({
    accessToken: '',
    organizationId: '',
    apiDomain: 'https://www.zohoapis.com'
  });

  const [securityData, setSecurityData] = useState(() => {
    const saved = localStorage.getItem('app_credentials');
    return saved ? JSON.parse(saved) : { email: CONFIG.DEFAULT_USER, password: CONFIG.DEFAULT_PASS };
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showZohoToken, setShowZohoToken] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [showWipeConfirmation, setShowWipeConfirmation] = useState(false);
  const [wipeDoubleCheck, setWipeDoubleCheck] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        accessToken: config.accessToken ?? '',
        organizationId: config.organizationId ?? '',
        apiDomain: config.apiDomain ?? 'https://www.zohoapis.com',
        lastSync: config.lastSync
      });
    }
  }, [config]);

  const handleSaveAll = () => {
    onSaveConfig(formData);
    localStorage.setItem('app_credentials', JSON.stringify(securityData));
    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus('idle');
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  const themes = [
    { id: 'slate', color: '#0f172a', label: 'Classic' },
    { id: 'indigo', color: '#4f46e5', label: 'Indigo' },
    { id: 'teal', color: '#0d9488', label: 'Teal' },
    { id: 'rose', color: '#e11d48', label: 'Rose' },
    { id: 'amber', color: '#d97706', label: 'Amber' },
  ];

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">App Settings</h1>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Workspace customization & system maintenance.</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: UI & Security */}
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3"><Palette size={20} className="text-primary" /><h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Display & Themes</h3></div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-8">
                   <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Color Scheme</label>
                      <div className="flex flex-wrap gap-3">
                         {themes.map(t => (
                            <button key={t.id} onClick={() => onSetTheme(t.id)} className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 ${theme === t.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                               <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: t.color }} /><span className="text-[9px] font-black uppercase tracking-tight text-slate-500 dark:text-slate-400">{t.label}</span>
                            </button>
                         ))}
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">System Scaling</label>
                        <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-md">{fontSize}px</span>
                      </div>
                      <input 
                        type="range" min="10" max="20" step="1" 
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        value={fontSize} 
                        onChange={(e) => onSetFontSize(e.target.value)}
                      />
                      <div className="flex justify-between px-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Compact</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Standard</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Comfort</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6 pt-2">
                      <div className="space-y-3">
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Appearance</label>
                         <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                            <button onClick={() => onSetDarkMode(false)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isDarkMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}><Sun size={14} /> Light</button>
                            <button onClick={() => onSetDarkMode(true)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'}`}><Moon size={14} /> Dark</button>
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Display</label>
                         <button onClick={() => onSetShowAedEquivalent(!showAedEquivalent)} className={`w-full h-10 flex items-center justify-center gap-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${showAedEquivalent ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-400'}`}>AED Equivalent</button>
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3"><User size={20} className="text-primary" /><h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">User Profile</h3></div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-5">
                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                          type="email" 
                          className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          value={securityData.email}
                          onChange={(e) => setSecurityData({ ...securityData, email: e.target.value })}
                        />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Pin (Optional)</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-11 pr-12 py-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          value={securityData.password}
                          onChange={(e) => setSecurityData({ ...securityData, password: e.target.value })}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Column: Data & Zoho */}
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3"><Globe size={20} className="text-primary" /><h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Zoho Books Integration</h3></div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="space-y-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Organization ID</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 712345678"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                              value={formData.organizationId}
                              onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                            />
                         </div>
                         <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">API Domain</label>
                            <select 
                              className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                              value={formData.apiDomain}
                              onChange={(e) => setFormData({ ...formData, apiDomain: e.target.value })}
                            >
                              <option value="https://www.zohoapis.com">US (.com)</option>
                              <option value="https://www.zohoapis.eu">EU (.eu)</option>
                              <option value="https://www.zohoapis.in">India (.in)</option>
                              <option value="https://www.zohoapis.com.au">AU (.com.au)</option>
                            </select>
                         </div>
                       </div>
                       <div className="space-y-1.5">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">OAuth Access Token</label>
                          <div className="relative">
                            <input 
                              type={showZohoToken ? 'text' : 'password'} 
                              placeholder="Paste Zoho OAuth Token..."
                              className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                              value={formData.accessToken}
                              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                            />
                            <button 
                              type="button"
                              onClick={() => setShowZohoToken(!showZohoToken)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                            >
                              {showZohoToken ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          <p className="text-[8px] text-slate-400 font-bold uppercase mt-2 px-1 italic">Balances historic invoices for the current workspace.</p>
                       </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                        <button 
                          type="button" 
                          onClick={onSync} 
                          disabled={isSyncing || !formData.accessToken || !formData.organizationId} 
                          className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                          <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> 
                          {isSyncing ? 'Synchronizing Invoices...' : 'Sync Zoho Invoices'}
                        </button>
                        {formData.lastSync && (
                          <p className="text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">Last synced: {formData.lastSync}</p>
                        )}
                    </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3"><Database size={20} className="text-primary" /><h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Backup & Maintenance</h3></div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={onExport} className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"><Download size={14}/> Export JSON</button>
                      <button onClick={() => importInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"><UploadCloud size={14}/> Restore</button>
                      <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
                    </div>
                    <button onClick={() => { setWipeDoubleCheck(''); setShowWipeConfirmation(true); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/10 text-rose-500 hover:text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-rose-100 dark:border-rose-900/30"><Trash2 size={14}/> Factory Reset</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-4">
          <button onClick={onClose} className="px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-xs">Cancel</button>
          <button onClick={handleSaveAll} className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-xs shadow-xl ${saveStatus === 'saved' ? 'bg-emerald-50 text-white' : 'bg-primary text-white'}`}>{saveStatus === 'saved' ? <CheckCircle size={18} /> : <Save size={18} />} Commit All Changes</button>
        </div>
      </div>

      {showWipeConfirmation && (
        <div className="fixed inset-0 z-[6000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-rose-100 dark:border-rose-900/30 text-center animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-600 mb-8 mx-auto"><AlertTriangle size={40} /></div>
              <h2 className="text-2xl font-black mb-2 dark:text-white">Destructive Action</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Type <span className="text-rose-600 font-black">WIPE</span> to permanently delete all data.</p>
              <input autoFocus type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-4 text-center font-black text-xl focus:ring-2 focus:ring-rose-500 uppercase dark:text-white outline-none" value={wipeDoubleCheck} onChange={(e) => setWipeDoubleCheck(e.target.value.toUpperCase())} placeholder="---" />
              <div className="grid grid-cols-2 gap-4 pt-8">
                <button onClick={() => setShowWipeConfirmation(false)} className="py-4 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
                <button 
                    onClick={() => { setShowWipeConfirmation(false); onClearData(); }} 
                    disabled={wipeDoubleCheck !== 'WIPE'} 
                    className="py-4 bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 dark:shadow-none"
                >
                    Purge Data
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;