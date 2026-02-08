export const DesktopNav = () => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isHome = currentPath === '/';
  const isAssistant = currentPath === '/assistant';

  const navItems = [
    { label: "Home", href: "/", isActive: isHome },
    { label: "Studio", href: "/assistant", isActive: isAssistant },
    { label: "Gallery", href: "/assistant", isActive: false },
    { label: "Tools", href: "/assistant", isActive: false },
    { label: "Community", href: "#", isActive: false },
  ];

  return (
    <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
      {navItems.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className={`text-sm font-medium transition-all duration-200 ${
            item.isActive
              ? "text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
};
