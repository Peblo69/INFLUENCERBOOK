import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatConversation } from "@/services/chatService";
import { Infinity, PanelLeft, MoreHorizontal, Pencil, Trash2, X, Check, Settings, LogOut, Plus, User, ChevronRight } from "lucide-react";

interface AssistantSidebarProps {
  conversations: ChatConversation[];
  currentConversationId: string | null;
  isLoading?: boolean;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
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
  onOpenUpgrade,
}: AssistantSidebarProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const convoMenuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (convoMenuRef.current && !convoMenuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    if (menuOpenId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenId]);

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

  const location = useLocation();
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

  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <aside
      className={`flex flex-col h-screen bg-black/60 backdrop-blur-xl border-r border-white/5 font-sans text-sm z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isCollapsed ? "w-20" : "w-[280px]"
      }`}
    >
      {/* Logo Area */}
      <div
        className={`flex-shrink-0 flex items-center h-20 transition-all duration-300 ${
          isCollapsed ? "justify-center px-0" : "px-6"
        }`}
      >
        <div className="relative text-white min-w-[28px]">
          <Infinity
            size={28}
            className="text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
          />
        </div>

        <div
          className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          <span className="text-lg font-semibold tracking-tight text-white/90">
            AI{" "}
            <span className="text-white/70">Influencerbook</span>
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

      {/* New Chat Button - Softer & Smaller */}
      <div className={`flex-shrink-0 px-3 pb-4 transition-all duration-300 ${isCollapsed ? "px-2" : ""}`}>
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2 py-2 px-3 rounded-xl transition-all duration-200 border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1] group ${
            isCollapsed ? "justify-center px-0" : ""
          }`}
        >
          <Plus size={16} className="text-white/50 group-hover:text-white/70 transition-colors flex-shrink-0" strokeWidth={1.5} />
          <span
            className={`text-[13px] font-medium text-white/60 group-hover:text-white/80 transition-all duration-300 ${
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
          className={`px-3 text-[10px] font-medium text-white/30 uppercase tracking-[0.15em] mb-2 transition-all duration-300 ${
            isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"
          }`}
        >
          Studio
        </div>
        {navLinks.map((link) => (
          <div key={link.href} className="relative group">
            <Link
              to={link.href}
              onMouseEnter={() => {
                const prefetchLink = document.createElement('link');
                prefetchLink.rel = 'prefetch';
                prefetchLink.href = link.href;
                document.head.appendChild(prefetchLink);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative overflow-hidden group/item ${
                pathname === link.href
                  ? "text-white bg-white/[0.05] border border-white/[0.06]"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"
              } ${isCollapsed ? "justify-center px-0" : "text-left"}`}
            >
              {pathname === link.href && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-white/40 rounded-full" />
              )}
              <span className="text-white/50 group-hover/item:text-white/70 transition-colors relative z-10 flex-shrink-0">
                {link.icon}
              </span>
              <span
                className={`text-[13px] font-medium whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                }`}
              >
                {link.label}
              </span>
            </Link>

            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-black/90 border border-white/10 rounded-lg text-xs font-medium text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] backdrop-blur-xl">
                {link.label}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="px-5 py-3">
        <div className="h-px bg-white/[0.04]"></div>
      </div>

      {/* Chat History Label */}
      <div
        className={`px-6 pb-2 transition-all duration-300 ${
          isCollapsed ? "opacity-0 h-0 overflow-hidden px-0" : "opacity-100 h-auto"
        }`}
      >
        <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.15em]">
          Recent Chats
        </span>
      </div>

      {/* Scrollable History */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 scrollbar-hide">
        {isCollapsed ? (
          <div className="flex flex-col items-center pt-2 space-y-1">
            {conversations.slice(0, 5).map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-medium transition-all duration-200 ${
                  currentConversationId === convo.id
                    ? "bg-white/[0.08] text-white/90 border border-white/[0.08]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
                title={convo.title}
              >
                {convo.title[0]?.toUpperCase() || "C"}
              </button>
            ))}
          </div>
        ) : isLoading ? (
          <div className="px-3 py-8 text-center">
            <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[11px] text-white/25 tracking-wide">
              No conversations yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedConversations).map(([group, convos]) => (
              <div key={group}>
                <div className="mb-2 px-3 text-[10px] font-medium text-white/25 tracking-wide">
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
                            className="flex-1 bg-white/[0.06] text-white/90 text-[12px] px-2.5 py-1.5 rounded-lg border border-white/[0.08] outline-none focus:border-white/20"
                          />
                          <button
                            onClick={handleSaveRename}
                            className="p-1.5 hover:bg-white/[0.06] rounded-lg text-emerald-400/70"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-1.5 hover:bg-white/[0.06] rounded-lg text-white/40"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => onSelectConversation(convo.id)}
                          className={`w-full text-left px-3 py-2 text-[12px] rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer relative overflow-hidden ${
                            currentConversationId === convo.id
                              ? "bg-white/[0.05] text-white/90 border border-white/[0.06]"
                              : "text-white/40 hover:text-white/60 hover:bg-white/[0.03] border border-transparent"
                          }`}
                        >
                          {currentConversationId === convo.id && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3 bg-white/30 rounded-full" />
                          )}
                          <span className="flex-1 truncate font-normal">{convo.title}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(
                                menuOpenId === convo.id ? null : convo.id
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/[0.06] rounded-lg transition-all duration-150"
                          >
                            <MoreHorizontal size={14} className="text-white/40" />
                          </button>
                        </div>
                      )}

                      {menuOpenId === convo.id && (
                        <div className="absolute right-2 top-full mt-1 z-50 bg-black/90 border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden min-w-[120px] backdrop-blur-xl">
                          <button
                            onClick={() => handleStartRename(convo)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors duration-150"
                          >
                            <Pencil size={12} />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={() => handleDelete(convo.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors duration-150"
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
      <div className="flex-shrink-0 p-3 border-t border-white/[0.04] space-y-2 mt-auto">
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
            {/* User Display */}
            <div className={`flex items-center gap-3 p-2 rounded-xl ${isCollapsed ? "justify-center" : ""}`}>
              <div className="w-8 h-8 min-w-[32px] rounded-full bg-white/[0.08] border border-white/[0.08] flex items-center justify-center">
                <span className="text-[11px] font-medium text-white/70">
                  {profile?.display_name?.[0] || profile?.username?.[0] || user.email?.[0] || "U"}
                </span>
              </div>

              <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                <p className="text-[13px] font-medium text-white/80 truncate">
                  {profile?.display_name || profile?.username || user.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-white/30 truncate font-normal">
                  {profile?.is_pro ? "Pro Plan" : "Free Plan"}
                </p>
              </div>
            </div>

            {/* Profile & Settings Buttons */}
            <div className={`space-y-1 ${isCollapsed ? "space-y-2" : ""}`}>
              {/* Profile Button */}
              <button 
                onClick={() => navigate("/profile")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-white/60 hover:text-white/90 hover:bg-white/[0.05] group ${isCollapsed ? "justify-center px-0" : ""}`}
                title={isCollapsed ? "Profile" : undefined}
              >
                <User size={16} className="group-hover:scale-110 transition-transform" />
                <span className={`text-[12px] font-normal transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                  Profile
                </span>
              </button>

              {/* Settings Button */}
              <button 
                onClick={() => navigate("/settings")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-white/60 hover:text-white/90 hover:bg-white/[0.05] group ${isCollapsed ? "justify-center px-0" : ""}`}
                title={isCollapsed ? "Settings" : undefined}
              >
                <Settings size={16} className="group-hover:scale-110 transition-transform" />
                <span className={`text-[12px] font-normal transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                  Settings
                </span>
              </button>

              {/* Divider */}
              {!isCollapsed && <div className="h-px bg-white/[0.04] my-1"></div>}

              {/* Logout Button */}
              <button 
                onClick={() => signOut()}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-red-400/60 hover:text-red-400/90 hover:bg-red-500/[0.06] group ${isCollapsed ? "justify-center px-0" : ""}`}
                title={isCollapsed ? "Log out" : undefined}
              >
                <LogOut size={16} className="group-hover:scale-110 transition-transform" />
                <span className={`text-[12px] font-normal transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                  Log out
                </span>
              </button>
            </div>
          </>
        ) : (
          <Link
            to="/auth"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.08] text-white/90 font-medium text-[13px] hover:bg-white/[0.12] transition-colors ${
              isCollapsed ? "justify-center px-0 w-9 h-9 mx-auto" : ""
            }`}
          >
            {isCollapsed ? (
              <LogOut size={16} />
            ) : (
              <span>Sign In</span>
            )}
          </Link>
        )}
      </div>
    </aside>
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
