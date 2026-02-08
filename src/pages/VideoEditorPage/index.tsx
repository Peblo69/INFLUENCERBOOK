import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timeline } from './components/Timeline';
import { VideoPreview } from './components/VideoPreview';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Clip, Track, EditorState, MediaType, MediaAsset } from './types';
import { 
  Plus, Video, Type as TypeIcon, Music, 
  Sticker, Wand2, Split, Captions, Aperture, SlidersHorizontal, Bot,
  FolderOpen, User, Download, Music4, Star, Zap
} from 'lucide-react';

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
    { name: "Upbeat Corporate", duration: 15, color: "bg-emerald-600" },
    { name: "Cinematic Whoosh", duration: 2, color: "bg-emerald-500" },
    { name: "Lo-Fi Chill", duration: 30, color: "bg-teal-600" },
    { name: "Suspense Drone", duration: 10, color: "bg-cyan-900" },
];

const TEXT_PRESETS = [
    { name: "Default Text", fontSize: 120, color: "#ffffff", fontFamily: 'Arial' },
    { name: "Yellow Bold", fontSize: 140, color: "#facc15", fontFamily: 'Impact' },
    { name: "Neon Blue", fontSize: 130, color: "#22d3ee", fontFamily: 'Verdana' },
    { name: "Red Warning", fontSize: 150, color: "#ef4444", fontFamily: 'Arial' },
    { name: "Subtle Grey", fontSize: 80, color: "#a1a1aa", fontFamily: 'Courier New' },
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

const VideoEditorPage: React.FC = () => {
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
      
      // Check if playhead is inside clip
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
      const stream = canvasRef.current.captureStream(30); // 30 FPS export
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'neoncut-export.webm';
          a.click();
          setEditorState(prev => ({ ...prev, isExporting: false, isPlaying: false }));
      };

      // Start Export Process
      setEditorState(prev => ({ ...prev, isExporting: true, isPlaying: true, currentTime: 0 }));
      recorder.start();

      // Stop automatically when finished
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

  // Shortcuts
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
       color: asset.type === MediaType.VIDEO || asset.type === MediaType.IMAGE ? 'bg-cyan-600' : asset.type === MediaType.AUDIO ? 'bg-emerald-600' : 'bg-orange-600',
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
          color: type === MediaType.AUDIO ? 'bg-emerald-600' : 'bg-orange-600',
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

  // SAFEGUARD: Helper to apply updates to selected clip
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
                    <div className="p-3 space-y-2">
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} multiple accept="video/*,image/*,audio/*" />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between px-3 py-1.5 bg-[#06b6d4] hover:bg-[#0891b2] text-black rounded text-xs font-bold transition-colors"><span>Import</span> <Plus size={14} /></button>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2">
                            {assets.map(asset => (
                                <div key={asset.id} className="aspect-square bg-[#252525] rounded overflow-hidden relative group cursor-pointer border border-transparent hover:border-cyan-500" onClick={() => addAssetToTimeline(asset)}>
                                    {asset.type === MediaType.VIDEO || asset.type === MediaType.IMAGE ? <img src={asset.thumbnail || asset.src} className="w-full h-full object-cover" alt={asset.name} /> : <div className="w-full h-full flex items-center justify-center text-[#a1a1aa]"><Music size={24} /></div>}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 truncate text-[10px] text-white">{asset.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                  </>
              );
          case 'audio':
              return (
                  <div className="flex-1 p-3 overflow-y-auto">
                      <h3 className="text-xs font-bold text-[#71717a] mb-3 uppercase tracking-wider">Stock Music</h3>
                      <div className="space-y-2">
                          {AUDIO_LIBRARY.map((item, i) => (
                              <div key={i} onClick={() => addPresetClip(MediaType.AUDIO, item.name, {}, item.duration)} className="flex items-center justify-between p-2 bg-[#252525] hover:bg-[#3f3f46] rounded cursor-pointer group">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded flex items-center justify-center ${item.color}`}><Music4 size={14} className="text-white" /></div>
                                      <div className="text-xs">
                                          <div className="text-white font-medium">{item.name}</div>
                                          <div className="text-[#71717a]">{item.duration}s</div>
                                      </div>
                                  </div>
                                  <Plus size={14} className="text-[#71717a] opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                          ))}
                      </div>
                  </div>
              );
          case 'text':
              return (
                  <div className="flex-1 p-3 overflow-y-auto">
                      <h3 className="text-xs font-bold text-[#71717a] mb-3 uppercase tracking-wider">Text Presets</h3>
                      <div className="grid grid-cols-2 gap-2">
                          {TEXT_PRESETS.map((item, i) => (
                              <div key={i} onClick={() => addPresetClip(MediaType.TEXT, item.name, { fontSize: item.fontSize, textColor: item.color, fontFamily: item.fontFamily })} className="aspect-video bg-[#252525] hover:bg-[#3f3f46] rounded border border-[#3f3f46] flex items-center justify-center cursor-pointer group relative">
                                  <span style={{ color: item.color, fontSize: '14px', fontWeight: 'bold', fontFamily: item.fontFamily }}>{item.name}</span>
                                  <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100"><Plus size={12} /></div>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          case 'stickers':
              return (
                  <div className="flex-1 p-3 overflow-y-auto">
                       <h3 className="text-xs font-bold text-[#71717a] mb-3 uppercase tracking-wider">Emojis</h3>
                       <div className="grid grid-cols-4 gap-2">
                           {STICKER_LIBRARY.map((item, i) => (
                               <div key={i} onClick={() => addPresetClip(MediaType.TEXT, item.icon, { fontSize: 150 }, 3)} className="aspect-square bg-[#252525] hover:bg-[#3f3f46] rounded flex items-center justify-center text-2xl cursor-pointer">
                                   {item.icon}
                               </div>
                           ))}
                       </div>
                  </div>
              );
          case 'filters':
               return (
                   <div className="flex-1 p-3 overflow-y-auto">
                       <h3 className="text-xs font-bold text-[#71717a] mb-3 uppercase tracking-wider">Color Grading</h3>
                       <div className="grid grid-cols-2 gap-2">
                           {FILTER_PRESETS.map((item, i) => (
                               <div key={i} onClick={() => applyFilterToSelected(item)} className="aspect-video bg-[#252525] hover:bg-[#3f3f46] rounded border border-[#3f3f46] flex flex-col items-center justify-center cursor-pointer gap-1">
                                   <Aperture size={16} className="text-cyan-400" />
                                   <span className="text-xs">{item.name}</span>
                               </div>
                           ))}
                       </div>
                       {!selectedClip && <div className="mt-4 text-xs text-[#71717a] text-center">Select a clip to apply filters</div>}
                   </div>
               );
          case 'transitions':
               return (
                   <div className="flex-1 p-3 overflow-y-auto">
                       <h3 className="text-xs font-bold text-[#71717a] mb-3 uppercase tracking-wider">Dissolves</h3>
                       <div className="space-y-2">
                           <div onClick={() => applyTransitionToSelected(1, 1)} className="p-2 bg-[#252525] hover:bg-[#3f3f46] rounded cursor-pointer flex items-center gap-3">
                               <div className="w-8 h-8 bg-black/50 rounded flex items-center justify-center"><Split size={14} /></div>
                               <span className="text-xs">Cross Dissolve (1s)</span>
                           </div>
                           <div onClick={() => applyTransitionToSelected(0.5, 0.5)} className="p-2 bg-[#252525] hover:bg-[#3f3f46] rounded cursor-pointer flex items-center gap-3">
                               <div className="w-8 h-8 bg-black/50 rounded flex items-center justify-center"><Split size={14} /></div>
                               <span className="text-xs">Quick Fade (0.5s)</span>
                           </div>
                           <div onClick={() => applyTransitionToSelected(2, 2)} className="p-2 bg-[#252525] hover:bg-[#3f3f46] rounded cursor-pointer flex items-center gap-3">
                               <div className="w-8 h-8 bg-black/50 rounded flex items-center justify-center"><Split size={14} /></div>
                               <span className="text-xs">Slow Fade (2s)</span>
                           </div>
                       </div>
                       {!selectedClip && <div className="mt-4 text-xs text-[#71717a] text-center">Select a clip to apply transitions</div>}
                   </div>
               );
          case 'effects':
                return (
                    <div className="flex-1 p-3 overflow-y-auto">
                        <h3 className="text-xs font-bold text-[#71717a] mb-3 uppercase tracking-wider">Motion Effects</h3>
                        <div className="grid grid-cols-2 gap-2">
                             <div onClick={() => applyEffectToSelected({ scale: 1.5 })} className="p-4 bg-[#252525] hover:bg-[#3f3f46] rounded cursor-pointer text-center">
                                <Star size={16} className="mx-auto mb-1 text-yellow-400" />
                                <span className="text-xs">Zoom In</span>
                             </div>
                             <div onClick={() => applyEffectToSelected({ rotation: 15 })} className="p-4 bg-[#252525] hover:bg-[#3f3f46] rounded cursor-pointer text-center">
                                <Zap size={16} className="mx-auto mb-1 text-blue-400" />
                                <span className="text-xs">Tilt</span>
                             </div>
                        </div>
                         {!selectedClip && <div className="mt-4 text-xs text-[#71717a] text-center">Select a clip to apply effects</div>}
                    </div>
                );
          default:
              return <div className="flex-1 flex items-center justify-center text-[#52525b] text-xs">Coming Soon</div>;
      }
  };

  return (
    <div className="flex flex-col h-screen bg-[#131313] text-zinc-200 font-sans select-none overflow-hidden">
      {/* HEADER */}
      <header className="h-14 bg-[#131313] border-b border-[#252525] flex items-center justify-between px-4 shrink-0">
         <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar flex-1">
            {NAV_ITEMS.map(item => (
               <button key={item.id} onClick={() => setActiveNav(item.id)} className={`flex flex-col items-center justify-center px-3 py-1 rounded hover:bg-[#252525] min-w-[64px] group transition-colors ${activeNav === item.id ? 'text-cyan-400' : 'text-[#a1a1aa]'}`}>
                 <item.icon size={18} className={`mb-1 group-hover:text-white ${activeNav === item.id ? 'text-cyan-400' : 'text-[#a1a1aa]'}`} />
                 <span className="text-[11px] font-medium leading-none group-hover:text-white">{item.label}</span>
               </button>
            ))}
         </div>
         <button 
            onClick={handleExport}
            disabled={editorState.isExporting}
            className={`px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-colors ${editorState.isExporting ? 'bg-cyan-900 text-cyan-500 cursor-wait' : 'bg-cyan-500 hover:bg-cyan-400 text-black'}`}
         >
            {editorState.isExporting ? 'Exporting...' : <><Download size={16} /> Export</>}
         </button>
      </header>

      {/* WORKSPACE */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT SIDEBAR (Dynamic Content) */}
        <div className="w-[340px] flex bg-[#131313] border-r border-[#252525] shrink-0">
           <div className="w-12 bg-[#131313] flex flex-col items-center py-4 space-y-6 border-r border-[#252525]">
              <div className="space-y-4 w-full flex flex-col items-center">
                 <div className="w-8 h-8 bg-[#252525] rounded flex items-center justify-center text-cyan-400 hover:bg-[#333] cursor-pointer transition-colors"><FolderOpen size={18} /></div>
                 <User size={18} className="text-[#71717a] hover:text-white cursor-pointer transition-colors" />
                 <Bot size={18} className="text-[#71717a] hover:text-white cursor-pointer transition-colors" />
              </div>
           </div>
           <div className="flex-1 flex flex-col bg-[#131313]">
              {renderSidebarContent()}
           </div>
        </div>

        {/* PREVIEW */}
        <div className="flex-1 bg-black border-r border-[#252525] min-w-0 relative flex flex-col">
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
        <div className="w-[300px] shrink-0 bg-[#131313]">
           <PropertiesPanel selectedClip={selectedClip} onUpdate={handleUpdateClip} />
        </div>
      </div>

      {/* TIMELINE */}
      <div className="h-[320px] shrink-0 border-t border-[#252525] bg-[#131313] z-10">
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

export default VideoEditorPage;

