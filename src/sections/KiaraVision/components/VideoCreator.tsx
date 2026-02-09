import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Film,
  Layers,
  Maximize,
  Minimize,
  MoreHorizontal,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume1,
  Volume2,
  VolumeX,
  X,
  Zap,
  Image as ImageIcon,
  Type,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { describeVideoWithOpenRouter } from "@/services/kiaraGateway";
import { uploadForReplicate } from "@/services/replicateApi";

const DURATION_OPTIONS = ["5s", "8s", "12s"] as const;
const RATIO_OPTIONS = [
  { id: "16:9", label: "16:9", w: 16, h: 9 },
  { id: "9:16", label: "9:16", w: 9, h: 16 },
  { id: "1:1", label: "1:1", w: 1, h: 1 },
] as const;

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_VIDEO_SIZE_MB = 200;
const MAX_VIDEO_DURATION_SEC = 300;
const MAX_VIDEO_DIMENSION = 3840;
const MIN_VIDEO_DIMENSION = 64;

type VideoMeta = {
  durationSec: number;
  width: number;
  height: number;
  sizeMb: number;
  mime: string;
};

const AspectIcon = ({ w, h, active }: { w: number; h: number; active?: boolean }) => {
  const isWide = w > h;
  const scale = isWide ? 14 : 10;
  const width = isWide ? scale : (scale * w) / h;
  const height = isWide ? (scale * h) / w : scale;
  return (
    <div
      className={`border transition-colors ${active ? "border-white/60" : "border-white/25"}`}
      style={{ width, height, borderRadius: 2 }}
    />
  );
};

export const VideoCreator = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"text" | "image">("image");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<string>("16:9");
  const [selectedDuration, setSelectedDuration] = useState<(typeof DURATION_OPTIONS)[number]>("5s");

  const [dragActive, setDragActive] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<string>("");
  const [visionError, setVisionError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const loadVideoMetadata = (file: File): Promise<{ duration: number; width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const probeUrl = URL.createObjectURL(file);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = probeUrl;
      probe.onloadedmetadata = () => {
        const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
        const width = probe.videoWidth || 0;
        const height = probe.videoHeight || 0;
        URL.revokeObjectURL(probeUrl);
        resolve({ duration, width, height });
      };
      probe.onerror = () => {
        URL.revokeObjectURL(probeUrl);
        reject(new Error("Failed to read video metadata"));
      };
    });

  const validateVideo = async (file: File): Promise<VideoMeta> => {
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      throw new Error("Unsupported video format. Use MP4, WebM, or MOV.");
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_VIDEO_SIZE_MB) {
      throw new Error(`Video is too large (${sizeMb.toFixed(1)}MB). Max is ${MAX_VIDEO_SIZE_MB}MB.`);
    }

    const { duration, width, height } = await loadVideoMetadata(file);
    if (!duration || duration <= 0) {
      throw new Error("Video duration could not be detected.");
    }
    if (duration > MAX_VIDEO_DURATION_SEC) {
      throw new Error(`Video is too long (${duration.toFixed(1)}s). Max is ${MAX_VIDEO_DURATION_SEC}s.`);
    }
    if (width < MIN_VIDEO_DIMENSION || height < MIN_VIDEO_DIMENSION) {
      throw new Error("Video resolution is too low. Minimum is 64x64.");
    }
    if (width > MAX_VIDEO_DIMENSION || height > MAX_VIDEO_DIMENSION) {
      throw new Error("Video resolution is too high. Maximum dimension is 3840.");
    }

    return {
      durationSec: duration,
      width,
      height,
      sizeMb,
      mime: file.type,
    };
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setUploadError("Only image and video files are supported.");
      return;
    }

    try {
      setUploadError(null);
      setVisionError(null);
      setVisionResult("");

      if (file.type.startsWith("video/")) {
        const meta = await validateVideo(file);
        setVideoMeta(meta);
        setMediaType("video");
      } else {
        setVideoMeta(null);
        setMediaType("image");
      }

      const url = URL.createObjectURL(file);
      setUploadedFile(file);
      setMediaUrl(url);
    } catch (error: any) {
      setUploadError(error?.message || "File validation failed");
      setUploadedFile(null);
      setMediaUrl(null);
      setMediaType(null);
      setVideoMeta(null);
    }
  };

  const runVisionTest = async () => {
    if (!uploadedFile || mediaType !== "video") {
      setVisionError("Upload a video first.");
      return;
    }

    setIsAnalyzing(true);
    setVisionError(null);
    setVisionResult("");
    try {
      const mediaUrl = await uploadForReplicate(uploadedFile);
      const response = await describeVideoWithOpenRouter({
        media: mediaUrl,
        reasoning_enabled: true,
        max_tokens: 1400,
        prompt:
          "Analyze this video in detail. Return: 1) Timeline with timestamps, 2) Main subjects and actions, 3) Scene/location details, 4) Camera motion and shot types, 5) Visible text/logos.",
      });

      if (!response.success || !response.output) {
        throw new Error("AI returned an empty description");
      }

      setVisionResult(response.output);
    } catch (error: any) {
      setVisionError(error?.message || "Video analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      void handleFile(e.target.files[0]);
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      void videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const toggleFullScreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsFullScreen((prev) => !prev);
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
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
    if (!seconds || Number.isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    setCurrentTime(current);
    setVideoDuration(total);
    if (total > 0) setProgress((current / total) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
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
    if (isMuted || volume === 0) return <VolumeX size={16} />;
    if (volume < 0.5) return <Volume1 size={16} />;
    return <Volume2 size={16} />;
  };

  const glassCard = "relative rounded-[20px] overflow-hidden bg-gradient-to-b from-white/[0.05] to-white/[0.01] backdrop-blur-xl border border-white/[0.06]";
  const tinyLabel = "text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]";

  return (
    <div className="relative h-full min-h-0 flex overflow-hidden bg-black text-white">
      <div className="absolute -top-40 -right-20 w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-20 w-[400px] h-[400px] rounded-full bg-white/[0.015] blur-[80px] pointer-events-none" />

      <aside className="w-[320px] h-full border-r border-white/[0.04] bg-black/80 backdrop-blur-2xl z-20 flex flex-col">
        <div className="p-4 border-b border-white/[0.04]">
          <div className={`${glassCard} p-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                  <Film size={15} className="text-white/70" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Kiara Vision</p>
                  <h2 className="text-[13px] font-semibold text-white/90 tracking-tight">Video Studio</h2>
                </div>
              </div>
              <button className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[9px] uppercase tracking-[0.12em] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all flex items-center gap-1">
                Pro <ChevronDown size={10} />
              </button>
            </div>

            <div className="mt-3 p-0.5 rounded-xl bg-black/40 border border-white/[0.05] flex">
              <button
                onClick={() => setActiveTab("text")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "text"
                    ? "bg-white/[0.1] text-white border border-white/[0.1]"
                    : "text-white/35 hover:text-white/60"
                }`}
              >
                <Type size={11} /> Text
              </button>
              <button
                onClick={() => setActiveTab("image")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "image"
                    ? "bg-white/[0.1] text-white border border-white/[0.1]"
                    : "text-white/35 hover:text-white/60"
                }`}
              >
                <ImageIcon size={11} /> Image
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
          {activeTab === "image" && (
            <div className={`${glassCard} p-3 animate-in slide-in-from-bottom-2 fade-in duration-300`}>
              <div className="flex items-center justify-between mb-2">
                <span className={tinyLabel}>Reference</span>
                {uploadedMedia && (
                  <span className="text-[9px] text-emerald-400/80 flex items-center gap-1">
                    <CheckCircle2 size={9} /> Ready
                  </span>
                )}
              </div>

              <div
                className={`relative group w-full aspect-video rounded-[14px] border border-dashed overflow-hidden transition-all cursor-pointer ${
                  dragActive
                    ? "border-white/30 bg-white/[0.05]"
                    : "border-white/[0.08] bg-black/40 hover:bg-black/50 hover:border-white/[0.15]"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />

                {uploadedMedia ? (
                  mediaType === "video" ? (
                    <video src={uploadedMedia} className="w-full h-full object-cover" autoPlay muted loop />
                  ) : (
                    <img src={uploadedMedia} alt="Reference" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                      <Upload size={14} className={dragActive ? "text-white/80" : "text-white/40"} />
                    </div>
                    <span className="text-[11px] text-white/35">
                      {dragActive ? "Drop to upload" : "Drop media here"}
                    </span>
                  </div>
                )}

                {uploadedMedia && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaUrl(null);
                      setMediaType(null);
                      setUploadedFile(null);
                      setVideoMeta(null);
                      setUploadError(null);
                      setVisionError(null);
                      setVisionResult("");
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/70 hover:bg-black/90 border border-white/[0.1] text-white/70 flex items-center justify-center transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              {uploadError && (
                <p className="mt-2 text-[10px] text-red-300/90">{uploadError}</p>
              )}
              {mediaType === "video" && videoMeta && (
                <p className="mt-2 text-[10px] text-white/45">
                  {videoMeta.mime} | {videoMeta.width}x{videoMeta.height} | {videoMeta.durationSec.toFixed(1)}s |{" "}
                  {videoMeta.sizeMb.toFixed(1)}MB
                </p>
              )}
            </div>
          )}

          <div className={`${glassCard} p-3`}>
            <div className="flex items-center justify-between mb-2">
              <span className={tinyLabel}>Prompt</span>
              <button className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[9px] uppercase tracking-[0.1em] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all flex items-center gap-1">
                <Sparkles size={9} /> Enhance
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === "image"
                  ? "Camera movement, pacing, mood..."
                  : "A cinematic dolly through neon rain..."
              }
              className="w-full h-24 rounded-[14px] bg-black/50 border border-white/[0.06] p-3 text-[12px] text-white/80 placeholder:text-white/20 outline-none focus:border-white/[0.12] resize-none leading-relaxed"
            />
          </div>

          <div className={`${glassCard} p-3 space-y-3`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={`${tinyLabel} mb-2`}>Duration</p>
                <div className="flex gap-1">
                  {DURATION_OPTIONS.map((value) => (
                    <button
                      key={value}
                      onClick={() => setSelectedDuration(value)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                        selectedDuration === value
                          ? "bg-white/[0.1] text-white border-white/[0.12]"
                          : "text-white/30 border-white/[0.04] hover:text-white/50 hover:border-white/[0.08]"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={`${tinyLabel} mb-2`}>Aspect</p>
                <div className="flex gap-1">
                  {RATIO_OPTIONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRatio(r.id)}
                      className={`flex-1 h-7 rounded-lg flex items-center justify-center gap-1.5 transition-all border ${
                        selectedRatio === r.id
                          ? "bg-white/[0.1] text-white/80 border-white/[0.12]"
                          : "text-white/30 border-white/[0.04] hover:text-white/50 hover:border-white/[0.08]"
                      }`}
                    >
                      <AspectIcon w={r.w} h={r.h} active={selectedRatio === r.id} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={13} /> Camera Controls
              </span>
              <ChevronDown size={12} />
            </button>
            <button
              onClick={runVisionTest}
              disabled={isAnalyzing || mediaType !== "video" || !uploadedFile}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-[11px] transition-all ${
                isAnalyzing || mediaType !== "video" || !uploadedFile
                  ? "bg-white/[0.02] border-white/[0.05] text-white/30 cursor-not-allowed"
                  : "bg-white/[0.04] border-white/[0.12] text-white/75 hover:bg-white/[0.08]"
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={13} /> {isAnalyzing ? "Analyzing Video..." : "Vision Test"}
              </span>
              <ChevronDown size={12} />
            </button>
            {visionError && <p className="text-[10px] text-red-300/90">{visionError}</p>}
            {visionResult && (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/40 p-3 text-[10px] leading-relaxed text-white/70">
                {visionResult}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.04] bg-black/60">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full h-10 rounded-xl text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 flex items-center justify-center gap-2 ${
              isGenerating
                ? "bg-white/[0.03] text-white/30 border border-white/[0.06] cursor-not-allowed"
                : "bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {isGenerating ? (
              <>
                <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.1s]" />
                <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" />
                Rendering
              </>
            ) : (
              <>
                <Zap size={13} className="fill-black" /> Generate
              </>
            )}
          </button>
          <p className="text-center mt-2.5 text-[9px] uppercase tracking-[0.14em] text-white/20">
            Cost 25 credits
          </p>
        </div>
      </aside>

      <section className="flex-1 min-w-0 h-full flex flex-col relative">
        <header className="h-14 border-b border-white/[0.04] px-5 flex items-center justify-between bg-black/40 backdrop-blur-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Preview</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all flex items-center justify-center">
              <Layers size={14} />
            </button>
            <button className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all flex items-center justify-center">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-5 space-y-4">
          <div className="w-full max-w-[1100px] mx-auto">
            <div className={`${glassCard} p-3`}>
              <div
                className={
                  isFullScreen
                    ? "fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-200"
                    : "relative w-full aspect-video rounded-[16px] overflow-hidden bg-black border border-white/[0.05]"
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
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black pointer-events-none">
                    <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cyberpunk_rain/1280/720')] bg-cover bg-center opacity-30" />
                    <div className="absolute inset-0 bg-black/50" />
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl z-20 flex flex-col items-center justify-center gap-5">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full animate-pulse" />
                      <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center relative">
                        <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[12px] font-medium text-white/80 tracking-tight">Rendering</p>
                      <p className="text-[10px] text-white/30 mt-1">Building motion & lighting</p>
                    </div>
                  </div>
                )}

                {!isPlaying && !isGenerating && (
                  <button onClick={togglePlay} className="absolute inset-0 z-10 flex items-center justify-center group">
                    <div className="w-16 h-16 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-white/[0.12]">
                      <Play size={28} className="fill-white text-white ml-0.5" />
                    </div>
                  </button>
                )}

                {isFullScreen && (
                  <button
                    onClick={toggleFullScreen}
                    className="absolute top-4 right-4 z-30 w-9 h-9 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-white/[0.12] transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}

                <div
                  className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 transition-opacity duration-200 ${
                    isPlaying && !isFullScreen ? "opacity-0 hover:opacity-100" : "opacity-100"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">
                    <button onClick={togglePlay} className="text-white/80 hover:text-white transition-colors">
                      {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>

                    <span className="text-[10px] font-mono text-white/50 min-w-[70px]">
                      {formatTime(currentTime)} / {formatTime(videoDuration)}
                    </span>

                    <div className="flex-1 h-6 flex items-center cursor-pointer group" onClick={handleSeek}>
                      <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
                        <div className="h-full rounded-full bg-white/70 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 group/vol">
                      <button onClick={toggleMute} className="text-white/50 hover:text-white/80 transition-colors">
                        {renderVolumeIcon()}
                      </button>
                      <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-[width] duration-200">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-16 h-1 accent-white"
                        />
                      </div>
                    </div>

                    <div className="w-px h-3 bg-white/10" />

                    <button className="text-white/40 hover:text-white/80 transition-colors" title="Download">
                      <Download size={15} />
                    </button>
                    <button
                      onClick={toggleFullScreen}
                      className="text-white/40 hover:text-white/80 transition-colors"
                      title={isFullScreen ? "Exit" : "Fullscreen"}
                    >
                      {isFullScreen ? <Minimize size={15} /> : <Maximize size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[1100px] mx-auto">
            <div className={`${glassCard} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-[0.14em] text-white/40 font-medium">Recent</h3>
                <button className="text-[10px] text-white/30 hover:text-white/60 transition-colors">View all</button>
              </div>

              <div
                ref={scrollRef}
                className="flex gap-2.5 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none pb-1"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setVideoSrc("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
                      setIsPlaying(true);
                      setTimeout(() => void videoRef.current?.play(), 100);
                    }}
                    className="flex-shrink-0 w-44 aspect-video rounded-xl overflow-hidden relative border border-white/[0.05] hover:border-white/[0.15] transition-all group"
                  >
                    <img
                      src={`https://picsum.photos/seed/vid_thumb_${i}/400/225`}
                      alt={`Session ${i}`}
                      className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-md border border-white/[0.08] text-[9px] uppercase tracking-[0.1em] text-white/50">
                      {selectedDuration}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <div className="text-[9px] text-white/60 uppercase tracking-[0.12em]">Take {i}</div>
                      <div className="w-6 h-6 rounded-full bg-white/[0.1] backdrop-blur-md border border-white/[0.15] flex items-center justify-center">
                        <Play size={10} className="fill-white text-white ml-[1px]" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
