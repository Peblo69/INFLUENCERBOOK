import React from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import { FeatureCard } from '../types';

const FEATURES: FeatureCard[] = [
  {
    id: '1',
    title: 'HOLIDAY SPECIAL',
    subtitle: 'Unlock infinite generation for 1 year.',
    image: 'https://picsum.photos/seed/purple/800/450',
    badge: 'LIMITED TIME',
    badgeColor: 'bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200 text-black',
    size: 'large'
  },
  {
    id: '2',
    title: 'CINEMATIC LENS',
    subtitle: '21:9 Anamorphic simulation with realistic bokeh.',
    image: 'https://picsum.photos/seed/cinema/800/450',
    size: 'large'
  },
  {
    id: '3',
    title: "YEAR IN REVIEW",
    subtitle: 'Your creative journey visualized.',
    image: 'https://picsum.photos/seed/neoncity/800/450',
    badge: '2025',
    badgeColor: 'bg-white text-black',
    size: 'large'
  },
  {
    id: '4',
    title: 'V5 ENGINE',
    subtitle: 'Next-gen photorealism with ray-traced lighting.',
    image: 'https://picsum.photos/seed/android/800/450',
    size: 'large'
  }
];

export const Hero: React.FC = () => {
  return (
    <section className="pt-8 pb-12 px-6">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
          Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200">Highlights</span>
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Discover the latest tools and community spotlights trending this week on Kiara Vision.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((feature, index) => (
          <div 
            key={feature.id}
            className="group relative h-64 md:h-96 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-indigo-300/50 transition-all duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background Image */}
            <img 
              src={feature.image} 
              alt={feature.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

            {/* Content */}
            <div className="absolute inset-0 p-6 flex flex-col justify-end">
              {feature.badge && (
                <div className={`absolute top-4 right-4 ${feature.badgeColor} px-3 py-1 text-[10px] font-bold rounded-full shadow-lg tracking-wider`}>
                  {feature.badge}
                </div>
              )}
              
              <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mb-1 flex items-center gap-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-300 line-clamp-2 max-w-[90%] opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                  {feature.subtitle}
                </p>
              </div>

              {/* Hover Indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-[0_0_30px_rgba(165,180,252,0.4)]">
                  <ArrowUpRight size={28} />
                </div>
              </div>
            </div>
            
            {/* Bottom highlight bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
          </div>
        ))}
      </div>
    </section>
  );
};