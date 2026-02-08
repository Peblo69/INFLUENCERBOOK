
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewChat,
  onOpenSettings,
  onOpenUpgrade
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="w-[240px] h-full bg-black flex flex-col border-r border-white/5 text-sm font-sans z-40">
      {/* Header / New Chat */}
      <div className="p-4 pb-2">
        <button 
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-2.5 bg-[#18181b] hover:bg-[#27272a] text-white rounded-lg transition-colors border border-white/5 group shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          <span className="font-medium text-xs tracking-wide">NEW CHAT</span>
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>
          </div>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="px-2 py-2 space-y-0.5">
          <NavButton 
            label="Explore" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>} 
          />
          <NavButton 
            label="Trending" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} 
          />
          <NavButton 
            label="Model Labs" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"/><path d="M14 2v7.31"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>} 
          />
      </div>

      {/* Divider */}
      <div className="px-4 py-2">
         <div className="h-px bg-white/5"></div>
      </div>

      {/* Scrollable History Area */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-800">
         <div className="space-y-1">
             <div className="mt-2 mb-2 px-4 text-[10px] font-medium text-muted/60 tracking-[0.2em] flex justify-between items-center group select-none">
                <span>HISTORY</span>
             </div>
             
             {sessions.length === 0 ? (
                 <div className="px-4 py-2 text-[10px] text-muted/30 italic font-mono">NO ARCHIVES</div>
             ) : (
                sessions.map(session => (
                    <button
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={`w-full text-left px-3 py-2 text-xs truncate rounded-md transition-colors ${
                        currentSessionId === session.id 
                            ? 'bg-[#18181b] text-white' 
                            : 'text-muted hover:text-white hover:bg-[#18181b]/50'
                        }`}
                    >
                        {session.title}
                    </button>
                ))
             )}
         </div>
      </div>

      {/* Footer Profile */}
      <div className="p-4 border-t border-white/5 relative" ref={menuRef}>
        
        {/* Dropdown Menu */}
        {showMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.1s_ease-out] z-50">
                <div className="p-1">
                    <MenuItem 
                        label="Settings" 
                        onClick={() => { onOpenSettings(); setShowMenu(false); }}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>} 
                    />
                    <MenuItem 
                        label="Custom Instructions" 
                        onClick={() => { onOpenSettings(); setShowMenu(false); }}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>} 
                    />
                    <div className="h-px bg-white/5 my-1"></div>
                    <MenuItem 
                        label="Upgrade Plan" 
                        onClick={() => { onOpenUpgrade(); setShowMenu(false); }}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>} 
                        highlight 
                    />
                    <div className="h-px bg-white/5 my-1"></div>
                    <MenuItem 
                        label="Log out" 
                        onClick={() => { setShowMenu(false); }}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>} 
                        danger 
                    />
                </div>
            </div>
        )}

        {/* Profile Button */}
        <div 
            onClick={() => setShowMenu(!showMenu)}
            className={`flex items-center gap-3 hover:bg-[#18181b] p-2 rounded-lg cursor-pointer transition-colors -mx-2 ${showMenu ? 'bg-[#18181b]' : ''}`}
        >
          <div className="w-7 h-7 rounded-full bg-[#27272a] flex items-center justify-center text-[10px] font-medium text-white ring-1 ring-white/10 relative">
            K
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-black rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">kacinka74</div>
            <div className="text-[10px] text-muted truncate">Pro Plan</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`}><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ label, icon, active, onClick }: { label: string, icon: React.ReactNode, active?: boolean, onClick?: () => void }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 group ${
            active 
            ? 'bg-white/10 text-white' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
    >
        <span className={`transition-colors ${active ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>
            {icon}
        </span>
        <span>{label}</span>
    </button>
);

const MenuItem = ({ label, icon, highlight, danger, onClick }: { label: string, icon: React.ReactNode, highlight?: boolean, danger?: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 
        highlight ? 'text-white hover:bg-[#27272a]' :
        'text-gray-300 hover:text-white hover:bg-[#27272a]'
    }`}>
        <span className={danger ? 'text-red-400' : 'text-gray-500 group-hover:text-white'}>{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        {highlight && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
    </button>
)
