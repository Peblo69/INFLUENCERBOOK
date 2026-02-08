import logoUrl from "@/assets/fantasy-prompts-logo.svg";
export const NavbarLogo = () => {
  return (
    <a
      href="/"
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
    </a>
  );
};
