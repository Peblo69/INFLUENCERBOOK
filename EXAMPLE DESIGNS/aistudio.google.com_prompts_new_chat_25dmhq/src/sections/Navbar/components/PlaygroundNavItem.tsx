export const PlaygroundNavItem = () => {
  return (
    <div className="items-center box-border caret-transparent gap-x-1 flex gap-y-1">
      <a
        href="https://aistudio.google.com/prompts/new_chat"
        className="text-neutral-300 font-medium items-center bg-zinc-800 box-border caret-transparent gap-x-1 flex basis-[0%] grow h-8 justify-start gap-y-1 text-nowrap w-full border px-3 rounded-xl border-solid border-transparent hover:text-zinc-50"
      >
        <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
          chat_spark
        </span>
        Playground{" "}
      </a>
      <button
        aria-label="expandCollapseIconTooltipText()"
        className="text-neutral-300 font-medium items-center aspect-square bg-transparent caret-transparent gap-x-1 flex h-8 justify-center gap-y-1 text-center text-nowrap border mr-1.5 p-0 rounded-[50%] border-solid border-transparent hover:text-zinc-50 hover:bg-zinc-800"
      >
        <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
          history
        </span>
      </button>
    </div>
  );
};
