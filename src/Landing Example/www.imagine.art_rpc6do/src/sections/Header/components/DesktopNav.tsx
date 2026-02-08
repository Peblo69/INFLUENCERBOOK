import { Link, useLocation } from "react-router-dom";

export const DesktopNav = () => {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const isAssistant = pathname === "/assistant";

  const navItems = [
    { label: "Home", to: "/", isActive: isHome },
    { label: "Studio", to: "/assistant", isActive: isAssistant },
    { label: "Gallery", to: "/assistant", isActive: false },
    { label: "Tools", to: "/assistant", isActive: false },
    { label: "Community", to: null, isActive: false },
  ];

  return (
    <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
      {navItems.map((item) => (
        item.to ? (
          <Link
            key={item.label}
            to={item.to}
            className={`text-sm font-medium transition-all duration-200 ${
              item.isActive ? "text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            className="text-sm font-medium text-zinc-400 hover:text-white transition-all duration-200"
          >
            {item.label}
          </button>
        )
      ))}
    </nav>
  );
};
