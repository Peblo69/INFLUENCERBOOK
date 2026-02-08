export const RightSidePanel = () => {
  return (
    <div className="hidden md:flex flex-col w-[320px] h-full border-l border-white/5 bg-black/20 backdrop-blur-xl z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <h2 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
          Run settings
        </h2>
        
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <span className="material-symbols-rounded text-[18px]">code</span>
          </button>
          <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <span className="material-symbols-rounded text-[18px]">restart_alt</span>
          </button>
          <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <span className="material-symbols-rounded text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {/* Model Selection */}
        <div className="space-y-3">
          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Model</label>
          <button className="w-full group relative p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-left transition-all duration-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-purple-300 group-hover:text-purple-200">Kiara Vision Pro</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">v2.5</span>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed">
              State-of-the-art image generation and editing model with enhanced reasoning.
            </p>
          </button>
        </div>

        {/* System Instructions */}
        <div className="space-y-3">
          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">System Instructions</label>
          <div className="w-full p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
            <p className="text-[11px] text-white/40 italic">
              Add optional tone and style instructions...
            </p>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Sliders */}
        <div className="space-y-6">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-white/70">Temperature</label>
              <input 
                type="number" 
                value="1.0" 
                readOnly
                className="w-12 bg-black/40 border border-white/10 rounded-md text-center text-xs text-white py-1"
              />
            </div>
            <input 
              type="range" 
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-125 transition-all"
            />
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-3">
            <label className="text-[11px] font-medium text-white/70">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-2">
              {['1:1', '16:9', '9:16'].map(ratio => (
                <button key={ratio} className="py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white transition-colors">
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
