export const ApiKeyButton = () => {
  return (
    <div className="box-border caret-transparent block">
      <button className="text-neutral-300 font-medium items-center bg-transparent caret-transparent gap-x-1 flex h-8 justify-start gap-y-1 text-center text-nowrap w-full border px-3 py-0 rounded-xl border-solid border-transparent hover:text-zinc-50 hover:bg-zinc-800">
        <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
          key
        </span>
        Get API key
      </button>
    </div>
  );
};
