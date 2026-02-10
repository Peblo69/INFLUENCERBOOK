import { useState, useRef, useEffect, useCallback } from "react";
import { ModelsSidebar } from "@/sections/ModelsPage/components/ModelsSidebar";
import { NeonEditor } from "./NeonEditor";
import {
  kiaraVisionImageToVideo,
  kiaraVisionTaskStatus,
  kiaraVisionSoundEffect,
  kiaraVisionCancelTask,
  type KiaraVisionTaskResponse,
} from "@/services/kiaraGateway";
import {
  Settings, ChevronDown, Image as ImageIcon, Music, Layers, Sparkles, Download,
  ThumbsUp, MoreHorizontal, Star, History, Play, Share2,
  Mic, Video as VideoIcon, Check, Loader2, Zap, ArrowLeft, X, AlertCircle
} from "lucide-react";

interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  duration: string;
  aspect: string;
  createdAt: string;
  audioUrl?: string;
}

const ASPECT_RATIOS: Record<string, string> = {
  "16:9": "1280:720",
  "9:16": "720:1280",
  "1:1": "960:960",
  "4:3": "1104:832",
  "3:4": "832:1104",
};

const DURATION_OPTIONS = ["5s", "10s"] as const;

export const VideoEditorPage = () => {
  const [activeTab, setActiveTab] = useState("image-to-video");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<string>("5s");
  const [aspect, setAspect] = useState("16:9");
  const [model, setModel] = useState("Kiara Vision");
  const [isGenerating, setIsGenerating] = useState(false);
  const [soundEffects, setSoundEffects] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showAspectPicker, setShowAspectPicker] = useState(false);

  // Keyframe state
  const [startFrameFile, setStartFrameFile] = useState<File | null>(null);
  const [startFramePreview, setStartFramePreview] = useState<string | null>(null);
  const startFrameInputRef = useRef<HTMLInputElement>(null);

  // Generation state
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const pollingRef = useRef(false);

  const [likedItems, setLikedItems] = useState<string[]>([]);
  const [savedItems, setSavedItems] = useState<string[]>([]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (startFramePreview) URL.revokeObjectURL(startFramePreview);
    };
  }, [startFramePreview]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (startFramePreview) URL.revokeObjectURL(startFramePreview);
    setStartFrameFile(file);
    setStartFramePreview(URL.createObjectURL(file));
  }, [startFramePreview]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const clearStartFrame = () => {
    if (startFramePreview) URL.revokeObjectURL(startFramePreview);
    setStartFrameFile(null);
    setStartFramePreview(null);
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!startFrameFile) {
      setGenerationError("Please upload a start frame image");
      return;
    }
    if (!prompt.trim() && activeTab === "text-to-video") {
      setGenerationError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setTaskProgress("Preparing...");
    pollingRef.current = true;

    try {
      // Convert image to data URI
      const promptImage = await fileToDataUri(startFrameFile);

      const durationNum = duration === "10s" ? 10 : 5;
      const ratio = ASPECT_RATIOS[aspect] || "1280:720";

      setTaskProgress("Submitting...");

      const result = await kiaraVisionImageToVideo({
        promptImage,
        promptText: prompt.trim() || undefined,
        duration: durationNum as 5 | 10,
        ratio,
      });

      if (!result.success || !result.task_id) {
        throw new Error(result.error || "Failed to start video generation");
      }

      setTaskId(result.task_id);
      setTaskProgress("Queued...");

      // Poll for completion
      let completed = false;
      const startTime = Date.now();
      const MAX_POLL_TIME = 600000; // 10 min

      while (!completed && pollingRef.current && Date.now() - startTime < MAX_POLL_TIME) {
        await new Promise(r => setTimeout(r, 5000));
        if (!pollingRef.current) break;

        const status = await kiaraVisionTaskStatus(result.task_id);
        const s = (status.status || "").toUpperCase();

        if (s === "RUNNING") setTaskProgress("Generating video...");
        else if (s === "THROTTLED") setTaskProgress("In queue...");
        else if (s === "PENDING") setTaskProgress("Queued...");

        if (s === "SUCCEEDED") {
          completed = true;
          const videoUrl = status.video || (Array.isArray(status.output) ? status.output[0] : status.output as string);

          if (videoUrl) {
            const newVideo: GeneratedVideo = {
              id: result.task_id,
              url: videoUrl,
              prompt: prompt || "Image to video",
              duration,
              aspect,
              createdAt: new Date().toISOString(),
            };

            // Auto-generate sound effects if enabled
            if (soundEffects && prompt.trim()) {
              setTaskProgress("Generating sound effects...");
              try {
                const sfxResult = await kiaraVisionSoundEffect({
                  promptText: prompt.trim(),
                  duration: durationNum,
                });
                if (sfxResult.success && sfxResult.audio) {
                  newVideo.audioUrl = sfxResult.audio;
                }
              } catch (sfxErr) {
                console.warn("[VideoEditor] Sound effect generation failed:", sfxErr);
              }
            }

            setGeneratedVideos(prev => [newVideo, ...prev]);
          }
        } else if (s === "FAILED") {
          throw new Error(status.error || "Video generation failed");
        }
      }

      if (!completed && pollingRef.current) {
        throw new Error("Video generation timed out");
      }
    } catch (err: any) {
      setGenerationError(err.message || "Generation failed");
      console.error("[VideoEditor] Error:", err);
    } finally {
      setIsGenerating(false);
      setTaskId(null);
      setTaskProgress("");
      pollingRef.current = false;
    }
  };

  const handleCancel = async () => {
    pollingRef.current = false;
    if (taskId) {
      try { await kiaraVisionCancelTask(taskId); } catch {}
    }
    setIsGenerating(false);
    setTaskId(null);
    setTaskProgress("");
  };

  const toggleLike = (id: string) => {
    setLikedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSave = (id: string) => {
    setSavedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {}
  };

  if (showEditor) {
    return (
      <div className="relative h-full flex flex-col bg-[#0a0a0a] animate-in fade-in zoom-in-95 duration-300">
        <NeonEditor />
        <button
          onClick={() => setShowEditor(false)}
          className="absolute top-6 left-6 px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-zinc-200 text-sm font-medium hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 z-50"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-white/20 overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={startFrameInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
      />

      {/* Left Navigation */}
      <ModelsSidebar />

      {/* Generator Panel */}
      <div className="w-[400px] flex flex-col border-r border-white/5 bg-[#0a0a0a] flex-shrink-0 z-20">

        {/* Panel Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <VideoIcon className="w-5 h-5 text-white" />
              Video Generator
            </h1>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(16,185,129,0.4)]`} />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {isGenerating ? "Working" : "Ready"}
              </span>
            </div>
          </div>

          {/* Model Selector */}
          <div className="relative mb-6">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#111] border border-white/10 rounded-xl hover:border-white/20 transition-all group"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Model</span>
                <span className="text-sm font-medium text-white">{model}</span>
              </div>
              <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-200 ${showModelDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showModelDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-xl border border-white/10 p-1 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                {["Kiara Vision"].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setModel(m); setShowModelDropdown(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                      model === m ? "bg-white text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {m}
                    {model === m && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-[#111] rounded-full border border-white/5">
            {["Image to Video", "Elements"].map((tab) => {
              const isActive = activeTab === tab.toLowerCase().replace(/ /g, "-");
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase().replace(/ /g, "-"))}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {activeTab === "image-to-video" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Start Frame</label>
                {startFrameFile && (
                  <button onClick={clearStartFrame} className="text-[10px] font-medium text-zinc-600 hover:text-white transition-colors">Reset</button>
                )}
              </div>

              {/* Start Frame Drop Zone */}
              <div
                className={`relative aspect-video bg-[#111] border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-white/30 hover:bg-[#151515] transition-all group overflow-hidden ${
                  startFramePreview ? 'border-white/20' : 'border-white/10'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => startFrameInputRef.current?.click()}
              >
                {startFramePreview ? (
                  <>
                    <img src={startFramePreview} className="w-full h-full object-cover" alt="Start frame" />
                    <button
                      onClick={(e) => { e.stopPropagation(); clearStartFrame(); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-black transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {startFrameFile?.name}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:bg-white/10 transition-colors mb-2">
                      <ImageIcon size={18} />
                    </div>
                    <span className="text-[10px] font-medium text-zinc-600 group-hover:text-zinc-400">
                      Drop image or click to upload
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Prompt</label>
              <span className="text-[10px] font-medium text-zinc-600">{prompt.length}/1000</span>
            </div>
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                placeholder="Describe the motion and action..."
                className="w-full h-32 p-4 bg-[#111] border border-white/10 rounded-2xl resize-none focus:outline-none focus:border-white/30 text-sm leading-relaxed placeholder:text-zinc-700 text-zinc-200 transition-all"
              />
            </div>
          </div>

          {/* Sound Effects Toggle */}
          <div className="p-4 bg-[#111] border border-white/10 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${soundEffects ? 'bg-white text-black' : 'bg-white/5 text-zinc-500'}`}>
                <Music size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Sound Effects</span>
                <span className="text-[10px] text-zinc-500">Auto-generate audio</span>
              </div>
            </div>
            <button
              onClick={() => setSoundEffects(!soundEffects)}
              className={`w-12 h-7 rounded-full relative transition-all duration-300 border ${soundEffects ? 'bg-white border-white' : 'bg-black border-white/20'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${soundEffects ? 'left-6 bg-black' : 'left-1 bg-zinc-500'}`} />
            </button>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Quality */}
            <div className="flex flex-col items-center justify-center gap-1.5 py-3 bg-[#111] border border-white/5 rounded-xl">
              <span className="text-[9px] font-bold text-zinc-500 uppercase">Quality</span>
              <div className="flex items-center gap-1 text-xs font-bold text-white">Pro</div>
            </div>

            {/* Duration */}
            <div className="relative">
              <button
                onClick={() => { setShowDurationPicker(!showDurationPicker); setShowAspectPicker(false); }}
                className="w-full flex flex-col items-center justify-center gap-1.5 py-3 bg-[#111] border border-white/5 rounded-xl hover:border-white/20 hover:bg-[#151515] transition-all"
              >
                <span className="text-[9px] font-bold text-zinc-500 uppercase">Duration</span>
                <div className="flex items-center gap-1 text-xs font-bold text-white">
                  {duration} <ChevronDown size={10} className="text-zinc-600" />
                </div>
              </button>
              {showDurationPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] rounded-lg border border-white/10 p-1 z-50 shadow-xl">
                  {DURATION_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => { setDuration(d); setShowDurationPicker(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        duration === d ? "bg-white text-black" : "text-zinc-400 hover:bg-white/5"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aspect Ratio */}
            <div className="relative">
              <button
                onClick={() => { setShowAspectPicker(!showAspectPicker); setShowDurationPicker(false); }}
                className="w-full flex flex-col items-center justify-center gap-1.5 py-3 bg-[#111] border border-white/5 rounded-xl hover:border-white/20 hover:bg-[#151515] transition-all"
              >
                <span className="text-[9px] font-bold text-zinc-500 uppercase">Aspect</span>
                <div className="flex items-center gap-1 text-xs font-bold text-white">
                  {aspect} <ChevronDown size={10} className="text-zinc-600" />
                </div>
              </button>
              {showAspectPicker && (
                <div className="absolute top-full right-0 mt-1 bg-[#1a1a1a] rounded-lg border border-white/10 p-1 z-50 shadow-xl min-w-[80px]">
                  {Object.keys(ASPECT_RATIOS).map(r => (
                    <button
                      key={r}
                      onClick={() => { setAspect(r); setShowAspectPicker(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        aspect === r ? "bg-white text-black" : "text-zinc-400 hover:bg-white/5"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {generationError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{generationError}</p>
              <button onClick={() => setGenerationError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <X size={12} />
              </button>
            </div>
          )}

          {/* Generate / Cancel Button */}
          {isGenerating ? (
            <div className="space-y-3">
              <button
                onClick={handleCancel}
                className="w-full py-4 bg-[#111] border border-white/10 text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
              >
                <X size={18} />
                Cancel Generation
              </button>
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Loader2 size={12} className="animate-spin" />
                {taskProgress}
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!startFrameFile}
              className="w-full py-4 bg-white text-black rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              <Sparkles size={18} className="fill-black" />
              Generate Video
            </button>
          )}
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
        {/* Top Bar */}
        <div className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-white">Generated Videos</span>
            {generatedVideos.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-bold text-zinc-400">
                {generatedVideos.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowEditor(true)}
            className="px-5 py-2 bg-[#111] border border-white/10 rounded-full text-xs font-bold text-white hover:bg-white hover:text-black hover:border-white transition-all flex items-center gap-2"
          >
            <VideoIcon size={14} /> Open Editor
          </button>
        </div>

        {/* Feed Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {generatedVideos.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  <VideoIcon size={32} className="text-zinc-600" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No videos yet</h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                  Upload a start frame image and describe the motion to generate your first video with Kiara Vision
                </p>
              </div>
            )}

            {/* Loading skeleton while generating */}
            {isGenerating && (
              <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden animate-pulse">
                <div className="px-6 py-4 border-b border-white/5 bg-[#111]/50">
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold text-zinc-500">GENERATING</div>
                    <Loader2 size={14} className="animate-spin text-zinc-500" />
                    <span className="text-xs text-zinc-500">{taskProgress}</span>
                  </div>
                </div>
                <div className="aspect-video bg-[#111] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin text-zinc-600" />
                    <span className="text-xs text-zinc-600">{taskProgress || "Processing..."}</span>
                  </div>
                </div>
              </div>
            )}

            {generatedVideos.map((item) => (
              <div key={item.id} className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-all duration-500 group">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#111]/50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-black bg-white px-2 py-1 rounded shadow-lg">
                      VIDEO
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span>{item.duration}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>{item.aspect}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>Kiara Vision</span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                      <Share2 size={14} />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <div className="px-6 py-4 bg-black">
                  <p className="text-sm text-zinc-300 leading-relaxed">{item.prompt}</p>
                </div>

                {/* Video */}
                <div className="relative bg-black w-full aspect-video group/video cursor-pointer">
                  <video
                    src={item.url}
                    className="w-full h-full object-contain"
                    loop
                    muted
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                  />
                  <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-bold border border-white/10">
                    {item.duration}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/video:opacity-100 transition-all duration-500 scale-90 group-hover/video:scale-100">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl">
                      <Play size={32} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>

                {/* Audio player if sound effects generated */}
                {item.audioUrl && (
                  <div className="px-6 py-3 bg-[#0a0a0a] border-t border-white/5 flex items-center gap-3">
                    <Music size={14} className="text-zinc-500" />
                    <audio src={item.audioUrl} controls className="flex-1 h-8 [&::-webkit-media-controls-panel]:bg-[#111]" />
                  </div>
                )}

                {/* Footer Actions */}
                <div className="px-6 py-4 flex items-center justify-between bg-[#111]/30 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {item.audioUrl && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <Music size={10} /> SFX
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold transition-all ${
                        likedItems.includes(item.id) ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                      }`}
                      onClick={() => toggleLike(item.id)}
                    >
                      <ThumbsUp size={14} className={likedItems.includes(item.id) ? 'fill-current' : ''} />
                      {likedItems.includes(item.id) ? 'Liked' : 'Like'}
                    </button>

                    <button
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                      title="Download"
                      onClick={() => handleDownload(item.url, `kiara-video-${item.id}.mp4`)}
                    >
                      <Download size={14} />
                    </button>

                    <button
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        savedItems.includes(item.id) ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                      onClick={() => toggleSave(item.id)}
                      title="Save"
                    >
                      <Star size={14} className={savedItems.includes(item.id) ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[72px] border-l border-white/5 bg-[#0a0a0a] flex flex-col items-center py-6 flex-shrink-0 z-20">
        <button className="mb-6 w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center shadow-lg hover:bg-zinc-200 transition-all group" title="History">
          <History size={20} className="group-hover:-rotate-12 transition-transform duration-300" />
        </button>

        <div className="flex-1 w-full overflow-y-auto custom-scrollbar px-3 space-y-3">
          {generatedVideos.map((vid, i) => (
            <div key={i} className="w-full aspect-square rounded-lg overflow-hidden border border-white/10 cursor-pointer relative group opacity-60 hover:opacity-100 hover:border-white/30 transition-all bg-[#111] flex items-center justify-center">
              <VideoIcon size={16} className="text-zinc-600" />
            </div>
          ))}
        </div>

        <button className="mt-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};
