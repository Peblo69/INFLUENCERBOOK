import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Film, Type, Wand2, Settings, Play, Download, 
  Share2, Layers, Image as ImageIcon, Video, ChevronDown, 
  Plus, Sparkles, Clock, MonitorPlay, Zap, X, Move,
  Maximize, Minimize, MoreHorizontal, Sliders, Pause, Volume2, Volume1, VolumeX, Infinity, FileVideo, CheckCircle2
} from 'lucide-react';

export const VideoCreator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('image');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState('16:9');
  const [durationStr, setDurationStr] = useState('5s'); 

  // --- File Upload State ---
  const [dragActive, setDragActive] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Unified Player State ---
  const [videoSrc, setVideoSrc] = useState<string>("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Drag Scroll State for history
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 5000); // Longer duration to show animation
  };

  // --- Drag & Drop Handlers ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Basic validation
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        return; // handle error UI if needed
    }
    const url = URL.createObjectURL(file);
    setUploadedMedia(url);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
  };

  // Drag Scroll Handlers (History Strip)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDown.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDown.current = false;
  };

  const handleMouseUp = () => {
    isDown.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  // --- Player Logic ---

  const togglePlay = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (videoRef.current) {
          if (videoRef.current.paused) {
              videoRef.current.play();
          } else {
              videoRef.current.pause();
          }
      }
  };

  const toggleFullScreen = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setIsFullScreen(!isFullScreen);
  };

  const toggleMute = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (videoRef.current) {
          const nextMuted = !isMuted;
          videoRef.current.muted = nextMuted;
          setIsMuted(nextMuted);
          
          if (!nextMuted && volume === 0) {
              setVolume(0.5);
              videoRef.current.volume = 0.5;
          }
      }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVol = parseFloat(e.target.value);
      setVolume(newVol);
      if (videoRef.current) {
          videoRef.current.volume = newVol;
          setIsMuted(newVol === 0);
      }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
      if (videoRef.current) {
          const current = videoRef.current.currentTime;
          const total = videoRef.current.duration;
          setCurrentTime(current);
          setVideoDuration(total);
          if (total > 0) setProgress((current / total) * 100);
      }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!videoRef.current) return;
      
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      
      const newTime = percentage * videoRef.current.duration;
      if (!isNaN(newTime)) {
          videoRef.current.currentTime = newTime;
          setProgress(percentage * 100);
      }
  };

  // Helper to render volume icon
  const VolumeIcon = () => {
      if (isMuted || volume === 0) return <VolumeX size={20} />;
      if (volume < 0.5) return <Volume1 size={20} />;
      return <Volume2 size={20} />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black font-sans relative">
      
      {/* 1. LEFT PANEL: COMPACT STUDIO SIDEBAR */}
      <div className="w-[400px] flex flex-col border-r border-white/5 bg-black/60 backdrop-blur-xl z-10 transition-all duration-300">
        
        {/* Header & Tabs */}
        <div className="p-5 border-b border-white/5 space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                  <Film size={20} className="text-zinc-400" />
                  <span className="font-display font-bold text-base tracking-wide">Video Gen</span>
              </div>
              <button className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                 Model 2.5 <ChevronDown size={12} />
              </button>
           </div>

           {/* Sleek Segmented Control - Smaller & Smoother */}
           <div className="flex p-0.5 bg-zinc-900/50 rounded-lg border border-white/5 relative">
              <button 
                onClick={() => setActiveTab('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ${
                  activeTab === 'text' 
                    ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Text
              </button>
              <button 
                 onClick={() => setActiveTab('image')}
                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ${
                  activeTab === 'image' 
                    ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Image / Video
              </button>
           </div>
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
           
           {/* Upload Zone (Drag & Drop) */}
           {activeTab === 'image' && (
             <div className="space-y-3 animate-fade-in-up">
               <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Reference Media</label>
                  {uploadedMedia && <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle2 size={10} /> Ready</span>}
               </div>
               
               <div 
                  className={`relative group w-full aspect-[16/9] rounded-xl border border-dashed transition-all duration-300 overflow-hidden flex flex-col items-center justify-center cursor-pointer ${
                      dragActive 
                      ? 'border-violet-500 bg-violet-500/10' 
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
               >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />

                  {uploadedMedia ? (
                      mediaType === 'video' ? (
                          <video src={uploadedMedia} className="w-full h-full object-cover" autoPlay muted loop />
                      ) : (
                          <img src={uploadedMedia} alt="Reference" className="w-full h-full object-cover" />
                      )
                  ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${dragActive ? 'bg-violet-500 border-violet-400' : 'bg-black/50 border-white/10'}`}>
                            {dragActive ? <Upload size={18} className="text-white animate-bounce" /> : <Upload size={18} className="text-zinc-400" />}
                        </div>
                        <span className={`text-xs font-medium transition-colors ${dragActive ? 'text-violet-300' : 'text-zinc-500'}`}>
                            {dragActive ? 'Drop to Upload' : 'Drop Image or Video'}
                        </span>
                      </div>
                  )}

                  {/* Clear Button (if media exists) */}
                  {uploadedMedia && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setUploadedMedia(null); }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-500/80 text-white transition-colors border border-white/10"
                      >
                          <X size={12} />
                      </button>
                  )}
               </div>
             </div>
           )}

           {/* Prompt Input */}
           <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                 <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Prompt</label>
                 <button className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5">
                    <Sparkles size={12} /> Enhance
                 </button>
              </div>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeTab === 'image' ? "Describe the motion and camera movement..." : "A cinematic shot of a futuristic city..."}
                className="w-full h-32 bg-transparent border-none p-0 text-[14px] text-white placeholder-zinc-600 focus:ring-0 outline-none resize-none leading-relaxed font-light"
              />
              <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent" />
           </div>

           {/* Settings Grid */}
           <div className="grid grid-cols-2 gap-4 pt-2">
               {/* Duration */}
               <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-600 uppercase tracking-widest px-1">Duration</label>
                   <button className="w-full flex items-center justify-between px-4 py-3.5 bg-white/5 border border-white/5 rounded-xl text-sm text-zinc-300 hover:bg-white/10 hover:border-white/10 transition-all group shadow-sm">
                       <span>{durationStr}</span>
                       <Clock size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                   </button>
               </div>

               {/* Ratio */}
               <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-600 uppercase tracking-widest px-1">Ratio</label>
                   <button className="w-full flex items-center justify-between px-4 py-3.5 bg-white/5 border border-white/5 rounded-xl text-sm text-zinc-300 hover:bg-white/10 hover:border-white/10 transition-all group shadow-sm">
                       <span>{selectedRatio}</span>
                       <MonitorPlay size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                   </button>
               </div>
           </div>

           {/* Advanced Toggle */}
           <div className="pt-2">
               <button className="w-full flex items-center justify-between px-4 py-4 bg-transparent border border-white/5 rounded-xl text-sm text-zinc-400 hover:text-white hover:border-white/10 transition-all group hover:bg-white/5">
                  <div className="flex items-center gap-3">
                      <Sliders size={16} />
                      <span className="font-medium">Camera Control</span>
                  </div>
                  <ChevronDown size={14} className="text-zinc-600 group-hover:text-zinc-400" />
               </button>
           </div>
        </div>

        {/* Footer Actions - Improved Button with Holographic Gradient */}
        <div className="p-6 border-t border-white/5 bg-black/40">
           <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full h-11 rounded-lg font-display font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all duration-300 group ${
                  isGenerating 
                  ? 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-white/5' 
                  : 'bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200 text-black shadow-[0_0_20px_rgba(232,121,249,0.3)] hover:shadow-[0_0_30px_rgba(232,121,249,0.5)] hover:scale-[1.01]'
              }`}
           >
              {isGenerating ? (
                  <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" />
                      </div>
                      <span>Processing...</span>
                  </div>
              ) : (
                  <>
                    <Zap size={14} className="fill-black text-black" />
                    <span>Generate Video</span>
                  </>
              )}
           </button>
           <div className="text-center mt-3">
               <span className="text-[10px] text-zinc-600 font-mono">Cost: 25 Credits</span>
           </div>
        </div>
      </div>


      {/* 2. CENTER PANEL: IMMERSIVE STAGE */}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
         
         {/* Minimal Toolbar - Cleaned Up */}
         <div className="h-14 border-b border-white/5 flex items-center justify-end px-6 bg-black/40 backdrop-blur-sm z-20">
            {/* Removed Studio/History/Collections buttons as requested */}
            <div className="flex items-center gap-3">
                <button className="p-2 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"><Layers size={16} /></button>
                <div className="h-3 w-px bg-white/10"></div>
                <button className="p-2 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
            </div>
         </div>

         {/* Stage Content */}
         <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
            
            {/* Main Preview Area (Inline & Fullscreen Unified) */}
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div 
                    className={`${
                        isFullScreen 
                        ? "fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in-up" 
                        : "w-full max-w-5xl aspect-video bg-[#050505] rounded-xl border border-white/5 relative overflow-hidden group shadow-2xl ring-1 ring-white/5"
                    }`}
                    onClick={(e) => {
                        // If fullscreen, clicking bg shouldn't necessarily do anything
                    }}
                >
                    {/* Video Element */}
                    <video 
                        ref={videoRef}
                        src={videoSrc}
                        className={`object-contain ${isFullScreen ? 'w-full h-full max-h-screen' : 'w-full h-full'}`}
                        loop
                        playsInline
                        onClick={togglePlay}
                        onTimeUpdate={handleTimeUpdate}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                    />

                    {/* Placeholder / Poster (Only if not playing and at start) */}
                    {!isPlaying && currentTime === 0 && !isGenerating && (
                         <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cyberpunk_rain/1280/720')] bg-cover bg-center pointer-events-none z-0">
                             <div className="absolute inset-0 bg-black/40" />
                         </div>
                    )}

                    {/* Loading State - Replaced Spinner with Brand Animation */}
                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/95 z-20 flex flex-col items-center justify-center gap-6 backdrop-blur-md">
                             <div className="relative">
                                {/* Ambient Glow */}
                                <div className="absolute inset-0 bg-gradient-brand blur-2xl opacity-20 animate-pulse-slow rounded-full" />
                                <svg 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="url(#gradient-brand-video)" 
                                    strokeWidth="1.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="w-20 h-20 drop-shadow-[0_0_20px_rgba(216,180,254,0.4)] relative z-10"
                                >
                                    <defs>
                                        <linearGradient id="gradient-brand-video" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#fbcfe8" />
                                            <stop offset="50%" stopColor="#c084fc" />
                                            <stop offset="100%" stopColor="#818cf8" />
                                        </linearGradient>
                                    </defs>
                                    <path className="infinity-path" d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
                                </svg>
                             </div>
                             
                             <div className="flex flex-col items-center gap-2">
                                 <span className="text-transparent bg-clip-text bg-gradient-brand font-display font-bold tracking-[0.2em] text-sm animate-pulse">
                                     RENDERING SCENE
                                 </span>
                                 <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-pink-300 rounded-full animate-bounce [animation-delay:0ms]"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce [animation-delay:150ms]"></span>
                                    <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:300ms]"></span>
                                 </div>
                             </div>
                        </div>
                    )}
                    
                    {/* Big Play Button (Visible when paused) */}
                    {!isPlaying && !isGenerating && (
                        <button 
                            onClick={togglePlay}
                            className="absolute inset-0 z-10 flex items-center justify-center group/btn"
                        >
                            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all duration-300 group-hover/btn:scale-110 group-hover/btn:bg-white/20 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                                <Play size={32} className="ml-1 fill-white opacity-90" />
                            </div>
                        </button>
                    )}

                    {/* Fullscreen Header (Only visible in fullscreen) */}
                    {isFullScreen && (
                        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             <div className="flex items-center gap-3 pointer-events-auto">
                                <h3 className="font-display font-bold text-white text-lg drop-shadow-md">Preview</h3>
                             </div>
                             <button 
                                onClick={toggleFullScreen}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-md pointer-events-auto"
                             >
                                <X size={20} />
                             </button>
                        </div>
                    )}

                    {/* Controls Bar */}
                    <div 
                        className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-40 transition-opacity duration-300 ${
                            isPlaying && !isFullScreen ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                         <div className="flex items-center gap-4">
                            {/* Play/Pause */}
                            <button onClick={togglePlay} className="text-white hover:text-violet-400 transition-colors">
                                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                            </button>

                            {/* Time */}
                            <span className="text-xs font-mono text-zinc-300 min-w-[80px]">
                                {formatTime(currentTime)} / {formatTime(videoDuration)}
                            </span>

                            {/* Scrubber */}
                            <div 
                                className="flex-1 h-8 flex items-center cursor-pointer group/scrubber"
                                onClick={handleSeek}
                            >
                                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative">
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 bg-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]" 
                                        style={{ width: `${progress}%` }} 
                                    />
                                </div>
                            </div>

                            {/* Volume Control */}
                            <div className="flex items-center gap-2 group/vol">
                                <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                                    <VolumeIcon />
                                </button>
                                <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-[width] duration-300 flex items-center">
                                    <input 
                                        type="range" 
                                        min="0" max="1" step="0.05"
                                        value={volume}
                                        onChange={handleVolumeChange}
                                        className="w-20 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                    />
                                </div>
                            </div>

                            <div className="w-px h-4 bg-white/10" />

                            {/* Actions */}
                            <div className="flex items-center gap-3 text-zinc-400">
                                <button className="hover:text-white transition-colors" title="Download">
                                    <Download size={18} />
                                </button>
                                <button 
                                    onClick={toggleFullScreen} 
                                    className="hover:text-white transition-colors" 
                                    title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                                >
                                    {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                </button>
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Recent Strip */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Session History</h3>
                    <button className="text-xs text-zinc-600 hover:text-zinc-400 font-medium">View All</button>
                </div>
                {/* Scrollable Container with Drag Logic */}
                <div 
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {[1,2,3,4,5,6,7,8].map((i) => (
                        <div 
                            key={i} 
                            onClick={() => {
                                setVideoSrc(`https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`); // Demo: Switch video
                                setIsPlaying(true);
                                setTimeout(() => videoRef.current?.play(), 100);
                            }}
                            className="flex-shrink-0 w-56 aspect-video bg-zinc-900/50 rounded-lg border border-white/5 relative group cursor-pointer overflow-hidden hover:border-white/20 transition-all shadow-lg"
                        >
                             <img src={`https://picsum.photos/seed/vid_thumb_${i}/400/225`} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity grayscale group-hover:grayscale-0" />
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                 <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center shadow-lg">
                                     <Play size={16} className="ml-0.5 fill-white text-white" />
                                 </div>
                             </div>
                             <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] font-mono text-zinc-300 border border-white/5">05s</div>
                        </div>
                    ))}
                </div>
            </div>
         </div>
      </div>
      
    </div>
  );
};