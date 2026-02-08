import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Infinity, PanelLeft, ChevronRight, Settings, LogOut } from "lucide-react";

export const CreateSidebar = () => {
  const { user, profile, signOut } = useAuth();
  const { t } = useI18n();
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

  const mainLinks = [
    { href: "/", label: t("Home"), icon: <HomeIcon /> },
    { href: "/assistant", label: t("Assistant"), icon: <ChatIcon /> },
    { href: "/models", label: t("Models"), icon: <GridIcon /> },
    { href: "/kiara-studio-labs", label: t("Labs"), icon: <FlaskIcon /> },
    { href: "/images", label: t("Images"), icon: <ImageIcon /> },
    { href: "/videos", label: t("Video"), icon: <VideoIcon /> },
  ];

  const libraryLinks = [
    { href: "/media", label: t("My Media"), icon: <FolderIcon /> },
    { href: "/favorites", label: t("Favorites"), icon: <FolderIcon /> },
    { href: "/uploads", label: t("Uploads"), icon: <FolderIcon /> },
    { href: "/trash", label: t("Trash"), icon: <FolderIcon /> },
  ];

  return (
    <aside
      className={`flex flex-col h-screen bg-black/60 backdrop-blur-xl border-r border-white/5 font-sans text-sm z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isCollapsed ? "w-20" : "w-[280px]"
      }`}
    >
      {/* Logo Area */}
      <div
        className={`flex-shrink-0 flex items-center gap-3 h-16 transition-all duration-300 ${
          isCollapsed ? "justify-center px-0" : "px-5"
        }`}
      >
        <div className="relative text-white min-w-[28px]">
          <Infinity
            size={28}
            className="text-white drop-shadow-[0_0_8px_rgba(233,213,255,0.4)]"
          />
        </div>

        <div
          className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          <span className="text-lg font-bold tracking-tight text-white">
            AI{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300">
              Influencerbook
            </span>
          </span>
        </div>

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="ml-auto text-zinc-500 hover:text-white transition-colors p-1"
            title={t("Collapse Sidebar")}
          >
            <PanelLeft size={18} />
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 min-h-0 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden">
        <div>
          <div
            className={`px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-all duration-300 ${
              isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"
            }`}
          >
            {t("Studio")}
          </div>
          <div className="space-y-1">
            {mainLinks.map((link) => (
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
          <div
            className={`px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-all duration-300 ${
              isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"
            }`}
          >
            {t("Library")}
          </div>
          <div className="space-y-1">
            {libraryLinks.map((link) => (
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

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-white/5 space-y-1 mt-auto" ref={menuRef}>
        {isCollapsed && (
          <div className="flex justify-center mb-3">
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-10 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              title={t("Expand Sidebar")}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {user ? (
          <div
            onClick={() => setShowMenu(!showMenu)}
            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 relative group ${
              isCollapsed ? "justify-center" : ""
            } ${showMenu ? "bg-white/5" : "hover:bg-white/5"}`}
          >
            {showMenu && !isCollapsed && (
              <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden z-[60] backdrop-blur-xl">
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => (window.location.href = "/settings")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Settings size={14} />
                    <span className="font-medium">{t("Settings")}</span>
                  </button>
                  <div className="h-px bg-white/5 mx-2 my-1"></div>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut size={14} />
                    <span className="font-medium">{t("Log out")}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="w-9 h-9 min-w-[36px] rounded-full bg-gradient-to-r from-pink-400/60 via-purple-400/60 to-indigo-400/60 p-[1px] relative shadow-[0_0_12px_rgba(233,213,255,0.15)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                <div className="text-[10px] font-bold text-white uppercase">
                  {profile?.display_name?.[0] ||
                    profile?.username?.[0] ||
                    user.email?.[0] ||
                    "U"}
                </div>
              </div>
            </div>

            <div
              className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${
                isCollapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100"
              }`}
            >
              <p className="text-sm font-bold text-white truncate group-hover:text-purple-200/80 transition-colors">
                {profile?.display_name ||
                  profile?.username ||
                  user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-zinc-500 truncate font-medium uppercase tracking-wide">
                {profile?.is_pro ? t("PRO PLAN") : t("FREE PLAN")}
              </p>
            </div>
          </div>
        ) : (
          <a
            href="/auth"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors ${
              isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""
            }`}
          >
            {isCollapsed ? (
              <LogOut size={16} />
            ) : (
              <span className="w-full text-center">{t("Sign In")}</span>
            )}
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

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  active,
  collapsed,
  href,
}) => {
  return (
    <div className="relative group">
      <a
        href={href}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden group/item ${
          active
            ? "text-white bg-white/5 border border-white/5"
            : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
        } ${collapsed ? "justify-center px-0" : "text-left"}`}
      >
        {active && (
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-400/80 via-purple-400/80 to-indigo-400/80 rounded-l-lg transition-all duration-300 ${
              collapsed ? "h-1/2 top-1/4 rounded-full left-1" : ""
            }`}
          />
        )}

        <span
          className={`transition-colors relative z-10 ${
            active ? "text-purple-200" : "group-hover/item:text-purple-200/70"
          }`}
        >
          {icon}
        </span>

        <span
          className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
            collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
          }`}
        >
          {label}
        </span>

        {active && !collapsed && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.06] to-transparent pointer-events-none" />
        )}
      </a>

      {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] shadow-xl translate-x-2 group-hover:translate-x-0">
          {label}
        </div>
      )}
    </div>
  );
};

// SVG Icons
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);
const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);
const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
);
const FlaskIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31" /><path d="M14 2v7.31" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" /></svg>
);
const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
);
const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
);
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
);
