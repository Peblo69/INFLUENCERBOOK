import { NavbarHeader } from "@/sections/Navbar/components/NavbarHeader";
import { NavbarNav } from "@/sections/Navbar/components/NavbarNav";

export const Navbar = () => {
  return (
    <div className="box-border caret-transparent block">
      <div className="fixed bg-stone-900 border-b-zinc-200 border-l-zinc-200 border-r-zinc-800 border-t-zinc-200 box-border caret-transparent flex flex-col h-full overflow-x-hidden overflow-y-auto w-[220px] z-[4] px-2 border-r left-0 inset-y-0 md:static md:bg-zinc-900 md:left-auto md:inset-y-auto">
        <NavbarHeader />
        <NavbarNav />
      </div>
    </div>
  );
};
