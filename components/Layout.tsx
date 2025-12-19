
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Wallet, Users, Menu, X, 
  Settings, Target, Landmark, 
  Loader, Heart, Percent, PanelLeftClose, 
  PanelLeft, Sparkles, Moon, Sun, Palette,
  DollarSign, FolderHeart, ChevronDown, Building, Plus, Check, Edit3, Trash2, Camera, LogOut, Database, ShieldCheck
} from 'lucide-react';
import { Entity } from '../types';
import { formatDate } from '../constants';
import DirhamSymbol from './DirhamSymbol';
import FiNancyIcon from './FiNancyIcon';
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
  
  // Entity Props
  entities: Entity[];
  activeEntity: Entity;
  onSwitchEntity: (id: string) => void;
  onCreateEntity: (name: string, logo?: string) => void;
  onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
  onDeleteEntity: (id: string) => void;

  // Persistence Status
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
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityLogo, setNewEntityLogo] = useState<string | undefined>(undefined);
  
  const entityMenuRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isVisualFull = !isCollapsed || isHovered;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (entityMenuRef.current && !entityMenuRef.current.contains(e.target as Node)) {
        setIsEntityMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEntityLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewEntityLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateOrUpdateEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEntityName.trim()) {
      if (editingEntityId) {
        onUpdateEntity(editingEntityId, { 
          name: newEntityName.trim(), 
          logo: newEntityLogo,
          initials: newEntityName.split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase()
        });
      } else {
        onCreateEntity(newEntityName.trim(), newEntityLogo);
      }
      resetModal();
    }
  };

  const resetModal = () => {
    setNewEntityName('');
    setNewEntityLogo(undefined);
    setEditingEntityId(null);
    setIsNewEntityModalOpen(false);
    setIsEntityMenuOpen(false);
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
    if (entity.logo) {
      return (
        <div className={`${sizeClass} rounded-xl overflow-hidden shadow-md shrink-0 border border-white/20`}>
          <img src={entity.logo} alt={entity.name} className="w-full h-full object-cover" />
        </div>
      );
    }
    return (
      <div className={`${sizeClass} rounded-xl flex items-center justify-center font-black text-white shadow-md shrink-0 ${entity.color} ${textClass}`}>
        {entity.initials}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-bg-page dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 selection:bg-indigo-200 dark:selection:bg-indigo-900">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1900] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`hidden md:block shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? 'w-24' : 'w-72'}`} />

      <aside 
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => isCollapsed && setIsHovered(false)}
        className={`
          fixed z-[2000] h-full bg-sidebar text-white transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${!isSidebarOpen && isCollapsed && !isHovered ? 'w-24' : 'w-72'}
          shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)]
        `}
      >
        <div className={`p-6 flex flex-col h-full`}>
          <div className={`flex items-center justify-between mb-8 transition-all duration-500 ${isVisualFull ? 'px-2' : 'px-0 justify-center'}`}>
            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter overflow-hidden">
              <AppLogo className={`transition-all duration-500 ${isVisualFull ? 'w-9 h-9' : 'w-8 h-8'}`} />
              <span className={`transition-all duration-500 origin-left ${isVisualFull ? 'opacity-100 scale-100' : 'opacity-0 scale-90 w-0'}`}>
                BooKeeper
              </span>
            </div>
            
            <button 
              onClick={() => { setIsCollapsed(!isCollapsed); setIsHovered(false); }}
              className={`hidden md:flex p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-300 ${!isVisualFull ? 'opacity-0 group-hover:opacity-100 pointer-events-none' : ''}`}
            >
              {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>

            <button className="md:hidden text-slate-400 p-2 hover:bg-white/10 rounded-xl" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar -mx-2 px-2 no-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`
                  w-full flex items-center transition-all duration-300 rounded-2xl group relative
                  ${activeTab === item.id 
                    ? 'bg-white text-slate-900 font-black shadow-xl translate-x-1' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'}
                  ${isVisualFull ? 'gap-4 px-5 py-3.5 sm:py-4' : 'px-0 py-4 justify-center'}
                `}
                title={!isVisualFull ? item.label : undefined}
              >
                <div className={`shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] sm:text-[11px] uppercase tracking-widest transition-all duration-500 origin-left truncate ${isVisualFull ? 'opacity-100 scale-100 w-auto' : 'opacity-0 scale-90 w-0'}`}>
                  {item.label}
                </span>
                
                {!isVisualFull && activeTab === item.id && (
                  <div className="absolute right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
             <button 
               onClick={onOpenSettings}
               className={`
                 w-full flex items-center transition-all duration-300 rounded-2xl group
                 text-slate-400 hover:text-white hover:bg-white/5
                 ${isVisualFull ? 'gap-4 px-5 py-3' : 'px-0 py-3 justify-center'}
               `}
               title="Settings"
             >
               <Settings size={18} />
               {isVisualFull && <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>}
             </button>

             <button 
               onClick={onSignOut}
               className={`
                 w-full flex items-center transition-all duration-300 rounded-2xl group
                 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10
                 ${isVisualFull ? 'gap-4 px-5 py-3' : 'px-0 py-3 justify-center'}
               `}
               title="Sign Out"
             >
               <LogOut size={18} />
               {isVisualFull && <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>}
             </button>
             
             <div className={`bg-white/5 rounded-3xl transition-all duration-500 border border-white/5 flex items-center mt-3 group/status ${isVisualFull ? 'p-4 sm:p-5 gap-3 sm:gap-4' : 'p-3 justify-center'}`}>
                <div className="relative">
                  {renderEntityAvatar(activeEntity, "w-7 h-7 sm:w-8 sm:h-8", "text-[10px]")}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-sidebar shadow-sm animate-pulse" title="Database Connected"></div>
                </div>
                <div className={`flex flex-col overflow-hidden transition-all duration-500 ${isVisualFull ? 'opacity-100 w-auto' : 'opacity-0 w-0 h-0'}`}>
                  <p className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5">
                    {activeEntity.name}
                    <ShieldCheck size={8} className="text-emerald-500" />
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">{ledgerCount} Lines</span>
                     <span className="text-[7px] text-slate-700 font-bold">•</span>
                     <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">{bankTxCount} Bank</span>
                  </div>
                </div>
             </div>

             {isVisualFull && (
               <div className="px-5 pt-3 pb-4 flex flex-col items-center gap-2 border-t border-white/5 mt-2 opacity-50">
                 <LadlyLogo className="h-4" />
                 <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 text-center leading-tight">
                   © Ladly Media 2025
                 </p>
               </div>
             )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative">
        <header className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl h-16 sm:h-20 flex items-center px-4 sm:px-8 justify-between shrink-0 border-b border-slate-200/50 dark:border-slate-800/50 z-[1000]">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            {isCollapsed && (
              <button 
                onClick={() => setIsCollapsed(false)}
                className="hidden md:flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <PanelLeft size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Pin</span>
              </button>
            )}
            <div className="md:hidden">
               <AppLogo size={32} />
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            {isAnyProcessing && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-indigo-800 animate-pulse">
                <Loader size={12} className="animate-spin" />
                <span className="text-[8px] font-black uppercase tracking-widest hidden xs:inline">Syncing</span>
              </div>
            )}
            <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{formatDate(new Date())}</span>
            </div>
            
            <div className="relative" ref={entityMenuRef}>
              <button 
                onClick={() => setIsEntityMenuOpen(!isEntityMenuOpen)}
                className={`
                  flex items-center gap-2 p-1 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border shadow-sm transition-all active:scale-95 group
                  ${isEntityMenuOpen ? 'border-primary ring-2 ring-primary/20 bg-slate-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'}
                `}
              >
                {renderEntityAvatar(activeEntity, "w-8 h-8 sm:w-9 sm:h-9", "text-[10px]")}
                <div className="hidden sm:block text-left px-1">
                   <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest leading-none text-slate-900 dark:text-white truncate max-w-[100px]">{activeEntity.name}</p>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Entity Profile</p>
                </div>
                <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 ${isEntityMenuOpen ? 'rotate-180' : ''} pr-1`} />
              </button>

              {isEntityMenuOpen && (
                <div className="absolute right-0 mt-2 sm:mt-3 w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-slate-800 z-[2000] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="p-4 sm:p-5 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Switch Entity</h3>
                  </div>
                  <div className="max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-1">
                    {entities.map(entity => (
                      <div key={entity.id} className="relative group/entity-item">
                        <button
                          onClick={() => { onSwitchEntity(entity.id); setIsEntityMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl transition-all ${activeEntity.id === entity.id ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          {renderEntityAvatar(entity, "w-8 h-8 sm:w-10 sm:h-10", "text-[10px]")}
                          <div className="flex-1 text-left min-w-0">
                            <p className={`text-[12px] sm:text-[13px] font-black truncate ${activeEntity.id === entity.id ? 'text-primary' : 'text-slate-800 dark:text-slate-200'}`}>{entity.name}</p>
                            <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">Corporate</p>
                          </div>
                          
                          {activeEntity.id === entity.id && (
                            <Check size={14} className="text-primary shrink-0" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 sm:p-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/20">
                    <button 
                      onClick={() => { resetModal(); setIsNewEntityModalOpen(true); }}
                      className="w-full flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl text-slate-500 hover:text-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <Plus size={18} />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">Add New Profile</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-0 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
            {children}
          </div>

          <button
            onClick={onToggleAi}
            className={`
              fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[500] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground 
              shadow-[0_10px_40px_-10px_rgba(15,23,42,0.5)] flex items-center justify-center 
              hover:scale-110 active:scale-95 transition-all duration-300 group
              ${isAiOpen ? 'rotate-90' : ''}
            `}
            title="Ask AI"
          >
            {isAiOpen ? <X size={20} /> : (
              <div className="relative">
                <FiNancyIcon className="h-8 w-8 sm:h-10 sm:w-10" />
                <Sparkles size={10} className="absolute -top-1 -right-1 text-indigo-400 animate-pulse" />
              </div>
            )}
          </button>
        </div>
      </main>

      {/* New/Edit Entity Modal - Optimized for mobile width */}
      {isNewEntityModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={resetModal}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-widest">{editingEntityId ? 'Edit Profile' : 'New Entity'}</h2>
              <button onClick={resetModal} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateEntity} className="p-6 sm:p-8 space-y-6 text-center">
              <div className="flex flex-col items-center gap-4">
                 <div className="relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.8rem] sm:rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 group-hover:border-primary transition-colors">
                       {newEntityLogo ? (
                         <img src={newEntityLogo} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                         <Camera size={28} className="text-slate-300 group-hover:text-primary transition-colors" />
                       )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-lg shadow-lg border-2 border-white dark:border-slate-900">
                       <Plus size={12} />
                    </div>
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleEntityLogoUpload} />
                 </div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand Mark</p>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                <div className="relative">
                  <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    autoFocus
                    required
                    type="text" 
                    placeholder="e.g. Dyson Squad" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-primary font-bold text-sm dark:text-white outline-none"
                    value={newEntityName}
                    onChange={e => setNewEntityName(e.target.value)}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-primary hover:opacity-90 text-primary-foreground font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-xl active:scale-95 text-[10px]"
              >
                {editingEntityId ? 'Save Profile' : 'Create Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
