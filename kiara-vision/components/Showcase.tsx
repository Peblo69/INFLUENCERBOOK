import React from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { CommunityProject } from '../types';

const PROJECTS: CommunityProject[] = [
  {
    id: 'p1',
    title: 'Neon Genesis: Live Action',
    author: 'shinji_ikari',
    image: 'https://picsum.photos/seed/eva/600/350',
    avatar: 'https://picsum.photos/seed/u1/50/50'
  },
  {
    id: 'p2',
    title: 'Cyberpunk 2077 - Night City',
    author: 'v_real',
    image: 'https://picsum.photos/seed/cp2077/600/350',
    avatar: 'https://picsum.photos/seed/u2/50/50'
  },
  {
    id: 'p3',
    title: 'The Last Starfighter',
    author: 'retro_scifi',
    image: 'https://picsum.photos/seed/star/600/350',
    avatar: 'https://picsum.photos/seed/u3/50/50'
  }
];

export const Showcase: React.FC = () => {
  return (
    <section className="py-12 px-6">
       <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold uppercase text-white mb-1 tracking-wide">
                Community <span className="text-zinc-500">Spotlight</span>
            </h2>
            <p className="text-zinc-400 text-sm">
                Trending generations from the community.
            </p>
          </div>
          <a href="#" className="text-sm font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1 transition-colors">
            View Gallery <ArrowRight size={14} />
          </a>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROJECTS.map((project) => (
             <div key={project.id} className="group cursor-pointer">
                {/* Card Image */}
                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 mb-3">
                   <img 
                      src={project.image} 
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                   />
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                   
                   {/* Play Button Overlay */}
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200 flex items-center justify-center shadow-lg text-black">
                         <Play size={24} className="ml-1 fill-black" />
                      </div>
                   </div>
                </div>

                {/* Author Info */}
                <div className="flex items-center justify-between px-1">
                   <div>
                       <h3 className="text-white font-display font-bold text-sm truncate group-hover:text-purple-300 transition-colors">{project.title}</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <img src={project.avatar} alt={project.author} className="w-4 h-4 rounded-full border border-white/20" />
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">@{project.author}</span>
                       </div>
                   </div>
                </div>
             </div>
          ))}
       </div>
    </section>
  );
};