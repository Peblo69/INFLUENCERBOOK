import { useI18n } from "@/contexts/I18nContext";

const Icon = ({ name, className = "h-4 w-4 mr-1.5 text-zinc-300" }: { name: string; className?: string }) => {
  switch (name) {
    case "explore":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M14.5 9.5l-3 7-7 3 3-7 7-3z" />
        </svg>
      );
    case "create":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
          <path d="M4 20h16" />
          <path d="M12 4l4 4-8 8H4v-4l8-8z" />
        </svg>
      );
    case "tweak":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a7 7 0 10-14.8 0" />
        </svg>
      );
    case "chat":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
          <path d="M4 5h16v10H7l-3 3V5z" />
        </svg>
      );
    default:
      return <span className={className} />;
  }
};

// Prefetch helper
const prefetchRoute = (href: string) => {
  if (href === '#') return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
};

export const DesktopNavLinks = () => {
  const { t } = useI18n();

  return (
    <div className="box-border caret-transparent hidden md:flex gap-2">
      <a 
        href="/" 
        onMouseEnter={() => prefetchRoute('/')}
        className="text-white/80 hover:text-white items-center flex h-[42px] justify-center px-4 py-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-200"
      >
        <Icon name="explore" className="h-4 w-4 mr-2" />
        <span className="text-sm font-light">{t("Explore")}</span>
      </a>
      <a 
        href="/assistant" 
        onMouseEnter={() => prefetchRoute('/assistant')}
        className="text-white/80 hover:text-white items-center flex h-[42px] justify-center px-4 py-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-200"
      >
        <Icon name="chat" className="h-4 w-4 mr-2" />
        <span className="text-sm font-light">{t("Assistant")}</span>
      </a>
      <a 
        href="#" 
        className="text-white/80 hover:text-white items-center flex h-[42px] justify-center px-4 py-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-200"
      >
        <Icon name="tweak" className="h-4 w-4 mr-2" />
        <span className="text-sm font-light">{t("Tweak")}</span>
      </a>
      <a 
        href="#" 
        className="text-white/80 hover:text-white items-center flex h-[42px] justify-center px-4 py-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-200"
      >
        <Icon name="chat" className="h-4 w-4 mr-2" />
        <span className="text-sm font-light">{t("Chat")}</span>
      </a>
    </div>
  );
};
