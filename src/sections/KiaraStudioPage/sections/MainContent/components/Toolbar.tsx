export const Toolbar = () => {
  return (
    <div className="w-full p-4 z-30">
      <div className="flex items-center justify-between bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle menu"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded text-[20px]">menu_open</span>
          </button>
          
          <div className="h-4 w-px bg-white/10"></div>
          
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white tracking-wide">
              Playground
            </h1>
            <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
              BETA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            aria-label="Incognito"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            title="Incognito Mode"
          >
            <span className="material-symbols-rounded text-[20px]">incognito</span>
          </button>
          
          <button
            aria-label="Share"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            title="Share"
          >
            <span className="material-symbols-rounded text-[20px]">share</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1"></div>

          <button
            aria-label="New Chat"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            title="New Chat"
          >
            <span className="material-symbols-rounded text-[20px]">add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
