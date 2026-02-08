export const AccountSwitcher = () => {
  return (
    <div className="relative box-border caret-transparent">
      <button className="text-neutral-300 font-medium items-center bg-transparent caret-transparent gap-x-1 flex h-8 justify-start gap-y-1 text-center text-nowrap w-full border px-3 py-0 rounded-xl border-solid border-transparent hover:text-zinc-50 hover:bg-zinc-800">
        <div className="box-border caret-transparent basis-[18px] shrink-0 text-nowrap w-[18px]"></div>
        <span className="box-border caret-transparent block text-ellipsis text-nowrap overflow-hidden">
          {" "}
          kacinka74@gmail.com{" "}
        </span>
      </button>
      <div className="absolute box-border caret-transparent block left-[13px] top-[9px]">
        <div className="relative box-border caret-transparent">
          <div
            role="button"
            aria-label="Google Account: WildRift Bulgaria (kacinka74@gmail.com)"
            className="relative items-center box-border caret-transparent flex h-[18px] justify-center w-[18px] hover:bg-zinc-700/10 hover:rounded-[50%]"
          >
            <div className="box-border caret-transparent block h-[18px] w-[18px]">
              <img
                src="https://lh3.googleusercontent.com/a/ACg8ocItxYQ5zzaxe41u_YaDwV1wr37-ZgdhEj2Hg0-G1giKunvPq2A=s64-cc-mo"
                alt="WildRift Bulgaria"
                className="text-2xl box-border caret-transparent h-[18px] w-[18px] rounded-[50%]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
