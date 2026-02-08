import React, { useState, useEffect, useRef, ReactNode } from 'react';

interface LandingProps {
  onEnter: () => void;
}

// --- Intersection Observer Hook for Scroll Reveals ---
const useOnScreen = (options: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target); // Trigger once
      }
    }, options);

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);

  return [ref, isVisible] as const;
};

// --- Reveal Component ---
const Reveal = ({ children, delay = 0, className = "" }: { children?: ReactNode, delay?: number, className?: string }) => {
  const [ref, isVisible] = useOnScreen({ threshold: 0.1 });
  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  const [scrollY, setScrollY] = useState(0);
  const [glitchText, setGlitchText] = useState("AI INFLUENCERBOOK");

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Subtle Glitch Effect
  useEffect(() => {
    const interval = setInterval(() => {
        if (Math.random() > 0.97) {
            const original = "AI INFLUENCERBOOK";
            const chars = "$%#@01/-";
            const randomChar = chars[Math.floor(Math.random() * chars.length)];
            const randomPos = Math.floor(Math.random() * original.length);
            const newText = original.substring(0, randomPos) + randomChar + original.substring(randomPos + 1);
            setGlitchText(newText);
            setTimeout(() => setGlitchText(original), 100);
        }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans selection:bg-white selection:text-black overflow-hidden relative">
      
      {/* Parallax Background Grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 mix-blend-difference flex justify-between items-center transition-transform duration-500 ease-out"
           style={{ transform: scrollY > 50 ? 'translateY(0)' : 'translateY(0)' }}>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white animate-pulse"></div>
            <span className="font-mono text-xs tracking-[0.2em] font-bold">THE AI INFLUENCERBOOK</span>
         </div>
         <button 
           onClick={onEnter}
           className="hidden md:block px-6 py-2 border border-white/20 text-[10px] tracking-widest uppercase hover:bg-white hover:text-black transition-all"
         >
           Access Terminal
         </button>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 pt-20">
        <div className="max-w-[1400px] mx-auto w-full relative z-10">
            <Reveal>
                <div className="inline-block border border-white/20 px-3 py-1 bg-white/5 backdrop-blur-sm mb-8">
                    <span className="text-[10px] font-mono tracking-[0.2em] text-gray-300">EST. REVENUE: $1.2M/YR</span>
                </div>
            </Reveal>

            <Reveal delay={100}>
                <h1 className="text-6xl md:text-[8rem] leading-[0.8] font-black tracking-tighter uppercase mb-6 mix-blend-difference">
                    THE <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-gray-800">{glitchText}</span>
                </h1>
            </Reveal>

            <Reveal delay={200}>
                <p className="max-w-xl text-lg md:text-xl text-gray-400 leading-relaxed font-light ml-2 border-l border-white/20 pl-6">
                    The intelligence engine for dominating Fanvue. 
                    Generate hyper-realistic prompts. Automate parasocial intimacy. Scale your earnings.
                </p>
            </Reveal>

            <Reveal delay={300}>
                <div className="mt-12 flex items-center gap-8">
                     <button 
                        onClick={onEnter}
                        className="group relative px-10 py-5 bg-white text-black overflow-hidden"
                     >
                        <div className="absolute inset-0 bg-gray-200 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.85,0,0.15,1)]"></div>
                        <span className="relative z-10 flex items-center gap-4 text-xs font-bold tracking-[0.2em] uppercase">
                            Create Persona
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                        </span>
                     </button>
                     <div className="hidden md:flex flex-col text-[10px] font-mono text-gray-500 gap-1">
                        <span>MODEL: FLUX/REALISM</span>
                        <span>TARGET: HIGH NET WORTH</span>
                     </div>
                </div>
            </Reveal>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-50">
            <span className="text-[10px] font-mono tracking-widest vertical-text">SCROLL TO MONETIZE</span>
            <div className="w-px h-16 bg-gradient-to-b from-white to-transparent"></div>
        </div>
      </section>

      {/* --- SECTION 2: THE PROBLEM (Darker, Moody) --- */}
      <section className="min-h-[80vh] bg-[#050505] relative flex items-center py-24 border-t border-white/5">
         <div className="max-w-[1400px] mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
             <div className="order-2 md:order-1 relative">
                {/* Abstract Visual */}
                <Reveal>
                    <div className="relative aspect-[4/5] border border-white/10 overflow-hidden bg-white/[0.02]">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,#ffffff05_1px,#ffffff05_2px)] bg-[size:100%_4px]"></div>
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-[8px] leading-[8px] text-white/20 whitespace-pre opacity-50 select-none">
{`
   Processing...
   [IMG_GEN_001]
   ................
   FACE_ID: MATCH
   SKIN_TXT: 8K
   LIGHTING: STUDIO
   ................
   RENDER: COMPLETE
`}
                        </div>
                        {/* Moving Scanner Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.5)] animate-[scan_3s_linear_infinite]"></div>
                    </div>
                </Reveal>
             </div>
             
             <div className="order-1 md:order-2 space-y-12">
                 <Reveal>
                     <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-none">
                         REALITY IS <br />
                         <span className="text-gray-600">OBSOLETE.</span>
                     </h2>
                 </Reveal>
                 <Reveal delay={100}>
                     <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                         Human influencers burn out. They age. They complain. 
                         Your AI workforce operates 24/7. Generating ultra-realistic content for Fanvue and social dominance without lifting a camera.
                     </p>
                 </Reveal>
                 <Reveal delay={200}>
                     <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
                         <div>
                             <h4 className="font-mono text-xs text-gray-500 mb-2">IMAGE QUALITY</h4>
                             <p className="text-2xl font-light">Photoreal 8K</p>
                         </div>
                         <div>
                             <h4 className="font-mono text-xs text-gray-500 mb-2">PROFIT MARGIN</h4>
                             <p className="text-2xl font-light">98.5%</p>
                         </div>
                     </div>
                 </Reveal>
             </div>
         </div>
      </section>

      {/* --- SECTION 3: FEATURES (Horizontal Scroll Feel) --- */}
      <section className="py-32 border-t border-white/5 bg-black relative">
          <div className="max-w-[1400px] mx-auto px-6 mb-20">
              <Reveal>
                <h3 className="text-xs font-mono tracking-[0.3em] text-emerald-500/70 mb-4">PLATFORM DOMINANCE</h3>
                <h2 className="text-5xl md:text-7xl font-bold tracking-tighter">THE CREATOR STACK</h2>
              </Reveal>
          </div>

          <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
              <FeatureCard 
                  num="01" 
                  title="Hyper-Real Imagery" 
                  desc="Engineered prompts for Flux & Midjourney that create indistinguishable human textures and lighting." 
              />
              <FeatureCard 
                  num="02" 
                  title="Fanvue Strategy" 
                  desc="Data-driven content calendars designed to convert free followers into high-paying subscribers." 
              />
              <FeatureCard 
                  num="03" 
                  title="Automated Intimacy" 
                  desc="Script generation for DMs that trigger high-value emotional investment from whales." 
              />
          </div>
      </section>

      {/* --- SECTION 4: TERMINAL PREVIEW --- */}
      <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/[0.02]"></div>
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
              <Reveal>
                  <div className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg overflow-hidden shadow-2xl text-left font-mono text-sm p-6 min-h-[300px] flex flex-col">
                      <div className="flex gap-2 mb-4 border-b border-white/5 pb-4">
                          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                          <div className="ml-auto text-[10px] text-gray-600">admin@fanvue_bot:~</div>
                      </div>
                      <div className="space-y-2 text-gray-400">
                          <p>
                              <span className="text-emerald-500">➜</span> <span className="text-white">generate_set</span> --theme="gym_mirror_selfie" --lighting="fluorescent"
                          </p>
                          <p className="pl-4 text-gray-500 italic">
                              Analyzing Instagram Trends... <span className="text-white">Trending: #FitAI</span>
                          </p>
                          <p className="pl-4 text-gray-500 italic">
                              Compiling Stable Diffusion Prompt... <span className="text-white">Done</span>
                          </p>
                          <p className="pl-4 text-gray-500 italic">
                              Calculating Est. Likes/Revenue...
                          </p>
                          <div className="pl-4 pt-2 text-white">
                              {`> OUTPUT: "hyper-realistic shot, sweat texture 1.2, gym lighting, 4k" `}
                              <br/>
                              {`> EST. REVENUE: $4,200 (Fanvue Exclusive)`}
                          </div>
                          <p className="mt-4 animate-pulse">
                              <span className="text-emerald-500">➜</span> <span className="w-2 h-4 bg-white inline-block align-middle"></span>
                          </p>
                      </div>
                  </div>
              </Reveal>
              
              <Reveal delay={200}>
                  <div className="mt-12">
                      <button 
                        onClick={onEnter}
                        className="px-12 py-4 bg-white text-black font-bold tracking-widest hover:scale-105 transition-transform duration-300"
                      >
                          LAUNCH INTERFACE
                      </button>
                  </div>
              </Reveal>
          </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/10 bg-black pt-20 pb-10">
          <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-end gap-12">
              <div>
                  <h2 className="text-3xl font-black tracking-tighter mb-2">THE AI INFLUENCERBOOK</h2>
                  <p className="text-xs font-mono text-gray-500">BUILDING THE NEW ELITE.</p>
              </div>
              <div className="flex gap-8 text-[10px] font-mono tracking-widest text-gray-500 uppercase">
                  <a href="#" className="hover:text-white transition-colors">Prompt Guide</a>
                  <a href="#" className="hover:text-white transition-colors">Pricing</a>
                  <a href="#" className="hover:text-white transition-colors">Login</a>
              </div>
          </div>
          <div className="max-w-[1400px] mx-auto px-6 mt-20 text-[10px] text-gray-800 font-mono text-center md:text-left">
              © 2025 THE AI INFLUENCERBOOK SYSTEMS INC.
          </div>
      </footer>

    </div>
  );
};

const FeatureCard = ({ num, title, desc }: { num: string, title: string, desc: string }) => {
    const [hover, setHover] = useState(false);
    return (
        <div 
            className="bg-black p-12 relative group overflow-hidden cursor-default transition-colors duration-500 hover:bg-[#0a0a0a]"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div className="absolute top-6 right-6 font-mono text-xs text-gray-700">/{num}</div>
            <div className={`w-8 h-8 rounded-full bg-white/5 mb-8 flex items-center justify-center transition-all duration-500 ${hover ? 'bg-white scale-110' : ''}`}>
                <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${hover ? 'bg-black' : 'bg-white'}`}></div>
            </div>
            <h3 className="text-xl font-bold tracking-wide mb-4 group-hover:text-white transition-colors">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs group-hover:text-gray-300 transition-colors">{desc}</p>
        </div>
    )
}