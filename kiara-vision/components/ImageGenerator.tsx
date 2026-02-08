import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Image as ImageIcon, Zap, Monitor, Download, 
  Share2, Maximize2, MoreHorizontal, Wand2, Bot, 
  MessageSquare, X, Send, User, ChevronUp, ChevronDown,
  Cpu, Layers, Aperture, Box, Flame, Command, Infinity,
  Palette, Ratio, Copy
} from 'lucide-react';

const INITIAL_IMAGES = [
  { id: 1, src: 'https://picsum.photos/seed/fashion_model/800/1000', ratio: 'aspect-[4/5]' },
  { id: 2, src: 'https://picsum.photos/seed/cyber_city/800/600', ratio: 'aspect-[4/3]' },
  { id: 3, src: 'https://picsum.photos/seed/abstract_art/800/800', ratio: 'aspect-square' },
  { id: 4, src: 'https://picsum.photos/seed/portrait_woman/800/1200', ratio: 'aspect-[2/3]' },
  { id: 5, src: 'https://picsum.photos/seed/scifi_mech/800/600', ratio: 'aspect-[4/3]' },
  { id: 6, src: 'https://picsum.photos/seed/landscape_mountains/800/450', ratio: 'aspect-[16/9]' },
  { id: 7, src: 'https://picsum.photos/seed/character_design/800/1000', ratio: 'aspect-[4/5]' },
  { id: 8, src: 'https://picsum.photos/seed/architecture_modern/800/800', ratio: 'aspect-square' },
];

// --- MODEL DATA ---
const MODELS = [
  { id: 'nano', name: 'Nano Banana', desc: "Google's Standard Generation Model", color: 'text-green-400', icon: Cpu },
  { id: 'seed45', name: 'Seedream 4.5', desc: "ByteDance's Next-Gen 4K Image Model", color: 'text-yellow-400', icon: Layers },
  { id: 'seed40', name: 'Seedream 4.0', desc: "ByteDance's Advanced Image Editing Model", color: 'text-yellow-400', icon: Layers },
  { id: 'gpt15', name: 'GPT Image 1.5', desc: "True-Color Precision Rendering", color: 'text-emerald-400', icon: Box },
  { id: 'zimg', name: 'Z-Image', desc: "Instant Lifelike Portraits", color: 'text-lime-400', icon: Aperture },
  { id: 'kling', name: 'Kling O1', desc: "Kling's Photorealistic Image Model", color: 'text-cyan-400', icon: Command },
  { id: 'flux2pro', name: 'FLUX.2 Pro', desc: "Speed-Optimized Detail", color: 'text-pink-300', icon: Flame },
  { id: 'flux2flex', name: 'FLUX.2 Flex', desc: "Next-Gen Image Generation", color: 'text-pink-300', icon: Flame },
  { id: 'flux2max', name: 'FLUX.2 Max', desc: "Ultimate Precision And Speed", color: 'text-pink-300', icon: Flame },
  { id: 'reve', name: 'Reve', desc: "Advanced Image Editing Model", color: 'text-purple-300', icon: Sparkles },
  { id: 'fluxcontext', name: 'Flux Kontext Max', desc: "Edit With Accuracy", color: 'text-pink-300', icon: Flame },
  { id: 'gptimg', name: 'GPT Image', desc: "Versatile Text-To-Image AI", color: 'text-emerald-400', icon: Box },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export const ImageGenerator: React.FC = () => {
  const [images, setImages] = useState(INITIAL_IMAGES);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  
  // Generation Options
  const [numImages, setNumImages] = useState(1);
  
  // Model Selector State
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  
  // Input Refs for Auto-expand
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const sidebarInputRef = useRef<HTMLTextAreaElement>(null);

  // Sidebar specific state
  const [isSidebarModelMenuOpen, setIsSidebarModelMenuOpen] = useState(false);
  const sidebarModelMenuRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', text: 'Hello! I am your creative AI assistant. Describe what you want to create, or ask me to edit an existing image.' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleNumImages = () => {
      setNumImages(prev => prev === 1 ? 2 : prev === 2 ? 4 : 1);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // If in chat mode, add user message immediately
    if (isChatMode) {
        setChatMessages(prev => [
            ...prev, 
            { id: Date.now().toString(), role: 'user', text: prompt }
        ]);
        setPrompt('');
    }

    // Simulate generation
    setTimeout(() => {
        setIsGenerating(false);
        
        // Create new images based on numImages
        const newImages = Array.from({ length: numImages }).map((_, i) => ({ 
            id: Date.now() + i, 
            src: `https://picsum.photos/seed/${Date.now() + i}/800/1000`, 
            ratio: 'aspect-[4/5]' 
        }));

        // Add to main grid (Middle Window)
        setImages(prev => [...newImages, ...prev]);

        // If in chat mode, add AI response (Text only)
        if (isChatMode) {
            setChatMessages(prev => [
                ...prev, 
                { 
                    id: (Date.now() + 1).toString(), 
                    role: 'ai', 
                    text: `I've generated ${numImages} new image${numImages > 1 ? 's' : ''} based on your request using ${selectedModel.name}. You can see it in your personal feed.` 
                }
            ]);
        }
    }, 3000); // Increased duration to show off animation
  };

  // Auto-resize MAIN textarea logic
  useEffect(() => {
    if (promptInputRef.current) {
      promptInputRef.current.style.height = 'auto';
      const scrollHeight = promptInputRef.current.scrollHeight;
      promptInputRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [prompt]);

  // Auto-resize SIDEBAR textarea logic
  useEffect(() => {
    if (sidebarInputRef.current) {
      sidebarInputRef.current.style.height = 'auto';
      const scrollHeight = sidebarInputRef.current.scrollHeight;
      // Start slightly larger for sidebar (44px min)
      sidebarInputRef.current.style.height = `${Math.max(44, Math.min(scrollHeight, 150))}px`;
    }
  }, [prompt]);

  useEffect(() => {
    if (isChatMode && chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatMode]);

  // Click outside listener for model menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Main bar menu
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
      // Sidebar menu
      if (sidebarModelMenuRef.current && !sidebarModelMenuRef.current.contains(event.target as Node)) {
        setIsSidebarModelMenuOpen(false);
      }
    };

    if (isModelMenuOpen || isSidebarModelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelMenuOpen, isSidebarModelMenuOpen]);

  return (
    <div className="relative flex h-[calc(100vh-80px)] overflow-hidden bg-black font-sans">
      
      {/* 1. LEFT/CENTER: MAIN CONTENT AREA */}
      <div 
        className={`flex-1 h-full overflow-y-auto custom-scrollbar p-6 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isChatMode ? 'mr-[350px]' : 'mr-0'
        }`}
      >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-display font-bold text-white">Personal Feed</h2>
                <div className="h-6 w-px bg-white/10" />
                <button className="text-sm text-zinc-400 hover:text-white transition-colors">History</button>
                <button className="text-sm text-zinc-400 hover:text-white transition-colors">Favorites</button>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mr-2">Sort by</span>
                <select className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500">
                    <option>Newest First</option>
                    <option>Oldest First</option>
                </select>
            </div>
          </div>

          {/* Masonry Grid */}
          <div className={`columns-1 md:columns-2 ${isChatMode ? 'lg:columns-2 xl:columns-3' : 'lg:columns-3 xl:columns-4'} gap-4 space-y-4 transition-all duration-500`}>
            
            {/* GENERATING PLACEHOLDERS */}
            {isGenerating && Array.from({ length: numImages }).map((_, idx) => (
                <div 
                   key={`gen-${idx}`}
                   className="break-inside-avoid relative rounded-xl overflow-hidden bg-zinc-900/50 border border-white/10 aspect-[4/5] flex flex-col items-center justify-center p-6 shadow-2xl animate-fade-in-up"
                   style={{ animationDelay: `${idx * 100}ms` }}
                >
                     {/* Gradient Background Effect */}
                     <div className="absolute inset-0 bg-gradient-brand opacity-5 animate-pulse-slow" />
                     
                     {/* Infinity Loader */}
                     <div className="relative z-10 p-6 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(216,180,254,0.1)]">
                         <svg 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="url(#gradient-brand-gen)" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="w-12 h-12 drop-shadow-[0_0_10px_rgba(216,180,254,0.5)]"
                         >
                            <defs>
                                <linearGradient id="gradient-brand-gen" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#fbcfe8" />
                                    <stop offset="50%" stopColor="#c084fc" />
                                    <stop offset="100%" stopColor="#818cf8" />
                                </linearGradient>
                            </defs>
                            <path className="infinity-path" d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
                         </svg>
                     </div>
                     
                     <div className="relative z-10 mt-8 flex flex-col items-center gap-3">
                         <span className="text-[10px] font-bold font-display tracking-[0.2em] text-transparent bg-clip-text bg-gradient-brand animate-pulse">
                             DREAMING
                         </span>
                         <div className="flex gap-1.5">
                             <div className="w-1 h-1 rounded-full bg-pink-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                             <div className="w-1 h-1 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                             <div className="w-1 h-1 rounded-full bg-indigo-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                         </div>
                     </div>
                </div>
            ))}

            {images.map((img, idx) => (
              <div 
                key={img.id} 
                className={`group relative break-inside-avoid rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-purple-300/50 transition-all duration-300 animate-fade-in-up`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <img 
                  src={img.src} 
                  alt="Generated Content" 
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
                  <div className="flex justify-between items-start">
                      <div className="flex gap-1">
                          <button className="p-2 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-purple-600 transition-colors" title="Remix">
                              <Wand2 size={16} />
                          </button>
                      </div>
                      <button className="p-2 rounded-lg bg-black/50 backdrop-blur-md text-white hover:text-red-400 transition-colors">
                          <MoreHorizontal size={16} />
                      </button>
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                      <div className="flex gap-1">
                          <button className="p-2 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-white/20 transition-colors" title="Upscale">
                              <Maximize2 size={16} />
                          </button>
                          <button className="p-2 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-white/20 transition-colors" title="Download">
                              <Download size={16} />
                          </button>
                      </div>
                      <button className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors shadow-lg">
                          Upscale
                      </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="h-40"></div>
      </div>

      {/* 2. STANDARD FLOATING PROMPT BAR (Bottom) */}
      <div 
        className={`fixed bottom-8 left-0 right-0 z-40 px-4 lg:pl-72 lg:pr-8 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isChatMode ? 'translate-y-[200%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
         <div className="w-full max-w-[840px] relative">
             
             {/* MODEL SELECTOR POPUP (MAIN BAR) */}
             {isModelMenuOpen && (
                 <div ref={modelMenuRef} className="absolute bottom-full left-0 mb-3 w-60 md:w-64 bg-[#09090b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-fade-in-up ring-1 ring-white/5 z-50 overflow-hidden flex flex-col">
                     {/* Sticky Header */}
                     <div className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-widest bg-[#09090b] border-b border-white/5 shrink-0 z-10">
                         Select Model
                     </div>
                     
                     {/* Scrollable List */}
                     <div className="overflow-y-auto custom-scrollbar p-2 max-h-[350px]">
                         <div className="space-y-1">
                             {MODELS.map((model) => (
                                 <button 
                                    key={model.id}
                                    onClick={() => { setSelectedModel(model); setIsModelMenuOpen(false); }}
                                    className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-all ${
                                        selectedModel.id === model.id 
                                        ? 'bg-white/10 border border-white/10' 
                                        : 'hover:bg-white/5 border border-transparent'
                                    }`}
                                 >
                                     <div className="mt-0.5">
                                         <model.icon size={18} className={model.color} />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <div className="flex items-center gap-2 mb-0.5">
                                             <span className={`text-sm font-bold font-display truncate ${selectedModel.id === model.id ? 'text-white' : 'text-zinc-300'}`}>{model.name}</span>
                                             {selectedModel.id === model.id && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_5px_rgba(192,132,252,0.8)]" />}
                                         </div>
                                         <p className="text-[10px] text-zinc-500 line-clamp-1">{model.desc}</p>
                                     </div>
                                 </button>
                             ))}
                         </div>
                     </div>
                 </div>
             )}

             {/* MAIN BAR UI */}
             <div className="bg-[#09090b]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/5 flex flex-col gap-2.5">
                 
                 {/* Top Row: Input & Trigger */}
                 <div className="relative flex items-end gap-2 pl-2 pr-2">
                    
                    {/* Model Trigger - Much Smaller */}
                    <button 
                        onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group flex-shrink-0 mb-[1px]"
                    >
                        <selectedModel.icon size={16} className={selectedModel.color} />
                        <span className="text-xs font-bold text-zinc-300 group-hover:text-white max-w-[60px] truncate">{selectedModel.name}</span>
                        <ChevronUp size={12} className={`text-zinc-500 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div className="h-6 w-px bg-white/5 mx-1 mb-2" />

                    {/* Text Input - Auto Expanding Textarea */}
                    <textarea
                        ref={promptInputRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Imagine something extraordinary..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none min-h-[40px] px-2 py-2.5 text-sm font-medium resize-none custom-scrollbar leading-relaxed"
                        style={{ maxHeight: '120px' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleGenerate();
                            }
                        }}
                    />
                    
                    {/* Generate Button - Smaller Width */}
                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`h-10 px-5 rounded-full font-bold font-display uppercase tracking-wide text-[11px] transition-all duration-300 flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 mb-[1px] ${
                            isGenerating 
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                            : 'bg-gradient-brand hover:bg-gradient-brand-hover text-black shadow-purple-900/40 hover:shadow-purple-900/60'
                        }`}
                    >
                        {isGenerating ? 'Creating...' : 'Generate'}
                        {!isGenerating && <Zap size={14} className="fill-black" />}
                    </button>
                 </div>

                 {/* Bottom Row: Settings & Extras */}
                 <div className="flex items-center gap-2.5 px-3 pb-0.5 overflow-x-auto hide-scrollbar">
                    {/* KIARAX BUTTON - Smaller */}
                    <button 
                        onClick={() => setIsChatMode(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-purple-500/30 text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-purple-500/10 hover:border-purple-500 transition-all shadow-[0_0_15px_rgba(139,92,246,0.05)] group"
                    >
                        <Sparkles size={12} className="text-purple-400 group-hover:text-purple-300 animate-pulse-slow" />
                        <span className="bg-clip-text text-transparent bg-gradient-brand group-hover:text-white group-hover:bg-none">KiaraX</span>
                    </button>
                    
                    <div className="w-px h-3 bg-white/10 mx-1" />

                    <button 
                        onClick={toggleNumImages}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 text-[10px] font-bold text-zinc-400 hover:text-white transition-all whitespace-nowrap"
                    >
                        <Copy size={12} />
                        {numImages} Image{numImages > 1 ? 's' : ''}
                    </button>

                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 text-[10px] font-bold text-zinc-400 hover:text-white transition-all whitespace-nowrap">
                        <Monitor size={12} />
                        16:9
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 text-[10px] font-bold text-zinc-400 hover:text-white transition-all whitespace-nowrap">
                        <Palette size={12} />
                        Style: Cinematic
                    </button>
                 </div>
             </div>
         </div>
      </div>

      {/* 3. AI CHAT SIDEBAR (Right) - REDESIGNED */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-[350px] bg-black/60 backdrop-blur-3xl border-l border-white/5 z-50 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col transform transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] ${
            isChatMode ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-900/20 blur-[100px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-purple-900/10 blur-[100px] pointer-events-none rounded-full" />

          {/* Sidebar Header - Minimal & Premium */}
          <div className="h-20 flex items-end justify-between px-6 pb-5 border-b border-white/5 bg-gradient-to-b from-black/50 to-transparent relative z-10">
              <div className="flex items-center gap-3">
                  <Infinity size={24} className="text-purple-300 drop-shadow-[0_0_10px_rgba(216,180,254,0.5)]" />
                  <h3 className="font-display font-bold text-white text-xl tracking-tight">Kiara X</h3>
              </div>
              <button 
                onClick={() => setIsChatMode(false)}
                className="p-1.5 -mr-2 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                  <X size={20} />
              </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-48 relative z-0">
              {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                      
                      {/* AI Label - Text Above */}
                      {msg.role === 'ai' && (
                          <div className="flex items-center gap-2 mb-1.5 ml-1">
                              <span className="text-[9px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-indigo-300 uppercase tracking-widest">
                                  Kiara X
                              </span>
                          </div>
                      )}

                      {/* Message Content */}
                      <div className={`relative ${
                          msg.role === 'user' 
                          ? 'bg-white/5 border border-white/10 rounded-2xl rounded-tr-sm px-4 py-2.5 text-zinc-100 shadow-xl backdrop-blur-md max-w-[90%] text-sm'
                          : 'text-zinc-300 leading-relaxed font-light text-[13px] max-w-full pl-1'
                      }`}>
                          {msg.text}
                      </div>
                  </div>
              ))}
              <div ref={chatEndRef} />
          </div>

          {/* Chat Input Area - Floating Glass Dock with Settings */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-20">
              
              {/* Sidebar Model Menu (Popup) */}
              {isSidebarModelMenuOpen && (
                 <div ref={sidebarModelMenuRef} className="absolute bottom-full left-6 right-6 mb-2 bg-[#09090b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-fade-in-up ring-1 ring-white/5 overflow-hidden flex flex-col z-50 max-h-[300px]">
                     <div className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-widest bg-[#09090b] border-b border-white/5 shrink-0 sticky top-0">
                         Select Model
                     </div>
                     <div className="overflow-y-auto custom-scrollbar p-2">
                         <div className="space-y-1">
                             {MODELS.map((model) => (
                                 <button 
                                    key={model.id}
                                    onClick={() => { setSelectedModel(model); setIsSidebarModelMenuOpen(false); }}
                                    className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-all ${
                                        selectedModel.id === model.id 
                                        ? 'bg-white/10 border border-white/10' 
                                        : 'hover:bg-white/5 border border-transparent'
                                    }`}
                                 >
                                     <div className="mt-0.5">
                                         <model.icon size={18} className={model.color} />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <div className="flex items-center gap-2 mb-0.5">
                                             <span className={`text-sm font-bold font-display truncate ${selectedModel.id === model.id ? 'text-white' : 'text-zinc-300'}`}>{model.name}</span>
                                             {selectedModel.id === model.id && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(139,92,246,0.8)]" />}
                                         </div>
                                     </div>
                                 </button>
                             ))}
                         </div>
                     </div>
                 </div>
              )}

              {/* Main Sidebar Input Container */}
              <div className="relative bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl ring-1 ring-white/5 flex flex-col gap-0 transition-all group focus-within:border-white/20 focus-within:shadow-[0_0_30px_rgba(216,180,254,0.1)]">
                  
                  {/* Toolbar Row */}
                  <div className="flex items-center gap-1 p-1.5 border-b border-white/5">
                      {/* Model Trigger - Flexible width but truncate */}
                      <button 
                          onClick={() => setIsSidebarModelMenuOpen(!isSidebarModelMenuOpen)}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all max-w-[110px]"
                      >
                          <selectedModel.icon size={12} className={`flex-shrink-0 ${selectedModel.color}`} />
                          <span className="text-[10px] font-bold text-zinc-300 truncate">{selectedModel.name}</span>
                          <ChevronUp size={10} className={`text-zinc-500 flex-shrink-0 transition-transform ${isSidebarModelMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <div className="w-px h-3 bg-white/10 mx-0.5 flex-shrink-0" />

                      <div className="flex items-center gap-0.5 overflow-x-auto hide-scrollbar flex-1">
                          <button 
                            onClick={toggleNumImages}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 text-[10px] font-bold text-zinc-400 hover:text-white transition-all whitespace-nowrap flex-shrink-0"
                          >
                               <Copy size={12} />
                               <span>x{numImages}</span>
                          </button>

                          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 text-[10px] font-bold text-zinc-400 hover:text-white transition-all whitespace-nowrap flex-shrink-0">
                               <Monitor size={12} />
                               <span>16:9</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 text-[10px] font-bold text-zinc-400 hover:text-white transition-all whitespace-nowrap flex-shrink-0">
                               <Palette size={12} />
                               <span>Style</span>
                          </button>
                      </div>
                  </div>

                  {/* Text Input Area */}
                  <textarea
                      ref={sidebarInputRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ask Kiara to create something..."
                      rows={1}
                      className="w-full bg-transparent text-white placeholder-zinc-500 resize-none outline-none min-h-[44px] px-3 py-2.5 text-[13px] font-light custom-scrollbar leading-relaxed"
                      style={{ maxHeight: '150px' }}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleGenerate();
                          }
                      }}
                  />

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between px-2 pb-2">
                      <div className="flex items-center gap-1">
                           <button className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-white/5 transition-colors"><ImageIcon size={18} /></button>
                           <button className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-white/5 transition-colors"><Wand2 size={18} /></button>
                      </div>
                      <button 
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                        className={`p-2 rounded-xl transition-all duration-300 ${
                            prompt.trim() && !isGenerating
                            ? 'bg-white text-black hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                            : 'bg-white/5 text-zinc-600'
                        }`}
                      >
                          <Send size={18} className={prompt.trim() && !isGenerating ? 'fill-black' : ''} />
                      </button>
                  </div>
              </div>
              <p className="text-[10px] text-zinc-700 text-center mt-4 font-mono uppercase tracking-widest opacity-50">
                  Kiara X Model V2.5
              </p>
          </div>
      </div>

    </div>
  );
};