import React from 'react';
import { Infinity, Home, Image, Video, PenTool, Sparkles, Box, Settings, HelpCircle, User, Brush, PanelLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isCollapsed, toggleCollapse }) => {
  return (
    <aside 
        className={`hidden lg:flex fixed top-0 left-0 h-screen bg-black/60 backdrop-blur-xl border-r border-white/5 flex-col z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      
      {/* Logo Area */}
      <div 
        className={`flex items-center gap-3 cursor-pointer h-20 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}
      >
        <div className="relative text-white min-w-[28px]" onClick={() => onChangeView('explore')}>
          <Infinity size={28} className="text-white drop-shadow-[0_0_8px_rgba(233,213,255,0.5)]" />
        </div>
        
        {/* Logo Text - masked when collapsed */}
        <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <span className="text-xl font-bold font-display tracking-tight text-white">
            Kiara<span className="text-transparent bg-clip-text bg-gradient-brand">Vision</span>
            </span>
        </div>

        {/* Toggle Button (When Expanded) */}
        {!isCollapsed && (
            <button 
                onClick={toggleCollapse}
                className="ml-auto text-zinc-500 hover:text-white transition-colors p-1"
                title="Collapse Sidebar"
            >
                <PanelLeft size={18} />
            </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden hide-scrollbar">
        <div className="mb-6">
            <div className={`px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-display transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                Studio
            </div>
            <SidebarItem 
              icon={<Home size={20} />} 
              label="Explore" 
              active={currentView === 'explore'} 
              onClick={() => onChangeView('explore')}
              collapsed={isCollapsed}
            />
            <SidebarItem 
              icon={<Image size={20} />} 
              label="Image Generator" 
              active={currentView === 'image-generator'} 
              onClick={() => onChangeView('image-generator')}
              collapsed={isCollapsed}
            />
            <SidebarItem 
              icon={<Video size={20} />} 
              label="Video Creator" 
              active={currentView === 'video-creator'} 
              onClick={() => onChangeView('video-creator')}
              collapsed={isCollapsed}
            />
            <SidebarItem 
              icon={<Brush size={20} />} 
              label="Inpaint Studio" 
              active={currentView === 'inpaint'} 
              onClick={() => onChangeView('inpaint')}
              collapsed={isCollapsed}
            />
            <SidebarItem 
              icon={<PenTool size={20} />} 
              label="Magic Editor" 
              active={currentView === 'magic-editor'} 
              onClick={() => onChangeView('magic-editor')}
              collapsed={isCollapsed}
            />
        </div>

        <div className="mb-6">
            <div className={`px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-display transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                Tools
            </div>
            <SidebarItem 
                icon={<Sparkles size={20} />} 
                label="Enhance & Upscale" 
                active={currentView === 'upscale'}
                onClick={() => onChangeView('upscale')} 
                collapsed={isCollapsed} 
            />
            <SidebarItem icon={<Box size={20} />} label="3D Assets" onClick={() => {}} collapsed={isCollapsed} />
            <SidebarItem icon={<User size={20} />} label="Characters" onClick={() => {}} collapsed={isCollapsed} />
        </div>
      </nav>

      {/* User / Footer Area */}
      <div className="p-3 border-t border-white/5 space-y-1">
        
        {/* Collapse Button (When Collapsed - Centered) */}
        {isCollapsed && (
            <div className="flex justify-center mb-4">
                <button 
                    onClick={toggleCollapse}
                    className="w-10 h-10 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                    title="Expand Sidebar"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        )}

        <SidebarItem icon={<HelpCircle size={20} />} label="Help & Support" onClick={() => {}} collapsed={isCollapsed} />
        <SidebarItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={currentView === 'settings'}
            onClick={() => onChangeView('settings')} 
            collapsed={isCollapsed} 
        />
        
        <div 
            onClick={() => onChangeView('profile')}
            className={`mt-4 pt-4 border-t border-white/5 flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-2'}`}
        >
            <div className="w-8 h-8 min-w-[32px] rounded-full bg-gradient-brand p-[1px] relative group cursor-pointer shadow-[0_0_10px_rgba(233,213,255,0.3)] hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    <img src="https://picsum.photos/seed/user_avatar/200/200" className="w-full h-full object-cover" />
                </div>
            </div>
            
            <div className={`flex-1 min-w-0 overflow-hidden cursor-pointer transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100'}`}>
                <p className="text-sm font-medium text-white truncate font-display group-hover:text-purple-300 transition-colors">Kiara Artist</p>
                <p className="text-xs text-zinc-500 truncate">Pro Plan Active</p>
            </div>
        </div>
      </div>
    </aside>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, collapsed, onClick }) => {
  return (
    <div className="relative group">
        <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden ${
            active 
            ? 'text-white bg-white/5 border border-white/5' 
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
        } ${collapsed ? 'justify-center' : 'text-left'}`}
        >
        {active && (
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-brand rounded-l-lg transition-all duration-300 ${collapsed ? 'h-1/2 top-1/4 rounded-full left-1' : ''}`} />
        )}
        
        <span className={`transition-colors relative z-10 ${active ? 'text-purple-200' : 'group-hover:text-purple-200'}`}>
            {icon}
        </span>
        
        <span className={`text-sm font-medium font-display whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            {label}
        </span>
        
        {active && !collapsed && (
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
        )}
        </button>

        {/* Tooltip for Collapsed State */}
        {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-black border border-white/10 rounded-md text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60] shadow-xl">
                {label}
            </div>
        )}
    </div>
  );
};