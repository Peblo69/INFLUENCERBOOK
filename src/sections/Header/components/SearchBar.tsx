export const SearchBar = () => {
  return (
    <div className="relative box-border caret-transparent hidden md:block">
      <style>{`
        .glass-search {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          box-shadow:
            0 8px 32px 0 rgba(0, 0, 0, 0.37),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
            inset 0 -1px 0 0 rgba(255, 255, 255, 0.05),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .glass-search:focus {
          box-shadow:
            0 8px 32px 0 rgba(0, 0, 0, 0.4),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
            inset 0 -1px 0 0 rgba(255, 255, 255, 0.08),
            0 0 0 1px rgba(255, 255, 255, 0.15);
        }

        .glass-search::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
          border-radius: 16px 16px 0 0;
          pointer-events: none;
        }
      `}</style>
      <div className="relative">
        <input
          placeholder="Search..."
          type="search"
          name="search"
          className="glass-search text-white/95 placeholder-white/40 box-border caret-transparent w-[380px] max-w-[50vw] pl-10 pr-4 py-2.5 rounded-[16px] outline-none transition-all duration-300 text-sm font-light"
          style={{ caretColor: 'white' }}
        />
        <span className="absolute box-border caret-transparent left-3 top-3 pointer-events-none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-white/60" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
      </div>
    </div>
  );
};
