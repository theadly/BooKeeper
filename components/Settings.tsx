
import React, { useState, useRef, useEffect } from 'react';
import { ZohoConfig } from '../types';
import { 
  Save, RefreshCw, CheckCircle, AlertCircle, Trash2, Download, 
  UploadCloud, Palette, Moon, Sun, Type, Monitor, Eye, Layout, Globe, X, AlertTriangle
} from 'lucide-react';
import AppLogo from './AppLogo';

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
  
  // Visual Preferences
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
  isOpen, onClose, config, onSaveConfig, onSync, isSyncing, onClearData, onExport, onImport,
  theme, onSetTheme, isDarkMode, onSetDarkMode, fontSize, onSetFontSize,
  showAedEquivalent, onSetShowAedEquivalent
}) => {
  const [formData, setFormData] = useState<ZohoConfig>(config);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [showWipeConfirmation, setShowWipeConfirmation] = useState(false);
  const [wipeDoubleCheck, setWipeDoubleCheck] = useState('');
  
  const importInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSaveStatus('idle');
  };

  const handleGlobalSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSaveConfig(formData);
    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus('idle');
      onClose();
    }, 1000);
  };

  const handleImportClick = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (confirm("This will overwrite your current local data. Continue?")) {
              onImport(file);
          }
      }
      if (e.target) e.target.value = '';
  };

  const handleWipeData = () => {
    if (wipeDoubleCheck.toUpperCase() === 'WIPE') {
      onClearData();
      setShowWipeConfirmation(false);
      setWipeDoubleCheck('');
      onClose();
    }
  };

  const themes = [
    { id: 'slate', color: '#0f172a', label: 'Classic' },
    { id: 'indigo', color: '#4f46e5', label: 'Indigo' },
    { id: 'teal', color: '#0d9488', label: 'Teal' },
    { id: 'rose', color: '#e11d48', label: 'Rose' },
    { id: 'amber', color: '#d97706', label: 'Amber' },
    { id: 'high-contrast', color: '#000000', label: 'Contrast' },
  ];

  const fontSizes = [
    { id: '12', label: 'Small' },
    { id: '14', label: 'Normal' },
    { id: '16', label: 'Large' },
    { id: '18', label: 'Extra' },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="bg-bg-card w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">App Settings</h1>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Customize your workspace and integrations.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Visual & Theme Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <Palette size={20} className="text-primary" />
                 <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Display & Themes</h3>
              </div>
              
              <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-8">
                 <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Color Scheme</label>
                    <div className="flex flex-wrap gap-3">
                       {themes.map(t => (
                          <button 
                            key={t.id}
                            onClick={() => onSetTheme(t.id)}
                            className={`
                              group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2
                              ${theme === t.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700'}
                            `}
                          >
                             <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: t.color }} />
                             <span className="text-[9px] font-black uppercase tracking-tight text-slate-500 dark:text-slate-400">{t.label}</span>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Appearance</label>
                       <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                          <button 
                             onClick={() => onSetDarkMode(false)}
                             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isDarkMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                             <Sun size={14} /> Light
                          </button>
                          <button 
                             onClick={() => onSetDarkMode(true)}
                             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                          >
                             <Moon size={14} /> Dark
                          </button>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Font Size</label>
                       <div className="flex items-center gap-2 flex-wrap">
                          {fontSizes.map(f => (
                            <button 
                              key={f.id}
                              onClick={() => onSetFontSize(f.id)}
                              className={`
                                px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                                ${fontSize === f.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}
                              `}
                            >
                              {f.label}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Show AED Equivalents</p>
                            <p className="text-[9px] text-slate-400 font-bold">Display 1 USD = 3.6725 AED</p>
                        </div>
                        <button 
                            onClick={() => onSetShowAedEquivalent(!showAedEquivalent)}
                            className={`w-12 h-6 rounded-full transition-all relative ${showAedEquivalent ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showAedEquivalent ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                 </div>
              </div>
            </div>

            {/* Integration Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <AppLogo className="h-7 w-7 text-[#3b82f6]" />
                 <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Zoho Integration</h3>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">API Region</label>
                      <select 
                          name="apiDomain"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-xs font-bold dark:text-white"
                          value={formData.apiDomain}
                          onChange={handleChange}
                      >
                          <option value="https://www.zohoapis.com">https://www.zohoapis.com (US)</option>
                          <option value="https://www.zohoapis.eu">https://www.zohoapis.eu (EU)</option>
                      </select>
                  </div>

                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Organization ID</label>
                      <input 
                          type="text" 
                          name="organizationId"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-xs font-bold dark:text-white"
                          placeholder="e.g. 123456789"
                          value={formData.organizationId}
                          onChange={handleChange}
                      />
                  </div>

                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Access Token</label>
                      <input 
                          type="password" 
                          name="accessToken"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-xs font-bold dark:text-white"
                          value={formData.accessToken}
                          onChange={handleChange}
                      />
                  </div>

                  <div className="pt-2">
                    <button 
                        type="button" 
                        onClick={onSync}
                        disabled={isSyncing || !formData.accessToken}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-[10px] font-black uppercase tracking-widest"
                    >
                        <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? 'Syncing...' : 'Sync Zoho Now'}
                    </button>
                  </div>
              </div>
            </div>
          </div>

          {/* Data Management Section */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Layout size={20} className="text-primary" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Data Portability</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <button 
                          onClick={onExport}
                          className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl hover:border-primary hover:bg-primary/5 transition-all group"
                      >
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 text-primary group-hover:scale-110 transition-transform">
                              <Download size={24} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Export</span>
                      </button>

                      <button 
                          onClick={() => importInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                      >
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 text-emerald-600 group-hover:scale-110 transition-transform">
                              <UploadCloud size={24} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Restore</span>
                      </button>
                      <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImportClick} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-slate-400" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">System Maintenance</h3>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/20 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-6">
                    <div className="flex-1">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-tight">Factory Reset</p>
                        <p className="text-[9px] text-slate-400 font-bold leading-tight">Delete all records and settings.</p>
                    </div>
                    <button 
                        onClick={() => setShowWipeConfirmation(true)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest"
                    >
                        Reset Data
                    </button>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-8 py-4 text-slate-400 font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-all text-xs"
          >
            Cancel
          </button>
          <button 
            onClick={() => handleGlobalSave()}
            className={`
              flex items-center gap-3 px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-xs shadow-xl active:scale-95
              ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'}
            `}
          >
            {saveStatus === 'saved' ? <CheckCircle size={18} /> : <Save size={18} />}
            {saveStatus === 'saved' ? 'Saved Successfully' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Double Confirmation Modal for Wiping Data */}
      {showWipeConfirmation && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl p-8 border border-rose-100 dark:border-rose-900/30 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-600 mb-6 mx-auto">
                 <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">Are you absolutely sure?</h2>
              <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-8 font-medium">
                 This action is <span className="text-rose-600 font-bold uppercase">permanent</span>. All your transactions, contacts, campaigns, and files will be deleted forever.
              </p>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Type <span className="text-rose-600">WIPE</span> to confirm</label>
                    <input 
                       type="text" 
                       className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-center font-black text-lg focus:ring-2 focus:ring-rose-500 uppercase"
                       placeholder="Confirm"
                       value={wipeDoubleCheck}
                       onChange={(e) => setWipeDoubleCheck(e.target.value)}
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <button 
                       onClick={() => { setShowWipeConfirmation(false); setWipeDoubleCheck(''); }}
                       className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={handleWipeData}
                       disabled={wipeDoubleCheck.toUpperCase() !== 'WIPE'}
                       className="px-6 py-4 bg-rose-600 disabled:bg-slate-300 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95 disabled:active:scale-100"
                    >
                       Delete All Data
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
