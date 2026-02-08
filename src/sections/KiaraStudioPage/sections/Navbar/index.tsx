import { NavbarHeader } from "@/sections/KiaraStudioPage/sections/Navbar/components/NavbarHeader";
import { NavbarNav } from "@/sections/KiaraStudioPage/sections/Navbar/components/NavbarNav";

export const Navbar = () => {
  return (
    <div className="relative z-20 h-full hidden md:flex flex-col w-[260px] shrink-0">
      {/* Glass Sidebar */}
      <div className="flex-1 flex flex-col border-r border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="p-4">
          <NavbarHeader />
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
          <NavbarNav />
        </div>

        {/* Subtle gradient at bottom */}
        <div className="h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};
