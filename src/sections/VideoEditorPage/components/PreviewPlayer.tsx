import { 
  Menu, 
  SkipBack, 
  Play, 
  SkipForward, 
  ZoomIn, 
  Ratio, 
  Maximize 
} from "lucide-react";

export const PreviewPlayer = () => {
  return (
    <div className="h-full flex flex-col">
      {/* Title Bar */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-[#2a2a2a] bg-[#171717] select-none">
        <span className="text-xs font-medium text-[#9ca3af]">Player</span>
        <Menu size={16} className="text-[#9ca3af] cursor-pointer hover:text-white" />
      </div>

      {/* Player Area */}
      <div className="flex-1 bg-[#0b0b0b] flex items-center justify-center relative group">
        {/* Empty State Placeholder */}
        <div className="aspect-video w-[80%] bg-black rounded flex items-center justify-center border border-[#1a1a1a]">
           {/* Hidden Play Icon for empty state */}
        </div>

        {/* Video Controls Overlay (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#171717] border-t border-[#2a2a2a] flex items-center justify-between px-4">
          {/* Left: Timecode */}
          <div className="flex items-center gap-4">
            <span className="text-[#00E5FF] text-xs font-mono">00:00:00:00</span>
            <span className="text-[#444] text-xs font-mono">/</span>
            <span className="text-[#666] text-xs font-mono">00:00:00:00</span>
          </div>

          {/* Center: Playback Controls */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
            <button className="text-[#9ca3af] hover:text-white transition-colors">
              <SkipBack size={20} />
            </button>
            <button className="text-white hover:text-[#00E5FF] transition-colors">
              <Play size={32} className="fill-current" />
            </button>
            <button className="text-[#9ca3af] hover:text-white transition-colors">
              <SkipForward size={20} />
            </button>
          </div>

          {/* Right: Tools */}
          <div className="flex items-center gap-3">
            <button className="text-[#9ca3af] hover:text-white transition-colors" title="Quality">
              <span className="text-[10px] border border-[#444] px-1 rounded">High</span>
            </button>
            <button className="text-[#9ca3af] hover:text-white transition-colors" title="Zoom">
              <ZoomIn size={18} />
            </button>
            <button className="text-[#9ca3af] hover:text-white transition-colors" title="Ratio">
              <Ratio size={18} />
            </button>
            <button className="text-[#9ca3af] hover:text-white transition-colors" title="Fullscreen">
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
