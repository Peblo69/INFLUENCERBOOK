import { NavLink } from "@/sections/KiaraStudioPage/components/NavLink";

const Icon = ({ name, className = "h-5 w-5" }: { name: string; className?: string }) => {
  switch (name) {
    case "models":
      return <span className={`material-symbols-rounded text-[20px] ${className}`}>grid_view</span>;
    case "studio":
      return <span className={`material-symbols-rounded text-[20px] ${className}`}>auto_awesome</span>;
    case "labs":
      return <span className={`material-symbols-rounded text-[20px] ${className}`}>science</span>;
    case "image":
      return <span className={`material-symbols-rounded text-[20px] ${className}`}>image</span>;
    case "video":
      return <span className={`material-symbols-rounded text-[20px] ${className}`}>movie</span>;
    default:
      return null;
  }
};

export const NavItems = () => {
  return (
    <div className="space-y-1 px-2">
      <div className="text-white/40 uppercase tracking-wider text-[10px] font-semibold px-3 mb-2 mt-4">MAIN</div>

      <a
        href="/models"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 group cursor-pointer text-white/60 hover:text-white"
      >
        <Icon name="models" />
        <span className="text-sm font-medium">Models</span>
      </a>

      <a
        href="/kiara-studio"
        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white shadow-lg shadow-white/5 transition-all duration-200 group cursor-pointer"
      >
        <Icon name="studio" className="text-purple-400" />
        <span className="text-sm font-medium">Kiara Studio</span>
      </a>

      <a
        href="/kiara-studio-labs"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 group cursor-pointer text-white/60 hover:text-white"
      >
        <Icon name="labs" />
        <span className="text-sm font-medium">Kiara Studio Labs</span>
      </a>

      <div className="text-white/40 uppercase tracking-wider text-[10px] font-semibold px-3 mb-2 mt-6">LIBRARY</div>

      <a
        href="/images"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 group cursor-pointer text-white/60 hover:text-white"
      >
        <Icon name="image" />
        <span className="text-sm font-medium">Images</span>
      </a>

      <a
        href="/video-editor"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 group cursor-pointer text-white/60 hover:text-white"
      >
        <Icon name="video" />
        <span className="text-sm font-medium">Videos</span>
        <span className="ml-auto material-symbols-rounded text-[14px] opacity-50 group-hover:opacity-100">edit_square</span>
      </a>
    </div>
  );
};
