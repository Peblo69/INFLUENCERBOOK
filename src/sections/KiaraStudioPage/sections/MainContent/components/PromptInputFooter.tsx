export const PromptInputFooter = () => {
  return (
    <footer className="relative flex-shrink-0 pb-6 px-6 z-20">
      <div className="w-full max-w-4xl mx-auto">
        {/* Floating Glass Input Bar */}
        <div className="relative group">
          {/* Glow Effect behind */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 via-blue-600/30 to-purple-600/30 rounded-[32px] blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
          
          <div className="relative flex items-end gap-2 p-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-2xl transition-all duration-300 focus-within:bg-black/80 focus-within:border-white/20">
            
            {/* Text Area Container */}
            <div className="flex-1 min-h-[50px] flex flex-col justify-center pl-4 py-2">
              <textarea
                placeholder="Ask Kiara Vision anything..."
                className="w-full bg-transparent text-white placeholder:text-white/30 text-sm resize-none outline-none custom-scrollbar-none max-h-[200px] min-h-[24px]"
                rows={1}
                style={{ fieldSizing: 'content' } as any}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pr-1 pb-1 h-10">
              {/* Attach Button */}
              <button 
                className="w-9 h-9 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
                title="Upload media"
              >
                <span className="material-symbols-rounded text-[20px]">add_circle</span>
              </button>

              {/* Run Button */}
              <button
                className="flex items-center gap-2 pl-3 pr-4 h-9 bg-white text-black rounded-full hover:bg-white/90 hover:scale-[1.02] active:scale-95 transition-all duration-200 font-medium text-sm shadow-lg shadow-white/10"
              >
                <span>Run</span>
                <div className="flex items-center gap-1 opacity-40">
                  <span className="text-[10px]">⌘</span>
                  <span className="material-symbols-rounded text-[14px]">keyboard_return</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="text-center mt-3">
          <p className="text-[10px] text-white/20">
            Kiara Vision can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
      
      {/* Add Material Symbols Font if not present */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        
        .custom-scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </footer>
  );
};
