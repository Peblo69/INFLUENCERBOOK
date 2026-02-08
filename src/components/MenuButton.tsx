export const MenuButton = () => {
  return (
    <button className="relative items-center bg-white/5 caret-transparent flex h-[42px] justify-center text-center w-[42px] border border-white/10 hover:border-white/30 p-0 rounded-xl hover:bg-white/10 transition-all duration-200 shadow-lg shadow-black/20">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-white" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
      <span className="absolute text-white text-[10px] items-center bg-white/25 backdrop-blur-md border border-white/40 box-border caret-transparent flex h-5 justify-center leading-4 translate-x-[50%] -translate-y-[50%] w-5 rounded-full right-0 top-0 font-bold">
        1
      </span>
    </button>
  );
};
