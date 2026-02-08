import React, { useEffect, useRef, useState } from "react";

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );
    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0 scale-100 blur-0" : "opacity-0 translate-y-12 scale-95 blur-sm"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export const ContentContainer = () => {
  return (
    <div className="box-border caret-transparent gap-x-12 flex flex-col w-full pt-[72px] bg-black min-h-screen text-stone-300 font-sans selection:bg-white/20 selection:text-white pb-32">
      
      {/* Welcome / Hero Carousel */}
      <div className="box-border caret-transparent gap-x-6 flex flex-col gap-y-8 mb-16">
        <FadeIn>
          <div className="px-4 md:px-[120px]">
            <h1 className="text-4xl md:text-6xl font-bold box-border caret-transparent leading-tight text-white tracking-tighter bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent w-fit">
              The AI Influencerbook
            </h1>
            <p className="text-lg md:text-xl font-light text-gray-400 mt-6 max-w-4xl leading-relaxed">
              The bible of digital influence. The definitive ecosystem for creating, managing, and scaling AI personas. Forget the courses—this is the source.
            </p>
          </div>
        </FadeIn>
        
        <div className="items-center box-border caret-transparent gap-x-6 flex gap-y-4 w-full overflow-x-auto px-4 md:px-[120px] pb-12 pt-4 scrollbar-hide snap-x">
          {/* Card 1: The Mastermind AI */}
          <FadeIn delay={100} className="snap-center">
          <a
            href="#"
              className="relative aspect-[1.7/1] box-border caret-transparent flex flex-col shrink-0 h-[260px] md:h-[400px] overflow-hidden rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-700 ease-out group shadow-2xl shadow-black hover:shadow-[0_0_50px_-15px_rgba(255,255,255,0.1)] bg-neutral-900"
          >
            <video
              src="https://imagine.animagic.art/imagine-one/home/campaigns/hailuo_bn.mp4"
                playsInline
                loop
                muted
                autoPlay
                className="box-border caret-transparent h-full max-w-full object-cover w-full opacity-60 group-hover:opacity-90 transition-opacity duration-700 scale-105 group-hover:scale-100 grayscale-[80%] group-hover:grayscale-0"
            ></video>
              <div className="absolute bg-gradient-to-t from-black via-black/90 to-transparent flex z-10 pt-[72px] pb-8 px-8 bottom-0 inset-x-0 h-3/4 justify-end flex-col">
                <div className="box-border caret-transparent gap-x-1 flex flex-col gap-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    The Mastermind AI
                  </p>
                  <p className="text-gray-400 text-sm md:text-base tracking-wide leading-relaxed max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    Your dedicated architect. An ultra-smart AI trained on every workflow, strategy, and secret tool. Ask anything.
                </p>
              </div>
              <button
                type="button"
                  className="mt-6 text-black text-sm font-bold bg-white hover:bg-gray-200 transition-colors flex items-center justify-center h-10 px-6 rounded-full w-fit opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 duration-500 delay-150"
              >
                  Access Intelligence
              </button>
            </div>
          </a>
          </FadeIn>

          {/* Card 2: Viral Engineering */}
          <FadeIn delay={200} className="snap-center">
          <a
            href="#"
              className="relative aspect-[1.7/1] box-border caret-transparent flex flex-col shrink-0 h-[260px] md:h-[400px] overflow-hidden rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-700 ease-out group shadow-2xl shadow-black hover:shadow-[0_0_50px_-15px_rgba(255,255,255,0.1)] bg-neutral-900"
          >
            <video
              src="https://imagine.animagic.art/imagine-one/home/spotlight-cards/videos/veo31.mp4"
                playsInline
                loop
                muted
                autoPlay
                className="box-border caret-transparent h-full max-w-full object-cover w-full opacity-60 group-hover:opacity-90 transition-opacity duration-700 scale-105 group-hover:scale-100 grayscale-[80%] group-hover:grayscale-0"
            ></video>
              <div className="absolute bg-gradient-to-t from-black via-black/90 to-transparent flex z-10 pt-[72px] pb-8 px-8 bottom-0 inset-x-0 h-3/4 justify-end flex-col">
                <div className="box-border caret-transparent gap-x-1 flex flex-col gap-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    Viral Engineering
                  </p>
                  <p className="text-gray-400 text-sm md:text-base tracking-wide leading-relaxed max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    Create content that dominates the feed. Physics-based precision, superior quality, and algorithmic mastery.
                </p>
              </div>
              <button
                type="button"
                  className="mt-6 text-black text-sm font-bold bg-white hover:bg-gray-200 transition-colors flex items-center justify-center h-10 px-6 rounded-full w-fit opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 duration-500 delay-150"
              >
                  Start Creating
              </button>
            </div>
          </a>
          </FadeIn>

          {/* Card 3: Identity Architecture */}
          <FadeIn delay={300} className="snap-center">
          <a
            href="#"
              className="relative aspect-[1.7/1] box-border caret-transparent flex flex-col shrink-0 h-[260px] md:h-[400px] overflow-hidden rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-700 ease-out group shadow-2xl shadow-black hover:shadow-[0_0_50px_-15px_rgba(255,255,255,0.1)] bg-neutral-900"
          >
            <video
              src="https://imagine.animagic.art/imagine-one/home/spotlight-cards/videos/imagineyou.mp4"
                playsInline
                loop
                muted
                autoPlay
                className="box-border caret-transparent h-full max-w-full object-cover w-full opacity-60 group-hover:opacity-90 transition-opacity duration-700 scale-105 group-hover:scale-100 grayscale-[80%] group-hover:grayscale-0"
            ></video>
              <div className="absolute bg-gradient-to-t from-black via-black/90 to-transparent flex z-10 pt-[72px] pb-8 px-8 bottom-0 inset-x-0 h-3/4 justify-end flex-col">
                <div className="box-border caret-transparent gap-x-1 flex flex-col gap-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    Identity Architecture
                  </p>
                  <p className="text-gray-400 text-sm md:text-base tracking-wide leading-relaxed max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    Sculpt the perfect digital human. Deep dives into dataset curation, LoRA training, and facial consistency.
                </p>
              </div>
              <button
                type="button"
                  className="mt-6 text-black text-sm font-bold bg-white hover:bg-gray-200 transition-colors flex items-center justify-center h-10 px-6 rounded-full w-fit opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 duration-500 delay-150"
              >
                  Forge Persona
              </button>
            </div>
          </a>
          </FadeIn>

          {/* Card 4: The Business of A.I. */}
          <FadeIn delay={400} className="snap-center">
          <a
            href="#"
              className="relative aspect-[1.7/1] box-border caret-transparent flex flex-col shrink-0 h-[260px] md:h-[400px] overflow-hidden rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-700 ease-out group shadow-2xl shadow-black hover:shadow-[0_0_50px_-15px_rgba(255,255,255,0.1)] bg-neutral-900"
          >
            <img
              alt="Kiara Vision 1.0 Realism Challenge"
              src="/optimized/gallery-1.webp"
                className="absolute text-transparent box-border h-full max-w-full object-cover w-full inset-0 opacity-60 group-hover:opacity-80 transition-opacity duration-500"
              />
              <div className="absolute bg-gradient-to-t from-black via-black/90 to-transparent flex z-10 pt-[72px] pb-8 px-8 bottom-0 inset-x-0 h-2/3 justify-end flex-col">
                <div className="box-border caret-transparent gap-x-1 flex flex-col gap-y-2">
                  <p className="text-xl md:text-2xl font-bold text-stone-100 tracking-tight">
                    The Business of A.I.
                  </p>
                  <p className="text-stone-400 text-xs md:text-sm tracking-wide leading-relaxed max-w-[90%]">
                    From zero followers to global empire. Monetization, brand deals, and platform dominance.
                </p>
              </div>
              <button
                type="button"
                  className="mt-4 text-stone-900 text-xs md:text-sm font-bold bg-stone-200 hover:bg-white transition-colors flex items-center justify-center h-9 px-4 rounded-full w-fit opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-300"
              >
                Learn More
              </button>
            </div>
          </a>
          </FadeIn>

           {/* Card 5: Cinematic Authority */}
           <FadeIn delay={500} className="snap-center">
          <a
            href="#"
              className="relative aspect-[1.7/1] box-border caret-transparent flex flex-col shrink-0 h-[260px] md:h-[400px] overflow-hidden rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-700 ease-out group shadow-2xl shadow-black hover:shadow-[0_0_50px_-15px_rgba(255,255,255,0.1)] bg-neutral-900"
          >
            <video
              src="https://imagine.animagic.art/imagine-one/home/spotlight-cards/videos/effects.mp4"
                playsInline
                loop
                muted
                autoPlay
                className="box-border caret-transparent h-full max-w-full object-cover w-full opacity-60 group-hover:opacity-80 transition-opacity duration-500 scale-105 group-hover:scale-100"
            ></video>
              <div className="absolute bg-gradient-to-t from-black via-black/80 to-transparent flex z-10 pt-[72px] pb-6 px-6 bottom-0 inset-x-0 h-2/3 justify-end flex-col">
                <div className="box-border caret-transparent gap-x-1 flex flex-col gap-y-2">
                  <p className="text-xl md:text-2xl font-bold text-stone-100 tracking-tight">
                    Cinematic Authority
                  </p>
                  <p className="text-stone-400 text-xs md:text-sm tracking-wide leading-relaxed max-w-[90%]">
                    Achieve Hollywood-grade results. Lighting, camera work, and spectral coherence.
                </p>
              </div>
              <button
                type="button"
                  className="mt-4 text-stone-900 text-xs md:text-sm font-bold bg-stone-200 hover:bg-white transition-colors flex items-center justify-center h-9 px-4 rounded-full w-fit opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-300"
              >
                  Master Effects
              </button>
            </div>
          </a>
          </FadeIn>
              </div>
            </div>

      {/* Tools Grid Section */}
      <div className="box-border caret-transparent gap-x-12 flex flex-col gap-y-24 w-full px-4 md:px-[120px]">
        
        {/* Section: Platform Capabilities */}
        <div className="box-border caret-transparent gap-x-4 flex flex-col gap-y-4 w-full">
          <FadeIn>
            <div className="items-center box-border caret-transparent flex justify-between border-b border-stone-800 pb-4 mb-4">
              <div>
                  <h2 className="text-2xl md:text-3xl font-semibold text-stone-100 tracking-tight mb-2">
                    The Ultimate Knowledge Base
                  </h2>
                  <p className="text-stone-400 text-sm md:text-base max-w-2xl">
                     Everything you need to know. From creating simple assets to training complex LoRAs on your own datasets. This is the complete pipeline.
                </p>
              </div>
              <button
                type="button"
                className="text-white text-xs font-medium hover:text-black transition-all hidden md:block border border-white/20 px-6 py-2 rounded-full hover:bg-white"
              >
                Explore Archive &rarr;
              </button>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            
            {[
              {
                icon: "https://c.animaapp.com/mh3wk20yFxCibU/assets/icon-14.svg",
                title: "Prompt Engineering",
                desc: "Speak the language of diffusion models for exact results."
              },
              {
                icon: "https://c.animaapp.com/mh3wk20yFxCibU/assets/icon-15.svg",
                title: "Image to Video",
                desc: "Bring static images to life with physics-aware motion."
              },
              {
                icon: "https://c.animaapp.com/mh3wk20yFxCibU/assets/icon-16.svg",
                title: "Model Training",
                desc: "Fine-tune models on your own characters and styles."
              },
              {
                icon: "https://c.animaapp.com/mh3wk20yFxCibU/assets/icon-17.svg",
                title: "Motion Control",
                desc: "Direct character movement with skeleton tracking."
              },
              {
                icon: "https://c.animaapp.com/mh3wk20yFxCibU/assets/icon-18.svg",
                title: "Advanced Workflows",
                desc: "Build complex node-based generation pipelines."
              },
              {
                icon: "https://imagine.animagic.art/remote-config/assets/main-dashboard/studio-tiles/images/image-studio.webp",
                title: "Inpainting & Repair",
                desc: "Seamlessly edit and fix details with surgical precision.",
                isImage: true
              },
               {
                icon: "https://imagine.animagic.art/remote-config/assets/main-dashboard/studio-tiles/images/video-studio.webp",
                title: "Social Strategy",
                desc: "Understand the algorithms that drive viral growth.",
                isImage: true
              },
               {
                icon: "https://imagine.animagic.art/remote-config/assets/main-dashboard/studio-tiles/images/music-studio.webp",
                title: "Voice & Audio",
                desc: "Create synchronized soundscapes and realistic voices.",
                isImage: true
              }
            ].map((tool, idx) => (
              <FadeIn delay={idx * 50} key={idx} className="h-full">
          <a
            href="#"
                  className="flex flex-col gap-3 p-6 rounded-xl bg-black border border-white/10 hover:border-white/30 transition-all duration-300 h-full group backdrop-blur-sm hover:shadow-2xl hover:shadow-white/5"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black p-2 mb-2 border border-white/10 group-hover:border-white/30 transition-colors">
                    <img src={tool.icon} alt={tool.title} className={`w-full h-full object-cover ${tool.isImage ? 'rounded-md' : ''} opacity-80 group-hover:opacity-100 transition-all duration-300 grayscale group-hover:grayscale-0`} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-stone-200 group-hover:text-white mb-2">{tool.title}</h3>
                    <p className="text-xs md:text-sm text-stone-500 group-hover:text-stone-300 leading-relaxed">{tool.desc}</p>
              </div>
            </a>
              </FadeIn>
            ))}

                  </div>
                </div>

        {/* Fullscreen Video: Master the Digital Form */}
        <div className="relative w-[100vw] h-screen -mx-4 md:-mx-[120px] overflow-hidden">
          {/* Video Background — desktop */}
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/hero-bg-poster.jpg"
            src={window.innerWidth >= 768 ? "/hero-bg-hq.mp4" : "/hero-bg-mobile.mp4"}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Edge fade — all 4 sides fade to black */}
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 120px 60px rgba(0,0,0,0.95), inset 0 0 60px 30px rgba(0,0,0,0.5)' }} />
          {/* Left side stronger for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

          {/* Text overlay — top left */}
          <div className="absolute inset-0 z-10 flex items-end pb-20 md:pb-28">
            <FadeIn>
              <div className="px-6 md:px-[120px] max-w-2xl space-y-6">
                <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-[0.95]">
                  Master the<br/>Digital Form
                </h2>
                <p className="text-gray-300/90 text-lg md:text-xl font-light leading-relaxed">
                  We don't just teach you to use tools. We teach you to own them.
                  Upload your dataset, tag with precision, and train custom LoRAs
                  that understand your specific style. This is digital craftsmanship at its peak.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Camera Control Section */}
        <FadeIn delay={200}>
          <div className="relative box-border caret-transparent gap-x-4 flex flex-col gap-y-6 w-full py-12 border-t border-stone-900">
             <div className="flex justify-between items-end mb-4">
                <div>
                    <p className="text-2xl font-semibold text-stone-200">
                    Directorial Authority
                    </p>
                    <p className="text-stone-500 text-sm mt-2">Control every angle. Direct your scenes like a professional cinematographer.</p>
                </div>
              </div>
            
            <div className="grid grid-cols-3 gap-2 md:gap-4 aspect-video w-full overflow-hidden rounded-2xl bg-black">
                {/* Column 1 */}
                <div className="flex flex-col gap-2 md:gap-4">
                    <video playsInline autoPlay muted loop src="https://imagine.animagic.art/remote-config/assets/video_effects/sd/pan_right.mp4" className="w-full h-full object-cover rounded-lg opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[80%] hover:grayscale-0"></video>
                    <video playsInline autoPlay muted loop src="https://imagine.animagic.art/remote-config/assets/video_effects/sd/pull_out.mp4" className="w-full h-full object-cover rounded-lg opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[80%] hover:grayscale-0"></video>
                    <video playsInline autoPlay muted loop src="https://imagine.animagic.art/remote-config/assets/video_effects/sd/truck_left.mp4" className="w-full h-full object-cover rounded-lg opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[80%] hover:grayscale-0"></video>
                </div>
                 {/* Column 2 */}
                 <div className="flex flex-col gap-2 md:gap-4 pt-8">
                    <video playsInline autoPlay muted loop src="https://imagine.animagic.art/remote-config/assets/video_effects/sd/pan_left.mp4" className="w-full h-full object-cover rounded-lg opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[80%] hover:grayscale-0"></video>
                    <video playsInline autoPlay muted loop src="https://imagine.animagic.art/remote-config/assets/video_effects/sd/zoom_out.mp4" className="w-full h-full object-cover rounded-lg opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[80%] hover:grayscale-0"></video>
                    <video playsInline autoPlay muted loop src="https://imagine.animagic.art/remote-config/assets/video_effects/sd/padestal_up.mp4" className="w-full h-full object-cover rounded-lg opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[80%] hover:grayscale-0"></video>
                </div>
                 {/* Column 3 */}
                 <div className="flex flex-col gap-2 md:gap-4">
                    <video playsInline autoPlay muted loop src="https://imagine.animagic.art/remote-config/assets/video_effects/sd/tilt_up.mp4" className="w-full h-full object-cover rounded-lg opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[80%] hover:grayscale-0"></video>
                    <video playsInline autoPlay muted loop src="https://imagine.animagic.art/remote-config/assets/video_effects/sd/zoom_in.mp4" className="w-full h-full object-cover rounded-lg opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[80%] hover:grayscale-0"></video>
                    <video playsInline autoPlay muted loop src="https://imagine.animagic.art/remote-config/assets/video_effects/sd/padestal_down.mp4" className="w-full h-full object-cover rounded-lg opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale-[80%] hover:grayscale-0"></video>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
                 <button className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all hover:scale-105 text-sm">
                    Master Camera Control
                 </button>
            </div>
          </div>
        </FadeIn>

        {/* Imagine You Section */}
        <FadeIn delay={300}>
          <div className="relative box-border caret-transparent gap-x-4 flex flex-col gap-y-6 w-full py-12 border-t border-stone-900">
            <p className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
               Built by the Community
            </p>
            <div className="columns-2 md:columns-4 gap-4 space-y-4">
                 <img src="/optimized/gallery-2.webp" className="w-full rounded-2xl opacity-70 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] grayscale-[80%] hover:grayscale-0" alt="Sample" />
                 <img src="/optimized/gallery-3.webp" className="w-full rounded-2xl opacity-70 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] grayscale-[80%] hover:grayscale-0" alt="Sample" />
                 <img src="/optimized/gallery-4.webp" className="w-full rounded-2xl opacity-70 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] grayscale-[80%] hover:grayscale-0" alt="Sample" />
                 <img src="/optimized/gallery-5.webp" className="w-full rounded-2xl opacity-70 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] grayscale-[80%] hover:grayscale-0" alt="Sample" />
                 
                 <img src="/optimized/gallery-6.webp" className="w-full rounded-2xl opacity-70 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] grayscale-[80%] hover:grayscale-0" alt="Sample" />
                 <img src="/optimized/gallery-7.webp" className="w-full rounded-2xl opacity-70 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] grayscale-[80%] hover:grayscale-0" alt="Sample" />
                 <img src="/optimized/gallery-8.webp" className="w-full rounded-2xl opacity-70 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] grayscale-[80%] hover:grayscale-0" alt="Sample" />
                 <img src="/optimized/gallery-1.webp" className="w-full rounded-2xl opacity-70 hover:opacity-100 transition-all duration-500 hover:scale-[1.02] grayscale-[80%] hover:grayscale-0" alt="Sample" />
            </div>
             <div className="flex justify-center mt-12">
                 <button className="px-8 py-3 border border-white/20 text-white font-medium rounded-full hover:bg-white hover:text-black transition-all bg-black">
                    Explore Success Stories
                 </button>
            </div>
          </div>
        </FadeIn>

        {/* Footer / CTA Section */}
        <FadeIn delay={400}>
            <div className="w-full py-24 border-t border-stone-900 text-center">
                <h2 className="text-4xl md:text-6xl font-bold text-stone-100 mb-6 tracking-tighter">
                    Ready to Start Your Legacy?
                </h2>
                <p className="text-stone-500 text-lg max-w-2xl mx-auto mb-10">
                    Join the elite circle of creators defining the future of media.
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <button className="px-10 py-5 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] text-lg">
                        Get Started for Free
          </button>
                    <button className="px-10 py-5 bg-black text-white font-bold rounded-full hover:bg-white hover:text-black transition-all hover:scale-105 border border-white/20 text-lg">
                        View Membership
          </button>
        </div>
            </div>
        </FadeIn>

      </div>
    </div>
  );
};