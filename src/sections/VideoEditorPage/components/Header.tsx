import { useState } from "react";
import { 
  Film, 
  Music, 
  Type, 
  Sticker, 
  Wand2, 
  ArrowRightLeft, 
  Filter, 
  Sliders, 
  Bot,
  ChevronDown 
} from "lucide-react";

const MENU_ITEMS = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'stickers', label: 'Stickers', icon: Sticker },
  { id: 'effects', label: 'Effects', icon: Wand2 },
  { id: 'transitions', label: 'Transitions', icon: ArrowRightLeft },
  { id: 'filters', label: 'Filters', icon: Filter },
  { id: 'adjustment', label: 'Adjustment', icon: Sliders },
  { id: 'ai_avatar', label: 'AI avatar', icon: Bot },
];

export const Header = () => {
  const [activeItem, setActiveItem] = useState('media');

  return (
    <div className="h-14 flex items-center px-2 bg-[#171717] border-b border-[#2a2a2a] shrink-0 select-none">
      <div className="flex items-center gap-1 h-full">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={`
              flex flex-col items-center justify-center gap-[2px] px-3 h-12 rounded-lg transition-all duration-200 group
              ${activeItem === item.id ? 'text-[#00E5FF]' : 'text-[#9ca3af] hover:text-white hover:bg-[#2a2a2a]'}
            `}
          >
            <item.icon size={20} className={activeItem === item.id ? 'fill-current' : ''} />
            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Window Controls Placeholder (Right side) */}
      <div className="ml-auto flex items-center gap-4 text-[#9ca3af]">
        <div className="flex items-center gap-2 bg-[#2a2a2a] px-3 py-1.5 rounded-md cursor-pointer hover:bg-[#333] transition-colors">
           <span className="text-xs text-white font-medium">1080p</span>
           <ChevronDown size={14} />
        </div>
        <button className="px-4 py-1.5 bg-[#00E5FF] text-black text-xs font-bold rounded-md hover:bg-[#33ebff] transition-colors shadow-[0_0_10px_rgba(0,229,255,0.3)]">
          Export
        </button>
      </div>
    </div>
  );
};
