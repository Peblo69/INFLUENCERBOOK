export const ApiKeyButton = () => {
  return (
    <div className="px-2 mb-1">
      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 group">
        <span className="material-symbols-rounded text-[20px]">key</span>
        <span className="text-sm font-medium">Get API key</span>
      </button>
    </div>
  );
};
