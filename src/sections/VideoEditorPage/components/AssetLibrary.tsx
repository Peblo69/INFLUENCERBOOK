import { 
  PlusSquare, 
  FolderOpen, 
  MonitorPlay, 
  Cloud, 
  Library, 
  ChevronDown,
  Plus,
  Bot,
  Video
} from "lucide-react";

export const AssetLibrary = () => {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sub-Sidebar (Categories) */}
      <div className="w-14 flex flex-col items-center py-4 gap-6 border-r border-[#2a2a2a] bg-[#171717] shrink-0">
        <button className="flex flex-col items-center gap-1 group">
          <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#00E5FF] border border-[#00E5FF]/20 shadow-[0_0_10px_rgba(0,229,255,0.1)]">
            <PlusSquare size={18} />
          </div>
          <span className="text-[9px] text-white/90 font-medium">Import</span>
        </button>

        <div className="w-8 h-[1px] bg-[#2a2a2a]" />

        <button className="flex flex-col items-center gap-1 text-[#9ca3af] hover:text-white transition-colors group">
          <FolderOpen size={20} />
          <span className="text-[9px] font-medium">Yours</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-[#9ca3af] hover:text-white transition-colors group">
          <MonitorPlay size={20} />
          <span className="text-[9px] font-medium">AI media</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-[#9ca3af] hover:text-white transition-colors group">
          <Cloud size={20} />
          <span className="text-[9px] font-medium">Spaces</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-[#9ca3af] hover:text-white transition-colors group">
          <Library size={20} />
          <span className="text-[9px] font-medium">Library</span>
        </button>
      </div>

      {/* Asset Content Area */}
      <div className="flex-1 flex flex-col bg-[#171717] min-w-0">
        {/* Header */}
        <div className="h-10 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-2 cursor-pointer group hover:text-[#00E5FF] transition-colors">
            <span className="text-sm font-medium text-white group-hover:text-[#00E5FF]">Import</span>
            <ChevronDown size={16} className="text-[#9ca3af] group-hover:text-[#00E5FF]" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
          {/* Empty State / Drop Zone */}
          <div className="h-[300px] border border-dashed border-[#333] bg-[#1a1a1a] rounded-lg flex flex-col items-center justify-center gap-3 hover:border-[#00E5FF]/50 hover:bg-[#1a1a1a]/80 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-[#00E5FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)] group-hover:scale-110 transition-transform">
              <Plus size={24} className="text-black" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white mb-1 group-hover:text-[#00E5FF]">Import</p>
              <p className="text-[10px] text-[#666]">Drag and drop videos, photos, and audio files here</p>
            </div>
          </div>

          {/* Bottom Tools */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-[1px] flex-1 bg-[#2a2a2a]" />
              <span className="text-[10px] text-[#555]">No media? Create with these tools</span>
              <div className="h-[1px] flex-1 bg-[#2a2a2a]" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button className="flex flex-col items-center justify-center gap-2 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:bg-[#222] hover:border-[#00E5FF]/30 transition-all group">
                <MonitorPlay size={20} className="text-[#9ca3af] group-hover:text-[#00E5FF]" />
                <span className="text-[10px] text-[#9ca3af] group-hover:text-white">AI media</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-2 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:bg-[#222] hover:border-[#00E5FF]/30 transition-all group">
                <Bot size={20} className="text-[#9ca3af] group-hover:text-[#00E5FF]" />
                <span className="text-[10px] text-[#9ca3af] group-hover:text-white">AI avatars</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-2 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:bg-[#222] hover:border-[#00E5FF]/30 transition-all group">
                <Video size={20} className="text-[#9ca3af] group-hover:text-[#00E5FF]" />
                <span className="text-[10px] text-[#9ca3af] group-hover:text-white">Record</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
