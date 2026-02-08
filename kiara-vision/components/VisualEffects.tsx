import React from 'react';
import { VisualEffect } from '../types';

const EFFECTS: VisualEffect[] = [
  { id: 'e1', title: 'Glitch Chromatic', category: 'Distortion', image: 'https://picsum.photos/seed/glitch/400/600', aspectRatio: 'portrait' },
  { id: 'e2', title: 'Liquid Metal', category: 'Material', image: 'https://picsum.photos/seed/metal/400/300', aspectRatio: 'landscape' },
  { id: 'e3', title: 'Bio-Luminescence', category: 'Nature', image: 'https://picsum.photos/seed/bio/400/500', aspectRatio: 'portrait' },
  { id: 'e4', title: 'Cyber Smoke', category: 'Elements', image: 'https://picsum.photos/seed/smoke2/400/400', aspectRatio: 'square' },
  { id: 'e5', title: 'Vortex Tunnel', category: 'Abstract', image: 'https://picsum.photos/seed/vortex/400/600', aspectRatio: 'portrait' },
  { id: 'e6', title: 'Data Stream', category: 'Overlay', image: 'https://picsum.photos/seed/data/400/300', aspectRatio: 'landscape' },
  { id: 'e7', title: 'Hologram', category: 'Sci-Fi', image: 'https://picsum.photos/seed/holo/400/550', aspectRatio: 'portrait' },
  { id: 'e8', title: 'Particle Dissolve', category: 'Transition', image: 'https://picsum.photos/seed/dust/400/400', aspectRatio: 'square' },
];

const CATEGORIES = ['Trending', 'Sci-Fi', 'Nature', 'Abstract', 'Horror', 'Cyberpunk', 'Elements'];

export const VisualEffects: React.FC = () => {
  return (
    <section className="py-12 px-6 bg-gradient-to-b from-black to-zinc-950/80">
       <div className="mb-8">
          <h2 className="text-2xl font-display font-bold uppercase text-white mb-2">VFX Library</h2>
          <p className="text-zinc-500 text-sm">Professional grade visual effects assets.</p>
       </div>

       {/* Tags Filter */}
       <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat, i) => (
             <button 
                key={cat} 
                className={`px-4 py-1.5 border text-xs font-bold rounded-full transition-all uppercase tracking-wide ${
                    i === 0 
                    ? 'bg-white text-black border-white hover:bg-zinc-200' 
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-indigo-300 hover:text-white'
                }`}
             >
                {cat}
             </button>
          ))}
       </div>

       {/* Masonry Layout */}
       <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {EFFECTS.map((effect) => (
             <div 
                key={effect.id} 
                className="group relative break-inside-avoid rounded-xl overflow-hidden bg-zinc-900 cursor-pointer border border-transparent hover:border-purple-300/50 transition-all duration-300"
             >
                <img 
                   src={effect.image} 
                   alt={effect.title} 
                   className="w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                />
                
                {/* Overlay Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                   <h4 className="text-white font-display font-bold text-sm">{effect.title}</h4>
                   <p className="text-purple-300 text-[10px] uppercase tracking-wider font-bold">{effect.category}</p>
                </div>
             </div>
          ))}
       </div>
    </section>
  );
};