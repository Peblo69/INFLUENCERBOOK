import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Brush,
  Circle,
  Download,
  Droplet,
  Eraser,
  Eye,
  Hand,
  ImagePlus,
  Layers,
  MousePointer2,
  Redo,
  RotateCcw,
  Sun,
  Trash2,
  Undo,
  Upload,
  Zap,
  ZoomIn,
  ZoomOut,
  Wand2,
  Sparkles,
  Grid3X3,
  Type,
  Palette,
  Move,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { kiaraInpaint } from "@/services/kiaraGateway";

const inpaintStyles = `
  .font-display {
    font-family: "Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif;
    letter-spacing: 0.02em;
  }

  .bg-gradient-brand {
    background-image: linear-gradient(135deg, #c084fc 0%, #818cf8 50%, #60a5fa 100%);
  }

  .bg-gradient-brand-hover {
    background-image: linear-gradient(135deg, #a78bfa 0%, #6366f1 50%, #3b82f6 100%);
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .glass-panel {
    background: rgba(8, 8, 8, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .glass-panel-hover:hover {
    background: rgba(12, 12, 12, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .tool-btn {
    position: relative;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .tool-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .tool-btn:hover::before {
    opacity: 1;
  }

  .tool-btn.active {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 20px rgba(192, 132, 252, 0.15);
  }

  .tool-btn.active::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 16px;
    background: linear-gradient(180deg, #c084fc 0%, #818cf8 100%);
    border-radius: 0 3px 3px 0;
  }

  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: rgba(255, 255, 255, 0.35);
  }

  .slider-track {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 2px;
    outline: none;
  }

  .slider-track::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: linear-gradient(135deg, #c084fc 0%, #818cf8 100%);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid rgba(8, 8, 8, 0.9);
    box-shadow: 0 0 10px rgba(192, 132, 252, 0.4);
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .slider-track::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 15px rgba(192, 132, 252, 0.6);
  }

  .generate-btn {
    position: relative;
    overflow: hidden;
  }

  .generate-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transform: translateX(-100%);
    transition: transform 0.6s;
  }

  .generate-btn:hover::before {
    transform: translateX(100%);
  }

  .layer-item {
    transition: all 0.2s ease;
  }

  .layer-item:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .layer-item.active {
    background: rgba(192, 132, 252, 0.08);
    border: 1px solid rgba(192, 132, 252, 0.2);
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 5px rgba(192, 132, 252, 0.3); }
    50% { box-shadow: 0 0 20px rgba(192, 132, 252, 0.5); }
  }

  .pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }
`;

export const InpaintStudio = () => {
  const { t } = useI18n();

  // Image state (replaces hardcoded URL)
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [previousImageSrc, setPreviousImageSrc] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ w: 0, h: 0 });
  const [error, setError] = useState<string | null>(null);

  const [tool, setTool] = useState<"brush" | "eraser" | "pan" | "select">("brush");

  const [brushSize, setBrushSize] = useState(80);
  const [brushHardness, setBrushHardness] = useState(100);
  const [brushOpacity, setBrushOpacity] = useState(100);

  const [zoom, setZoom] = useState(0.4);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isMouseOverImage, setIsMouseOverImage] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageLoad = () => {
    if (canvasRef.current && imageRef.current) {
      canvasRef.current.width = imageRef.current.naturalWidth;
      canvasRef.current.height = imageRef.current.naturalHeight;
      setImageDimensions({
        w: imageRef.current.naturalWidth,
        h: imageRef.current.naturalHeight,
      });
    }
  };

  // Upload image from file picker or drag-drop
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreviousImageSrc(imageSrc);
    setImageSrc(url);
    clearCanvas();
    setError(null);
  };

  // Cap dimensions to avoid blowing edge function memory limits
  const MAX_INPAINT_DIM = 1024;
  const getScaledDims = (w: number, h: number) => {
    if (w <= MAX_INPAINT_DIM && h <= MAX_INPAINT_DIM) return { w, h };
    const scale = MAX_INPAINT_DIM / Math.max(w, h);
    return { w: Math.round(w * scale), h: Math.round(h * scale) };
  };

  // Export original image as base64 data URI (resized to max 1024px)
  const exportImageAsDataUri = (): string => {
    const img = imageRef.current!;
    const { w, h } = getScaledDims(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/png");
  };

  // Export mask with inverted alpha (purple painted → transparent for OpenAI)
  const exportMaskAsDataUri = (): string => {
    const canvas = canvasRef.current!;
    const img = imageRef.current!;
    const { w, h } = getScaledDims(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(canvas, 0, 0, w, h);
    return c.toDataURL("image/png");
  };

  // Wire Generate button to OpenAI inpaint API
  const handleGenerate = async () => {
    if (!prompt.trim() || !imageSrc || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const imageData = exportImageAsDataUri();
      const maskData = exportMaskAsDataUri();
      const result = await kiaraInpaint({
        image: imageData,
        mask: maskData,
        prompt: prompt.trim(),
      });
      if (result.success && result.output) {
        setPreviousImageSrc(imageSrc);
        setImageSrc(result.output);
        clearCanvas();
        setPrompt("");
      } else {
        setError("Generation returned no output");
      }
    } catch (err: any) {
      console.error("[InpaintStudio] Generate error:", err);
      setError(err.message || "Inpainting failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download current image
  const handleDownload = () => {
    if (!imageSrc) return;
    const a = document.createElement("a");
    a.href = imageSrc;
    a.download = `kiara-inpaint-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Undo — revert to previous image
  const handleUndo = () => {
    if (!previousImageSrc) return;
    setImageSrc(previousImageSrc);
    setPreviousImageSrc(null);
    clearCanvas();
  };

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const draw = (pos: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastPos.current) {
      return;
    }

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = brushSize;

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = `rgba(192, 132, 252, ${brushOpacity / 100})`;
      ctx.fillStyle = `rgba(192, 132, 252, ${brushOpacity / 100})`;
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === "pan" || e.button === 1) {
      setIsPanning(true);
      return;
    }

    if ((tool === "brush" || tool === "eraser") && isMouseOverImage) {
      setIsDrawing(true);
      const pos = getCanvasPoint(e.clientX, e.clientY);
      lastPos.current = pos;
      draw(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });

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

    if (isPanning) {
      setPan((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
      return;
    }

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

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const resetView = () => {
    setZoom(0.4);
    setPan({ x: 0, y: 0 });
  };

  const getContainerCursor = () => {
    if (isPanning) {
      return "cursor-grabbing";
    }
    if (tool === "pan") {
      return "cursor-grab";
    }
    if ((tool === "brush" || tool === "eraser") && isMouseOverImage) {
      return "cursor-none";
    }
    return "cursor-default";
  };

  useEffect(() => {
    if (promptInputRef.current) {
      promptInputRef.current.style.height = "auto";
      const scrollHeight = promptInputRef.current.scrollHeight;
      promptInputRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [prompt]);

  return (
    <div className="flex flex-col h-screen bg-[#050505] relative overflow-hidden select-none group font-sans">
      <style>{inpaintStyles}</style>

      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          backgroundPosition: `${pan.x % 40}px ${pan.y % 40}px`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            backgroundPosition: `${pan.x % 40}px ${pan.y % 40}px`,
          }}
        />
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-30 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          {imageDimensions.w > 0 && (
            <div className="glass-panel rounded-xl px-4 py-2 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow" />
              <span className="text-[11px] font-semibold text-white/70 font-display tracking-wide">
                {imageDimensions.w} × {imageDimensions.h}
              </span>
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="glass-panel glass-panel-hover rounded-xl px-4 py-2 flex items-center gap-2.5 text-white/50 hover:text-white transition-all duration-200"
            title={imageSrc ? t("Change Image") : t("Upload Image")}
          >
            <ImagePlus size={15} className="text-white/60" />
            <span className="text-[11px] font-semibold tracking-wide">
              {imageSrc ? t("Change") : t("Upload")}
            </span>
          </button>
          {imageSrc && (
            <button
              onClick={handleDownload}
              className="glass-panel glass-panel-hover rounded-xl px-4 py-2 flex items-center gap-2.5 text-white/50 hover:text-white transition-all duration-200"
              title={t("Download")}
            >
              <Download size={15} className="text-white/60" />
              <span className="text-[11px] font-semibold tracking-wide">{t("Save")}</span>
            </button>
          )}
        </div>

        {/* Undo/Redo */}
        <div className="pointer-events-auto glass-panel rounded-xl p-1 flex gap-0.5">
          <button
            onClick={handleUndo}
            disabled={!previousImageSrc}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              previousImageSrc 
                ? 'text-white/50 hover:text-white hover:bg-white/5' 
                : 'text-white/15 cursor-not-allowed'
            }`}
            title={t("Undo")}
          >
            <Undo size={16} />
          </button>
          <div className="w-px bg-white/5 my-1.5" />
          <button 
            className="p-2.5 text-white/15 cursor-not-allowed rounded-lg" 
            title={t("Redo")}
          >
            <Redo size={16} />
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
          e.target.value = "";
        }}
      />

      {/* Error toast */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-xl">
          <span className="text-xs text-red-300 font-medium">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-4 text-red-400 hover:text-red-200 text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Left Toolbar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4">
        {/* Main Tools */}
        <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1">
          <ToolButton
            active={tool === "select"}
            onClick={() => setTool("select")}
            icon={<MousePointer2 size={18} strokeWidth={1.5} />}
            tooltip={t("Select (V)")}
          />
          <div className="h-px bg-white/5 mx-2 my-1" />
          <ToolButton
            active={tool === "brush"}
            onClick={() => setTool("brush")}
            icon={<Brush size={18} strokeWidth={1.5} />}
            activeColor="text-purple-300"
            tooltip={t("Brush (B)")}
          />
          <ToolButton
            active={tool === "eraser"}
            onClick={() => setTool("eraser")}
            icon={<Eraser size={18} strokeWidth={1.5} />}
            activeColor="text-red-400"
            tooltip={t("Eraser (E)")}
          />
          <div className="h-px bg-white/5 mx-2 my-1" />
          <ToolButton
            active={tool === "pan"}
            onClick={() => setTool("pan")}
            icon={<Hand size={18} strokeWidth={1.5} />}
            tooltip={t("Pan (Space)")}
          />
        </div>

        {/* Actions */}
        <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1">
          <ToolButton
            active={false}
            onClick={clearCanvas}
            icon={<Trash2 size={18} strokeWidth={1.5} />}
            activeColor="text-red-400"
            tooltip={t("Clear Mask")}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="absolute right-6 top-24 bottom-32 w-72 flex flex-col gap-4 pointer-events-none z-30">
        {/* Brush Settings */}
        <div className="pointer-events-auto glass-panel rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                <Palette size={14} className="text-purple-400" />
              </div>
              <span className="section-title">{t("Brush Settings")}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]" />
          </div>

          {/* Size */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-white/50">
                <Circle size={12} />
                <span className="text-[12px] font-medium">{t("Size")}</span>
              </div>
              <span className="text-[11px] font-mono text-white/40 bg-white/[0.05] px-2 py-0.5 rounded">
                {brushSize}px
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="slider-track w-full"
            />
          </div>

          {/* Hardness */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-white/50">
                <Sun size={12} />
                <span className="text-[12px] font-medium">{t("Hardness")}</span>
              </div>
              <span className="text-[11px] font-mono text-white/40 bg-white/[0.05] px-2 py-0.5 rounded">
                {brushHardness}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={brushHardness}
              onChange={(e) => setBrushHardness(Number(e.target.value))}
              className="slider-track w-full"
            />
          </div>

          {/* Opacity */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-white/50">
                <Droplet size={12} />
                <span className="text-[12px] font-medium">{t("Opacity")}</span>
              </div>
              <span className="text-[11px] font-mono text-white/40 bg-white/[0.05] px-2 py-0.5 rounded">
                {brushOpacity}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={brushOpacity}
              onChange={(e) => setBrushOpacity(Number(e.target.value))}
              className="slider-track w-full"
            />
          </div>
        </div>

        {/* Layers Panel */}
        <div className="pointer-events-auto glass-panel rounded-2xl p-5 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                <Layers size={14} className="text-white/50" />
              </div>
              <span className="section-title">{t("Layers")}</span>
            </div>
            <span className="text-[10px] text-white/30 font-mono">2</span>
          </div>
          
          <div className="space-y-2">
            {/* Mask Layer */}
            <div className="layer-item active flex items-center gap-3 p-3 rounded-xl cursor-pointer group">
              <Eye size={14} className="text-purple-400/70 group-hover:text-purple-400" />
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center">
                <Brush size={12} className="text-purple-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white/80 truncate">{t("Inpaint Mask")}</p>
                <p className="text-[10px] text-white/30">Active</p>
              </div>
            </div>

            {/* Original Layer */}
            <div className="layer-item flex items-center gap-3 p-3 rounded-xl cursor-pointer group border border-transparent hover:border-white/[0.05]">
              <Eye size={14} className="text-white/30 group-hover:text-white/50" />
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] overflow-hidden flex items-center justify-center">
                {imageSrc ? (
                  <img src={imageSrc} alt={t("Original")} className="w-full h-full object-cover opacity-40" />
                ) : (
                  <div className="w-full h-full bg-white/[0.03]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white/50 group-hover:text-white/70 transition-colors truncate">
                  {t("Original Image")}
                </p>
                <p className="text-[10px] text-white/20">Base</p>
              </div>
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="pointer-events-auto glass-panel rounded-2xl p-2 flex items-center justify-between">
          <button 
            onClick={() => setZoom((z) => Math.max(z - 0.1, 0.1))} 
            className="p-2.5 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-[12px] font-mono font-semibold text-white/60 w-14 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={() => setZoom((z) => Math.min(z + 0.1, 5))} 
            className="p-2.5 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all"
          >
            <ZoomIn size={16} />
          </button>
          <div className="w-px h-4 bg-white/5 mx-1" />
          <button 
            onClick={resetView} 
            className="p-2.5 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all"
            title="Reset View"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className={`w-full h-full overflow-hidden relative touch-none ${getContainerCursor()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setIsMouseOverImage(false);
        }}
      >
        {/* Custom Cursor */}
        {(tool === "brush" || tool === "eraser") && isMouseOverImage && !isPanning && (
          <div
            className="pointer-events-none fixed z-50 rounded-full border-2 shadow-lg"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              width: brushSize * zoom,
              height: brushSize * zoom,
              transform: "translate(-50%, -50%)",
              backgroundColor:
                tool === "eraser" ? "rgba(239, 68, 68, 0.15)" : "rgba(192, 132, 252, 0.15)",
              borderColor: tool === "eraser" ? "rgba(239, 68, 68, 0.5)" : "rgba(192, 132, 252, 0.6)",
              boxShadow: tool === "eraser" 
                ? "0 0 20px rgba(239, 68, 68, 0.3)" 
                : "0 0 20px rgba(192, 132, 252, 0.3)",
              willChange: "left, top",
            }}
          />
        )}

        {/* Image + Canvas */}
        {imageSrc && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
            className="shadow-2xl"
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt={t("Workspace")}
              crossOrigin="anonymous"
              className="block max-w-none pointer-events-none select-none shadow-[0_0_60px_rgba(0,0,0,0.6)]"
              onLoad={handleImageLoad}
              draggable={false}
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          </div>
        )}

        {/* Empty State / Upload */}
        {!imageSrc && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              className="pointer-events-auto flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl p-20 bg-white/[0.02] hover:bg-white/[0.04] hover:border-purple-500/30 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Upload size={32} className="text-white/20 group-hover:text-purple-400/60 transition-colors" />
              </div>
              <span className="text-white/50 font-semibold text-base mb-2">{t("Upload Image")}</span>
              <span className="text-white/25 text-sm">{t("Drop an image or click to browse")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Prompt Bar */}
      <div className="absolute bottom-8 left-0 right-0 px-4 flex justify-center z-40 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl glass-panel rounded-2xl p-2 flex items-end gap-3">
          {/* AI Icon */}
          <div className="pl-2 pb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center">
              <Wand2 size={18} className="text-purple-300" />
            </div>
          </div>

          <div className="h-8 w-px bg-white/5 mb-2.5" />

          {/* Textarea */}
          <textarea
            ref={promptInputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("Describe what to generate in the masked area...")}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm font-medium min-h-[44px] px-2 py-3 resize-none custom-scrollbar leading-relaxed"
            style={{ maxHeight: "120px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !imageSrc || !prompt.trim()}
            className={`generate-btn h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2 mb-0.5 shrink-0 ${
              isGenerating || !imageSrc || !prompt.trim()
                ? "bg-white/[0.05] text-white/30 cursor-not-allowed"
                : "bg-gradient-brand hover:bg-gradient-brand-hover text-black shadow-[0_0_30px_rgba(192,132,252,0.25)] hover:shadow-[0_0_40px_rgba(192,132,252,0.4)]"
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span>{t("Processing")}</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="fill-black" />
                <span>{t("Generate")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
type ToolButtonProps = {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  activeColor?: string;
  tooltip?: string;
};

const ToolButton = ({
  active,
  onClick,
  icon,
  activeColor = "text-white",
  tooltip,
}: ToolButtonProps) => (
  <div className="relative group">
    <button
      onClick={onClick}
      className={`tool-btn w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
        active
          ? `active ${activeColor}`
          : "text-white/35 hover:text-white/70"
      }`}
    >
      {icon}
    </button>
    {tooltip && (
      <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/90 border border-white/[0.08] rounded-lg text-[10px] font-semibold text-white/70 opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl">
        {tooltip}
      </div>
    )}
  </div>
);
