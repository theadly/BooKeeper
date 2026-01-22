import React, { useState, useRef, useEffect } from 'react';
import { AIChatMessage, Transaction, Contact, Campaign, BankTransaction, StatusOption } from '../types';
import { generateFinancialAdvice } from '../services/geminiService';
import { Send, User, Trash2, ExternalLink, Minus, Activity } from 'lucide-react';
import JarvisIcon from './JarvisIcon';
import LadlyLogo from './LadlyLogo';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  contacts: Contact[];
  campaigns: Campaign[];
  bankTransactions: BankTransaction[];
  history: AIChatMessage[];
  onUpdateHistory: (history: AIChatMessage[]) => void;
  onNavigateToCampaign: (projectName: string) => void;
  // Actions injected from App
  onUpdateLedgerStatus: (projects: string[], field: 'clientStatus' | 'ladlyStatus', status: StatusOption) => void;
  onReconcile: (projectName: string, bankId: string) => void;
}

const AIChat: React.FC<AIChatProps> = ({ 
  isOpen, onClose, transactions, contacts, campaigns, bankTransactions, 
  history, onUpdateHistory, onNavigateToCampaign,
  onUpdateLedgerStatus, onReconcile
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isOpen]);

  useEffect(() => {
    if (history.length === 0) {
      // Default greeting without relying on auth provider
      onUpdateHistory([{
        id: 'welcome',
        role: 'model',
        text: `At your service, Laila. All systems are online and the ledger is ready for your inspection. How may I assist you today?`,
        timestamp: new Date()
      }]);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: AIChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    const newHistory = [...history, userMsg];
    onUpdateHistory(newHistory);
    setInput('');
    setIsLoading(true);

    // Mock user context since we removed Firebase Auth
    const currentUser = { displayName: 'Laila Mourad', email: 'admin@bookeeper.com' };
    
    const response = await generateFinancialAdvice(
      input, 
      transactions, 
      contacts, 
      campaigns, 
      bankTransactions,
      { name: currentUser.displayName, email: currentUser.email }
    );

    // Process Function Calls if any
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === 'update_ledger_status') {
          onUpdateLedgerStatus(call.args.projectNames, call.args.field, call.args.status);
        } else if (call.name === 'match_ledger_with_bank') {
          onReconcile(call.args.projectName, call.args.bankTransactionId);
        }
      }
    }

    const modelMsg: AIChatMessage = {
      id: crypto.randomUUID(),
      role: 'model',
      text: response.text,
      timestamp: new Date()
    };

    onUpdateHistory([...newHistory, modelMsg]);
    setIsLoading(false);
  };

  const clearChat = () => {
    if (confirm("Clear all chat history?")) {
      onUpdateHistory([]);
    }
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\[Campaign:[^\]]+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[Campaign:([^\]]+)\]/);
      if (match) {
        const projectName = match[1];
        return (
          <button
            key={i}
            onClick={() => onNavigateToCampaign(projectName)}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors my-1 mx-0.5"
          >
            <ExternalLink size={12} />
            {projectName}
          </button>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop to allow click-outside-to-close */}
      <div className="fixed inset-0 z-[550]" onClick={onClose} />
      
      <div className={`
        fixed bottom-24 right-8 z-[600] w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] 
        flex flex-col bg-bg-card border border-slate-200 dark:border-slate-700 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] 
        overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300
      `}>
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-sidebar text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl text-indigo-400">
                <JarvisIcon className="h-6 w-6" />
            </div>
            <div>
                <h2 className="font-black text-sm uppercase tracking-widest">JARVIS AI</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">System Agency Active</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={clearChat} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors" title="Clear History">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors" title="Close">
              <Minus size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-bg-page/50">
          {history.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
                ${msg.role === 'model' ? 'bg-primary text-primary-foreground' : 'bg-bg-card border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}
              `}>
                {msg.role === 'model' ? <JarvisIcon className="h-6 w-6" /> : <User size={16} />}
              </div>
              
              <div className={`
                max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-none' 
                  : 'bg-bg-card border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'}
              `}>
                <div className="whitespace-pre-line">
                  {renderMessageContent(msg.text)}
                </div>
                <div className={`text-[9px] mt-2 opacity-60 font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-primary-foreground text-right' : 'text-slate-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <JarvisIcon className="h-6 w-6" />
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                 <Activity size={12} className="text-primary animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jarvis is working...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-bg-card shrink-0">
          <div className="flex gap-2 relative">
              <input 
                type="text" 
                placeholder="Ask JARVIS to update statuses..." 
                className="flex-1 bg-bg-page border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary focus:outline-none pr-14 text-[13px] font-medium shadow-inner dark:text-white"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
              >
                <Send size={18} />
              </button>
          </div>
          <div className="mt-4 flex flex-col items-center gap-1 opacity-60">
             <LadlyLogo className="h-4" />
             <p className="text-center text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">AGENCY MODE ENABLED</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChat;