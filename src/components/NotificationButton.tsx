export const NotificationButton = () => {
  return (
    <a
      href="#"
      className="text-white/80 hover:text-white items-center box-border caret-transparent flex h-[42px] justify-center border border-white/20 hover:border-white/40 px-3 rounded-lg hover:bg-white/10 transition-all duration-200"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
        <path d="M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z" />
      </svg>
      <span className="text-sm font-light box-border caret-transparent block leading-5 ml-2">
        4
      </span>
    </a>
  );
};
