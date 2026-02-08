import { HelpCircle } from "lucide-react";

interface PropertyInspectorProps {
  selectedClip: string | null;
}

export const PropertyInspector = ({ selectedClip }: PropertyInspectorProps) => {
  return (
    <div className="h-full flex flex-col text-[#e0e0e0]">
      {/* Tabs */}
      <div className="h-10 flex items-center px-2 border-b border-[#2a2a2a] bg-[#171717]">
        <button className="h-full px-4 text-xs font-medium text-[#00E5FF] border-b-2 border-[#00E5FF]">
          Details
        </button>
        <button className="h-full px-4 text-xs font-medium text-[#9ca3af] hover:text-white transition-colors">
          Animation
        </button>
        <button className="h-full px-4 text-xs font-medium text-[#9ca3af] hover:text-white transition-colors">
          Speed
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* File Properties Table */}
        <div className="space-y-4">
          <div className="grid grid-cols-[100px_1fr] gap-y-3 text-xs">
            <span className="text-[#666]">Name:</span>
            <span className="text-white truncate">1119</span>

            <span className="text-[#666]">Path:</span>
            <span className="text-white truncate text-[10px] leading-tight text-white/70">
              C:/Users/flext/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/1119
            </span>

            <span className="text-[#666]">Aspect ratio:</span>
            <span className="text-white">Original</span>

            <span className="text-[#666]">Resolution:</span>
            <span className="text-white">Adapted</span>

            <span className="text-[#666]">Frame rate:</span>
            <span className="text-white">30.00fps</span>

            <span className="text-[#666]">Imported media:</span>
            <span className="text-white">Stay in original location</span>
          </div>

          <div className="h-[1px] bg-[#2a2a2a] my-4" />

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9ca3af]">Proxy:</span>
                <HelpCircle size={12} className="text-[#666]" />
              </div>
              <span className="text-xs text-white">Turned off</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9ca3af]">Arrange layers:</span>
                <HelpCircle size={12} className="text-[#666]" />
              </div>
              <span className="text-xs text-white">Turned on</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="p-3 border-t border-[#2a2a2a] bg-[#171717]">
        <button className="w-full py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-xs font-medium text-white rounded transition-colors">
          Modify
        </button>
      </div>
    </div>
  );
};
