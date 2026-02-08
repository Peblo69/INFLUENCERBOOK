export const ZeroState = () => {
  const tabs = [
    { name: "Featured", active: true },
    { name: "Vision", active: false },
    { name: "Live", active: false },
    { name: "Images", active: false },
    { name: "Video", active: false },
    { name: "Audio", active: false },
  ];

  return (
    <div className="flex flex-col items-center justify-center w-full pt-20 pb-10 animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-block mb-4 relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h1 className="relative text-5xl md:text-6xl font-light text-white tracking-tight">
            Kiara <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Vision</span>
          </h1>
        </div>
        <p className="text-white/40 text-sm max-w-md mx-auto font-light">
          Unleash your creativity with our most advanced multimodal AI model yet.
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 px-2 custom-scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            className={`
              relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border
              ${tab.active 
                ? 'bg-white/10 text-white border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                : 'bg-black/20 text-white/40 border-white/5 hover:bg-white/5 hover:text-white/80 hover:border-white/10'
              }
            `}
          >
            {tab.name}
            {tab.active && (
              <div className="absolute inset-0 rounded-full ring-1 ring-white/20 animate-pulse" />
            )}
          </button>
        ))}
      </div>
      
      <style>{`
        .custom-scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
