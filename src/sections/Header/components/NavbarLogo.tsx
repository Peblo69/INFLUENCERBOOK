import logoUrl from "@/assets/fantasy-prompts-logo.svg";
import { Link } from "react-router-dom";
export const NavbarLogo = () => {
  return (
    <Link
      to="/"
      aria-label="Fantasy Prompts"
      className="items-center box-border caret-transparent flex"
    >
      <img
        src={logoUrl}
        alt="Fantasy Prompts"
        className="box-border caret-transparent h-4 max-w-full mx-1 md:h-5"
      />
      <span className="ml-2 text-sm md:text-base font-semibold select-none">
        Fantasy Prompts
      </span>
    </Link>
  );
};
