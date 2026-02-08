import { PromptRenderer } from "@/sections/KiaraStudioPage/sections/MainContent/components/PromptRenderer";

export const MainContent = () => {
  return (
    <div
      role="main"
      className="box-border caret-transparent flex flex-col h-full w-full overflow-hidden"
    >
      <div className="box-border caret-transparent basis-[0%] grow shrink-0 overflow-x-hidden overflow-y-auto w-full">
        <span className="box-border caret-transparent block h-full">
          <div className="box-border caret-transparent"></div>
          <PromptRenderer />
        </span>
      </div>
    </div>
  );
};
