import { Toolbar } from "@/sections/KiaraStudioPage/sections/MainContent/components/Toolbar";
import { ZeroState } from "@/sections/KiaraStudioPage/components/ZeroState";
import { PromptInputFooter } from "@/sections/KiaraStudioPage/sections/MainContent/components/PromptInputFooter";
import { RightSidePanel } from "@/sections/KiaraStudioPage/sections/MainContent/components/RightSidePanel";

export const ChunkEditor = () => {
  return (
    <div className="relative flex h-full w-full">
      <section className="flex flex-col flex-1 h-full overflow-hidden relative z-10">
        {/* Floating Toolbar */}
        <Toolbar />
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6">
          <ZeroState />
          {/* Spacer for scrolling */}
          <div className="h-[200px]"></div>
        </div>
        
        {/* Floating Input Footer */}
        <div className="shrink-0 mt-auto">
          <PromptInputFooter />
        </div>
      </section>

      {/* Right Panel */}
      <RightSidePanel />
    </div>
  );
};
