
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Wallet, Users, Menu, X, 
  Settings, Target, Landmark, 
  Loader, Percent, PanelLeftClose, 
  PanelLeft, Sparkles, Moon, Sun, 
  FolderHeart, ChevronDown, Building, Plus, Check, Camera, LogOut, ShieldCheck
} from 'lucide-react';
import { Entity } from '../types';
import { formatDate } from '../constants';
import JarvisIcon from './JarvisIcon';
import AppLogo from './AppLogo';
import LadlyLogo from './LadlyLogo';

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
}

const Layout: React.FC<LayoutProps> = ({ 
  children, activeTab, setActiveTab, isAnyProcessing, 
  onToggleAi, isAiOpen, onOpenSettings, onSignOut,
  entities, activeEntity, onSwitchEntity, onCreateEntity,
  onUpdateEntity, onDeleteEntity,
  ledgerCount = 0, bankTxCount = 0
}) => {
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
      <aside onMouseEnter={() => isCollapsed && setIsHovered(true)} onMouseLeave={() => isCollapsed && setIsHovered(false)} className={`fixed z-[2000] h-full bg-sidebar text-white transition-all duration-500 ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'} ${!isSidebarOpen && isCollapsed && !isHovered ? 'w-24' : 'w-72'} shadow-2xl`}>
        <div className="p-6 flex flex-col h-full">
          <div className={`flex items-center justify-between mb-8 ${isVisualFull ? 'px-2' : 'px-0 justify-center'}`}>
            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter">
              <AppLogo className="w-9 h-9" />
              <span className={`transition-all duration-500 ${isVisualFull ? 'opacity-100' : 'opacity-0 w-0'}`}>BooKeeper</span>
            </div>
            <button onClick={() => setIsCollapsed(!isCollapsed)} className={`hidden md:block text-slate-400 hover:text-white ${!isVisualFull ? 'opacity-0' : ''}`}>{isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}</button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center transition-all duration-300 rounded-2xl ${activeTab === item.id ? 'bg-white text-slate-900 font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'} ${isVisualFull ? 'gap-4 px-5 py-4' : 'px-0 py-4 justify-center'}`}>
                {item.icon}
                <span className={`text-[11px] uppercase tracking-widest transition-all ${isVisualFull ? 'opacity-100' : 'opacity-0 w-0'}`}>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
             <button onClick={onOpenSettings} className={`w-full flex items-center transition-all rounded-2xl text-slate-400 hover:text-white ${isVisualFull ? 'gap-4 px-5 py-3' : 'justify-center py-3'}`}><Settings size={18} />{isVisualFull && <span className="text-[10px] uppercase font-black tracking-widest">Settings</span>}</button>
             <button onClick={onSignOut} className={`w-full flex items-center transition-all rounded-2xl text-rose-400 hover:bg-rose-500/10 ${isVisualFull ? 'gap-4 px-5 py-3' : 'justify-center py-3'}`}><LogOut size={18} />{isVisualFull && <span className="text-[10px] uppercase font-black tracking-widest">Sign Out</span>}</button>
             <div className={`bg-white/5 rounded-2xl flex items-center mt-2 ${isVisualFull ? 'p-4 gap-3' : 'p-3 justify-center'}`}>
                <div className="relative">{renderEntityAvatar(activeEntity, "w-8 h-8", "text-[10px]")}<div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-sidebar" /></div>
                {isVisualFull && <div className="truncate"><p className="text-[9px] font-black uppercase text-white truncate">{activeEntity.name}</p><p className="text-[7px] text-slate-500 font-bold uppercase">{ledgerCount} Lines</p></div>}
             </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl h-16 flex items-center px-4 sm:px-6 justify-between shrink-0 border-b z-[1000]">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-900 bg-white rounded-xl shadow-sm border" onClick={() => setIsSidebarOpen(true)}><Menu size={22} /></button>
            <div className="hidden lg:block text-left">
               <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Fiscal Cycle</p>
               <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{formatDate(new Date())}</p>
            </div>
          </div>
          <div className="relative" ref={entityMenuRef}>
            <button onClick={() => setIsEntityMenuOpen(!isEntityMenuOpen)} className="flex items-center gap-2 p-1 rounded-xl bg-white dark:bg-slate-900 border shadow-sm">
              {renderEntityAvatar(activeEntity, "w-8 h-8", "text-[10px]")}
              <div className="hidden sm:block text-left px-1"><p className="text-[10px] font-black uppercase text-slate-900 dark:text-white leading-none">{activeEntity.name}</p><p className="text-[7px] font-black text-slate-400 uppercase mt-1">Profile</p></div>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {isEntityMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border z-[2000] overflow-hidden">
                <div className="p-2 space-y-1">
                  {entities.map(e => (
                    <button key={e.id} onClick={() => { onSwitchEntity(e.id); setIsEntityMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeEntity.id === e.id ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                      {renderEntityAvatar(e, "w-8 h-8")}<div className="flex-1 text-left truncate"><p className="text-[11px] font-black">{e.name}</p></div>
                      {activeEntity.id === e.id && <Check size={14} className="text-primary" />}
                    </button>
                  ))}
                  <button onClick={() => { setIsNewEntityModalOpen(true); setIsEntityMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:text-primary transition-all"><div className="w-8 h-8 rounded-lg bg-slate-50 border-2 border-dashed flex items-center justify-center"><Plus size={16} /></div><span className="text-[10px] font-black uppercase">New Entity</span></button>
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

      {isNewEntityModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsNewEntityModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black uppercase mb-6">New Entity</h2>
            <form onSubmit={handleCreateEntity} className="space-y-4">
              <div className="flex flex-col items-center gap-2 mb-4">
                 <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed flex items-center justify-center text-slate-300 hover:border-primary cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                    {newEntityLogo ? <img src={newEntityLogo} className="w-full h-full object-cover rounded-2xl" /> : <Camera size={24} />}
                 </div>
                 <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onload=()=>setNewEntityLogo(r.result as string); r.readAsDataURL(f); } }} />
              </div>
              <input autoFocus required placeholder="Company Name" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm" value={newEntityName} onChange={e => setNewEntityName(e.target.value)} />
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg">Create Profile</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
