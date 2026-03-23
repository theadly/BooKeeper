
import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Wallet, Users, Menu, X,
  Settings, Target, Landmark,
  Loader, Percent, PanelLeftClose,
  PanelLeft, Sparkles, Moon, Sun,
  FolderHeart, ChevronDown, Building, Plus, Check, Camera, LogOut, ShieldCheck, RefreshCw
} from 'lucide-react';
import { Entity } from '../types';
import { formatDate } from '../constants';
import JarvisIcon from './JarvisIcon';
import AppLogo from './AppLogo';
import LadlyLogo from './LadlyLogo';
import UserProfileModal from './UserProfileModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAnyProcessing?: boolean;
  onToggleAi: () => void;
  isAiOpen: boolean;
  onOpenSettings: () => void;
  onSignOut: () => void;
  entities: Entity[];
  activeEntity: Entity;
  onSwitchEntity: (id: string) => void;
  onCreateEntity: (name: string, logo?: string) => void;
  onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
  onDeleteEntity: (id: string) => void;
  ledgerCount?: number;
  bankTxCount?: number;
  user?: { name?: string; email?: string; avatarUrl?: string };
  userProfile?: { customName?: string; customPhoto?: string };
  onSaveUserProfile?: (profile: { customName: string; customPhoto?: string }) => void;
  zohoConnected?: boolean;
  isSyncingZoho?: boolean;
  zohoLastSync?: string;
  onZohoSync?: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children, activeTab, setActiveTab, isAnyProcessing,
  onToggleAi, isAiOpen, onOpenSettings, onSignOut,
  entities, activeEntity, onSwitchEntity, onCreateEntity,
  onUpdateEntity, onDeleteEntity,
  ledgerCount = 0, bankTxCount = 0, user, userProfile, onSaveUserProfile,
  zohoConnected, isSyncingZoho, zohoLastSync, onZohoSync
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEntityMenuOpen, setIsEntityMenuOpen] = useState(false);
  const [isNewEntityModalOpen, setIsNewEntityModalOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityLogo, setNewEntityLogo] = useState<string | undefined>(undefined);
  const entityMenuRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isVisualFull = !isCollapsed || isHovered;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (entityMenuRef.current && !entityMenuRef.current.contains(e.target as Node)) setIsEntityMenuOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEntityName.trim()) {
      onCreateEntity(newEntityName.trim(), newEntityLogo);
      setNewEntityName(''); setNewEntityLogo(undefined); setIsNewEntityModalOpen(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'finance', label: 'Ledger', icon: <Wallet size={20} /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Target size={20} /> },
    { id: 'crm', label: 'CRM', icon: <Users size={20} /> },
    { id: 'banking', label: 'Banking', icon: <Landmark size={20} /> },
    { id: 'resources', label: 'Resources', icon: <FolderHeart size={20} /> },
    { id: 'tax', label: 'VAT', icon: <Percent size={20} /> },
  ];

  const renderEntityAvatar = (entity: Entity, sizeClass: string = "w-9 h-9", textClass: string = "text-xs") => {
    if (entity.logo) return <div className={`${sizeClass} rounded-xl overflow-hidden shrink-0 border`}><img src={entity.logo} alt={entity.name} className="w-full h-full object-cover" /></div>;
    return <div className={`${sizeClass} rounded-xl flex items-center justify-center font-black text-white shrink-0 ${entity.color} ${textClass}`}>{entity.initials}</div>;
  };

  return (
    <div className="flex h-screen bg-bg-page dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1900] md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <div className={`hidden md:block shrink-0 transition-all duration-500 ${isCollapsed ? 'w-24' : 'w-72'}`} />
      <aside onMouseEnter={() => isCollapsed && setIsHovered(true)} onMouseLeave={() => isCollapsed && setIsHovered(false)} className={`fixed z-[2000] h-full bg-sidebar border-r border-teal-900/5 transition-all duration-500 ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'} ${!isSidebarOpen && isCollapsed && !isHovered ? 'w-24' : 'w-72'} shadow-lg`}>
        <div className="p-6 flex flex-col h-full">
          <div className={`flex items-center justify-between mb-8 ${isVisualFull ? 'px-2' : 'px-0 justify-center'}`}>
            <div className="flex items-center gap-3">
              <AppLogo className="w-9 h-9" />
              <span className={`font-serif italic text-xl text-teal-900 transition-all duration-500 ${isVisualFull ? 'opacity-100' : 'opacity-0 w-0'}`}>BooKeeper</span>
            </div>
            <button onClick={() => setIsCollapsed(!isCollapsed)} className={`hidden md:block text-on-surface-variant hover:text-teal-900 ${!isVisualFull ? 'opacity-0' : ''}`}>{isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}</button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center transition-all duration-200 rounded-xl ${activeTab === item.id ? 'bg-white text-teal-900 font-semibold shadow-sm' : 'text-on-surface-variant hover:text-teal-900 hover:bg-white/60'} ${isVisualFull ? 'gap-3 px-4 py-3' : 'px-0 py-3 justify-center'}`}>
                {item.icon}
                <span className={`text-[11px] tracking-wider transition-all ${isVisualFull ? 'opacity-100' : 'opacity-0 w-0'}`}>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-4 pt-4 border-t border-teal-900/5 space-y-1">
             <button onClick={onOpenSettings} className={`w-full flex items-center transition-all rounded-xl text-on-surface-variant hover:text-teal-900 hover:bg-white/60 ${isVisualFull ? 'gap-3 px-4 py-2.5' : 'justify-center py-2.5'}`}><Settings size={18} />{isVisualFull && <span className="text-[10px] uppercase font-medium tracking-wider">Settings</span>}</button>
             <button onClick={onSignOut} className={`w-full flex items-center transition-all rounded-xl text-error hover:bg-red-50 ${isVisualFull ? 'gap-3 px-4 py-2.5' : 'justify-center py-2.5'}`}><LogOut size={18} />{isVisualFull && <span className="text-[10px] uppercase font-medium tracking-wider">Sign Out</span>}</button>
             <button
               onClick={() => setIsProfileModalOpen(true)}
               className={`bg-white/60 hover:bg-white/90 rounded-xl flex items-center mt-2 transition-colors w-full text-left ${isVisualFull ? 'p-3 gap-3' : 'p-3 justify-center'}`}
             >
                <div className="relative shrink-0">
                  {(userProfile?.customPhoto || user?.avatarUrl)
                    ? <img src={userProfile?.customPhoto || user?.avatarUrl} alt={userProfile?.customName || user?.name} className="w-8 h-8 rounded-xl object-cover border border-surface-container" />
                    : <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary font-black text-[10px]">{(userProfile?.customName || user?.name || user?.email || '?').split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2)}</div>
                  }
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-surface-container-low" />
                </div>
                {isVisualFull && (
                  <div className="truncate">
                    <p className="text-[9px] font-semibold uppercase text-teal-900 truncate">{userProfile?.customName || user?.name || user?.email || 'Signed In'}</p>
                    <p className="text-[7px] text-on-surface-variant font-medium uppercase truncate">{user?.email}</p>
                  </div>
                )}
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="bg-surface-container-lowest/80 backdrop-blur-xl h-16 flex items-center px-4 sm:px-6 justify-between shrink-0 border-b border-surface-container z-[1000]">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-teal-900 bg-white rounded-xl shadow-sm border border-surface-container" onClick={() => setIsSidebarOpen(true)}><Menu size={22} /></button>
            <div className="hidden lg:block text-left">
               <p className="text-[8px] font-medium uppercase text-on-surface-variant tracking-widest">Fiscal Cycle</p>
               <p className="text-[11px] font-semibold text-on-background uppercase">{formatDate(new Date())}</p>
            </div>
            {zohoConnected && (
              <button
                onClick={onZohoSync}
                disabled={isSyncingZoho}
                title={zohoLastSync ? `Last synced: ${zohoLastSync}` : 'Sync Zoho invoices'}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-surface-container text-[9px] font-medium text-on-surface-variant uppercase tracking-wider hover:text-teal-900 hover:bg-white/80 transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} className={isSyncingZoho ? 'animate-spin text-primary' : ''} />
                {isSyncingZoho ? 'Syncing...' : 'Sync Zoho'}
                {zohoLastSync && !isSyncingZoho && <span className="hidden lg:inline text-on-surface-variant/60 normal-case font-normal">· {zohoLastSync}</span>}
              </button>
            )}
            {!zohoConnected && (
              <button
                onClick={onOpenSettings}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-dashed border-surface-container text-[9px] font-medium text-on-surface-variant uppercase tracking-wider hover:text-teal-900 hover:border-primary/40 transition-all"
              >
                <RefreshCw size={12} />
                Connect Zoho
              </button>
            )}
          </div>
          <div className="relative" ref={entityMenuRef}>
            <button onClick={() => setIsEntityMenuOpen(!isEntityMenuOpen)} className="flex items-center gap-2 p-1 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm hover:shadow-md transition-shadow">
              {renderEntityAvatar(activeEntity, "w-8 h-8", "text-[10px]")}
              <div className="hidden sm:block text-left px-1"><p className="text-[10px] font-semibold uppercase text-on-background leading-none">{activeEntity.name}</p><p className="text-[7px] font-medium text-on-surface-variant uppercase mt-1">Profile</p></div>
              <ChevronDown size={12} className="text-on-surface-variant" />
            </button>
            {isEntityMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container z-[2000] overflow-hidden">
                <div className="p-2 space-y-1">
                  {entities.map(e => (
                    <button key={e.id} onClick={() => { onSwitchEntity(e.id); setIsEntityMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeEntity.id === e.id ? 'bg-primary/5' : 'hover:bg-surface-container-low'}`}>
                      {renderEntityAvatar(e, "w-8 h-8")}<div className="flex-1 text-left truncate"><p className="text-[11px] font-semibold text-on-background">{e.name}</p></div>
                      {activeEntity.id === e.id && <Check size={14} className="text-primary" />}
                    </button>
                  ))}
                  <button onClick={() => { setIsNewEntityModalOpen(true); setIsEntityMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all"><div className="w-8 h-8 rounded-lg bg-surface-container border-2 border-dashed flex items-center justify-center"><Plus size={16} /></div><span className="text-[10px] font-medium uppercase">New Entity</span></button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0 px-2 sm:px-4 pt-2 flex flex-col overflow-hidden relative">
          <div className="flex-1 min-h-0">{children}</div>
          <button onClick={onToggleAi} className="fixed bottom-6 right-6 z-[500] w-12 h-12 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group">
            {isAiOpen ? <X size={20} /> : <div className="relative"><JarvisIcon className="h-8 w-8" /><Sparkles size={8} className="absolute -top-1 -right-1 text-indigo-300 animate-pulse" /></div>}
          </button>
        </div>
      </main>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        googleName={user?.name}
        googleEmail={user?.email}
        googleAvatarUrl={user?.avatarUrl}
        customName={userProfile?.customName}
        customPhoto={userProfile?.customPhoto}
        onSave={(profile) => { onSaveUserProfile?.(profile); setIsProfileModalOpen(false); }}
        onSignOut={onSignOut}
      />

      {isNewEntityModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsNewEntityModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-xl p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-xl text-on-background mb-6">New Entity</h2>
            <form onSubmit={handleCreateEntity} className="space-y-4">
              <div className="flex flex-col items-center gap-2 mb-4">
                 <div className="w-16 h-16 rounded-xl bg-surface-container-low border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary cursor-pointer transition-colors" onClick={() => logoInputRef.current?.click()}>
                    {newEntityLogo ? <img src={newEntityLogo} className="w-full h-full object-cover rounded-xl" /> : <Camera size={24} />}
                 </div>
                 <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onload=()=>setNewEntityLogo(r.result as string); r.readAsDataURL(f); } }} />
              </div>
              <input autoFocus required placeholder="Company Name" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 font-medium text-sm text-on-background focus:ring-2 focus:ring-primary/20 outline-none" value={newEntityName} onChange={e => setNewEntityName(e.target.value)} />
              <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-full font-semibold text-sm shadow-sm hover:bg-primary-dim transition-colors">Create Profile</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
