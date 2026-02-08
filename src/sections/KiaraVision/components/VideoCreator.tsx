import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Film,
  Layers,
  Maximize,
  Minimize,
  MonitorPlay,
  MoreHorizontal,
  Pause,
  Play,
  Sliders,
  Sparkles,
  Upload,
  Volume1,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const videoCreatorStyles = `
  .kv-font-display {
    font-family: "Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif;
    letter-spacing: 0.02em;
  }

  .kv-glass {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(20px);
  }

  .kv-glass-soft {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(14px);
  }

  .kv-panel-shadow {
    box-shadow:
      0 16px 40px rgba(0, 0, 0, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .kv-button-primary {
    background-image: linear-gradient(110deg, #ffffff 0%, #f4f4f5 40%, #d4d4d8 100%);
    color: #09090b;
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow:
      0 12px 30px rgba(255, 255, 255, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  .kv-button-primary:hover {
    filter: brightness(1.03);
    transform: translateY(-1px);
  }

  .kv-button-primary:active {
    transform: translateY(0);
  }

  .kv-chip-active {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.22);
    color: #fafafa;
  }

  .kv-ring-accent {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 0 0 6px rgba(255, 255, 255, 0.02);
  }

  .kv-surface-grid {
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 36px 36px;
  }

  .kv-noise-overlay {
    background-image: radial-gradient(rgba(255, 255, 255, 0.08) 0.6px, transparent 0.6px);
    background-size: 3px 3px;
    opacity: 0.14;
    mix-blend-mode: soft-light;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.18);
    border-radius: 999px;
  }

  .hide-scrollbar {
    scrollbar-width: none;
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .animate-kv-fade-up {
    animation: kv-fade-up 320ms ease-out;
  }

  .animate-kv-pulse {
    animation: kv-pulse 2s ease-in-out infinite;
  }

  .kv-render-path {
    stroke-dasharray: 80;
    stroke-dashoffset: 80;
    animation: kv-draw 1.9s linear infinite;
  }

  @keyframes kv-fade-up {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes kv-pulse {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes kv-draw {
    0% {
      stroke-dashoffset: 80;
    }
    100% {
      stroke-dashoffset: 0;
    }
  }
`;

const DURATION_OPTIONS = ["5s", "8s", "12s"] as const;
const RATIO_OPTIONS = ["16:9", "9:16", "1:1"] as const;

export const VideoCreator = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"text" | "image">("image");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<(typeof RATIO_OPTIONS)[number]>("16:9");
  const [selectedDuration, setSelectedDuration] = useState<(typeof DURATION_OPTIONS)[number]>("5s");

  const [dragActive, setDragActive] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoSrc, setVideoSrc] = useState(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => {
    return () => {
      if (uploadedMedia?.startsWith("blob:")) {
        URL.revokeObjectURL(uploadedMedia);
      }
    };
  }, [uploadedMedia]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 5000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const setMediaUrl = (nextUrl: string | null) => {
    setUploadedMedia((prev) => {
      if (prev?.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return nextUrl;
    });
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return;
    }
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) {
      return;
    }
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDown.current || !scrollRef.current) {
      return;
    }
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) {
      return;
    }
    if (videoRef.current.paused) {
      void videoRef.current.play();
      return;
    }
    videoRef.current.pause();
  };

  const toggleFullScreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsFullScreen((prev) => !prev);
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) {
      return;
    }

    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || Number.isNaN(seconds)) {
      return "00:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) {
      return;
    }

    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    setCurrentTime(current);
    setVideoDuration(total);
    if (total > 0) {
      setProgress((current / total) * 100);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * videoRef.current.duration;

    if (!Number.isNaN(newTime)) {
      videoRef.current.currentTime = newTime;
      setProgress(percentage * 100);
    }
  };

  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX size={18} />;
    }
    if (volume < 0.5) {
      return <Volume1 size={18} />;
    }
    return <Volume2 size={18} />;
  };

  return (
    <div className="relative h-full min-h-0 flex overflow-hidden bg-[#030303] text-white font-sans">
      <style>{videoCreatorStyles}</style>

      <div className="absolute inset-0 kv-surface-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 kv-noise-overlay pointer-events-none" />
      <div className="absolute -top-40 -right-10 w-[540px] h-[540px] rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 w-[420px] h-[420px] rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />

      <aside className="w-[390px] h-full border-r border-white/10 bg-black/40 backdrop-blur-2xl z-20 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="kv-glass-soft kv-panel-shadow rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl kv-glass-soft flex items-center justify-center">
                  <Film size={18} className="text-zinc-100" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{t("Studio")}</p>
                  <h2 className="kv-font-display text-sm font-semibold">{t("Video Creator")}</h2>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-full kv-glass-soft text-[10px] uppercase tracking-[0.15em] text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5">
                {t("Model Pro")} <ChevronDown size={11} />
              </button>
            </div>

            <div className="p-1 rounded-xl bg-black/40 border border-white/10 flex">
              <button
                onClick={() => setActiveTab("text")}
                className={`flex-1 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-semibold transition-all ${
                  activeTab === "text" ? "kv-chip-active" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t("Text")}
              </button>
              <button
                onClick={() => setActiveTab("image")}
                className={`flex-1 py-2 rounded-lg text-[10px] uppercase tracking-[0.18em] font-semibold transition-all ${
                  activeTab === "image" ? "kv-chip-active" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t("Image/Video")}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {activeTab === "image" && (
            <section className="kv-glass-soft kv-panel-shadow rounded-2xl p-4 animate-kv-fade-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{t("Reference")}</span>
                {uploadedMedia && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={10} /> {t("Ready")}
                  </span>
                )}
              </div>

              <div
                className={`relative group w-full aspect-video rounded-xl border border-dashed overflow-hidden transition-all cursor-pointer ${
                  dragActive
                    ? "border-zinc-200 bg-white/10"
                    : "border-white/20 bg-black/30 hover:bg-black/40 hover:border-white/30"
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
                  mediaType === "video" ? (
                    <video src={uploadedMedia} className="w-full h-full object-cover" autoPlay muted loop />
                  ) : (
                    <img src={uploadedMedia} alt="Reference" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                    <div className="w-10 h-10 rounded-full kv-glass-soft border border-white/20 flex items-center justify-center">
                      <Upload size={16} className={dragActive ? "text-white" : "text-zinc-400"} />
                    </div>
                    <span className="text-xs text-zinc-400">
                      {dragActive ? t("Drop to upload") : t("Drop or click media")}
                    </span>
                  </div>
                )}

                {uploadedMedia && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaUrl(null);
                      setMediaType(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </section>
          )}

          <section className="kv-glass-soft kv-panel-shadow rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{t("Prompt")}</span>
              <button className="px-2.5 py-1 rounded-full border border-white/15 text-[10px] uppercase tracking-[0.15em] text-zinc-400 hover:text-white hover:border-white/25 transition-colors flex items-center gap-1.5">
                <Sparkles size={11} /> {t("Enhance")}
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === "image"
                  ? t("Describe camera movement, pacing, and style...")
                  : t("A slow cinematic dolly through a neon rain alley...")
              }
              className="w-full h-32 rounded-xl bg-black/35 border border-white/10 p-3 text-[14px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/25 resize-none leading-relaxed"
            />
          </section>

          <section className="kv-glass-soft kv-panel-shadow rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{t("Duration")}</p>
                <div className="grid grid-cols-3 gap-1">
                  {DURATION_OPTIONS.map((value) => (
                    <button
                      key={value}
                      onClick={() => setSelectedDuration(value)}
                      className={`py-2 rounded-lg text-[11px] transition-colors border ${
                        selectedDuration === value
                          ? "kv-chip-active"
                          : "text-zinc-400 border-white/10 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{t("Aspect")}</p>
                <div className="grid grid-cols-3 gap-1">
                  {RATIO_OPTIONS.map((value) => (
                    <button
                      key={value}
                      onClick={() => setSelectedRatio(value)}
                      className={`py-2 rounded-lg text-[11px] transition-colors border ${
                        selectedRatio === value
                          ? "kv-chip-active"
                          : "text-zinc-400 border-white/10 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="w-full flex items-center justify-between rounded-xl border border-white/12 px-3.5 py-3 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-colors">
              <span className="flex items-center gap-2">
                <Sliders size={15} /> {t("Camera Controls")}
              </span>
              <ChevronDown size={14} />
            </button>
          </section>
        </div>

        <div className="p-5 border-t border-white/10 bg-black/40">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full h-11 rounded-xl kv-font-display text-[11px] uppercase tracking-[0.18em] font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              isGenerating
                ? "bg-zinc-900 text-zinc-500 border border-white/10 cursor-not-allowed"
                : "kv-button-primary"
            }`}
          >
            {isGenerating ? (
              <>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.25s]" />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.1s]" />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                {t("Rendering")}
              </>
            ) : (
              <>
                <Zap size={14} className="fill-black" /> {t("Generate Video")}
              </>
            )}
          </button>
          <p className="text-center mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            {t("Cost 25 credits")}
          </p>
        </div>
      </aside>

      <section className="flex-1 min-w-0 h-full flex flex-col relative z-10">
        <header className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-black/35 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-kv-pulse" />
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{t("Realtime Preview")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-xl kv-glass-soft text-zinc-400 hover:text-white transition-colors flex items-center justify-center">
              <Layers size={16} />
            </button>
            <button className="w-9 h-9 rounded-xl kv-glass-soft text-zinc-400 hover:text-white transition-colors flex items-center justify-center">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="w-full max-w-[1300px] mx-auto">
            <div className="kv-glass kv-panel-shadow rounded-[24px] p-4 sm:p-5">
              <div
                className={
                  isFullScreen
                    ? "fixed inset-0 z-[120] bg-black flex items-center justify-center animate-kv-fade-up"
                    : "relative w-full aspect-video rounded-[18px] overflow-hidden bg-[#050505] border border-white/10 kv-ring-accent"
                }
              >
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className={`object-contain ${isFullScreen ? "w-full h-full max-h-screen" : "w-full h-full"}`}
                  loop
                  playsInline
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                />

                {!isPlaying && currentTime === 0 && !isGenerating && (
                  <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cyberpunk_rain/1280/720')] bg-cover bg-center pointer-events-none">
                    <div className="absolute inset-0 bg-black/45" />
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-20 flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full animate-kv-pulse" />
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="url(#kv-gradient-render)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-20 h-20 relative z-10"
                      >
                        <defs>
                          <linearGradient id="kv-gradient-render" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#e4e4e7" />
                            <stop offset="50%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor="#a1a1aa" />
                          </linearGradient>
                        </defs>
                        <path className="kv-render-path" d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="kv-font-display text-sm tracking-[0.24em] uppercase text-zinc-100">{t("Rendering Sequence")}</p>
                      <p className="text-xs text-zinc-500 mt-2">{t("Building motion, lighting, and camera path")}</p>
                    </div>
                  </div>
                )}

                {!isPlaying && !isGenerating && (
                  <button onClick={togglePlay} className="absolute inset-0 z-10 flex items-center justify-center group">
                    <div className="w-20 h-20 rounded-full kv-glass border border-white/30 flex items-center justify-center transition-all group-hover:scale-105">
                      <Play size={34} className="fill-white text-white ml-1" />
                    </div>
                  </button>
                )}

                {isFullScreen && (
                  <button
                    onClick={toggleFullScreen}
                    className="absolute top-5 right-5 z-30 w-10 h-10 rounded-full kv-glass-soft text-white flex items-center justify-center"
                  >
                    <X size={18} />
                  </button>
                )}

                <div
                  className={`absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/55 to-transparent z-30 transition-opacity ${
                    isPlaying && !isFullScreen ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button onClick={togglePlay} className="text-zinc-100 hover:text-white transition-colors">
                      {isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
                    </button>

                    <span className="text-[11px] font-mono text-zinc-300 min-w-[86px]">
                      {formatTime(currentTime)} / {formatTime(videoDuration)}
                    </span>

                    <div className="flex-1 h-8 flex items-center cursor-pointer" onClick={handleSeek}>
                      <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white/90"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 group/vol">
                      <button onClick={toggleMute} className="text-zinc-300 hover:text-white transition-colors">
                        {renderVolumeIcon()}
                      </button>
                      <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-[width] duration-300">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-20 h-1.5 accent-white"
                        />
                      </div>
                    </div>

                    <div className="w-px h-4 bg-white/20" />

                    <button className="text-zinc-300 hover:text-white transition-colors" title={t("Download")}>
                      <Download size={18} />
                    </button>
                    <button
                      onClick={toggleFullScreen}
                      className="text-zinc-300 hover:text-white transition-colors"
                      title={isFullScreen ? t("Exit Fullscreen") : t("Fullscreen")}
                    >
                      {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[1300px] mx-auto kv-glass-soft kv-panel-shadow rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t("Recent Sessions")}</h3>
              <button className="text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">{t("View All")}</button>
            </div>

            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <button
                  key={i}
                  onClick={() => {
                    setVideoSrc(
                      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                    );
                    setIsPlaying(true);
                    setTimeout(() => void videoRef.current?.play(), 100);
                  }}
                  className="flex-shrink-0 w-56 aspect-video rounded-xl overflow-hidden relative border border-white/10 hover:border-white/25 transition-all group"
                >
                  <img
                    src={`https://picsum.photos/seed/vid_thumb_${i}/400/225`}
                    alt={`Session ${i}`}
                    className="w-full h-full object-cover opacity-55 group-hover:opacity-85 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full kv-glass-soft text-[10px] uppercase tracking-[0.12em] text-zinc-300">
                    {selectedDuration}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <div className="text-[10px] text-zinc-300 uppercase tracking-[0.16em]">{t("Take {{index}}", { index: i })}</div>
                    <div className="w-7 h-7 rounded-full kv-glass-soft border border-white/20 flex items-center justify-center">
                      <Play size={12} className="fill-white text-white ml-[1px]" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
