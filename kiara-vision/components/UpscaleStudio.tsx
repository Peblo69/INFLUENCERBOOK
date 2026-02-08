import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, ZoomIn, ZoomOut, Download, AlertCircle, 
  ChevronDown, Check, Zap, RotateCcw, Image as ImageIcon,
  Maximize, MoreHorizontal, Sliders, Move, Layers, Sparkles,
  ArrowRight, Activity, X, FileUp
} from 'lucide-react';

export const UpscaleStudio: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  // In a real app, processedImage would be the result from the API
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [comparePos, setComparePos] = useState(50); // 0 to 100%
  const [zoom, setZoom] = useState(1);
  const [scaleFactor, setScaleFactor] = useState(2);
  const [selectedModel, setSelectedModel] = useState('kiara-detail');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // --- handlers ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setProcessedImage(url); // Initially set both to the uploaded image
      setComparePos(50);
      setZoom(1);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    setIsDraggingSlider(true);
  };

  // Global Drag Handling
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingSlider || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      
      setComparePos(percentage);
    };

    const handleGlobalMouseUp = () => {
      setIsDraggingSlider(false);
    };

    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingSlider]);

  const handleUpscale = () => {
    if (!image) return;
    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
        setIsProcessing(false);
        // For demo purposes, we keep the image same but maybe apply a filter if we could
        // In real app: setProcessedImage(response.url)
    }, 2500);
  };

  const handleReset = () => {
      setImage(null);
      setProcessedImage(null);
      setZoom(1);
      setComparePos(50);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-black font-sans relative select-none">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*" 
      />
      
      {/* 1. LEFT: MAIN WORKSPACE (Comparison View) */}
      <div 
        className="flex-1 relative overflow-hidden bg-[#050505] flex items-center justify-center p-8 group"
      > 
         {/* Dot Pattern Background */}
         <div className="absolute inset-0 opacity-20 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
         />

         {image && processedImage ? (
             /* Image Container with Zoom */
             <div 
                ref={containerRef}
                className="relative shadow-2xl rounded-lg overflow-hidden border border-white/5 bg-black/50 ring-1 ring-white/10"
                style={{ 
                    // fit-content ensures the container hugs the image exactly, so slider 0-100% matches image width
                    width: 'fit-content',
                    height: 'fit-content',
                    maxWidth: '95%',
                    maxHeight: '90%',
                    transform: `scale(${zoom})`,
                    transition: isDraggingSlider ? 'none' : 'transform 0.2s ease-out',
                    cursor: isDraggingSlider ? 'ew-resize' : 'default'
                }}
             >
                 {/* 1. UNDERLAY: PROCESSED IMAGE (The "After" State) */}
                 {/* Display block to remove line-height gap */}
                 <img 
                    src={processedImage} 
                    alt="Upscaled" 
                    className="block max-w-full max-h-[80vh] object-contain select-none pointer-events-none"
                    draggable={false}
                 />

                 {/* 2. OVERLAY: ORIGINAL IMAGE (The "Before" State) */}
                 {/* We use clip-path instead of width masking to keep the image static and prevent lag */}
                 <div 
                    className="absolute inset-0"
                    style={{ 
                        clipPath: `inset(0 ${100 - comparePos}% 0 0)` 
                    }}
                 >
                     <img 
                        src={image} 
                        alt="Original" 
                        className="block w-full h-full object-contain select-none pointer-events-none filter grayscale-[10%] brightness-90" 
                        draggable={false}
                     />
                     
                     {/* Label: Original - Positioned absolutely within the clipped area */}
                     <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-zinc-300 rounded shadow-lg z-10 whitespace-nowrap">
                         Original
                     </div>
                 </div>
                 
                 {/* Label: Upscaled (Outside clipped area, always visible if not covered) */}
                 <div className="absolute bottom-4 right-4 px-2 py-1 bg-purple-600/90 backdrop-blur-md text-[10px] font-bold text-white rounded shadow-lg z-10 border border-white/10 whitespace-nowrap">
                     Upscaled x{scaleFactor}
                 </div>

                 {/* SLIDER HANDLE LINE */}
                 <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white/50 cursor-ew-resize z-20 hover:bg-white transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                    style={{ left: `${comparePos}%` }}
                    onMouseDown={handleMouseDown}
                 >
                     {/* Circle Handle */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Move size={14} className="text-white drop-shadow-md" />
                     </div>
                 </div>
             </div>
         ) : (
             /* EMPTY STATE: UPLOAD */
             <div className="flex flex-col items-center justify-center animate-fade-in-up">
                 <button 
                    onClick={handleUploadClick}
                    className="group relative w-64 h-64 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-purple-500/50 transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer"
                 >
                     <div className="w-16 h-16 rounded-full bg-zinc-800/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-purple-500/30">
                         <FileUp size={24} className="text-zinc-400 group-hover:text-purple-400 transition-colors" />
                     </div>
                     <div className="text-center">
                         <h3 className="text-sm font-bold text-white mb-1">Upload Image</h3>
                         <p className="text-xs text-zinc-500">JPG, PNG up to 10MB</p>
                     </div>
                 </button>
             </div>
         )}

         {/* Floating Toolbar (Left) */}
         {image && (
             <div className="absolute left-6 top-1/2 -translate-x-0 -translate-y-1/2 flex flex-col gap-2 bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-xl shadow-2xl z-20">
                <button onClick={handleUploadClick} className="p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors" title="Change Image">
                    <Upload size={18} />
                </button>
                <div className="h-px w-full bg-white/10 my-1" />
                <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    <ZoomIn size={18} />
                </button>
                <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    <ZoomOut size={18} />
                </button>
                <button onClick={() => setZoom(1)} className="p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    <Maximize size={18} />
                </button>
             </div>
         )}
      </div>

      {/* 2. RIGHT: SETTINGS SIDEBAR */}
      <div className="w-80 bg-[#09090b] border-l border-white/5 flex flex-col z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/20">
              <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-brand flex items-center justify-center">
                     <Sparkles size={12} className="text-black fill-black" />
                  </div>
                  <span className="font-display font-bold text-base text-white">Upscale</span>
              </div>
              <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md"
              >
                  <RotateCcw size={10} /> RESET
              </button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              
              {/* Model Selector Card */}
              <div className="space-y-3">
                  <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Active Model</label>
                      <span className="text-[10px] text-purple-400 font-medium">V2.4 Updated</span>
                  </div>
                  
                  <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-3 cursor-pointer hover:border-purple-500/50 transition-all group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex items-start gap-3 relative z-10">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-white/5 group-hover:border-purple-500/30">
                              <Layers size={20} className="text-zinc-400 group-hover:text-purple-400 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-0.5">
                                  <span className="text-sm font-bold text-white group-hover:text-purple-100 transition-colors">Kiara Detailer</span>
                                  <ChevronDown size={14} className="text-zinc-500 group-hover:text-purple-400" />
                              </div>
                              <p className="text-[10px] text-zinc-500 leading-tight">Pro-grade diffusion for photorealistic restoration.</p>
                          </div>
                      </div>
                  </div>
                  
                  {/* Custom Notification (Replaced Yellow Alert) */}
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <Activity size={12} className="text-purple-400" />
                      <span className="text-[10px] font-medium text-purple-300">High demand: ~2s processing time</span>
                  </div>
              </div>

              {/* Scale Factor */}
              <div className="space-y-3">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Scale Factor</label>
                  <div className="grid grid-cols-4 gap-2">
                      {[2, 4, 8, 16].map((scale) => (
                          <button
                            key={scale}
                            onClick={() => setScaleFactor(scale)}
                            className={`h-9 rounded-lg text-xs font-bold font-display transition-all border flex items-center justify-center gap-0.5 ${
                                scaleFactor === scale 
                                ? 'bg-gradient-brand text-black border-transparent shadow-[0_0_15px_rgba(232,121,249,0.3)]' 
                                : 'bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/20 hover:text-white hover:bg-zinc-800'
                            }`}
                          >
                              <span className="text-[10px] opacity-70">x</span>{scale}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Advanced Settings */}
              <div className="pt-2">
                   <button className="w-full flex items-center justify-between text-[11px] font-bold text-zinc-400 hover:text-white py-2 border-b border-white/5 pb-4 transition-colors group">
                       ADVANCED CONFIGURATION
                       <ChevronDown size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
                   </button>
                   
                   <div className="pt-5 space-y-6">
                        {/* Denoise Slider */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-400 font-medium">Denoise Strength</span>
                                <span className="text-white font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded">0.5</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full w-1/2 bg-gradient-to-r from-pink-300 to-indigo-300 rounded-full"></div>
                            </div>
                        </div>

                        {/* Texture Enhance Toggle */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-400 font-medium">Texture Enhance</span>
                                <span className="text-white font-mono text-[10px]">Medium</span>
                            </div>
                             <div className="flex gap-1">
                                 <div className="h-1.5 flex-1 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(192,132,252,0.5)]"></div>
                                 <div className="h-1.5 flex-1 bg-zinc-800 rounded-full hover:bg-zinc-700 cursor-pointer transition-colors"></div>
                                 <div className="h-1.5 flex-1 bg-zinc-800 rounded-full hover:bg-zinc-700 cursor-pointer transition-colors"></div>
                             </div>
                        </div>

                        {/* HDR Toggle */}
                         <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400 font-medium">HDR Output</span>
                            <div className="w-8 h-4 bg-zinc-800 rounded-full relative cursor-pointer border border-white/5">
                                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-zinc-500 rounded-full transition-all"></div>
                            </div>
                        </div>
                   </div>
              </div>
          </div>

          {/* Footer Action */}
          <div className="p-6 border-t border-white/5 bg-[#09090b] relative">
              {/* Glow Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
              
              <div className="flex justify-between text-[10px] text-zinc-500 mb-4 font-mono uppercase tracking-wider">
                  <span>Output Res</span>
                  <span className="text-white font-bold">{(image ? 1200 : 0) * scaleFactor} x {(image ? 1200 : 0) * scaleFactor}</span>
              </div>
              
              <button 
                  onClick={handleUpscale}
                  disabled={isProcessing || !image}
                  className={`w-full h-12 rounded-xl font-display font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg border ${
                      isProcessing || !image
                      ? 'bg-zinc-900 text-zinc-600 border-white/5 cursor-not-allowed'
                      : 'bg-gradient-brand hover:bg-gradient-brand-hover text-black border-transparent shadow-[0_0_20px_rgba(232,121,249,0.3)] hover:shadow-[0_0_30px_rgba(232,121,249,0.5)] hover:scale-[1.01]'
                  }`}
              >
                  {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
                        </div>
                        <span>Enhancing...</span>
                    </div>
                  ) : (
                      <>
                        Upscale Image <Zap size={16} className="fill-black" />
                      </>
                  )}
              </button>
          </div>
      </div>
    </div>
  );
};