import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatConversation } from "@/services/chatService";
import { Infinity, PanelLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, X, Check, Settings, LogOut, Star } from "lucide-react";

interface AssistantSidebarProps {
  conversations: ChatConversation[];
  currentConversationId: string | null;
  isLoading?: boolean;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
}

export const AssistantSidebar = ({
  conversations,
  currentConversationId,
  isLoading,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  onOpenUpgrade,
}: AssistantSidebarProps) => {
  const { user, profile, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const convoMenuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (convoMenuRef.current && !convoMenuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    if (showMenu || menuOpenId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu, menuOpenId]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleStartRename = (convo: ChatConversation) => {
    setEditingId(convo.id);
    setEditTitle(convo.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  const handleDelete = (id: string) => {
    onDeleteConversation(id);
    setMenuOpenId(null);
  };

  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

  const navLinks = [
    { href: "/", label: "Home", icon: <HomeIcon /> },
    { href: "/assistant", label: "Assistant", icon: <ChatIcon /> },
    { href: "/models", label: "Models", icon: <GridIcon /> },
    { href: "/kiara-studio-labs", label: "Labs", icon: <FlaskIcon /> },
    { href: "/images", label: "Images", icon: <ImageIcon /> },
    { href: "/videos", label: "Video", icon: <VideoIcon /> },
  ];

  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <div
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
            title="Collapse Sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className={`flex-shrink-0 px-3 pb-2 transition-all duration-300 ${isCollapsed ? "px-2" : ""}`}>
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2.5 py-2.5 rounded-xl transition-all duration-200 border border-white/5 group
            bg-gradient-to-r from-pink-500/[0.07] via-purple-500/[0.07] to-indigo-500/[0.07]
            hover:from-pink-500/[0.12] hover:via-purple-500/[0.12] hover:to-indigo-500/[0.12]
            hover:border-white/10
            ${isCollapsed ? "justify-center px-0" : "justify-center px-4"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-purple-300/70 group-hover:text-purple-200 transition-colors"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span
            className={`font-semibold text-[11px] tracking-[0.15em] uppercase text-zinc-400 group-hover:text-white transition-all duration-300 ${
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            }`}
          >
            New Chat
          </span>
        </button>
      </div>

      {/* Studio Navigation */}
      <nav className="flex-shrink-0 px-3 py-2 space-y-1">
        <div
          className={`px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-all duration-300 ${
            isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"
          }`}
        >
          Studio
        </div>
        {navLinks.map((link) => (
          <div key={link.href} className="relative group">
            <a
              href={link.href}
              onMouseEnter={() => {
                // Prefetch route on hover for instant navigation
                const prefetchLink = document.createElement('link');
                prefetchLink.rel = 'prefetch';
                prefetchLink.href = link.href;
                document.head.appendChild(prefetchLink);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden group/item ${
                pathname === link.href
                  ? "text-white bg-white/5 border border-white/5"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
              } ${isCollapsed ? "justify-center px-0" : "text-left"}`}
            >
              {pathname === link.href && (
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-400/80 via-purple-400/80 to-indigo-400/80 rounded-l-lg transition-all duration-300 ${
                    isCollapsed ? "h-1/2 top-1/4 rounded-full left-1" : ""
                  }`}
                />
              )}
              <span
                className={`transition-colors relative z-10 ${
                  pathname === link.href
                    ? "text-purple-200"
                    : "group-hover/item:text-purple-200/70"
                }`}
              >
                {link.icon}
              </span>
              <span
                className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                }`}
              >
                {link.label}
              </span>
              {pathname === link.href && !isCollapsed && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.06] to-transparent pointer-events-none" />
              )}
            </a>

            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] shadow-xl translate-x-2 group-hover:translate-x-0">
                {link.label}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="px-5 py-2">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"></div>
      </div>

      {/* Chat History Label */}
      <div
        className={`px-6 pb-1 transition-all duration-300 ${
          isCollapsed ? "opacity-0 h-0 overflow-hidden px-0" : "opacity-100 h-auto"
        }`}
      >
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Chats
        </span>
      </div>

      {/* Scrollable History - completely hidden scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 scrollbar-hide">
        {isCollapsed ? (
          <div className="flex flex-col items-center pt-2 space-y-1">
            {conversations.slice(0, 5).map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-200 group relative ${
                  currentConversationId === convo.id
                    ? "bg-white/5 text-white border border-white/5"
                    : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
                }`}
                title={convo.title}
              >
                {convo.title[0]?.toUpperCase() || "C"}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] shadow-xl max-w-[180px] truncate">
                  {convo.title}
                </div>
              </button>
            ))}
          </div>
        ) : isLoading ? (
          <div className="px-3 py-8 text-center">
            <div className="w-4 h-4 border-2 border-purple-300/20 border-t-purple-300/60 rounded-full animate-spin mx-auto"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[10px] text-zinc-600 tracking-widest uppercase">
              No conversations yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedConversations).map(([group, convos]) => (
              <div key={group}>
                <div className="mt-2 mb-2 px-3 text-[10px] font-bold text-zinc-600 tracking-[0.2em] select-none uppercase">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {convos.map((convo) => (
                    <div
                      key={convo.id}
                      className="relative group"
                      ref={menuOpenId === convo.id ? convoMenuRef : null}
                    >
                      {editingId === convo.id ? (
                        <div className="flex items-center gap-1 px-2 py-1.5">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSaveRename}
                            className="flex-1 bg-white/10 text-white text-xs px-2 py-1.5 rounded-lg border border-purple-400/20 outline-none focus:border-purple-400/40"
                          />
                          <button
                            onClick={handleSaveRename}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => onSelectConversation(convo.id)}
                          className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-all duration-200 border border-transparent flex items-center gap-2 cursor-pointer relative overflow-hidden ${
                            currentConversationId === convo.id
                              ? "bg-white/5 text-white border-white/5"
                              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                          }`}
                        >
                          {currentConversationId === convo.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-400/60 via-purple-400/60 to-indigo-400/60 rounded-l-lg" />
                          )}
                          <span className="flex-1 truncate">{convo.title}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(
                                menuOpenId === convo.id ? null : convo.id
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity duration-75"
                          >
                            <MoreHorizontal size={14} className="text-zinc-500" />
                          </button>
                        </div>
                      )}

                      {menuOpenId === convo.id && (
                        <div className="absolute right-2 top-full mt-1 z-50 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                          <button
                            onClick={() => handleStartRename(convo)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors duration-75"
                          >
                            <Pencil size={12} />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={() => handleDelete(convo.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-75"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Profile */}
      <div className="flex-shrink-0 p-3 border-t border-white/5 space-y-1 mt-auto" ref={menuRef}>
        {/* Collapse Button (When Collapsed) */}
        {isCollapsed && (
          <div className="flex justify-center mb-3">
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
              className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 relative group ${
                isCollapsed ? "justify-center" : ""
              } ${showMenu ? "bg-white/5" : "hover:bg-white/5"}`}
            >
              {showMenu && !isCollapsed && (
                <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden z-[60] backdrop-blur-xl">
                  <div className="p-1.5 space-y-0.5">
                    <button
                      onClick={() => {
                        onOpenSettings();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Settings size={14} />
                      <span className="font-medium">Settings</span>
                    </button>
                    <div className="h-px bg-white/5 mx-2 my-1"></div>
                    <button
                      onClick={() => {
                        onOpenUpgrade();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Star size={14} />
                      <span className="font-medium">Upgrade Plan</span>
                    </button>
                    <div className="h-px bg-white/5 mx-2 my-1"></div>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <LogOut size={14} />
                      <span className="font-medium">Log out</span>
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
                  {profile?.is_pro ? "PRO PLAN" : "FREE PLAN"}
                </p>
              </div>
            </div>
          </>
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
              <span className="w-full text-center">Sign In</span>
            )}
          </a>
        )}
      </div>
    </div>
  );
};

// Helper to group conversations by date
function groupConversationsByDate(
  conversations: ChatConversation[]
): Record<string, ChatConversation[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: Record<string, ChatConversation[]> = {};

  conversations.forEach((convo) => {
    const date = new Date(
      convo.last_message_at || convo.updated_at || convo.created_at
    );
    let group: string;

    if (date >= today) {
      group = "Today";
    } else if (date >= yesterday) {
      group = "Yesterday";
    } else if (date >= lastWeek) {
      group = "Last 7 Days";
    } else if (date >= lastMonth) {
      group = "Last 30 Days";
    } else {
      group = "Older";
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(convo);
  });

  return groups;
}

// Nav icons (matching ModelsSidebar size)
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
