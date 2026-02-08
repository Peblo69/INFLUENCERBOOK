import { MobileMenuButton } from "@/sections/Header/components/MobileMenuButton";
import { MobileNavLinks } from "@/sections/Header/components/MobileNavLinks";

export const MobileNav = () => {
  return (
    <div className="items-center box-border caret-transparent flex justify-center pb-1 md:hidden">
      <MobileMenuButton />
      <MobileNavLinks />
    </div>
  );
};
