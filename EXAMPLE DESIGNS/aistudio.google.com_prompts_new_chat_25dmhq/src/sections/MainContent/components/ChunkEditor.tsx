import { Toolbar } from "@/sections/MainContent/components/Toolbar";
import { ZeroState } from "@/components/ZeroState";
import { PromptInputFooter } from "@/sections/MainContent/components/PromptInputFooter";
import { RightSidePanel } from "@/sections/MainContent/components/RightSidePanel";

export const ChunkEditor = () => {
  return (
    <div className="box-border caret-transparent flex h-full">
      <section className="bg-zinc-900 box-border caret-transparent flex basis-[0%] flex-col grow h-full">
        <Toolbar />
        <div className="box-border caret-transparent flex basis-[0%] grow">
          <div className="box-border caret-transparent flex basis-[0%] flex-col grow overflow-auto pb-2 px-5">
            <ZeroState />
          </div>
        </div>
        <PromptInputFooter />
      </section>
      <RightSidePanel />
    </div>
  );
};
