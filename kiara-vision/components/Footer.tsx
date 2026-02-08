import React from 'react';
import { Infinity, Twitter, Youtube, Instagram, Github } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 bg-black py-12 px-6 mt-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        
        <div className="col-span-1">
          <a href="#" className="flex items-center gap-2 mb-4 text-white">
            <Infinity size={24} className="text-purple-300 drop-shadow-[0_0_8px_rgba(216,180,254,0.5)]" />
            <span className="font-display font-bold text-lg">Kiara Vision</span>
          </a>
          <p className="text-zinc-600 text-sm">
            Forging the future of digital creativity through AI.
          </p>
        </div>

        <div>
          <h4 className="text-white font-display font-bold mb-4 uppercase text-xs tracking-widest text-zinc-500">Product</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li><a href="#" className="hover:text-purple-300 transition-colors">Features</a></li>
            <li><a href="#" className="hover:text-purple-300 transition-colors">Pricing</a></li>
            <li><a href="#" className="hover:text-purple-300 transition-colors">Download</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-display font-bold mb-4 uppercase text-xs tracking-widest text-zinc-500">Resources</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li><a href="#" className="hover:text-purple-300 transition-colors">Community</a></li>
            <li><a href="#" className="hover:text-purple-300 transition-colors">Help</a></li>
            <li><a href="#" className="hover:text-purple-300 transition-colors">API</a></li>
          </ul>
        </div>

        <div>
           <div className="flex gap-4">
              <SocialIcon icon={<Twitter size={18} />} />
              <SocialIcon icon={<Instagram size={18} />} />
              <SocialIcon icon={<Youtube size={18} />} />
              <SocialIcon icon={<Github size={18} />} />
           </div>
        </div>

      </div>
      <div className="mt-12 pt-8 border-t border-white/5 text-center text-zinc-700 text-xs">
        © 2025 Kiara Vision Inc.
      </div>
    </footer>
  );
};

const SocialIcon = ({ icon }: { icon: React.ReactNode }) => (
    <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-black hover:bg-gradient-brand hover:border-transparent transition-all duration-300">
        {icon}
    </a>
)