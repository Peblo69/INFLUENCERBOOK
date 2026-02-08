import { Navbar } from "@/sections/Header/components/Navbar";
import { MobileNav } from "@/sections/Header/components/MobileNav";

export const Header = () => {
  return (
    <header className="fixed box-border caret-transparent w-full z-50 top-0">
      <Navbar />
      <MobileNav />
    </header>
  );
};
