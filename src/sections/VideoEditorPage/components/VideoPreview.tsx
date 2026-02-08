import React, { useEffect, useRef, useState } from 'react';
import { Clip, EditorState, MediaType } from '../../VideoEditorPage/types'; // Adjusted import path
import { Maximize2, Play, Pause, Volume2, Scan, Ratio } from 'lucide-react';

interface VideoPreviewProps {
  state: EditorState;
  clips: Clip[];
  onPlayToggle: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onUpdateClip: (id: string, updates: Partial<Clip>) => void;
  onSelectClip: (id: string) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ 
  state, clips, onPlayToggle, canvasRef, onUpdateClip, onSelectClip 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoCacheRef = useRef<{ [key: string]: HTMLVideoElement }>({});
  const imgCacheRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const stateRef = useRef(state);
  const clipsRef = useRef(clips);

  // Interaction State
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, clipX: 0, clipY: 0 });
  const draggedClipIdRef = useRef<string | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { clipsRef.current = clips; }, [clips]);

  // Format timecode
  const formatTimecode = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const f = Math.floor((seconds % 1) * 30);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };

  // --- ASSET LOADING ---
  useEffect(() => {
     if (!mountRef.current) return;
     clips.forEach(clip => {
        if (clip.type === MediaType.VIDEO && clip.src) {
            if (!videoCacheRef.current[clip.id]) {
                const vid = document.createElement('video');
                vid.src = clip.src;
                vid.muted = false; 
                vid.preload = "auto";
                vid.playsInline = true;
                vid.crossOrigin = "anonymous"; 
                Object.assign(vid.style, { position: 'fixed', top: '0', left: '0', width: '1px', height: '1px', opacity: '0.001', pointerEvents: 'none', zIndex: '-9999' });
                mountRef.current?.appendChild(vid);
                videoCacheRef.current[clip.id] = vid;
            }
        } 
        else if (clip.type === MediaType.IMAGE && clip.src && !imgCacheRef.current[clip.id]) {
            const img = new Image();
            img.src = clip.src;
            imgCacheRef.current[clip.id] = img;
        }
     });
     const activeIds = new Set(clips.map(c => c.id));
     Object.keys(videoCacheRef.current).forEach(id => {
         if (!activeIds.has(id)) {
             const vid = videoCacheRef.current[id];
             vid.pause(); vid.src = ""; vid.remove(); delete videoCacheRef.current[id];
         }
     });
  }, [clips]);

  // --- CANVAS INTERACTION HANDLERS ---
  const getCanvasCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoordinates(e);
    const currentState = stateRef.current;
    const currentClips = clipsRef.current;

    // Find clicked clip (reverse order to check top-most first)
    const activeClips = currentClips
      .filter(c => currentState.currentTime >= c.start && currentState.currentTime < c.start + c.duration)
      .sort((a, b) => a.trackId.localeCompare(b.trackId))
      .reverse();

    // Simple Hit Detection (Approximate)
    const cx = 1920 / 2;
    const cy = 1080 / 2;

    for (const clip of activeClips) {
       // Transform mouse to clip space logic is complex with rotation
       // Using simple bounding box approximation around center
       const clipX = cx + clip.properties.x;
       const clipY = cy + clip.properties.y;
       
       let w = 400; let h = 400; // Default hit area
       if (clip.type === MediaType.TEXT) { w = 600; h = 200; }
       
       // If zoomed/scaled
       w *= clip.properties.scale;
       h *= clip.properties.scale;

       if (x >= clipX - w/2 && x <= clipX + w/2 && y >= clipY - h/2 && y <= clipY + h/2) {
           isDraggingRef.current = true;
           draggedClipIdRef.current = clip.id;
           dragStartRef.current = { x, y, clipX: clip.properties.x, clipY: clip.properties.y };
           onSelectClip(clip.id);
           return; // Stop after finding top-most
       }
    }
    
    // Deselect if clicked empty space
    onSelectClip('');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !draggedClipIdRef.current) return;
    const { x, y } = getCanvasCoordinates(e);
    
    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;

    // Update locally for rendering immediately? 
    // Ideally we update React state to persist, but for smooth 60fps drag we might want local override
    // For this implementation, we'll trigger the callback which updates state
    onUpdateClip(draggedClipIdRef.current, {
       properties: {
          ...clipsRef.current.find(c => c.id === draggedClipIdRef.current)!.properties,
          x: dragStartRef.current.clipX + dx,
          y: dragStartRef.current.clipY + dy
       }
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedClipIdRef.current = null;
  };

  // --- RENDER LOOP ---
  useEffect(() => {
    let animationFrameId: number;
    
    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { alpha: false }); 
      if (!canvas || !ctx) { animationFrameId = requestAnimationFrame(render); return; }

      const currentState = stateRef.current;
      const currentClips = clipsRef.current;
      const selectedId = currentState.selectedClipId;
      
      if (canvas.width !== 1920 || canvas.height !== 1080) {
          canvas.width = 1920; canvas.height = 1080;
      }

      // Clear
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const activeClips = currentClips
        .filter(clip => currentState.currentTime >= clip.start && currentState.currentTime < clip.start + clip.duration)
        .sort((a, b) => a.trackId.localeCompare(b.trackId)); 

      activeClips.forEach(clip => {
        ctx.save();
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // 1. Calculate Opacity (Fades)
        let alpha = clip.properties.opacity;
        const timeInClip = currentState.currentTime - clip.start;
        const timeRem = (clip.start + clip.duration) - currentState.currentTime;
        
        if (clip.properties.fadeIn && timeInClip < clip.properties.fadeIn) {
            alpha *= (timeInClip / clip.properties.fadeIn);
        }
        if (clip.properties.fadeOut && timeRem < clip.properties.fadeOut) {
            alpha *= (timeRem / clip.properties.fadeOut);
        }

        ctx.translate(cx + clip.properties.x, cy + clip.properties.y);
        ctx.rotate((clip.properties.rotation * Math.PI) / 180);
        ctx.scale(clip.properties.scale, clip.properties.scale);
        ctx.globalAlpha = alpha;
        
        if (clip.properties.blendMode) ctx.globalCompositeOperation = clip.properties.blendMode as GlobalCompositeOperation;

        const b = clip.properties.brightness ?? 1;
        const c = clip.properties.contrast ?? 1;
        const s = clip.properties.saturation ?? 1;
        const h = clip.properties.hue ?? 0;
        const bl = clip.properties.blur ?? 0;
        ctx.filter = `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${h}deg) blur(${bl}px)`;

        // DRAW VIDEO
        if (clip.type === MediaType.VIDEO) {
            const vid = videoCacheRef.current[clip.id];
            if (vid) {
                const speed = clip.properties.speed || 1;
                const clipTime = (currentState.currentTime - clip.start) * speed + clip.offset;
                const targetTime = Math.max(0, Math.min(vid.duration, clipTime));
                
                vid.volume = Math.max(0, Math.min(1, clip.properties.volume * alpha));

                if (currentState.isPlaying) {
                    const drift = Math.abs(vid.currentTime - targetTime);
                    if (vid.playbackRate !== speed) vid.playbackRate = speed;
                    if (vid.paused && vid.readyState >= 2) vid.play().catch(()=>{});
                    if (drift > 0.4) vid.currentTime = targetTime;
                } else {
                    vid.pause();
                    if (Math.abs(vid.currentTime - targetTime) > 0.05) vid.currentTime = targetTime;
                }

                if (vid.readyState >= 2) {
                    const drawW = vid.videoWidth;
                    const drawH = vid.videoHeight;
                    ctx.drawImage(vid, -drawW/2, -drawH/2, drawW, drawH);
                    
                    // Bounding Box if Selected
                    if (clip.id === selectedId) {
                         ctx.strokeStyle = '#ffffff';
                         ctx.lineWidth = 4;
                         ctx.setLineDash([10, 10]);
                         ctx.strokeRect(-drawW/2, -drawH/2, drawW, drawH);
                         ctx.setLineDash([]);
                    }
                }
            }
        } 
        // DRAW IMAGE
        else if (clip.type === MediaType.IMAGE) {
            const img = imgCacheRef.current[clip.id];
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, -img.naturalWidth/2, -img.naturalHeight/2);
                
                if (clip.id === selectedId) {
                     ctx.strokeStyle = '#ffffff';
                     ctx.lineWidth = 4;
                     ctx.setLineDash([10, 10]);
                     ctx.strokeRect(-img.naturalWidth/2, -img.naturalHeight/2, img.naturalWidth, img.naturalHeight);
                }
            }
        }
        // DRAW TEXT
        else if (clip.type === MediaType.TEXT) {
            ctx.filter = 'none'; 
            ctx.fillStyle = clip.properties.textColor || "white";
            const fontSize = clip.properties.fontSize || 120;
            const fontFamily = clip.properties.fontFamily || 'Arial';
            ctx.font = `bold ${fontSize}px ${fontFamily}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            // Text Shadow / Outline for better visibility
            ctx.shadowColor = "rgba(0,0,0,0.7)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            ctx.fillText(clip.name, 0, 0);
            
            // Bounding Box for Text
            if (clip.id === selectedId) {
                const metrics = ctx.measureText(clip.name);
                const w = metrics.width + 40;
                const h = fontSize * 1.2;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(-w/2, -h/2, w, h);
            }
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div ref={mountRef} className="w-full h-full flex flex-col bg-transparent relative group select-none">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 bg-black/20 border-b border-white/10 z-20">
        <div className="text-xs text-zinc-500">Player (Drag elements to move)</div>
        <div className="flex items-center gap-3">
           <button className="text-zinc-500 hover:text-white transition-colors"><Scan size={14} /></button>
           <div className="text-zinc-500 text-xs font-mono px-2 bg-white/5 rounded border border-white/5">1080p</div>
           <button className="text-zinc-500 hover:text-white transition-colors"><Maximize2 size={14} /></button>
        </div>
      </div>
      {/* Canvas */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#050505]">
         <canvas 
           ref={canvasRef}
           className="shadow-2xl bg-black cursor-move"
           onMouseDown={handleMouseDown}
           onMouseMove={handleMouseMove}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}
           style={{ width: '100%', height: '100%', objectFit: 'contain' }}
         />
         {!state.isPlaying && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                     <Play fill="white" className="text-white ml-1" size={32} />
                 </div>
             </div>
         )}
      </div>
      {/* Footer */}
      <div className="h-12 bg-transparent border-t border-white/10 flex items-center justify-between px-4 z-20">
         <div className="flex items-center gap-4">
            <button 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-zinc-200 text-black transition-colors"
              onClick={onPlayToggle}
            >
               {state.isPlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="ml-0.5" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
               <span className="text-white font-bold">{formatTimecode(state.currentTime)}</span>
               <span className="text-zinc-600">/</span>
               <span className="text-zinc-600">{formatTimecode(state.duration)}</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <Volume2 size={16} className="text-zinc-500" />
            <button className="text-zinc-500 hover:text-white flex items-center gap-1 text-xs transition-colors"><Ratio size={14} /> <span>Ratio</span></button>
         </div>
      </div>
    </div>
  );
};