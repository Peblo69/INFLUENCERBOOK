import { NavItems } from "@/sections/Navbar/components/NavItems";
import { NavbarFooter } from "@/sections/Navbar/components/NavbarFooter";

export const NavbarNav = () => {
  return (
    <nav className="box-border caret-transparent flex basis-[0%] flex-col grow shrink-0">
      <div className="box-border caret-transparent block">
        <NavItems />
      </div>
      <div className="box-border caret-transparent basis-[0%] grow"></div>
      <NavbarFooter />
    </nav>
  );
};
