import { Link, useLocation } from "react-router-dom";

export const DesktopNav = () => {
  const { pathname } = useLocation();

  const navItems = [
    { label: "Home", to: "/" },
    { label: "Assistant", to: "/assistant" },
    { label: "Influencer Studio", to: "/models" },
    { label: "Influencers", to: "/influencers" },
    { label: "Video", to: "/videos" },
    { label: "Labs", to: "/kiara-studio-labs" },
    { label: "Assets", to: "/images" },
  ];

  return (
    <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 bg-white/[0.03] border border-white/[0.06] rounded-full px-1.5 py-1">
      {navItems.map((item) => {
        const isActive = pathname === item.to;
        return (
          <Link
            key={item.label}
            to={item.to}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 whitespace-nowrap ${
              isActive
                ? "bg-white/[0.08] text-white"
                : "text-zinc-500 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
