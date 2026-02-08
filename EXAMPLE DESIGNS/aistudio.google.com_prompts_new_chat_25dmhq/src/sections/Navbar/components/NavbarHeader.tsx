import { Logo } from "@/components/Logo";

export const NavbarHeader = () => {
  return (
    <div className="sticky items-center bg-stone-900 box-border caret-transparent gap-x-2 flex gap-y-2 w-full z-[2] px-2 py-6 top-0 md:bg-zinc-900">
      <a
        href="https://aistudio.google.com/"
        className="text-indigo-400 font-medium box-border caret-transparent block"
      >
        <Logo />
      </a>
    </div>
  );
};
