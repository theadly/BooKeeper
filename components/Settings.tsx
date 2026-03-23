import React, { useState, useRef, useEffect } from 'react';
import { ZohoConfig } from '../types';
import {
  Save, RefreshCw, CheckCircle, Trash2, Download,
  UploadCloud, Palette, Moon, Sun, X, AlertTriangle, Database, Globe, LogOut, ShieldCheck
} from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: ZohoConfig;
  onSaveConfig: (config: ZohoConfig) => void;
  onSync: () => Promise<{ imported: number; updated: number } | void>;
  isSyncing: boolean;
  syncError?: string | null;
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
  user?: { name?: string; email?: string; avatarUrl?: string };
  onSignOut: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  isOpen, onClose, config, onSaveConfig, onSync, onClearData, onExport, onImport,
  theme, onSetTheme, isDarkMode, onSetDarkMode, fontSize, onSetFontSize,
  showAedEquivalent, onSetShowAedEquivalent, isSyncing, syncError, user, onSignOut
}) => {
  const [formData, setFormData] = useState<ZohoConfig>({
    accessToken: '',
    organizationId: '',
    apiDomain: 'https://www.zohoapis.com'
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [syncResult, setSyncResult] = useState<{ imported: number; updated: number } | null>(null);
  const [showWipeConfirmation, setShowWipeConfirmation] = useState(false);
  const [wipeDoubleCheck, setWipeDoubleCheck] = useState('');
  const [showZohoAdvanced, setShowZohoAdvanced] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        accessToken: config.accessToken ?? '',
        refreshToken: config.refreshToken ?? '',
        clientId: config.clientId ?? '',
        clientSecret: config.clientSecret ?? '',
        organizationId: config.organizationId ?? '',
        apiDomain: config.apiDomain ?? 'https://www.zohoapis.com',
        lastSync: config.lastSync
      });
    }
  }, [config]);

  const handleSaveAll = () => {
    onSaveConfig(formData);
    setSaveStatus('saved');
    setTimeout(() => { setSaveStatus('idle'); onClose(); }, 600);
  };

  if (!isOpen) return null;

  const isZohoConnected = !!(formData.refreshToken && formData.clientId && formData.clientSecret && formData.organizationId);

  const themes = [
    { id: 'slate', color: '#0f172a', label: 'Classic' },
    { id: 'indigo', color: '#4f46e5', label: 'Indigo' },
    { id: 'teal', color: '#0d9488', label: 'Teal' },
    { id: 'rose', color: '#e11d48', label: 'Rose' },
    { id: 'amber', color: '#d97706', label: 'Amber' },
  ];

  const inputClass = "w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-xs font-medium text-on-background outline-none focus:ring-2 focus:ring-primary/20 transition-all";
  const labelClass = "block text-[9px] font-medium text-on-surface-variant uppercase tracking-widest ml-1";

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-surface-container-lowest w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-xl border border-surface-container flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-8 py-6 border-b border-surface-container flex justify-between items-center">
          <div>
            <h1 className="font-serif text-2xl text-on-background leading-none">App Settings</h1>
            <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">Workspace customization & system maintenance</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-on-surface-variant hover:text-on-background hover:bg-surface-container-low rounded-full transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left: Display & Account */}
            <div className="space-y-8">

              {/* Display & Themes */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Palette size={16} className="text-primary" />
                  <h3 className="text-[10px] font-medium text-on-background uppercase tracking-widest">Display &amp; Themes</h3>
                </div>
                <div className="p-5 bg-surface-container-low rounded-xl border border-surface-container space-y-6">
                  <div className="space-y-3">
                    <label className={labelClass}>Color Scheme</label>
                    <div className="flex flex-wrap gap-2">
                      {themes.map(t => (
                        <button key={t.id} onClick={() => onSetTheme(t.id)} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all border ${theme === t.id ? 'border-primary bg-primary/5' : 'border-surface-container hover:bg-surface-container'}`}>
                          <div className="w-7 h-7 rounded-full shadow-sm" style={{ backgroundColor: t.color }} />
                          <span className="text-[8px] font-medium uppercase tracking-wider text-on-surface-variant">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className={labelClass}>System Scaling</label>
                      <span className="text-[9px] font-medium text-primary px-2 py-0.5 bg-primary/10 rounded-full">{fontSize}px</span>
                    </div>
                    <input type="range" min="10" max="20" step="1" className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary" value={fontSize} onChange={(e) => onSetFontSize(e.target.value)} />
                    <div className="flex justify-between px-1">
                      <span className="text-[8px] font-medium text-on-surface-variant uppercase">Compact</span>
                      <span className="text-[8px] font-medium text-on-surface-variant uppercase">Standard</span>
                      <span className="text-[8px] font-medium text-on-surface-variant uppercase">Comfort</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={labelClass}>Appearance</label>
                      <div className="flex bg-surface-container p-1 rounded-full">
                        <button onClick={() => onSetDarkMode(false)} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${!isDarkMode ? 'bg-surface-container-lowest text-on-background shadow-sm' : 'text-on-surface-variant'}`}><Sun size={12} /> Light</button>
                        <button onClick={() => onSetDarkMode(true)} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${isDarkMode ? 'bg-surface-container-lowest text-on-background shadow-sm' : 'text-on-surface-variant'}`}><Moon size={12} /> Dark</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Financial Display</label>
                      <button onClick={() => onSetShowAedEquivalent(!showAedEquivalent)} className={`w-full h-[34px] flex items-center justify-center gap-1.5 rounded-full border text-[9px] font-medium uppercase tracking-wider transition-all ${showAedEquivalent ? 'bg-primary text-on-primary border-primary shadow-sm' : 'bg-surface-container border-surface-container text-on-surface-variant'}`}>AED Equivalent</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-primary" />
                  <h3 className="text-[10px] font-medium text-on-background uppercase tracking-widest">Account</h3>
                </div>
                <div className="p-5 bg-surface-container-low rounded-xl border border-surface-container">
                  <div className="flex items-center gap-4">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-xl object-cover border border-surface-container shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary font-black text-sm shadow-sm">{userInitials}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-background truncate">{user?.name || 'Signed In'}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{user?.email}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-[8px] font-medium text-emerald-600 uppercase tracking-wider">Authenticated via Google</span>
                      </div>
                    </div>
                    <button onClick={() => { onClose(); onSignOut(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-error hover:bg-red-50 transition-colors text-[9px] font-medium uppercase tracking-wider shrink-0">
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Zoho & Backup */}
            <div className="space-y-8">

              {/* Zoho Integration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Globe size={16} className="text-primary" />
                  <h3 className="text-[10px] font-medium text-on-background uppercase tracking-widest">Zoho Books Integration</h3>
                </div>
                <div className="p-5 bg-surface-container-low rounded-xl border border-surface-container space-y-4">
                  {isZohoConnected && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-emerald-700">Zoho Connected</p>
                        <p className="text-[8px] text-emerald-600 font-medium">{formData.lastSync ? `Last synced: ${formData.lastSync}` : 'Token auto-refreshes on every sync.'}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className={labelClass}>Organization ID</label>
                    <input type="text" placeholder="e.g. 712345678" className={inputClass} value={formData.organizationId} onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })} />
                  </div>

                  <button type="button" onClick={() => setShowZohoAdvanced(!showZohoAdvanced)} className="w-full flex items-center justify-between text-[9px] font-medium text-on-surface-variant uppercase tracking-widest hover:text-on-background transition-colors py-1">
                    <span>{isZohoConnected ? 'Update OAuth Credentials' : 'OAuth Credentials (required for auto-sync)'}</span>
                    <span className="text-[8px]">{showZohoAdvanced ? '▲' : '▼'}</span>
                  </button>

                  {(!isZohoConnected || showZohoAdvanced) && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      {!isZohoConnected && <p className="text-[8px] text-on-surface-variant font-medium px-1">Enter your Zoho OAuth credentials once — the token auto-refreshes every session.</p>}
                      <div className="space-y-1.5">
                        <label className={labelClass}>Refresh Token</label>
                        <input type="password" placeholder="Paste Zoho Refresh Token..." className={inputClass} value={formData.refreshToken || ''} onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className={labelClass}>Client ID</label>
                          <input type="text" placeholder="1000.XXXX..." className={inputClass} value={formData.clientId || ''} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <label className={labelClass}>Client Secret</label>
                          <input type="password" placeholder="Client Secret..." className={inputClass} value={formData.clientSecret || ''} onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>API Domain</label>
                        <select className={inputClass} value={formData.apiDomain} onChange={(e) => setFormData({ ...formData, apiDomain: e.target.value })}>
                          <option value="https://www.zohoapis.com">US (.com)</option>
                          <option value="https://www.zohoapis.eu">EU (.eu)</option>
                          <option value="https://www.zohoapis.in">India (.in)</option>
                          <option value="https://www.zohoapis.com.au">AU (.com.au)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-surface-container flex flex-col gap-2">
                    <button type="button" onClick={async () => { setSyncResult(null); const r = await onSync(); if (r) setSyncResult(r); }} disabled={isSyncing || !formData.organizationId} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-full text-[10px] font-medium uppercase tracking-wider shadow-sm hover:bg-primary-dim transition-colors disabled:opacity-50">
                      <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? 'Synchronizing...' : 'Sync Zoho Invoices'}
                    </button>
                    {syncError && (
                      <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-xl">
                        <AlertTriangle size={13} className="text-error shrink-0" />
                        <p className="text-[9px] font-medium text-error">{syncError}</p>
                      </div>
                    )}
                    {syncResult && !syncError && (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                        <p className="text-[9px] font-medium text-emerald-700">{syncResult.imported} new · {syncResult.updated} updated</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Backup & Maintenance */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Database size={16} className="text-primary" />
                  <h3 className="text-[10px] font-medium text-on-background uppercase tracking-widest">Backup &amp; Maintenance</h3>
                </div>
                <div className="p-5 bg-surface-container-low rounded-xl border border-surface-container space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={onExport} className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-[9px] font-medium uppercase tracking-wider hover:bg-surface-container transition-colors"><Download size={13}/> Export JSON</button>
                    <button onClick={() => importInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-[9px] font-medium uppercase tracking-wider hover:bg-surface-container transition-colors"><UploadCloud size={13}/> Restore</button>
                    <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
                  </div>
                  <button onClick={() => { setWipeDoubleCheck(''); setShowWipeConfirmation(true); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-error/5 text-error hover:bg-error/10 rounded-xl text-[9px] font-medium uppercase tracking-wider transition-colors border border-error/20">
                    <Trash2 size={13}/> Factory Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-surface-container-low border-t border-surface-container flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-on-surface-variant font-medium text-[10px] uppercase tracking-wider hover:text-on-background transition-colors">Cancel</button>
          <button onClick={handleSaveAll} className={`flex items-center gap-2 px-8 py-2.5 rounded-full font-medium text-[10px] uppercase tracking-wider transition-all shadow-sm ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-primary text-on-primary hover:bg-primary-dim'}`}>
            {saveStatus === 'saved' ? <CheckCircle size={15} /> : <Save size={15} />} Commit Changes
          </button>
        </div>
      </div>

      {/* Wipe Confirmation */}
      {showWipeConfirmation && (
        <div className="fixed inset-0 z-[6000] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-xl p-8 border border-error/20 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-error/10 rounded-xl flex items-center justify-center text-error mb-6 mx-auto"><AlertTriangle size={32} /></div>
            <h2 className="font-serif text-xl text-on-background mb-1">Destructive Action</h2>
            <p className="text-xs text-on-surface-variant mb-6 font-medium">Type <span className="text-error font-semibold">WIPE</span> to permanently delete all data.</p>
            <input autoFocus type="text" className="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-center font-semibold text-lg text-on-background focus:ring-2 focus:ring-error/30 uppercase outline-none" value={wipeDoubleCheck} onChange={(e) => setWipeDoubleCheck(e.target.value.toUpperCase())} placeholder="---" />
            <div className="grid grid-cols-2 gap-3 pt-6">
              <button onClick={() => setShowWipeConfirmation(false)} className="py-3 bg-surface-container-low border border-surface-container rounded-full font-medium text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-on-background transition-colors">Cancel</button>
              <button onClick={() => { setShowWipeConfirmation(false); onClearData(); }} disabled={wipeDoubleCheck !== 'WIPE'} className="py-3 bg-error disabled:bg-surface-container text-white disabled:text-on-surface-variant rounded-full font-medium text-[10px] uppercase tracking-wider shadow-sm transition-colors">Purge Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
