import { Logo } from "@/sections/KiaraStudioPage/components/Logo";

export const NavbarHeader = () => {
  return (
    <div className="flex items-center gap-3 px-2 py-2 mb-4">
      <a
        href="#"
        className="flex items-center gap-3 group transition-opacity hover:opacity-80"
      >
        <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300">
          <Logo />
          
          {/* Shine effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white tracking-wide">KIARA</span>
          <span className="text-[10px] font-medium text-white/40 tracking-widest uppercase">Studio</span>
        </div>
      </a>
    </div>
  );
};
