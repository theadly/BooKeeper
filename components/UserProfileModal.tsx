import React, { useState, useRef } from 'react';
import { X, Camera, LogOut, Mail, User, ShieldCheck, Save, CheckCircle } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleName?: string;
  googleEmail?: string;
  googleAvatarUrl?: string;
  customName?: string;
  customPhoto?: string;
  onSave: (profile: { customName: string; customPhoto?: string }) => void;
  onSignOut: () => void;
}

function compressImage(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen, onClose,
  googleName, googleEmail, googleAvatarUrl,
  customName, customPhoto,
  onSave, onSignOut
}) => {
  const [nameInput, setNameInput] = useState(customName || googleName || '');
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(customPhoto);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const displayPhoto = photoPreview || customPhoto || googleAvatarUrl;
  const initials = (nameInput || googleName || googleEmail || '?')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, 300);
      setPhotoPreview(compressed);
    } catch { /* ignore */ }
    setIsCompressing(false);
  };

  const handleSave = () => {
    onSave({ customName: nameInput.trim(), customPhoto: photoPreview });
    setSaveStatus('saved');
    setTimeout(() => { setSaveStatus('idle'); onClose(); }, 600);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(undefined);
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-2xl border border-surface-container overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-container flex justify-between items-center">
          <div>
            <h2 className="font-serif text-xl text-on-background leading-none">My Profile</h2>
            <p className="text-[8px] font-medium text-on-surface-variant uppercase tracking-widest mt-1">Account & identity</p>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-background hover:bg-surface-container-low rounded-full transition-all"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-2 border-surface-container shadow-md" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-black text-2xl shadow-md">{initials}</div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="absolute inset-0 rounded-2xl bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {isCompressing
                  ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={20} className="text-white" />
                }
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[9px] font-medium text-primary uppercase tracking-wider hover:underline"
              >
                Upload photo
              </button>
              {(photoPreview || customPhoto) && (
                <>
                  <span className="text-on-surface-variant text-[9px]">·</span>
                  <button onClick={handleRemovePhoto} className="text-[9px] font-medium text-on-surface-variant uppercase tracking-wider hover:text-error transition-colors">Remove</button>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-medium text-on-surface-variant uppercase tracking-widest ml-1">Display Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                className="w-full bg-surface-container-low border border-surface-container rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-on-background outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Your display name"
              />
            </div>
          </div>

          {/* Email — read only */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-medium text-on-surface-variant uppercase tracking-widest ml-1">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <div className="w-full bg-surface-container border border-surface-container rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-on-surface-variant select-all">{googleEmail || '—'}</div>
            </div>
          </div>

          {/* Auth badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200/60">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            <span className="text-[9px] font-medium text-emerald-700 uppercase tracking-wider">Authenticated via Google · Secured by Supabase</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={handleSave}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-full font-medium text-[10px] uppercase tracking-wider shadow-sm transition-all ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-primary text-on-primary hover:bg-primary-dim'}`}
          >
            {saveStatus === 'saved' ? <CheckCircle size={14} /> : <Save size={14} />}
            {saveStatus === 'saved' ? 'Saved' : 'Save Changes'}
          </button>
          <button
            onClick={() => { onClose(); onSignOut(); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-medium text-[10px] uppercase tracking-wider text-error hover:bg-red-50 transition-colors border border-error/20"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
