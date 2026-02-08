import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ToolItem } from '../types';

const TOOLS: ToolItem[] = [
  { id: 't1', title: 'Text to Image', image: 'https://picsum.photos/seed/cyber/300/300', actionLabel: 'Create' },
  { id: 't2', title: 'Motion Video', image: 'https://picsum.photos/seed/motion/300/300', actionLabel: 'Animate' },
  { id: 't3', title: 'Generative Fill', image: 'https://picsum.photos/seed/fill/300/300', actionLabel: 'Edit' },
  { id: 't4', title: 'Video Editor', image: 'https://picsum.photos/seed/edit/300/300', actionLabel: 'Studio' },
  { id: 't5', title: '4K Upscale', image: 'https://picsum.photos/seed/detail/300/300', actionLabel: 'Enhance' },
  { id: 't6', title: 'Dream Model', image: 'https://picsum.photos/seed/dream/300/300', isNew: true, actionLabel: 'Generate' },
  { id: 't7', title: 'Voice Sync', image: 'https://picsum.photos/seed/mic/300/300', actionLabel: 'Sync' },
];

export const QuickTools: React.FC = () => {
  return (
    <section className="py-10 px-6 border-t border-white/5 bg-zinc-950/50">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div className="max-w-xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold uppercase text-white mb-2 tracking-tight">
            Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200">Today</span>
          </h2>
          <p className="text-zinc-400 text-sm md:text-base font-light">
            Unleash your potential with our suite of AI-powered creative tools.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 font-bold px-6 py-3 rounded-full transition-all w-full md:w-auto font-display">
          All Tools
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Tools Grid/Scroll */}
      <div className="relative">
        <div className="flex gap-5 overflow-x-auto pb-8 hide-scrollbar snap-x">
          {TOOLS.map((tool) => (
            <div 
              key={tool.id} 
              className="group flex-shrink-0 relative w-44 md:w-60 aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer snap-start border border-white/5 hover:border-purple-300 transition-all duration-300 hover:shadow-[0_0_20px_rgba(216,180,254,0.3)]"
            >
              <img 
                src={tool.image} 
                alt={tool.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
              
              {tool.isNew && (
                <div className="absolute top-3 right-3 bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200 text-black text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                  NEW
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-5">
                 <h4 className="text-white font-display font-bold text-lg mb-1 leading-none">{tool.title}</h4>
                 <div className="flex items-center gap-2 text-xs text-zinc-400 group-hover:text-purple-200 transition-colors uppercase tracking-wider font-semibold">
                    {tool.actionLabel}
                    <ArrowRight size={12} className="transform -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                 </div>
              </div>

              {/* Hover Effect Layer */}
              <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>
        
        {/* Fade Indicator for scroll */}
        <div className="absolute right-0 top-0 bottom-6 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none" />
      </div>

    </section>
  );
};