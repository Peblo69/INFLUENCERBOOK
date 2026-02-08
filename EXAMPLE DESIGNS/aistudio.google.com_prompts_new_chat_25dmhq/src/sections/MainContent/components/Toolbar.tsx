export const Toolbar = () => {
  return (
    <div className="backdrop-blur-[2px] box-border caret-transparent block shrink-0 w-full">
      <div className="items-center border-b-zinc-800 border-l-zinc-200 border-r-zinc-200 border-t-zinc-200 box-border caret-transparent gap-x-2 flex justify-between gap-y-2 pt-4 pb-2 px-5 border-b">
        <div className="items-center box-border caret-transparent gap-x-1 flex gap-y-1">
          <button
            aria-label="Toggle navigation menu"
            className="text-zinc-50 font-medium items-center aspect-square bg-zinc-800 caret-transparent gap-x-1 flex h-8 justify-center gap-y-1 text-center text-nowrap border border-neutral-700 p-0 rounded-xl border-solid hover:bg-neutral-700"
          >
            <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
              menu_open
            </span>
          </button>
          <div className="items-center box-border caret-transparent flex">
            <div className="items-center box-border caret-transparent gap-x-1 flex flex-wrap min-h-6 gap-y-1 mx-3">
              <h1 className="text-base font-semibold box-border caret-transparent leading-6 text-ellipsis text-nowrap overflow-hidden font-inter_tight">
                Playground
              </h1>
            </div>
            <p className="text-[13px] items-center box-border caret-transparent gap-x-1 flex gap-y-1">
              <div className="box-border caret-transparent block"></div>
            </p>
            <div className="items-center box-border caret-transparent flex justify-between max-w-full"></div>
            <p className="text-[13px] box-border caret-transparent my-[13px]"></p>
          </div>
        </div>
        <div className="items-center box-border caret-transparent gap-x-1 flex gap-y-1">
          <div className="box-border caret-transparent block">
            <button
              aria-label="Temporary chat toggle"
              className="text-neutral-300 font-medium items-center aspect-square bg-transparent caret-transparent gap-x-1 flex h-8 justify-center gap-y-1 text-center text-nowrap border p-0 rounded-[50%] border-solid border-transparent hover:text-zinc-50 hover:bg-neutral-700"
            >
              <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
                incognito
              </span>
            </button>
          </div>
          <div className="box-border caret-transparent block">
            <button
              aria-label="Share prompt"
              className="text-neutral-700 font-medium items-center aspect-square bg-transparent caret-transparent gap-x-1 flex h-8 justify-center gap-y-1 text-center text-nowrap border p-0 rounded-[50%] border-solid border-transparent"
            >
              <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
                share
              </span>
            </button>
          </div>
          <button className="text-neutral-300 font-medium items-center aspect-square bg-transparent caret-transparent gap-x-1 hidden h-8 justify-center min-h-0 min-w-0 gap-y-1 text-center text-nowrap border p-0 rounded-[50%] border-solid border-transparent md:flex md:min-h-[auto] md:min-w-[auto] hover:text-zinc-50 hover:bg-neutral-700">
            <span className="text-lg font-normal box-border caret-transparent inline-block leading-[18px] min-h-0 min-w-0 text-nowrap font-google_symbols md:block md:min-h-[auto] md:min-w-[auto]">
              compare_arrows
            </span>
          </button>
          <button
            aria-label="New chat"
            className="text-neutral-700 font-medium items-center aspect-square bg-transparent caret-transparent gap-x-1 flex h-8 justify-center gap-y-1 text-center text-nowrap border p-0 rounded-[50%] border-solid border-transparent"
          >
            <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
              add
            </span>
          </button>
          <button
            aria-label="View more actions"
            className="text-neutral-300 font-medium items-center aspect-square bg-transparent caret-transparent gap-x-1 flex h-8 justify-center gap-y-1 text-center text-nowrap border p-0 rounded-[50%] border-solid border-transparent hover:text-zinc-50 hover:bg-neutral-700"
          >
            <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
              more_vert
            </span>
          </button>
        </div>
        <div className="box-border caret-transparent hidden"></div>
        <div className="box-border caret-transparent hidden"></div>
      </div>
    </div>
  );
};
