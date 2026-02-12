import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Infinity, PanelLeft, ChevronRight, Settings, LogOut } from "lucide-react";

export const InfluencersSidebar = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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

  const pathname = location.pathname;

  const navLinks = [
    { href: "/", label: "Home", icon: <HomeIcon /> },
    { href: "/assistant", label: "Assistant", icon: <ChatIcon /> },
    { href: "/models", label: "Influencer Studio", icon: <GridIcon /> },
    { href: "/influencers", label: "Influencers", icon: <InfluencerIcon /> },
    { href: "/videos", label: "Video", icon: <VideoIcon /> },
    { href: "/kiara-studio-labs", label: "Labs", icon: <FlaskIcon /> },
    { href: "/images", label: "Assets", icon: <ImageIcon /> },
    ...(profile?.is_admin ? [{ href: "/admin", label: "Admin", icon: <AdminIcon /> }] : []),
  ];

  return (
    <aside 
      className={`flex flex-col h-screen bg-black/60 backdrop-blur-xl border-r border-white/5 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isCollapsed ? 'w-20' : 'w-[280px]'
      }`}
    >
      {/* Logo Area */}
      <div 
        className={`flex-shrink-0 flex items-center h-20 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}
      >
        <div className="relative text-white min-w-[28px]">
          <Infinity size={28} className="text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
        </div>
        
        <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <span className="text-lg font-semibold tracking-tight text-white/90">
            AI <span className="text-white/70">Influencerbook</span>
          </span>
        </div>

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="ml-auto text-white/40 hover:text-white/70 transition-colors p-1.5 hover:bg-white/5 rounded-lg"
            title="Collapse Sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {/* Studio Section */}
        <div>
          <div className={`px-3 text-[10px] font-medium text-white/30 uppercase tracking-[0.15em] mb-2 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
            Studio
          </div>
          <div className="space-y-0.5">
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
      </nav>

      {/* User / Footer Area */}
      <div className="p-3 border-t border-white/[0.04] space-y-1 mt-auto" ref={menuRef}>
        
        {isCollapsed && (
          <div className="flex justify-center mb-3">
            <button 
              onClick={() => setIsCollapsed(false)}
              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
              title="Expand Sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {user ? (
          <>
            <div 
              onClick={() => setShowMenu(!showMenu)}
              className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 relative group ${isCollapsed ? 'justify-center' : ''} ${showMenu ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}`}
            >
              {showMenu && !isCollapsed && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 bg-black/95 border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden z-[60] backdrop-blur-xl">
                  <div className="p-1.5 space-y-0.5">
                    <button onClick={() => navigate("/settings")} className="w-full flex items-center gap-3 px-3 py-2 text-[12px] text-white/50 hover:text-white/80 hover:bg-white/[0.05] rounded-lg transition-colors">
                      <Settings size={14} />
                      <span className="font-normal">Settings</span>
                    </button>
                    <div className="h-px bg-white/[0.04] mx-2 my-1"></div>
                    <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2 text-[12px] text-red-400/60 hover:text-red-400/90 hover:bg-red-500/[0.06] rounded-lg transition-colors">
                      <LogOut size={14} />
                      <span className="font-normal">Log out</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="w-8 h-8 min-w-[32px] rounded-full bg-white/[0.08] border border-white/[0.08] flex items-center justify-center">
                <span className="text-[11px] font-medium text-white/70">
                  {profile?.display_name?.[0] || profile?.username?.[0] || user.email?.[0] || "U"}
                </span>
              </div>
              
              <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <p className="text-[13px] font-medium text-white/80 truncate">
                  {profile?.display_name || profile?.username || user.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-white/30 truncate font-normal">
                  {profile?.is_pro ? "Pro Plan" : "Free Plan"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <Link to="/auth" className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.08] text-white/90 font-medium text-[13px] hover:bg-white/[0.12] transition-colors ${isCollapsed ? 'justify-center px-0 w-9 h-9 mx-auto' : ''}`}>
            {isCollapsed ? <LogOut size={16} /> : <span>Sign In</span>}
          </Link>
        )}
      </div>
    </aside>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  href: string;
  collapsed: boolean;
}

const SidebarItem = ({ icon, label, active, href, collapsed }: SidebarItemProps) => {
  return (
    <div className="relative group">
      <Link
        to={href}
        onMouseEnter={() => {
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = href;
          document.head.appendChild(prefetchLink);
        }}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative overflow-hidden group/item ${
          active
            ? "text-white bg-white/[0.05] border border-white/[0.06]"
            : "text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"
        } ${collapsed ? "justify-center px-0" : "text-left"}`}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-white/40 rounded-full" />
        )}
        <span className="text-white/50 group-hover/item:text-white/70 transition-colors relative z-10 flex-shrink-0">
          {icon}
        </span>
        <span
          className={`text-[13px] font-medium whitespace-nowrap transition-all duration-300 ${
            collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
          }`}
        >
          {label}
        </span>
      </Link>

      {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-black/90 border border-white/10 rounded-lg text-xs font-medium text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] backdrop-blur-xl">
          {label}
        </div>
      )}
    </div>
  );
};

// Clean, minimal icons - 16px, thinner stroke
const InfluencerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m22 21-3-3" />
    <path d="m19 18 3 3" />
    <path d="m22 18-3 3" />
  </svg>
);

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const FlaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2v7.31" />
    <path d="M14 2v7.31" />
    <path d="M8.5 2h7" />
    <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
    <path d="M5.52 16h12.96" />
  </svg>
);

const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const VideoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const AdminIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
