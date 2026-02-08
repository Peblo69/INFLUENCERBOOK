
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Timeline } from './components/Timeline';
import { VideoPreview } from './components/VideoPreview';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Clip, Track, EditorState, MediaType, MediaAsset } from './types';
import { 
  Plus, Video, Type as TypeIcon, Music, 
  Sticker, Wand2, Split, Captions, Aperture, SlidersHorizontal, Bot,
  FolderOpen, User, Download, Music4, Star, Zap, Sparkles
} from 'lucide-react';
import "./style.css"; 

const INITIAL_TRACKS: Track[] = [
  { id: 't1', type: MediaType.TEXT, name: 'Text', isMuted: false, isLocked: false },
  { id: 't2', type: MediaType.VIDEO, name: 'Main Video', isMuted: false, isLocked: false },
  { id: 't3', type: MediaType.AUDIO, name: 'Audio', isMuted: false, isLocked: false },
];

const NAV_ITEMS = [
  { id: 'media', label: 'Media', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: TypeIcon },
  { id: 'stickers', label: 'Stickers', icon: Sticker },
  { id: 'effects', label: 'Effects', icon: Wand2 },
  { id: 'transitions', label: 'Transitions', icon: Split },
  { id: 'captions', label: 'Captions', icon: Captions },
  { id: 'filters', label: 'Filters', icon: Aperture },
  { id: 'adjustment', label: 'Adjustment', icon: SlidersHorizontal },
  { id: 'avatar', label: 'AI avatar', icon: Bot },
];

// --- MOCK DATA LIBRARIES ---
const AUDIO_LIBRARY = [
    { name: "Cosmic Drift", duration: 15, color: "bg-zinc-800" },
    { name: "Nebula Pulse", duration: 2, color: "bg-zinc-700" },
    { name: "Void Silence", duration: 30, color: "bg-zinc-800" },
    { name: "Star Dust", duration: 10, color: "bg-zinc-900" },
];

const TEXT_PRESETS = [
    { name: "Clean", fontSize: 120, color: "#ffffff", fontFamily: 'Arial' },
    { name: "Bold", fontSize: 140, color: "#d4d4d8", fontFamily: 'Impact' },
    { name: "Neon", fontSize: 130, color: "#e4e4e7", fontFamily: 'Verdana' },
    { name: "Warning", fontSize: 150, color: "#a1a1aa", fontFamily: 'Arial' },
    { name: "Subtle", fontSize: 80, color: "#52525b", fontFamily: 'Courier New' },
];

const STICKER_LIBRARY = [
    { icon: "🔥", name: "Fire" }, { icon: "😂", name: "Laugh" }, { icon: "❤️", name: "Love" },
    { icon: "👍", name: "Like" }, { icon: "🎉", name: "Party" }, { icon: "👀", name: "Eyes" },
    { icon: "⭐", name: "Star" }, { icon: "💡", name: "Idea" }, { icon: "🔴", name: "Record" },
];

const FILTER_PRESETS = [
    { name: "None", b: 1, c: 1, s: 1, h: 0 },
    { name: "Vivid", b: 1.1, c: 1.2, s: 1.3, h: 0 },
    { name: "Noir", b: 1, c: 1.2, s: 0, h: 0 },
    { name: "Vintage", b: 0.9, c: 0.9, s: 0.8, h: 30 },
    { name: "Cool", b: 1, c: 1, s: 1, h: 180 },
    { name: "Warm", b: 1.1, c: 1, s: 1.2, h: -20 },
];

export const NeonEditor: React.FC = () => {
  const [activeNav, setActiveNav] = useState('media');
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  
  // Undo/Redo Stacks
  const [history, setHistory] = useState<Clip[][]>([]);
  const [future, setFuture] = useState<Clip[][]>([]);

  const [editorState, setEditorState] = useState<EditorState>({
    currentTime: 0,
    duration: 30,
    isPlaying: false,
    zoomLevel: 50,
    selectedClipId: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Loop Logic
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // --- HISTORY MANAGEMENT ---
  const pushToHistory = useCallback((newClips: Clip[]) => {
     setHistory(prev => [...prev.slice(-20), clips]); // Keep last 20 states
     setFuture([]);
     setClips(newClips);
  }, [clips]);

  const handleUndo = () => {
      if (history.length === 0) return;
      const previous = history[history.length - 1];
      setFuture(prev => [clips, ...prev]);
      setClips(previous);
      setHistory(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
      if (future.length === 0) return;
      const next = future[0];
      setHistory(prev => [...prev, clips]);
      setClips(next);
      setFuture(prev => prev.slice(1));
  };

  // --- PLAYBACK ---
  useEffect(() => {
    if (editorState.isPlaying) {
      lastTimeRef.current = performance.now();
      const loop = (time: number) => {
        const delta = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;
        setEditorState(prev => {
          if (!prev.isPlaying) return prev;
          if (prev.currentTime >= prev.duration) return { ...prev, isPlaying: false, currentTime: 0 };
          return { ...prev, currentTime: prev.currentTime + delta };
        });
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [editorState.isPlaying]);

  // --- CLIP ACTIONS ---
  const handleUpdateClip = (id: string, updates: Partial<Clip>) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteClip = () => {
    if (!editorState.selectedClipId) return;
    pushToHistory(clips.filter(c => c.id !== editorState.selectedClipId));
    setEditorState(prev => ({ ...prev, selectedClipId: null }));
  };

  const handleRippleDelete = () => {
    if (!editorState.selectedClipId) return;
    const clipToRemove = clips.find(c => c.id === editorState.selectedClipId);
    if (!clipToRemove) return;
    const { trackId, start, duration } = clipToRemove;
    const newClips = clips.filter(c => c.id !== clipToRemove.id).map(c => {
        if (c.trackId === trackId && c.start > start) return { ...c, start: c.start - duration };
        return c;
    });
    pushToHistory(newClips);
    setEditorState(prev => ({ ...prev, selectedClipId: null }));
  };

  const handleSplitClip = () => {
      if (!editorState.selectedClipId) return;
      const clip = clips.find(c => c.id === editorState.selectedClipId);
      if (!clip) return;
      
      const time = editorState.currentTime;
      if (time <= clip.start || time >= clip.start + clip.duration) return;

      const splitPoint = time - clip.start;
      const firstDuration = splitPoint;
      const secondDuration = clip.duration - splitPoint;

      const clipA: Clip = { ...clip, duration: firstDuration };
      const clipB: Clip = { 
          ...clip, 
          id: `clip_${Date.now()}_b`, 
          start: time, 
          duration: secondDuration, 
          offset: clip.offset + splitPoint 
      };

      pushToHistory([...clips.filter(c => c.id !== clip.id), clipA, clipB]);
  };

  const handleExport = () => {
      if (!canvasRef.current) return;
      const stream = canvasRef.current.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'kiara-vision-export.webm';
          a.click();
          setEditorState(prev => ({ ...prev, isExporting: false, isPlaying: false }));
      };

      setEditorState(prev => ({ ...prev, isExporting: true, isPlaying: true, currentTime: 0 }));
      recorder.start();

      const checkEnd = setInterval(() => {
          setEditorState(curr => {
              if (curr.currentTime >= curr.duration) {
                  recorder.stop();
                  clearInterval(checkEnd);
                  return { ...curr, isPlaying: false };
              }
              return curr;
          });
      }, 100);
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
          if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); handleSplitClip(); }
          if (e.key === 'Delete') handleDeleteClip();
          if (e.key === ' ') { 
              e.preventDefault(); 
              setEditorState(prev => ({ ...prev, isPlaying: !prev.isPlaying })); 
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, future, editorState.selectedClipId, clips]);

  // --- ASSET HANDLING ---
  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata'; video.src = URL.createObjectURL(file); video.muted = true; video.currentTime = 0.5;
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg')); }
        else resolve('');
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve('');
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const newAssets: MediaAsset[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video') ? MediaType.VIDEO : file.type.startsWith('image') ? MediaType.IMAGE : file.type.startsWith('audio') ? MediaType.AUDIO : MediaType.TEXT;
      let duration = type === MediaType.IMAGE ? 5 : 10;
      let thumbnail = '';
      if (type === MediaType.VIDEO) {
         thumbnail = await generateVideoThumbnail(file);
         await new Promise<void>((resolve) => {
            const el = document.createElement('video'); el.src = url; el.preload = 'metadata';
            el.onloadedmetadata = () => { duration = el.duration; resolve(); }; el.onerror = () => resolve();
         });
      } else if (type === MediaType.AUDIO) {
         await new Promise<void>((resolve) => {
            const el = document.createElement('audio'); el.src = url;
            el.onloadedmetadata = () => { duration = el.duration; resolve(); }; el.onerror = () => resolve();
         });
      }
      newAssets.push({ id: `asset_${Date.now()}_${Math.random()}`, file, src: url, name: file.name, type, duration, thumbnail });
    }
    setAssets(prev => [...prev, ...newAssets]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addAssetToTimeline = (asset: MediaAsset) => {
     const trackId = asset.type === MediaType.VIDEO || asset.type === MediaType.IMAGE ? 't2' : asset.type === MediaType.AUDIO ? 't3' : 't1';
     const newClip: Clip = {
       id: `clip_${Date.now()}`, trackId, name: asset.name, type: asset.type, start: editorState.currentTime, duration: asset.duration, offset: 0,
       src: asset.src, assetId: asset.id,
       color: asset.type === MediaType.VIDEO || asset.type === MediaType.IMAGE ? 'bg-zinc-600' : asset.type === MediaType.AUDIO ? 'bg-zinc-700' : 'bg-zinc-500',
       properties: { opacity: 1, volume: 1, scale: 1, rotation: 0, x: 0, y: 0, brightness: 1, contrast: 1, saturation: 1, hue: 0, blur: 0, fontSize: 120, textColor: '#ffffff', fontFamily: 'Arial' }
     };
     pushToHistory([...clips, newClip]);
     setEditorState(prev => ({ ...prev, duration: Math.max(prev.duration, newClip.start + newClip.duration + 5) }));
  };

  // --- SIDEBAR HELPERS ---
  const addPresetClip = (type: MediaType, name: string, props: Partial<Clip['properties']>, duration: number = 5) => {
      const newClip: Clip = {
          id: `clip_preset_${Date.now()}`, 
          trackId: type === MediaType.AUDIO ? 't3' : 't1', 
          name, 
          type, 
          start: editorState.currentTime, 
          duration, 
          offset: 0,
          color: type === MediaType.AUDIO ? 'bg-zinc-700' : 'bg-zinc-500',
          properties: { opacity: 1, volume: 1, scale: 1, rotation: 0, x: 0, y: 0, brightness: 1, contrast: 1, saturation: 1, hue: 0, blur: 0, fontSize: 120, textColor: '#ffffff', fontFamily: 'Arial', ...props }
      };
      pushToHistory([...clips, newClip]);
      setEditorState(prev => ({ ...prev, duration: Math.max(prev.duration, newClip.start + newClip.duration + 5) }));
  };

  const applyFilterToSelected = (filter: typeof FILTER_PRESETS[0]) => {
      if (!editorState.selectedClipId) return;
      const clip = clips.find(c => c.id === editorState.selectedClipId);
      if (!clip) return;
      handleUpdateClip(editorState.selectedClipId, { properties: { ...clip.properties, brightness: filter.b, contrast: filter.c, saturation: filter.s, hue: filter.h } });
  };

  const applyTransitionToSelected = (fadeIn: number, fadeOut: number) => {
     if (!editorState.selectedClipId) return;
     const clip = clips.find(c => c.id === editorState.selectedClipId);
     if (!clip) return;
     handleUpdateClip(editorState.selectedClipId, { properties: { ...clip.properties, fadeIn, fadeOut } });
  };

  const applyEffectToSelected = (effectUpdate: Partial<Clip['properties']>) => {
      if (!editorState.selectedClipId) return;
      const clip = clips.find(c => c.id === editorState.selectedClipId);
      if (!clip) return;
      handleUpdateClip(clip.id, { properties: { ...clip.properties, ...effectUpdate } });
  };

  const selectedClip = clips.find(c => c.id === editorState.selectedClipId);

  // --- SIDEBAR RENDER ---
  const renderSidebarContent = () => {
      switch (activeNav) {
          case 'media':
              return (
                  <>
                    <div className="p-4 space-y-3">
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} multiple accept="video/*,image/*,audio/*" />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full btn-ios py-2.5 text-xs gap-2 group">
                            <span>IMPORT MEDIA</span> <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 gap-3">
                            {assets.map(asset => (
                                <div key={asset.id} className="aspect-square inset-3d relative group cursor-pointer overflow-hidden rounded-xl" onClick={() => addAssetToTimeline(asset)}>
                                    {asset.type === MediaType.VIDEO || asset.type === MediaType.IMAGE ? <img src={asset.thumbnail || asset.src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={asset.name} /> : <div className="w-full h-full flex items-center justify-center text-zinc-500"><Music size={24} /></div>}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1.5 truncate text-[10px] text-white backdrop-blur-sm">{asset.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                  </>
              );
          case 'audio':
              return (
                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                      <h3 className="text-[10px] font-bold text-zinc-500 mb-4 uppercase tracking-wider pl-1">Soundscapes</h3>
                      <div className="space-y-2">
                          {AUDIO_LIBRARY.map((item, i) => (
                              <div key={i} onClick={() => addPresetClip(MediaType.AUDIO, item.name, {}, item.duration)} className="flex items-center justify-between p-2.5 glass-medium hover:bg-white/10 rounded-xl cursor-pointer group transition-all">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color} text-white/70`}><Music4 size={14} /></div>
                                      <div className="text-xs">
                                          <div className="text-zinc-200 font-bold">{item.name}</div>
                                          <div className="text-zinc-500 text-[10px]">{item.duration}s</div>
                                      </div>
                                  </div>
                                  <Plus size={14} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                          ))}
                      </div>
                  </div>
              );
          case 'text':
              return (
                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                      <h3 className="text-[10px] font-bold text-zinc-500 mb-4 uppercase tracking-wider pl-1">Typography</h3>
                      <div className="grid grid-cols-2 gap-3">
                          {TEXT_PRESETS.map((item, i) => (
                              <div key={i} onClick={() => addPresetClip(MediaType.TEXT, item.name, { fontSize: item.fontSize, textColor: item.color, fontFamily: item.fontFamily })} className="aspect-video glass-medium hover:bg-white/10 rounded-xl flex items-center justify-center cursor-pointer group relative transition-all">
                                  <span style={{ color: item.color, fontSize: '14px', fontWeight: 'bold', fontFamily: item.fontFamily }}>{item.name}</span>
                                  <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100"><Plus size={12} className="text-white" /></div>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          case 'stickers':
              return (
                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                       <h3 className="text-[10px] font-bold text-zinc-500 mb-4 uppercase tracking-wider pl-1">Elements</h3>
                       <div className="grid grid-cols-4 gap-2">
                           {STICKER_LIBRARY.map((item, i) => (
                               <div key={i} onClick={() => addPresetClip(MediaType.TEXT, item.icon, { fontSize: 150 }, 3)} className="aspect-square glass-medium hover:bg-white/10 rounded-xl flex items-center justify-center text-2xl cursor-pointer transition-all">
                                   {item.icon}
                               </div>
                           ))}
                       </div>
                  </div>
              );
          case 'filters':
               return (
                   <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                       <h3 className="text-[10px] font-bold text-zinc-500 mb-4 uppercase tracking-wider pl-1">Grading</h3>
                       <div className="grid grid-cols-2 gap-3">
                           {FILTER_PRESETS.map((item, i) => (
                               <div key={i} onClick={() => applyFilterToSelected(item)} className="aspect-video glass-medium hover:bg-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1 transition-all group">
                                   <Aperture size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                                   <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">{item.name}</span>
                               </div>
                           ))}
                       </div>
                       {!selectedClip && <div className="mt-4 text-xs text-zinc-600 text-center">Select a clip to apply filters</div>}
                   </div>
               );
          case 'transitions':
               return (
                   <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                       <h3 className="text-[10px] font-bold text-zinc-500 mb-4 uppercase tracking-wider pl-1">Transitions</h3>
                       <div className="space-y-2">
                           {[{ l: 'Cross Dissolve', t: 1 }, { l: 'Quick Fade', t: 0.5 }, { l: 'Slow Fade', t: 2 }].map((t, i) => (
                               <div key={i} onClick={() => applyTransitionToSelected(t.t, t.t)} className="p-3 glass-medium hover:bg-white/10 rounded-xl cursor-pointer flex items-center gap-3 transition-all">
                                   <div className="w-8 h-8 bg-black/40 rounded-lg flex items-center justify-center"><Split size={14} className="text-zinc-400" /></div>
                                   <span className="text-xs font-medium text-zinc-300">{t.l} ({t.t}s)</span>
                               </div>
                           ))}
                       </div>
                   </div>
               );
          case 'effects':
                return (
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                        <h3 className="text-[10px] font-bold text-zinc-500 mb-4 uppercase tracking-wider pl-1">FX</h3>
                        <div className="grid grid-cols-2 gap-3">
                             <div onClick={() => applyEffectToSelected({ scale: 1.5 })} className="p-4 glass-medium hover:bg-white/10 rounded-xl cursor-pointer text-center transition-all group">
                                <Star size={16} className="mx-auto mb-2 text-zinc-400 group-hover:text-white" />
                                <span className="text-xs text-zinc-300">Zoom In</span>
                             </div>
                             <div onClick={() => applyEffectToSelected({ rotation: 15 })} className="p-4 glass-medium hover:bg-white/10 rounded-xl cursor-pointer text-center transition-all group">
                                <Zap size={16} className="mx-auto mb-2 text-zinc-400 group-hover:text-white" />
                                <span className="text-xs text-zinc-300">Tilt</span>
                             </div>
                        </div>
                    </div>
                );
          default:
              return <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs">Module Offline</div>;
      }
  };

  return (
    <div className="flex flex-col h-full text-zinc-200 font-sans select-none overflow-hidden relative bg-transparent">
      {/* HEADER */}
      <header className="h-16 glass-heavy flex items-center justify-between px-6 shrink-0 z-30">
         <div className="flex items-center gap-6 mr-8">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                    <Sparkles size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="text-sm font-black tracking-widest text-white">KIARA</h1>
                    <span className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] block -mt-1">VISION EDITOR</span>
                </div>
             </div>
             <div className="h-6 w-px bg-white/10"></div>
         </div>
         
         <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar flex-1 justify-center">
            {NAV_ITEMS.map(item => (
               <button key={item.id} onClick={() => setActiveNav(item.id)} className={`flex flex-col items-center justify-center w-16 py-1.5 rounded-xl group transition-all duration-300 ${activeNav === item.id ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                 <item.icon size={18} className="mb-1" strokeWidth={activeNav === item.id ? 2.5 : 2} />
                 <span className="text-[9px] font-bold leading-none tracking-wide uppercase">{item.label}</span>
               </button>
            ))}
         </div>

         <div className="flex items-center gap-4 ml-8">
            <button 
                onClick={handleExport}
                disabled={editorState.isExporting}
                className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all btn-3d-primary ${editorState.isExporting ? 'opacity-75 cursor-wait' : ''}`}
            >
                {editorState.isExporting ? 'RENDERING...' : <><Download size={14} strokeWidth={3} /> EXPORT</>}
            </button>
         </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* LEFT SIDEBAR */}
        <div className="w-[360px] flex glass-heavy shrink-0 backdrop-blur-md z-20">
           <div className="w-16 flex flex-col items-center py-6 space-y-6 border-r border-white/5 bg-black/20">
              <div className="space-y-6 w-full flex flex-col items-center">
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 cursor-pointer transition-all border border-white/5 shadow-inner"><FolderOpen size={20} /></div>
                 <User size={20} className="text-zinc-600 hover:text-white cursor-pointer transition-colors" />
                 <Bot size={20} className="text-zinc-600 hover:text-white cursor-pointer transition-colors" />
              </div>
           </div>
           <div className="flex-1 flex flex-col bg-transparent">
              {renderSidebarContent()}
           </div>
        </div>

        {/* PREVIEW */}
        <div className="flex-1 bg-transparent min-w-0 relative flex flex-col">
           <VideoPreview 
             state={editorState} 
             clips={clips} 
             onPlayToggle={() => setEditorState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
             canvasRef={canvasRef}
             onUpdateClip={handleUpdateClip}
             onSelectClip={(id) => setEditorState(prev => ({ ...prev, selectedClipId: id }))}
           />
        </div>

        {/* PROPERTIES */}
        <div className="w-[320px] shrink-0 glass-heavy border-l border-white/5 z-20">
           <PropertiesPanel selectedClip={selectedClip} onUpdate={handleUpdateClip} />
        </div>
      </div>

      {/* TIMELINE */}
      <div className="h-[340px] shrink-0 border-t border-white/5 glass-heavy z-30">
         <Timeline 
            tracks={tracks} clips={clips} state={editorState}
            onStateChange={(u) => setEditorState(prev => ({ ...prev, ...u }))}
            onClipSelect={(id) => setEditorState(prev => ({ ...prev, selectedClipId: id }))}
            onClipUpdate={handleUpdateClip}
            onTimeUpdate={(t) => setEditorState(prev => ({ ...prev, currentTime: t }))}
            onDelete={handleDeleteClip}
            onRippleDelete={handleRippleDelete}
            onSplit={handleSplitClip}
            onUndo={handleUndo}
            onRedo={handleRedo}
         />
      </div>
    </div>
  );
};
