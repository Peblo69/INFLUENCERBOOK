import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Infinity, PanelLeft, ChevronRight, Settings, LogOut } from "lucide-react";

export const ModelsSidebar = () => {
  const { user, profile, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

  const navLinks = [
    { href: "/", label: "Home", icon: <HomeIcon /> },
    { href: "/assistant", label: "Assistant", icon: <ChatIcon /> },
    { href: "/models", label: "Models", icon: <GridIcon /> },
    { href: "/kiara-studio-labs", label: "Labs", icon: <FlaskIcon /> },
    { href: "/images", label: "Images", icon: <ImageIcon /> },
    { href: "/videos", label: "Video", icon: <VideoIcon /> },
  ];

  const libraryLinks = [
    { href: "/media", label: "My Media" },
    { href: "/favorites", label: "Favorites" },
    { href: "/uploads", label: "Uploads" },
    { href: "/trash", label: "Trash" },
  ];

  return (
    <aside 
        className={`flex flex-col h-full bg-black/60 backdrop-blur-xl border-r border-white/5 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isCollapsed ? 'w-20' : 'w-[280px]'
        }`}
    >
      
      {/* Logo Area */}
      <div 
        className={`flex items-center gap-3 h-20 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}
      >
        <div className="relative text-white min-w-[28px]">
          <Infinity size={28} className="text-white drop-shadow-[0_0_8px_rgba(233,213,255,0.5)]" />
        </div>
        
        {/* Logo Text - masked when collapsed */}
        <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <span className="text-lg font-bold tracking-tight text-white">
            AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Influencerbook</span>
            </span>
        </div>

        {/* Toggle Button (When Expanded) */}
        {!isCollapsed && (
            <button 
                onClick={() => setIsCollapsed(true)}
                className="ml-auto text-zinc-500 hover:text-white transition-colors p-1"
                title="Collapse Sidebar"
            >
                <PanelLeft size={18} />
            </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div>
            <div className={`px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                Studio
            </div>
            <div className="space-y-1">
                {navLinks.map((link) => (
                    <SidebarItem 
                        key={link.href}
                        icon={link.icon} 
                        label={link.label} 
                        active={pathname === link.href}
                        href={link.href}
                        collapsed={isCollapsed}
                    />
                ))}
            </div>
        </div>

        <div>
            <div className={`px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                Library
            </div>
            <div className="space-y-1">
                {libraryLinks.map((link) => (
                    <SidebarItem 
                        key={link.href}
                        icon={<FolderIcon />} // Using generic folder icon for library items
                        label={link.label} 
                        active={pathname === link.href}
                        href={link.href}
                        collapsed={isCollapsed}
                    />
                ))}
            </div>
        </div>
      </nav>

      {/* User / Footer Area */}
      <div className="p-3 border-t border-white/5 space-y-1 mt-auto" ref={menuRef}>
        
        {/* Collapse Button (When Collapsed - Centered) */}
        {isCollapsed && (
            <div className="flex justify-center mb-4">
                <button 
                    onClick={() => setIsCollapsed(false)}
                    className="w-10 h-10 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                    title="Expand Sidebar"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        )}

        {user ? (
            <>
                <div 
                    onClick={() => setShowMenu(!showMenu)}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-300 relative group ${isCollapsed ? 'justify-center' : ''} ${showMenu ? 'bg-white/5' : 'hover:bg-white/5'}`}
                >
                    {showMenu && !isCollapsed && (
                        <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden z-[60] backdrop-blur-xl animate-in slide-in-from-bottom-2 fade-in duration-200">
                            <div className="p-1.5 space-y-0.5">
                                <button onClick={() => window.location.href = '/settings'} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors duration-75">
                                    <Settings size={14} />
                                    <span className="font-medium">Settings</span>
                                </button>
                                <div className="h-px bg-white/5 mx-2 my-1"></div>
                                <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors duration-75">
                                    <LogOut size={14} />
                                    <span className="font-medium">Log out</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="w-9 h-9 min-w-[36px] rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] relative shadow-[0_0_15px_rgba(233,213,255,0.3)] group-hover:scale-105 transition-transform duration-75">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                            <div className="text-[10px] font-bold text-white">
                                {profile?.display_name?.[0] || profile?.username?.[0] || user.email?.[0] || 'U'}
                            </div>
                        </div>
                    </div>
                    
                    <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100'}`}>
                        <p className="text-[13px] font-bold text-white truncate group-hover:text-purple-300 transition-colors duration-75">
                            {profile?.display_name || profile?.username || user.email?.split('@')[0]}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate font-medium uppercase tracking-wide">
                            {profile?.is_pro ? 'Pro Plan Active' : 'Free Plan'}
                        </p>
                    </div>
                </div>
            </>
        ) : (
            <a
                href="/auth"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors duration-75 ${isCollapsed ? 'justify-center px-0 w-10 h-10 mx-auto' : ''}`}
            >
                {isCollapsed ? <LogOut size={16} /> : <span className="w-full text-center">Sign In</span>}
            </a>
        )}
      </div>
    </aside>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  href: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, collapsed, href }) => {
  return (
    <div className="relative group">
        <a 
        href={href}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-75 relative overflow-hidden group/item ${
            active 
            ? 'text-white bg-white/5 border border-white/5' 
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
        } ${collapsed ? 'justify-center px-0' : 'text-left'}`}
        >
        {active && (
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500 rounded-l-lg transition-all duration-100 ${collapsed ? 'h-1/2 top-1/4 rounded-full left-1' : ''}`} />
        )}
        
        <span className={`transition-colors duration-75 relative z-10 ${active ? 'text-purple-200' : 'group-hover/item:text-purple-200'}`}>
            {React.cloneElement(icon as React.ReactElement, { width: 18, height: 18 })}
        </span>
        
        <span className={`text-[13px] font-medium tracking-wide whitespace-nowrap transition-all duration-100 ${collapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            {label}
        </span>
        
        {active && !collapsed && (
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
        )}
        </a>

        {/* Tooltip for Collapsed State */}
        {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-75 pointer-events-none z-[60] shadow-xl translate-x-2 group-hover:translate-x-0">
                {label}
            </div>
        )}
    </div>
  );
};

// SVG Icons (Reused from previous version for consistency)
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);
const ChatIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);
const GridIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
);
const FlaskIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 2v7.31" /><path d="M14 2v7.31" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" /></svg>
);
const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
);
const VideoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
);
const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
);