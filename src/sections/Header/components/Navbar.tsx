import { SearchBar } from "@/sections/Header/components/SearchBar";
import { DesktopNavLinks } from "@/sections/Header/components/DesktopNavLinks";
import { ActionButtons } from "@/sections/Header/components/ActionButtons";

export const Navbar = () => {
  return (
    <nav className="items-center box-border caret-transparent max-w-none w-full mx-auto px-6 py-4">
      <div className="relative items-center box-border caret-transparent flex justify-between w-full">
        {/* Left: Navigation Links */}
        <div className="items-center box-border caret-transparent flex gap-3">
          <DesktopNavLinks />
        </div>

        {/* Center: Search Bar */}
        <div className="absolute left-1/2 -translate-x-1/2 items-center box-border caret-transparent flex">
          <SearchBar />
        </div>

        {/* Right: Action Buttons */}
        <div className="items-center box-border caret-transparent flex gap-3 ml-auto">
          <ActionButtons />
        </div>
      </div>
    </nav>
  );
};
