export const Footer = () => {
  return (
    <footer className="relative overflow-hidden">
      <style>{`
        @keyframes planet-glow {
          0%, 100% {
            transform: translateY(0%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-2%) scale(1.02);
            opacity: 0.8;
          }
        }

        .planet-glow {
          animation: planet-glow 8s ease-in-out infinite;
        }
      `}</style>

      {/* Planet Glow Effect from Bottom */}
      <div className="absolute inset-x-0 bottom-0 h-[600px] pointer-events-none overflow-hidden">
        {/* Main Planet Glow */}
        <div className="planet-glow absolute left-1/2 -translate-x-1/2 bottom-[-300px] w-[800px] h-[800px] rounded-full bg-gradient-to-t from-purple-600/30 via-pink-500/20 to-transparent blur-3xl"></div>

        {/* Secondary Glow Layer */}
        <div className="planet-glow absolute left-1/2 -translate-x-1/2 bottom-[-250px] w-[600px] h-[600px] rounded-full bg-gradient-to-t from-blue-500/20 via-purple-400/15 to-transparent blur-2xl" style={{ animationDelay: '1s' }}></div>

        {/* Rim Light */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/40 to-transparent blur-sm"></div>
      </div>

      {/* Black Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/80"></div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Kiara Vision
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Create stunning AI-generated images with advanced customization and cloud storage.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-white/60 hover:text-white transition-all">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-all">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm">Product</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-white/60 hover:text-white transition-all">Features</a>
              <a href="#" className="block text-white/60 hover:text-white transition-all">Pricing</a>
              <a href="#" className="block text-white/60 hover:text-white transition-all">API Access</a>
              <a href="#" className="block text-white/60 hover:text-white transition-all">Documentation</a>
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm">Legal</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-white/60 hover:text-white transition-all">Privacy Policy</a>
              <a href="#" className="block text-white/60 hover:text-white transition-all">Terms of Service</a>
              <a href="#" className="block text-white/60 hover:text-white transition-all">Cookie Policy</a>
              <a href="#" className="block text-white/60 hover:text-white transition-all">DMCA</a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm">
            &copy; 2025 Kiara Vision. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
