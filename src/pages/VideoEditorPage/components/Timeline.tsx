import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { Clip, Track, EditorState, MediaType } from '../types';
import { 
  Undo2, Redo2, Scissors, Trash2, MousePointer2, 
  Magnet, Link, GripHorizontal, Flag, ChevronDown, Mic, ArrowLeftFromLine
} from 'lucide-react';

interface TimelineProps {
  tracks: Track[];
  clips: Clip[];
  state: EditorState;
  onStateChange: (newState: Partial<EditorState>) => void;
  onClipSelect: (id: string | null) => void;
  onClipUpdate: (id: string, updates: Partial<Clip>) => void;
  onTimeUpdate: (time: number) => void;
  onDelete: () => void;
  onRippleDelete: () => void;
  onSplit: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  tracks,
  clips,
  state,
  onStateChange,
  onClipSelect,
  onClipUpdate,
  onTimeUpdate,
  onDelete,
  onRippleDelete,
  onSplit,
  onUndo,
  onRedo
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const HEADER_HEIGHT = 0; 
  const TRACK_HEIGHT = 40; 
  const RULER_HEIGHT = 28;
  
  // Scales
  const timeScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, state.duration])
      .range([0, state.duration * state.zoomLevel]);
  }, [state.duration, state.zoomLevel]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalHeight = tracks.length * TRACK_HEIGHT + RULER_HEIGHT + 100; 
    const totalWidth = Math.max(containerRef.current?.clientWidth || 0, state.duration * state.zoomLevel);

    svg.attr("width", totalWidth)
       .attr("height", totalHeight);

    // --- LAYERS ---
    const rulerLayer = svg.append("g").attr("class", "ruler-layer");
    const tracksLayer = svg.append("g").attr("class", "tracks-layer");
    const clipsLayer = svg.append("g").attr("class", "clips-layer");
    const snapLayer = svg.append("g").attr("class", "snap-layer");
    const playheadLayer = svg.append("g").attr("class", "playhead-layer");

    // 1. Draw Ruler
    rulerLayer.append("rect")
       .attr("x", 0).attr("y", 0)
       .attr("width", totalWidth).attr("height", RULER_HEIGHT)
       .attr("fill", "#131313");

    const axis = d3.axisTop(timeScale)
      .ticks(state.duration / 2)
      .tickFormat((d) => {
        const seconds = d as number;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; 
      })
      .tickSize(6)
      .tickPadding(6);

    const rulerGroup = rulerLayer.append("g")
      .attr("transform", `translate(0, ${RULER_HEIGHT})`)
      .call(axis)
      .attr("color", "#71717a") 
      .style("font-size", "10px")
      .style("font-family", "monospace");

    rulerGroup.select(".domain").attr("stroke", "#27272a");
    rulerGroup.selectAll("line").attr("stroke", "#3f3f46");

    // 2. Draw Tracks
    tracks.forEach((track, index) => {
      const y = RULER_HEIGHT + index * TRACK_HEIGHT + 10;
      
      tracksLayer.append("rect")
         .attr("x", 0)
         .attr("y", y)
         .attr("width", totalWidth)
         .attr("height", TRACK_HEIGHT - 4)
         .attr("fill", "#18181b")
         .attr("rx", 2);

      if (track.type === MediaType.VIDEO && index === 1) {
         tracksLayer.append("line")
           .attr("x1", 0).attr("y1", y + (TRACK_HEIGHT/2) - 2)
           .attr("x2", totalWidth).attr("y2", y + (TRACK_HEIGHT/2) - 2)
           .attr("stroke", "#27272a")
           .attr("stroke-width", 1);
      }
    });

    // --- DRAG BEHAVIORS ---
    const dragMove = d3.drag<SVGGElement, Clip>()
        .subject(function(d) { return { x: timeScale(d.start), y: 0 }; })
        .on("start", function(event, d) {
            d3.select(this).attr("cursor", "grabbing");
            onClipSelect(d.id);
            d3.select(this).raise();
        })
        .on("drag", function(event, d) {
            let newStart = timeScale.invert(event.x);
            newStart = Math.max(0, newStart); 
            const threshold = 15 / state.zoomLevel;
            const candidates = [0, state.currentTime];
            clips.forEach(c => { if(c.id!==d.id) { candidates.push(c.start, c.start+c.duration); }});
            
            let snapped = newStart;
            let isSnapped = false;
            let snapX = 0;

            for (const t of candidates) {
               if (Math.abs(t - newStart) < threshold) { snapped = t; isSnapped = true; snapX = timeScale(t); break; }
            }
            if (!isSnapped) {
                for (const t of candidates) {
                    if (Math.abs(t - (newStart + d.duration)) < threshold) { snapped = t - d.duration; isSnapped = true; snapX = timeScale(t); break; }
                }
            }

            (d as any)._tempStart = snapped;
            const newX = timeScale(snapped);

            // Transform the entire group
            d3.select(this).attr("transform", `translate(${newX - timeScale(d.start)}, 0)`); 
            
            snapLayer.selectAll("*").remove();
            if (isSnapped) {
                snapLayer.append("line").attr("x1", snapX).attr("y1", RULER_HEIGHT).attr("x2", snapX).attr("y2", totalHeight).attr("stroke", "yellow").attr("stroke-dasharray", "4,2");
            }
        })
        .on("end", function(event, d) {
             d3.select(this).attr("cursor", "pointer").attr("transform", null); // Reset and redraw by React
             snapLayer.selectAll("*").remove();
             const finalStart = (d as any)._tempStart;
             if (finalStart !== undefined && finalStart !== d.start) {
                 onClipUpdate(d.id, { start: finalStart });
             }
             delete (d as any)._tempStart;
        });

    const dragStartHandle = d3.drag<SVGRectElement, Clip>()
        .on("start", (e) => e.sourceEvent.stopPropagation())
        .on("drag", function(event, d) {
             const mouseTime = timeScale.invert(event.x);
             const maxTime = d.start + d.duration - 0.1; 
             const clampedTime = Math.min(maxTime, Math.max(0, mouseTime));
             const delta = clampedTime - d.start;
             const newDuration = d.duration - delta;
             const newOffset = d.offset + delta; 

             // Visual feedback
             const group = d3.select(this.parentNode as Element);
             const newX = timeScale(clampedTime);
             const newW = timeScale(d.duration + d.start) - newX;
             
             group.select("rect.clip-body").attr("x", newX).attr("width", newW);
             d3.select(this).attr("x", newX); 

             (d as any)._tempUpdates = { start: clampedTime, duration: newDuration, offset: newOffset };
        })
        .on("end", function(event, d) {
             const updates = (d as any)._tempUpdates;
             if (updates) onClipUpdate(d.id, updates);
        });

    const dragEndHandle = d3.drag<SVGRectElement, Clip>()
        .on("start", (e) => e.sourceEvent.stopPropagation())
        .on("drag", function(event, d) {
             const mouseTime = timeScale.invert(event.x);
             const minTime = d.start + 0.1;
             const clampedTime = Math.max(minTime, mouseTime);
             const newDuration = clampedTime - d.start;

             const group = d3.select(this.parentNode as Element);
             const x = timeScale(d.start);
             const newW = timeScale(clampedTime) - x;
             
             group.select("rect.clip-body").attr("width", newW);
             d3.select(this).attr("x", x + newW - 6);

             (d as any)._tempUpdates = { duration: newDuration };
        })
        .on("end", function(event, d) {
             const updates = (d as any)._tempUpdates;
             if (updates) onClipUpdate(d.id, updates);
        });


    // 3. Render Clips
    clips.forEach(clip => {
      const trackIndex = tracks.findIndex(t => t.id === clip.trackId);
      if (trackIndex === -1) return;

      const y = RULER_HEIGHT + trackIndex * TRACK_HEIGHT + 12;
      const h = TRACK_HEIGHT - 8; 
      const x = timeScale(clip.start);
      const w = Math.max(4, timeScale(clip.start + clip.duration) - timeScale(clip.start));

      const group = clipsLayer.append("g")
        .datum(clip)
        .attr("class", "clip-group cursor-pointer")
        .on("click", () => onClipSelect(clip.id));

      // Bind main move drag
      group.call(dragMove as any);

      let clipFill = "#3f3f46"; 
      let clipStroke = "#52525b";
      if (clip.type === MediaType.VIDEO || clip.type === MediaType.IMAGE) {
         clipFill = "#0e7490"; clipStroke = "#06b6d4";
      } else if (clip.type === MediaType.AUDIO) {
         clipFill = "#064e3b"; clipStroke = "#10b981";
      } else if (clip.type === MediaType.TEXT) {
         clipFill = "#7c2d12"; clipStroke = "#f97316";
      }
      const isSelected = clip.id === state.selectedClipId;

      // Clip Body
      group.append("rect")
        .attr("class", "clip-body")
        .attr("x", x).attr("y", y).attr("width", w).attr("height", h)
        .attr("rx", 4)
        .attr("fill", isSelected ? d3.color(clipFill)?.brighter(0.2)?.toString() || clipFill : clipFill) 
        .attr("stroke", isSelected ? "#ffffff" : clipStroke)
        .attr("stroke-width", isSelected ? 2 : 1);

      // --- VISUAL TRANSITION RAMPS (Fade In/Out) ---
      if (clip.properties.fadeIn && clip.properties.fadeIn > 0) {
          const fadeW = timeScale(clip.properties.fadeIn);
          if (fadeW < w) {
             // Draw a small opacity ramp triangle/rect
             group.append("path")
                .attr("d", `M ${x} ${y+h} L ${x} ${y} L ${x+fadeW} ${y} Z`)
                .attr("fill", "white")
                .attr("opacity", 0.3)
                .attr("pointer-events", "none");
          }
      }
      if (clip.properties.fadeOut && clip.properties.fadeOut > 0) {
          const fadeW = timeScale(clip.properties.fadeOut);
          if (fadeW < w) {
             group.append("path")
                .attr("d", `M ${x+w} ${y+h} L ${x+w} ${y} L ${x+w-fadeW} ${y} Z`)
                .attr("fill", "white")
                .attr("opacity", 0.3)
                .attr("pointer-events", "none");
          }
      }

      // Handles
      if (isSelected) {
        group.append("rect")
            .attr("class", "clip-handle handle-start")
            .attr("x", x).attr("y", y).attr("width", 10).attr("height", h).attr("rx", 2)
            .attr("fill", "white").attr("opacity", 0.3)
            .style("cursor", "ew-resize")
            .call(dragStartHandle as any);

        group.append("rect")
            .attr("class", "clip-handle handle-end")
            .attr("x", x + w - 10).attr("y", y).attr("width", 10).attr("height", h).attr("rx", 2)
            .attr("fill", "white").attr("opacity", 0.3)
            .style("cursor", "ew-resize")
            .call(dragEndHandle as any);
      }

      group.append("text")
        .attr("x", x + 8).attr("y", y + h/2 + 4)
        .text(clip.name)
        .attr("fill", "#e4e4e7").attr("font-size", "11px").attr("font-family", "sans-serif")
        .style("pointer-events", "none")
        .each(function() {
            if ((this as SVGTextElement).getComputedTextLength() > w - 10) d3.select(this).text("");
        });
    });

    // 4. Playhead
    const playheadDrag = d3.drag<SVGGElement, unknown>()
       .on("start", function() { d3.select(this).attr("cursor", "ew-resize"); })
       .on("drag", function(event) {
           let newTime = timeScale.invert(event.x);
           newTime = Math.max(0, Math.min(state.duration, newTime));
           d3.select(this).select("line").attr("x1", event.x).attr("x2", event.x);
           d3.select(this).select("rect").attr("x", event.x - 5);
           d3.select(this).select("path").attr("transform", `translate(${event.x - timeScale(state.currentTime)}, 0)`);
           onTimeUpdate(newTime);
       });

    const playheadGroup = playheadLayer.append("g").call(playheadDrag as any).style("cursor", "ew-resize");
    const phX = timeScale(state.currentTime);
    
    playheadGroup.append("line").attr("x1", phX).attr("y1", RULER_HEIGHT).attr("x2", phX).attr("y2", totalHeight).attr("stroke", "#06b6d4").attr("stroke-width", 1);
    playheadGroup.append("rect").attr("x", phX - 5).attr("y", RULER_HEIGHT).attr("width", 10).attr("height", totalHeight).attr("fill", "transparent");
    playheadGroup.append("path").attr("d", `M ${phX} ${RULER_HEIGHT} L ${phX - 6} ${RULER_HEIGHT - 8} L ${phX - 6} ${RULER_HEIGHT - 16} L ${phX + 6} ${RULER_HEIGHT - 16} L ${phX + 6} ${RULER_HEIGHT - 8} Z`).attr("fill", "#06b6d4");

  }, [tracks, clips, state.duration, state.zoomLevel, state.currentTime, state.selectedClipId, timeScale]);

  const handleSvgClick = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const target = e.target as Element;
    if (target.tagName === 'rect' && (target.parentElement?.classList.contains('tracks-layer') || target.parentElement?.classList.contains('ruler-layer'))) {
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        onTimeUpdate(Math.max(0, Math.min(state.duration, timeScale.invert(x))));
    }
  };

  return (
    <div className="flex flex-col h-full select-none bg-[#131313] border-t border-[#252525]">
      <div className="h-10 flex items-center px-4 bg-[#171717] border-b border-[#252525] justify-between text-[#a1a1aa]">
        <div className="flex items-center gap-4">
           <div className="flex items-center bg-[#252525] rounded p-0.5">
              <button className="p-1.5 text-white bg-[#3f3f46] rounded shadow-sm"><MousePointer2 size={14} /></button>
              <button className="p-1.5 hover:text-white hover:bg-[#3f3f46] rounded"><ChevronDown size={12} /></button>
           </div>
           <div className="w-px h-4 bg-[#3f3f46]" />
           <div className="flex items-center gap-1">
             <button onClick={onUndo} className="p-1.5 hover:text-white hover:bg-[#252525] rounded" title="Undo"><Undo2 size={14} /></button>
             <button onClick={onRedo} className="p-1.5 hover:text-white hover:bg-[#252525] rounded" title="Redo"><Redo2 size={14} /></button>
           </div>
           <div className="w-px h-4 bg-[#3f3f46]" />
           <div className="flex items-center gap-1">
             <button onClick={onSplit} className="p-1.5 hover:text-white hover:bg-[#252525] rounded" title="Split"><Scissors size={14} /></button>
             <button onClick={onDelete} className="p-1.5 hover:text-white hover:bg-[#252525] rounded" title="Delete"><Trash2 size={14} /></button>
             <button onClick={onRippleDelete} className="p-1.5 hover:text-white hover:bg-[#252525] rounded" title="Ripple Delete"><ArrowLeftFromLine size={14} /></button>
             <button className="p-1.5 hover:text-white hover:bg-[#252525] rounded" title="Add Marker"><Flag size={14} /></button>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <button className="p-1.5 text-cyan-400 bg-[#132d35] rounded border border-cyan-900/50"><Magnet size={14} /></button>
             <button className="p-1.5 hover:text-white hover:bg-[#252525]"><Link size={14} /></button>
           </div>
           <div className="flex items-center gap-2 w-32">
              <button onClick={() => onStateChange({ zoomLevel: Math.max(10, state.zoomLevel - 10) })}>-</button>
              <input type="range" min="10" max="200" value={state.zoomLevel} onChange={(e) => onStateChange({ zoomLevel: Number(e.target.value) })} className="flex-1 h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
              <button onClick={() => onStateChange({ zoomLevel: Math.min(200, state.zoomLevel + 10) })}>+</button>
           </div>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-auto relative scrollbar-thin" onClick={handleSvgClick}>
        <svg ref={svgRef} className="block min-w-full" />
      </div>
    </div>
  );
};

