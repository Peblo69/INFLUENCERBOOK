import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Brush, Eraser, Hand, Undo, Redo, ZoomIn, ZoomOut, 
  Trash2, RotateCcw, MousePointer2, Circle, Droplet, Sun, 
  Layers, Eye, Zap, Move
} from 'lucide-react';

export const InpaintStudio: React.FC = () => {
  // --- State ---
  const [image, setImage] = useState<string | null>('https://picsum.photos/seed/portrait_woman/1920/1080');
  const [tool, setTool] = useState<'brush' | 'eraser' | 'pan' | 'select'>('brush');
  
  // Brush Properties
  const [brushSize, setBrushSize] = useState(80); // In canvas pixels
  const [brushHardness, setBrushHardness] = useState(100);
  const [brushOpacity, setBrushOpacity] = useState(100);
  
  // Viewport State
  const [zoom, setZoom] = useState(0.4); 
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  // Cursor State
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 }); // Screen coordinates
  const [isMouseOverImage, setIsMouseOverImage] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // --- Handlers ---

  const handleImageLoad = () => {
    if (canvasRef.current && imageRef.current) {
      canvasRef.current.width = imageRef.current.naturalWidth;
      canvasRef.current.height = imageRef.current.naturalHeight;
    }
  };

  // Helper: Map Screen Coordinates -> Canvas Coordinates
  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Scale factor (Screen Pixels to Canvas Pixels)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan' || e.button === 1) {
      setIsPanning(true);
      return;
    }
    
    // Only allow drawing if we are actually over the image
    if ((tool === 'brush' || tool === 'eraser') && isMouseOverImage) {
      setIsDrawing(true);
      const pos = getCanvasPoint(e.clientX, e.clientY);
      lastPos.current = pos;
      draw(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Update Cursor Position & Detection Logic
    setCursorPos({ x: e.clientX, y: e.clientY });

    // Check if mouse is strictly over the image canvas
    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const isOver = 
            e.clientX >= rect.left && 
            e.clientX <= rect.right && 
            e.clientY >= rect.top && 
            e.clientY <= rect.bottom;
        
        setIsMouseOverImage(isOver);
    } else {
        setIsMouseOverImage(false);
    }

    // 2. Handle Panning
    if (isPanning) {
      setPan(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
      return;
    }

    // 3. Handle Drawing
    if (isDrawing) {
      const pos = getCanvasPoint(e.clientX, e.clientY);
      draw(pos);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
    lastPos.current = null;
  };

  const draw = (pos: { x: number, y: number }) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPos.current) return;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSize; 

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      // Pastel Purple (purple-300 hex approx)
      ctx.strokeStyle = `rgba(216, 180, 254, ${brushOpacity / 100})`; 
      ctx.fillStyle = `rgba(216, 180, 254, ${brushOpacity / 100})`;
    }

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    lastPos.current = pos;
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const resetView = () => {
    setZoom(0.4);
    setPan({ x: 0, y: 0 });
  };

  // Determine the cursor style for the main container
  const getContainerCursor = () => {
      if (tool === 'pan' || isPanning) return 'cursor-grab';
      if (isPanning) return 'cursor-grabbing';
      if ((tool === 'brush' || tool === 'eraser') && isMouseOverImage) return 'cursor-none';
      return 'cursor-default';
  };

  // Auto-resize textarea logic
  useEffect(() => {
    if (promptInputRef.current) {
      promptInputRef.current.style.height = 'auto';
      const scrollHeight = promptInputRef.current.scrollHeight;
      promptInputRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [prompt]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#030303] relative overflow-hidden select-none group font-sans">
      
      {/* 1. TECHNICAL GRID BACKGROUND (Dots & Lines) */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: `${pan.x % 40}px ${pan.y % 40}px`,
        }}
      >
        {/* Subtle Dots at intersections (simulated via another gradient layer) */}
         <div 
            className="absolute inset-0"
            style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                backgroundPosition: `${pan.x % 40}px ${pan.y % 40}px`,
            }} 
         />
      </div>

      {/* 2. HEADER */}
      <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-30 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-lg shadow-xl ring-1 ring-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-zinc-300 font-display tracking-wider">1920 x 1080</span>
              </div>
          </div>
          <div className="pointer-events-auto flex gap-1 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-lg p-1 shadow-xl ring-1 ring-white/5">
              <button className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors" title="Undo">
                  <Undo size={14} />
              </button>
              <div className="w-px h-auto bg-white/10 my-1"></div>
              <button className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors" title="Redo">
                  <Redo size={14} />
              </button>
          </div>
      </div>

      {/* 3. LEFT TOOLBAR - Compact & Purple */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4">
         <div className="flex flex-col gap-1.5 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-xl shadow-2xl ring-1 ring-white/5">
             <ToolButton 
                active={tool === 'select'} 
                onClick={() => setTool('select')}
                icon={<MousePointer2 size={18} />}
                tooltip="Select (V)"
             />
             <div className="h-px w-full bg-white/5 mx-auto w-[80%]" />
             <ToolButton 
                active={tool === 'brush'} 
                onClick={() => setTool('brush')}
                icon={<Brush size={18} />}
                activeColor="text-purple-300"
                tooltip="Brush (B)"
             />
             <ToolButton 
                active={tool === 'eraser'} 
                onClick={() => setTool('eraser')}
                icon={<Eraser size={18} />}
                activeColor="text-red-400"
                tooltip="Eraser (E)"
             />
             <div className="h-px w-full bg-white/5 mx-auto w-[80%]" />
             <ToolButton 
                active={tool === 'pan'} 
                onClick={() => setTool('pan')}
                icon={<Hand size={18} />}
                tooltip="Pan (Space)"
             />
         </div>
         
         <div className="flex flex-col gap-2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-xl shadow-2xl ring-1 ring-white/5">
             <ToolButton 
                active={false} 
                onClick={clearCanvas}
                icon={<Trash2 size={18} />}
                activeColor="text-red-500"
                tooltip="Clear Mask"
             />
         </div>
      </div>

      {/* 4. RIGHT PANEL - Technical & Spacious */}
      <div className="absolute right-6 top-24 bottom-32 w-64 flex flex-col gap-3 pointer-events-none z-30">
          <div className="pointer-events-auto bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl ring-1 ring-white/5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display">Brush Settings</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(216,180,254,0.5)]"></div>
              </div>
              
              <div className="space-y-3">
                  <div className="flex justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 font-medium"><Circle size={10} /> Size</span>
                      <span className="font-mono text-[10px]">{brushSize}px</span>
                  </div>
                  <input 
                    type="range" min="10" max="500" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-purple-400 cursor-pointer hover:accent-purple-300"
                  />
              </div>

              <div className="space-y-3">
                  <div className="flex justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 font-medium"><Sun size={10} /> Hardness</span>
                      <span className="font-mono text-[10px]">{brushHardness}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={brushHardness} 
                    onChange={(e) => setBrushHardness(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-purple-400 cursor-pointer hover:accent-purple-300"
                  />
              </div>

              <div className="space-y-3">
                  <div className="flex justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 font-medium"><Droplet size={10} /> Opacity</span>
                      <span className="font-mono text-[10px]">{brushOpacity}%</span>
                  </div>
                  <input 
                    type="range" min="1" max="100" 
                    value={brushOpacity} 
                    onChange={(e) => setBrushOpacity(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-purple-400 cursor-pointer hover:accent-purple-300"
                  />
              </div>
          </div>

          <div className="pointer-events-auto flex-1 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl ring-1 ring-white/5 overflow-hidden flex flex-col">
               <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display">Layers</span>
                  <Layers size={12} className="text-zinc-500" />
              </div>
              <div className="space-y-1.5">
                  <div className="flex items-center gap-2 p-2 bg-zinc-800/40 rounded-lg border border-purple-500/20 cursor-pointer hover:bg-zinc-800 transition-colors group">
                      <Eye size={12} className="text-zinc-500 group-hover:text-zinc-300" />
                      <div className="w-6 h-6 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <Brush size={10} className="text-purple-400" />
                      </div>
                      <span className="text-xs font-medium text-zinc-200">Inpaint Mask</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-transparent hover:bg-white/5 transition-colors cursor-pointer group">
                      <Eye size={12} className="text-zinc-500 group-hover:text-zinc-300" />
                      <div className="w-6 h-6 rounded bg-zinc-700 overflow-hidden">
                          <img src={image || ''} className="w-full h-full object-cover opacity-50" />
                      </div>
                      <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors">Original</span>
                  </div>
              </div>
          </div>

          <div className="pointer-events-auto bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl ring-1 ring-white/5 flex items-center justify-between">
              <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"><ZoomOut size={14} /></button>
              <span className="text-xs font-mono font-bold text-zinc-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(z + 0.1, 5))} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"><ZoomIn size={14} /></button>
              <div className="w-px h-3 bg-white/10 mx-1"></div>
              <button onClick={resetView} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"><RotateCcw size={14} /></button>
          </div>
      </div>


      {/* 5. MAIN WORKSPACE AREA */}
      <div 
        ref={containerRef}
        className={`w-full h-full overflow-hidden relative touch-none ${getContainerCursor()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
            handleMouseUp();
            setIsMouseOverImage(false); // Reset on exit
        }}
      >
          {/* CUSTOM CURSOR OVERLAY */}
          {(tool === 'brush' || tool === 'eraser') && isMouseOverImage && !isPanning && (
              <div 
                className="pointer-events-none fixed z-50 rounded-full border border-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                    width: brushSize * zoom, 
                    height: brushSize * zoom,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: tool === 'eraser' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(216, 180, 254, 0.2)', // Red or Pastel Purple
                    borderColor: tool === 'eraser' ? '#ef4444' : '#e9d5ff',
                    willChange: 'left, top'
                }}
              />
          )}

          {/* INFINITE CANVAS WRAPPER */}
          <div 
            style={{ 
               position: 'absolute',
               left: '50%',
               top: '50%',
               transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
               transformOrigin: 'center center',
            }}
            className="shadow-2xl"
          >
            {/* IMAGE LAYER */}
            <img 
               ref={imageRef}
               src={image || ''} 
               alt="Workspace"
               className="block max-w-none pointer-events-none select-none shadow-[0_0_50px_rgba(0,0,0,0.5)]"
               onLoad={handleImageLoad}
               draggable={false}
            />
            
            {/* CANVAS DRAWING LAYER */}
            <canvas
               ref={canvasRef}
               className="absolute inset-0 w-full h-full pointer-events-none" 
            />
          </div>
          
          {/* EMPTY STATE */}
          {!image && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl p-12 bg-zinc-900/50 pointer-events-auto cursor-pointer hover:border-purple-500/50 hover:bg-zinc-900/80 transition-all">
                    <Upload size={40} className="text-zinc-600 mb-4" />
                    <span className="text-zinc-400 font-bold font-display tracking-wide">Upload Image</span>
                </div>
            </div>
          )}
      </div>

      {/* 6. BOTTOM PROMPT BAR */}
      <div className="absolute bottom-8 left-0 right-0 px-4 flex justify-center z-40 pointer-events-none">
         <div className="pointer-events-auto w-full max-w-2xl bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl ring-1 ring-white/5 flex items-end gap-2">
            <div className="pl-3 pr-2 mb-[1px]">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center">
                    <Zap size={16} className="text-purple-400 fill-purple-400" />
                </div>
            </div>
            <div className="h-8 w-px bg-white/10 mx-1 mb-[1px]"></div>
            
            {/* Auto-expanding Textarea */}
            <textarea
                ref={promptInputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what to fill in the masked area..."
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm font-medium min-h-[40px] px-2 py-2.5 font-sans resize-none custom-scrollbar leading-relaxed"
                style={{ maxHeight: '120px' }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        setIsGenerating(true); 
                        setTimeout(() => setIsGenerating(false), 2000);
                    }
                }}
            />

            <button 
                onClick={() => { setIsGenerating(true); setTimeout(() => setIsGenerating(false), 2000); }}
                className={`h-10 px-6 rounded-xl font-bold font-display uppercase tracking-wide text-xs transition-all duration-300 flex items-center gap-2 mb-[1px] ${
                    isGenerating 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : 'bg-gradient-brand hover:bg-gradient-brand-hover text-black shadow-[0_0_20px_rgba(232,121,249,0.3)] hover:shadow-[0_0_30px_rgba(232,121,249,0.5)]'
                }`}
            >
                {isGenerating ? 'Processing...' : 'Generate'}
                {!isGenerating && <Zap size={14} className="fill-black" />}
            </button>
         </div>
      </div>
    </div>
  );
};

// Helper Component for Tools
const ToolButton = ({ 
    active, 
    onClick, 
    icon, 
    activeColor = 'text-white', 
    tooltip 
}: { 
    active: boolean, 
    onClick: () => void, 
    icon: React.ReactNode, 
    activeColor?: string,
    tooltip?: string 
}) => (
    <div className="relative group">
        <button 
        onClick={onClick}
        className={`p-2.5 rounded-lg transition-all duration-200 relative ${
            active 
            ? 'bg-zinc-800 border border-white/10 shadow-inner' 
            : 'text-zinc-500 hover:text-white hover:bg-white/5'
        }`}
        >
        <div className={`relative z-10 ${active ? activeColor : ''}`}>
            {icon}
        </div>
        {active && (
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-current rounded-r-md ${activeColor.replace('text-', 'bg-')}`}></div>
        )}
        </button>
        {tooltip && (
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-black border border-white/10 rounded text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-50 font-display tracking-wide">
                {tooltip}
            </div>
        )}
    </div>
);