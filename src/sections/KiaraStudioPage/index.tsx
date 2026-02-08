import { CookieBanner } from "@/sections/KiaraStudioPage/components/CookieBanner";
import { Navbar } from "@/sections/KiaraStudioPage/sections/Navbar";
import { MainContent } from "@/sections/KiaraStudioPage/sections/MainContent";

export const KiaraStudioPage = () => {
  return (
    <div className="relative min-h-screen bg-black text-zinc-200 font-inter overflow-hidden selection:bg-purple-500/30">
      {/* Advanced Background System */}
      <div className="fixed inset-0 z-0">
        {/* Deep Space Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1a1a2e_0%,_#000000_100%)] opacity-80" />
        
        {/* Animated Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)'
          }}
        />

        {/* Ambient Glow Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-purple-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      </div>

      <CookieBanner />

      {/* Glass Container */}
      <div className="relative z-10 flex flex-col h-screen backdrop-blur-[0px]">
        <div className="flex-1 flex overflow-hidden">
          <Navbar />
          <MainContent />
        </div>
      </div>
    </div>
  );
};
