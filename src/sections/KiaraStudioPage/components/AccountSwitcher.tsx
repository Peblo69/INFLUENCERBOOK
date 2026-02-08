export const AccountSwitcher = () => {
  return (
    <div className="px-2 pt-2 border-t border-white/5 mt-2">
      <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 group">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
          <img
            src="https://lh3.googleusercontent.com/a/ACg8ocItxYQ5zzaxe41u_YaDwV1wr37-ZgdhEj2Hg0-G1giKunvPq2A=s64-cc-mo"
            alt="User"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col items-start overflow-hidden">
          <span className="text-xs font-medium text-white truncate w-full text-left">
            kacinka74@gmail.com
          </span>
          <span className="text-[10px] text-white/40">Free Plan</span>
        </div>
        <span className="material-symbols-rounded text-[18px] text-white/40 ml-auto">unfold_more</span>
      </button>
    </div>
  );
};
