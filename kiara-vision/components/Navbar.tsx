import React from 'react';
import { Search, Bell, Menu, Crown } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full bg-black/50 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center justify-between px-6 py-4">
        
        {/* Mobile Menu Trigger (Visible only on small screens) */}
        <div className="lg:hidden flex items-center gap-3">
             <button className="text-zinc-400 hover:text-white">
                <Menu size={24} />
             </button>
             <span className="text-lg font-bold font-display tracking-tight text-white">Kiara Vision</span>
        </div>

        {/* Search Bar (Hidden on very small screens) */}
        <div className="hidden md:flex items-center flex-1 max-w-xl bg-zinc-900/50 border border-white/10 rounded-full px-4 py-2 ml-4 focus-within:border-purple-300/50 transition-colors">
            <Search size={18} className="text-zinc-500 mr-2" />
            <input 
                type="text" 
                placeholder="Search models, projects, or effects..." 
                className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-full"
            />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 ml-auto">
            <button className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-purple-200/20 hover:border-purple-200/50 rounded-full px-4 py-1.5 transition-all group">
               <Crown size={14} className="text-purple-200" />
               <span className="text-xs font-bold uppercase tracking-wide text-zinc-300 group-hover:text-white font-display">Upgrade Pro</span>
            </button>

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-pink-300 animate-pulse" />
            </button>
        </div>
      </div>
    </header>
  );
};