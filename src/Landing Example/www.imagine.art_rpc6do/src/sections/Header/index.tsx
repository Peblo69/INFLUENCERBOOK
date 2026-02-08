import { DesktopNav } from "./components/DesktopNav";
import { MobileActions } from "./components/MobileActions";
import { Infinity } from "lucide-react";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-8 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
      {/* Logo */}
      <a href="/" className="flex items-center gap-3 group">
        <Infinity className="w-8 h-8 text-white group-hover:text-purple-400 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
        <span className="text-lg font-bold tracking-tight text-white group-hover:text-white/90 transition-colors">
          AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Influencerbook</span>
        </span>
      </a>

      <DesktopNav />
      <MobileActions />
    </header>
  );
};
