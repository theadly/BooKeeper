import React, { useState, useRef, useEffect } from 'react';
import { ZohoConfig, GoogleSheetsConfig } from '../types';
import { fetchSheetHeaders, autoDetectMapping, MAPPABLE_FIELDS } from '../services/googleSheetsService';
import {
  Save, RefreshCw, CheckCircle, Trash2, Download,
  UploadCloud, Palette, Moon, Sun, X, AlertTriangle, Database, Globe, LogOut, ShieldCheck,
  Sheet, Link2, Zap
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
  onDeduplicate: () => Promise<number>;
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
  googleSheetsConfig: GoogleSheetsConfig;
  onSaveGoogleSheetsConfig: (config: GoogleSheetsConfig) => void;
  onSyncSheets: () => Promise<{ added: number; updated: number; skipped: number } | void>;
  isSyncingSheets: boolean;
  sheetSyncError?: string | null;
}

const Settings: React.FC<SettingsProps> = ({
  isOpen, onClose, config, onSaveConfig, onSync, onClearData, onExport, onImport, onDeduplicate,
  theme, onSetTheme, isDarkMode, onSetDarkMode, fontSize, onSetFontSize,
  showAedEquivalent, onSetShowAedEquivalent, isSyncing, syncError, user, onSignOut,
  googleSheetsConfig, onSaveGoogleSheetsConfig, onSyncSheets, isSyncingSheets, sheetSyncError
}) => {
  const [formData, setFormData] = useState<ZohoConfig>({
    accessToken: '',
    organizationId: '',
    apiDomain: 'https://www.zohoapis.com'
  });

  // Google Sheets state
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetMapping, setSheetMapping] = useState<Record<string, string>>({});
  const [sheetAutoSync, setSheetAutoSync] = useState(false);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [detectingHeaders, setDetectingHeaders] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [sheetsDetected, setSheetsDetected] = useState(false);
  const [sheetSyncResult, setSheetSyncResult] = useState<{ added: number; updated: number; skipped: number } | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [syncResult, setSyncResult] = useState<{ imported: number; updated: number } | null>(null);
  const [showWipeConfirmation, setShowWipeConfirmation] = useState(false);
  const [wipeDoubleCheck, setWipeDoubleCheck] = useState('');
  const [showZohoAdvanced, setShowZohoAdvanced] = useState(false);
  const [dedupeStatus, setDedupeStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [dedupeCount, setDedupeCount] = useState(0);
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

  useEffect(() => {
    if (googleSheetsConfig) {
      setSheetUrl(googleSheetsConfig.sheetUrl ?? '');
      setSheetMapping(googleSheetsConfig.columnMapping ?? {});
      setSheetAutoSync(googleSheetsConfig.autoSync ?? false);
      if (googleSheetsConfig.sheetUrl && Object.keys(googleSheetsConfig.columnMapping ?? {}).length > 0) {
        setSheetsDetected(true);
      }
    }
  }, [googleSheetsConfig]);

  const handleSaveAll = () => {
    onSaveConfig(formData);
    if (sheetUrl) {
      onSaveGoogleSheetsConfig({ sheetUrl, columnMapping: sheetMapping, autoSync: sheetAutoSync, lastSync: googleSheetsConfig.lastSync });
    }
    setSaveStatus('saved');
    setTimeout(() => { setSaveStatus('idle'); onClose(); }, 600);
  };

  const handleDetectColumns = async () => {
    if (!sheetUrl.trim()) return;
    setDetectingHeaders(true);
    setDetectError(null);
    setSheetsDetected(false);
    const { headers, error } = await fetchSheetHeaders(sheetUrl.trim());
    setDetectingHeaders(false);
    if (error) { setDetectError(error); return; }
    setSheetHeaders(headers);
    const detected = autoDetectMapping(headers);
    setSheetMapping(detected);
    setSheetsDetected(true);
  };

  if (!isOpen) return null;

  const isZohoConnected = !!(formData.refreshToken && formData.clientId && formData.clientSecret && formData.organizationId);
  const isSheetsConnected = !!(googleSheetsConfig.sheetUrl && Object.keys(googleSheetsConfig.columnMapping ?? {}).length > 0);

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

  const detectedCount = Object.keys(sheetMapping).length;
  const totalFields = MAPPABLE_FIELDS.length;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-surface-container-lowest w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl shadow-xl border border-surface-container flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-8 py-6 border-b border-surface-container flex justify-between items-center">
          <div>
            <h1 className="font-serif text-2xl text-on-background leading-none">App Settings</h1>
            <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">Workspace customization & system maintenance</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-on-surface-variant hover:text-on-background hover:bg-surface-container-low rounded-full transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Column: UI & Account */}
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
                    <input
                      type="range" min="10" max="20" step="1"
                      className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                      value={fontSize}
                      onChange={(e) => onSetFontSize(e.target.value)}
                    />
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
                    <button
                      onClick={() => { onClose(); onSignOut(); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-error hover:bg-red-50 transition-colors text-[9px] font-medium uppercase tracking-wider shrink-0"
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Google Sheets Integration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Sheet size={16} className="text-primary" />
                  <h3 className="text-[10px] font-medium text-on-background uppercase tracking-widest">Google Sheets Sync</h3>
                </div>
                <div className="p-5 bg-surface-container-low rounded-xl border border-surface-container space-y-4">

                  {/* Connected badge */}
                  {isSheetsConnected && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-emerald-700">Sheet Connected</p>
                        <p className="text-[8px] text-emerald-600 font-medium truncate">
                          {googleSheetsConfig.lastSync ? `Last synced: ${new Date(googleSheetsConfig.lastSync).toLocaleString()}` : 'Ready to sync'}
                        </p>
                      </div>
                      {googleSheetsConfig.autoSync && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded-full">
                          <Zap size={9} className="text-emerald-600" />
                          <span className="text-[8px] font-semibold text-emerald-700 uppercase">Auto</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* URL input */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>Google Sheet URL</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                        <input
                          type="url"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className={`${inputClass} pl-8`}
                          value={sheetUrl}
                          onChange={(e) => { setSheetUrl(e.target.value); setSheetsDetected(false); setDetectError(null); }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleDetectColumns}
                        disabled={detectingHeaders || !sheetUrl.trim()}
                        className="px-3 py-2 bg-primary text-on-primary rounded-xl text-[9px] font-medium uppercase tracking-wider disabled:opacity-50 shrink-0 hover:bg-primary-dim transition-colors"
                      >
                        {detectingHeaders ? <RefreshCw size={12} className="animate-spin" /> : 'Detect'}
                      </button>
                    </div>
                    <p className="text-[8px] text-on-surface-variant px-1">Share the sheet with <strong>"Anyone with the link can view"</strong> first</p>
                  </div>

                  {/* Detect error */}
                  {detectError && (
                    <div className="flex items-start gap-2 p-3 bg-error/5 border border-error/20 rounded-xl">
                      <AlertTriangle size={13} className="text-error shrink-0 mt-0.5" />
                      <p className="text-[9px] font-medium text-error">{detectError}</p>
                    </div>
                  )}

                  {/* Column mapping */}
                  {sheetsDetected && sheetHeaders.length > 0 && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <label className={labelClass}>Column Mapping</label>
                        <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full ${detectedCount >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {detectedCount}/{totalFields} detected
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                        {MAPPABLE_FIELDS.map(({ key, label, required }) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className={`text-[8px] font-medium w-28 shrink-0 ${required ? 'text-on-background' : 'text-on-surface-variant'}`}>
                              {label}{required ? ' *' : ''}
                            </span>
                            <select
                              value={sheetMapping[key] || ''}
                              onChange={(e) => setSheetMapping(prev => ({ ...prev, [key]: e.target.value }))}
                              className="flex-1 bg-surface-container border border-surface-container rounded-lg px-2 py-1.5 text-[9px] font-medium text-on-background outline-none focus:ring-1 focus:ring-primary/20"
                            >
                              <option value="">— not mapped —</option>
                              {sheetHeaders.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                            {sheetMapping[key] && (
                              <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto-sync toggle */}
                  {(sheetsDetected || isSheetsConnected) && (
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-[10px] font-medium text-on-background">Auto-sync on load</p>
                        <p className="text-[8px] text-on-surface-variant">Automatically sync sheet when you open the app</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSheetAutoSync(v => !v)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${sheetAutoSync ? 'bg-primary' : 'bg-surface-container'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sheetAutoSync ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )}

                  {/* Sync button */}
                  {(sheetsDetected || isSheetsConnected) && (
                    <div className="pt-3 border-t border-surface-container space-y-2">
                      <button
                        type="button"
                        onClick={async () => {
                          // Save config first then sync
                          onSaveGoogleSheetsConfig({ sheetUrl, columnMapping: sheetMapping, autoSync: sheetAutoSync, lastSync: googleSheetsConfig.lastSync });
                          setSheetSyncResult(null);
                          const result = await onSyncSheets();
                          if (result) setSheetSyncResult(result);
                        }}
                        disabled={isSyncingSheets}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-full text-[10px] font-medium uppercase tracking-wider shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={isSyncingSheets ? 'animate-spin' : ''} />
                        {isSyncingSheets ? 'Syncing Sheet...' : 'Sync Sheet Now'}
                      </button>

                      {sheetSyncError && (
                        <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-xl">
                          <AlertTriangle size={13} className="text-error shrink-0" />
                          <p className="text-[9px] font-medium text-error">{sheetSyncError}</p>
                        </div>
                      )}
                      {sheetSyncResult && !sheetSyncError && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                          <p className="text-[9px] font-medium text-emerald-700">
                            {sheetSyncResult.added} added · {sheetSyncResult.updated} updated · {sheetSyncResult.skipped} skipped
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Zoho & Data */}
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
                        <p className="text-[8px] text-emerald-600 font-medium">Token auto-refreshes on every sync. {formData.lastSync ? `Last synced: ${formData.lastSync}` : 'Not yet synced.'}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className={labelClass}>Organization ID</label>
                    <input type="text" placeholder="e.g. 712345678" className={inputClass} value={formData.organizationId} onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowZohoAdvanced(!showZohoAdvanced)}
                    className="w-full flex items-center justify-between text-[9px] font-medium text-on-surface-variant uppercase tracking-widest hover:text-on-background transition-colors py-1"
                  >
                    <span>{isZohoConnected ? 'Update OAuth Credentials' : 'OAuth Credentials (required for auto-sync)'}</span>
                    <span className="text-[8px]">{showZohoAdvanced ? '▲' : '▼'}</span>
                  </button>

                  {(!isZohoConnected || showZohoAdvanced) && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      {!isZohoConnected && (
                        <p className="text-[8px] text-on-surface-variant font-medium px-1">Enter your Zoho OAuth credentials once. The token will auto-refresh on every session — you'll never need to paste a token again.</p>
                      )}
                      <div className="space-y-1.5">
                        <label className={labelClass}>Refresh Token</label>
                        <input type="password" placeholder="Paste Zoho Refresh Token..." className={inputClass} value={formData.refreshToken || ''} onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <button
                      type="button"
                      onClick={async () => {
                        setSyncResult(null);
                        const result = await onSync();
                        if (result) setSyncResult(result);
                      }}
                      disabled={isSyncing || !formData.organizationId}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-full text-[10px] font-medium uppercase tracking-wider shadow-sm hover:bg-primary-dim transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                      {isSyncing ? 'Synchronizing Invoices...' : 'Sync Zoho Invoices'}
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
                        <p className="text-[9px] font-medium text-emerald-700">{syncResult.imported} new, {syncResult.updated} updated invoices synced</p>
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

                  {/* Deduplicate */}
                  <button
                    onClick={async () => {
                      setDedupeStatus('running');
                      setDedupeCount(0);
                      const removed = await onDeduplicate();
                      setDedupeCount(removed);
                      setDedupeStatus('done');
                      setTimeout(() => setDedupeStatus('idle'), 4000);
                    }}
                    disabled={dedupeStatus === 'running'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-lowest border border-surface-container rounded-xl text-[9px] font-medium uppercase tracking-wider hover:bg-surface-container transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={dedupeStatus === 'running' ? 'animate-spin' : ''} />
                    {dedupeStatus === 'running' ? 'Scanning...' : dedupeStatus === 'done' ? (dedupeCount > 0 ? `Removed ${dedupeCount} duplicate${dedupeCount !== 1 ? 's' : ''}` : 'No duplicates found') : 'Find & Remove Duplicates'}
                  </button>

                  <button onClick={() => { setWipeDoubleCheck(''); setShowWipeConfirmation(true); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-error/5 text-error hover:bg-error/10 rounded-xl text-[9px] font-medium uppercase tracking-wider transition-colors border border-error/20"><Trash2 size={13}/> Factory Reset</button>
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
            <input
              autoFocus
              type="text"
              className="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-center font-semibold text-lg text-on-background focus:ring-2 focus:ring-error/30 uppercase outline-none"
              value={wipeDoubleCheck}
              onChange={(e) => setWipeDoubleCheck(e.target.value.toUpperCase())}
              placeholder="---"
            />
            <div className="grid grid-cols-2 gap-3 pt-6">
              <button onClick={() => setShowWipeConfirmation(false)} className="py-3 bg-surface-container-low border border-surface-container rounded-full font-medium text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-on-background transition-colors">Cancel</button>
              <button
                onClick={() => { setShowWipeConfirmation(false); onClearData(); }}
                disabled={wipeDoubleCheck !== 'WIPE'}
                className="py-3 bg-error disabled:bg-surface-container text-white disabled:text-on-surface-variant rounded-full font-medium text-[10px] uppercase tracking-wider shadow-sm transition-colors"
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
