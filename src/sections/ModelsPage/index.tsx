import { useState, useRef, useEffect, memo } from "react";
import { ModelsSidebar } from "./components/ModelsSidebar";
import { useNotifications } from "@/components/Notification";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/lib/supabase";
import { fileToBase64, uploadGeneratedImages } from "@/lib/supabase/storage";
import {
  kiaraGenerate,
  listUserLoRAs,
  uploadLoRA,
  type LoRAModel,
} from "@/services/kiaraGateway";
import { streamMessageToGrok, type GrokAttachment } from "@/services/grokService";
import {
  Image as ImageIcon,
  Paperclip,
  MoreHorizontal,
  ArrowUpRight,
  RefreshCw,
  Plus,
  MessageSquare,
  Download,
  X,
  Settings,
  Mic,
  Globe,
  Layers,
  Check,
  ChevronDown,
  Heart,
  Ellipsis,
  RotateCcw,
  Copy,
  Trash2,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

// Custom Icons for Settings Panel
const SlidersIcon = ({ className = "" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 21v-7" />
    <path d="M4 10V3" />
    <path d="M12 21v-9" />
    <path d="M12 8V3" />
    <path d="M20 21v-5" />
    <path d="M20 12V3" />
    <path d="M1 14h6" />
    <path d="M9 8h6" />
    <path d="M17 16h6" />
  </svg>
);

const AspectRatioIcon = ({ className = "" }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M12 4v16" />
  </svg>
);

const ResolutionIcon = ({ className = "" }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
  </svg>
);

const ImagesIcon = ({ className = "" }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const SeedIcon = ({ className = "" }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v20" />
    <path d="M2 12h20" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const HashIcon = ({ className = "" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const SparklesIcon = ({ className = "" }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const UploadIcon = ({ className = "" }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ChevronDownIcon = ({ className = "" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Aspect Ratio Icons
const Square1x1Icon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

const Wide16x9Icon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="6" width="20" height="12" rx="2" />
  </svg>
);

const Tall9x16Icon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="7" y="2" width="10" height="20" rx="2" />
  </svg>
);

const Wide4x3Icon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="5" width="18" height="14" rx="2" />
  </svg>
);

const Tall3x4Icon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="5" y="3" width="14" height="18" rx="2" />
  </svg>
);

type TabType = "generations" | "images";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  images?: string[];
}

interface VisionAIImage {
  file: File;
  preview: string;
}

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
}

interface LightboxImage {
  id: string;
  url: string;
  prompt: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  createdAt?: string;
  isSession?: boolean; // true = session image, false = DB image
}

// ============================================================================
// INPUT CAPSULE (extracted outside ModelsPage to prevent remount on every keystroke)
// ============================================================================
interface GenerationSettingsState {
  numberOfImages: number;
  seed: string; // "" = random, otherwise numeric string
}

interface InputCapsuleProps {
  isBottom?: boolean;
  chatInput: string;
  setChatInput: (v: string) => void;
  visionAIImages: VisionAIImage[];
  setVisionAIImages: React.Dispatch<React.SetStateAction<VisionAIImage[]>>;
  isAiResponding: boolean;
  isGenerating: boolean;
  handleSend: (overrideText?: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  showModelMenu: boolean;
  setShowModelMenu: (v: boolean) => void;
  imageRatio: string;
  setImageRatio: (v: string) => void;
  imageResolution: string;
  setImageResolution: (v: string) => void;
  generationSettings: GenerationSettingsState;
  setGenerationSettings: React.Dispatch<React.SetStateAction<GenerationSettingsState>>;
  t: (key: string, vars?: Record<string, any>) => string;
  // LoRA
  userLoRAs: LoRAModel[];
  selectedLoRA: string | null;
  setSelectedLoRA: (v: string | null) => void;
  loraStrength: number;
  setLoraStrength: (v: number) => void;
  isUploadingLoRA: boolean;
  uploadProgress: number | null;
  loraFileInputRef: React.RefObject<HTMLInputElement | null>;
}

const InputCapsule: React.FC<InputCapsuleProps> = ({
  isBottom = false,
  chatInput,
  setChatInput,
  visionAIImages,
  setVisionAIImages,
  isAiResponding,
  isGenerating,
  handleSend,
  fileInputRef,
  textareaRef,
  showSettings,
  setShowSettings,
  selectedModel,
  setSelectedModel,
  showModelMenu,
  setShowModelMenu,
  imageRatio,
  setImageRatio,
  imageResolution,
  setImageResolution,
  generationSettings,
  setGenerationSettings,
  t,
  userLoRAs,
  selectedLoRA,
  setSelectedLoRA,
  loraStrength,
  setLoraStrength,
  isUploadingLoRA,
  uploadProgress,
  loraFileInputRef,
}) => {
  const canSend = (chatInput.trim().length > 0 || visionAIImages.length > 0) && !isAiResponding && !isGenerating;

  return (
    <div className={`relative rounded-[24px] overflow-hidden transition-all duration-300 ${isBottom ? 'w-full max-w-3xl' : ''}`}>
      {/* Multi-layer glass background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-white/[0.02]" />
      <div className="absolute inset-0 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 rounded-[24px] border border-white/[0.06]" />
      <div className="absolute inset-0 rounded-[24px] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" />
      
      <div className={`relative ${isBottom ? 'p-1.5' : 'p-1.5'}`}>

    {visionAIImages.length > 0 && (
      <div className="flex gap-1.5 px-2.5 pt-1.5 pb-1 overflow-x-auto scrollbar-hide">
        {visionAIImages.map((img, i) => (
          <div key={i} className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/[0.06] flex-shrink-0 group">
            <img src={img.preview} className="w-full h-full object-cover" />
            <button onClick={() => setVisionAIImages(p => p.filter((_, x) => x !== i))} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <X size={10} className="text-white/70" />
            </button>
          </div>
        ))}
      </div>
    )}

    <textarea
      ref={textareaRef}
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) handleSend(); } }}
      placeholder={isBottom ? t("Enter prompt...") : t("Message Kiara...")}
      className={`w-full bg-transparent text-[13px] px-2.5 py-2 outline-none resize-none placeholder:text-white/25 text-white/85 max-h-[100px] chat-text leading-relaxed ${isBottom ? 'min-h-[40px]' : 'min-h-[36px]'}`}
      rows={1}
    />

    {isBottom && (
      <div
        aria-hidden={!showSettings}
        className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          showSettings
            ? "max-h-[380px] opacity-100 translate-y-0 mt-1.5"
            : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        {/* Compact Premium Settings Panel */}
        <div className="relative mb-1.5 rounded-xl overflow-hidden">
          {/* Multi-layer glass background */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-white/[0.02]" />
          <div className="absolute inset-0 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 rounded-xl border border-white/[0.06]" />
          
          {/* Content */}
          <div className="relative p-3">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/[0.05]">
              <div className="flex items-center gap-1.5">
                <SlidersIcon className="text-white/50 w-3 h-3" />
                <span className="text-[10px] font-medium text-white/70">{t("Settings")}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-5 h-5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/60 transition-all"
              >
                <X size={10} />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto scrollbar-hide space-y-2.5">
              {/* Aspect Ratio - Compact */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/40">{t("Ratio")}</label>
                </div>
                <div className="flex gap-1">
                  {[
                    { id: "1:1", icon: <Square1x1Icon /> },
                    { id: "16:9", icon: <Wide16x9Icon /> },
                    { id: "9:16", icon: <Tall9x16Icon /> },
                    { id: "4:3", icon: <Wide4x3Icon /> },
                    { id: "3:4", icon: <Tall3x4Icon /> },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setImageRatio(r.id)}
                      className={`flex-1 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                        imageRatio === r.id
                          ? "bg-white/[0.1] border border-white/[0.15] text-white/90"
                          : "bg-white/[0.02] border border-white/[0.04] text-white/30 hover:bg-white/[0.05] hover:text-white/50"
                      }`}
                    >
                      <span className="scale-75">{r.icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution & Count - Compact Row */}
              <div className="flex gap-2">
                {/* Resolution */}
                <div className="flex-1">
                  <label className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/40 mb-1 block">{t("Res")}</label>
                  <div className="flex gap-1">
                    {[
                      { id: "1k", label: "1K" },
                      { id: "2k", label: "2K" },
                    ].map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setImageResolution(r.id)}
                        className={`flex-1 h-6 rounded-md text-[10px] font-medium transition-all duration-150 ${
                          imageResolution === r.id
                            ? "bg-white/[0.1] border border-white/[0.15] text-white/90"
                            : "bg-white/[0.02] border border-white/[0.04] text-white/30 hover:bg-white/[0.05]"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/40">{t("Count")}</label>
                    <span className="text-[9px] font-semibold text-white/60">{generationSettings.numberOfImages}</span>
                  </div>
                  <div className="h-6 px-2 rounded-md bg-white/[0.02] border border-white/[0.04] flex items-center">
                    <input
                      type="range"
                      min="1"
                      max="4"
                      value={generationSettings.numberOfImages}
                      onChange={(e) =>
                        setGenerationSettings((prev) => ({
                          ...prev,
                          numberOfImages: parseInt(e.target.value, 10),
                        }))
                      }
                      className="flex-1 h-0.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.35) ${(generationSettings.numberOfImages - 1) / 3 * 100}%, rgba(255,255,255,0.08) ${(generationSettings.numberOfImages - 1) / 3 * 100}%, rgba(255,255,255,0.08) 100%)`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Seed - Compact */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <HashIcon className="text-white/30 w-3 h-3" />
                  <label className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/40">{t("Seed")}</label>
                  <span className="text-[8px] text-white/20 ml-auto">{t("Optional")}</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={t("Random")}
                    value={generationSettings.seed}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setGenerationSettings((prev) => ({ ...prev, seed: val }));
                    }}
                    className="w-full h-7 rounded-lg bg-white/[0.02] border border-white/[0.05] px-2 pl-7 font-mono text-[11px] text-white/60 placeholder:text-white/20 outline-none transition-all focus:border-white/[0.1]"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20 text-[10px]">#</span>
                  {generationSettings.seed && (
                    <button
                      onClick={() => setGenerationSettings((prev) => ({ ...prev, seed: "" }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>

              {/* LoRA - Compact */}
              <div className="pt-2 border-t border-white/[0.05]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <SparklesIcon className="text-white/40 w-3 h-3" />
                    <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/40">{t("LoRA")}</span>
                  </div>
                  <button
                    onClick={() => loraFileInputRef.current?.click()}
                    disabled={isUploadingLoRA}
                    className="text-[9px] font-medium text-white/50 hover:text-white/70 transition-colors disabled:opacity-50"
                  >
                    {isUploadingLoRA ? `${uploadProgress ?? 0}%` : t("+ Upload")}
                  </button>
                </div>

                {isUploadingLoRA && (
                  <div className="mb-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.03]">
                    <div
                      className="h-full rounded-full bg-white/30 transition-all duration-300"
                      style={{ width: `${uploadProgress ?? 0}%` }}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  {/* LoRA Select */}
                  <div className="relative">
                    <select
                      value={selectedLoRA || ""}
                      onChange={(e) => {
                        const id = e.target.value || null;
                        setSelectedLoRA(id);
                        if (id) {
                          const lora = userLoRAs.find((l) => l.id === id);
                          if (lora) setLoraStrength(lora.default_strength);
                        }
                      }}
                      className="w-full h-7 rounded-lg bg-white/[0.02] border border-white/[0.05] px-2 pr-7 appearance-none text-[11px] text-white/60 outline-none transition-all focus:border-white/[0.1] cursor-pointer"
                    >
                      <option value="">{t("None")}</option>
                      {userLoRAs.map((lora) => (
                        <option key={lora.id} value={lora.id}>
                          {lora.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Strength Slider - Compact */}
                  {selectedLoRA && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] animate-in slide-in-from-top-1 fade-in duration-200">
                      <span className="text-[9px] text-white/30 w-8">{t("Str")}</span>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={loraStrength}
                        onChange={(e) => setLoraStrength(parseFloat(e.target.value))}
                        className="flex-1 h-0.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${(loraStrength / 2) * 100}%, rgba(255,255,255,0.06) ${(loraStrength / 2) * 100}%, rgba(255,255,255,0.06) 100%)`
                        }}
                      />
                      <span className="text-[9px] font-medium text-white/50 w-8 text-right">{loraStrength.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="px-1 pb-0.5 flex items-center justify-between">
      <div className="flex items-center gap-0.5">
        <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-white/35 hover:text-white/60 transition-all">
          <Paperclip size={13} strokeWidth={1.5} />
        </button>
        {isBottom && (
          <>
            <button className="w-7 h-7 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-white/35 hover:text-white/60 transition-all">
              <Mic size={13} strokeWidth={1.5} />
            </button>
            <button className="w-7 h-7 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-white/35 hover:text-white/60 transition-all">
              <Globe size={13} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isBottom && (
          <>
            {/* Active settings chips */}
            <button
              type="button"
              onClick={() => {
                setShowSettings(true);
                setShowModelMenu(false);
              }}
              className="flex items-center gap-0.5 rounded-full p-0.5 transition-colors hover:bg-white/[0.02]"
              title={t("Open settings")}
            >
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium tracking-wide transition-all ${imageRatio !== "1:1" ? 'bg-white/[0.08] text-white/70 border border-white/[0.12]' : 'bg-white/[0.02] text-white/35 border border-white/[0.05]'}`}>
                {imageRatio}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium tracking-wide transition-all ${imageResolution !== "1k" ? 'bg-white/[0.08] text-white/70 border border-white/[0.12]' : 'bg-white/[0.02] text-white/35 border border-white/[0.05]'}`}>
                {imageResolution === "1k" ? "1K" : "2K"}
              </span>
              {generationSettings.numberOfImages > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-white/70 border border-white/[0.12] text-[9px] font-medium">
                  ×{generationSettings.numberOfImages}
                </span>
              )}
              {selectedLoRA && (
                <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-white/70 border border-white/[0.12] text-[9px] font-medium">
                  LoRA
                </span>
              )}
            </button>

            {/* Models Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowModelMenu(!showModelMenu); setShowSettings(false); }}
                className="w-7 h-7 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-white/35 hover:text-white/60 transition-all"
                title={t("Models")}
              >
                <Layers size={13} strokeWidth={1.5} />
              </button>
              {showModelMenu && (
                <div className="absolute bottom-full right-0 mb-1.5 w-48 bg-black/95 border border-white/[0.06] rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden z-[100]">
                  <div className="px-3 py-2 border-b border-white/[0.05]">
                    <span className="text-[9px] font-medium text-white/35 uppercase tracking-[0.12em]">{t("Model")}</span>
                  </div>
                  {[
                    { id: "kiara-z-max", name: "Kiara Z MAX", desc: "Premium" },
                  ].map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { setSelectedModel(model.id); setShowModelMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors ${selectedModel === model.id ? 'bg-white/[0.04]' : ''}`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedModel === model.id ? 'border-white/25' : 'border-white/[0.08]'}`}>
                        {selectedModel === model.id && <Check size={8} className="text-white/70" />}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-white/80">{model.name}</p>
                        <p className="text-[9px] text-white/30">{model.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Config Button */}
            <button
              onClick={() => { setShowSettings(!showSettings); setShowModelMenu(false); }}
              className={`h-7 rounded-full px-2.5 text-[10px] font-medium tracking-wide flex items-center gap-1 transition-all active:scale-95 ${
                showSettings
                  ? "bg-white/[0.08] text-white/80 border border-white/[0.12]"
                  : "bg-white/[0.02] text-white/40 hover:bg-white/[0.05] hover:text-white/60 border border-white/[0.05]"
              }`}
              title={t("Settings")}
            >
              <Settings size={12} strokeWidth={1.5} className={`transition-transform ${showSettings ? "rotate-90" : ""}`} />
              <span className="hidden sm:inline">{t("Settings")}</span>
              <ChevronDown size={11} strokeWidth={1.5} className={`transition-transform ${showSettings ? "rotate-180" : ""}`} />
            </button>
          </>
        )}
        <button
          onClick={() => handleSend()}
          disabled={!canSend}
          className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          <ArrowUpRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
    </div>
    </div>
  );
};

const IMAGES_PER_ROW = 5;
const ROWS_PER_PAGE = 6;
const IMAGES_PER_PAGE = IMAGES_PER_ROW * ROWS_PER_PAGE;


const downloadImage = async (url: string, filename?: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = blob.type.includes("png") ? ".png" : blob.type.includes("webp") ? ".webp" : ".jpg";
    const name = filename || `kiara-${Date.now()}${ext}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    // Fallback: open in new tab if download fails (e.g. CORS)
    window.open(url, "_blank");
  }
};

const resolveStoredImageUrl = (path: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const { data } = supabase.storage.from("generated-images").getPublicUrl(path);
  return data.publicUrl;
};

// ============================================================================
// GALLERY COMPONENT
// ============================================================================
const ImagesGalleryContent = () => {
  const { t } = useI18n();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { count } = await supabase
        .from('ai_generation_outputs')
        .select('id', { count: 'exact', head: true });
      setTotalImages(count || 0);

      const from = (currentPage - 1) * IMAGES_PER_PAGE;
      const to = from + IMAGES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('ai_generation_outputs')
        .select('id, image_url, created_at, ai_generation_jobs ( prompt, model_id, created_at )')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching images:', error);
        setImages([]);
        return;
      }

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        imageUrl: resolveStoredImageUrl(row.image_url),
        prompt: row.ai_generation_jobs?.prompt || '',
        createdAt: row.created_at,
        model: row.ai_generation_jobs?.model_id || undefined,
      }));

      setImages(mapped);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [currentPage]);

  const totalPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

  const handleDeleteGalleryImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("ai_generation_outputs")
        .delete()
        .eq("id", imageId);
      if (error) throw error;
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      setTotalImages((prev) => Math.max(0, prev - 1));
      if (selectedImage?.id === imageId) setSelectedImage(null);
    } catch (err: any) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{t("Gallery")}</h2>
          <p className="text-xs text-zinc-500 mt-1 font-mono uppercase tracking-wider">
            {t("{{count}} assets - page {{page}}/{{total}}", {
              count: totalImages,
              page: currentPage,
              total: totalPages || 1,
            })}
          </p>
        </div>
        <button
          onClick={fetchImages}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2"
        >
          <RefreshCw size={12} /> {t("Refresh")}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("Loading Library...")}</p>
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-zinc-500">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <ImageIcon size={24} />
          </div>
          <p className="text-sm">{t("No images found")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2.5">
            {images.map((img) => (
              <div
                key={img.id}
                className="aspect-square bg-[#0a0a0a] rounded-2xl overflow-hidden relative group cursor-pointer border border-white/[0.04] hover:border-white/[0.12] transition-all duration-500"
              >
                <img
                  src={img.imageUrl}
                  onClick={() => setSelectedImage(img)}
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                  <span className="text-[10px] font-medium text-white/70 tracking-wide">{img.model || "Kiara Z MAX"}</span>
                </div>
                <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-pink-400 hover:border-pink-400/30 hover:bg-pink-500/10 transition-all duration-200"
                  >
                    <Heart size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadImage(img.imageUrl); }}
                    className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
                  >
                    <Download size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteGalleryImage(img.id); }}
                    className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
                  >
                    <Ellipsis size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 py-8">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase"
              >
                {t("Prev")}
              </button>
              <span className="px-4 py-2 text-xs font-mono text-zinc-500 flex items-center">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase"
              >
                {t("Next")}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/97 backdrop-blur-2xl flex items-center justify-center animate-fadeIn" onClick={() => setSelectedImage(null)}>
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/50 hover:text-white transition-all duration-200 z-10"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-16 max-w-[90vw] max-h-[88vh] px-12" onClick={e => e.stopPropagation()}>
            <div className="flex-shrink-0 max-w-[60vw] max-h-[85vh] flex items-center justify-center">
              <img src={selectedImage.imageUrl} className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            </div>

            <div className="flex-shrink-0 w-[280px] flex flex-col justify-center py-8 space-y-10">
              <div>
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-3">{t("Prompt")}</p>
                <p className="text-[13px] text-white/80 font-light leading-[1.7]">{selectedImage.prompt}</p>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">{t("Model")}</p>
                  <p className="text-[13px] text-white/90 font-medium">{selectedImage.model || "Kiara Z MAX"}</p>
                </div>

                {selectedImage.createdAt && (
                  <div>
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">{t("Created")}</p>
                    <p className="text-[13px] text-white/90 font-medium">
                      {new Date(selectedImage.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" "}
                      <span className="text-white/40">
                        {new Date(selectedImage.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => downloadImage(selectedImage.imageUrl)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all duration-200"
                >
                  <Download size={13} /> {t("Download")}
                </button>
                <button
                  className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-pink-500/10 border border-white/[0.06] hover:border-pink-400/30 flex items-center justify-center text-white/40 hover:text-pink-400 transition-all duration-200"
                >
                  <Heart size={15} />
                </button>
                <button
                  onClick={() => handleDeleteGalleryImage(selectedImage.id)}
                  className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-400/30 flex items-center justify-center text-white/40 hover:text-red-400 transition-all duration-200"
                  title={t("Delete")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export const ModelsPage = () => {
  const { NotificationContainer, showNotification } = useNotifications();
  const { t } = useI18n();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const [activeTab, setActiveTab] = useState<TabType>("generations");

  // Sync tab with URL
  useEffect(() => {
    if (pathname === "/images") setActiveTab("images");
    else setActiveTab("generations");
  }, [pathname]);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [visionMode, setVisionMode] = useState(true);
  
  // Image Generation State
  const [visionAIImages, setVisionAIImages] = useState<VisionAIImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSessionImages, setGeneratedSessionImages] = useState<Array<{ id: string; url: string; prompt: string; createdAt: string }>>([]);
  const [latestGenerations, setLatestGenerations] = useState<GeneratedImage[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamingContentRef = useRef("");
  const streamingMessageIdRef = useRef<string | null>(null);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);

  // Settings & Model Selection
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState("kiara-z-max");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [imageRatio, setImageRatio] = useState("1:1");
  const [imageResolution, setImageResolution] = useState("1k");
  const [generationSettings, setGenerationSettings] = useState<GenerationSettingsState>({
    numberOfImages: 1,
    seed: "",
  });

  // LoRA state
  const [userLoRAs, setUserLoRAs] = useState<LoRAModel[]>([]);
  const [selectedLoRA, setSelectedLoRA] = useState<string | null>(null);
  const [loraStrength, setLoraStrength] = useState(0.8);
  const [isUploadingLoRA, setIsUploadingLoRA] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const loraFileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch user's LoRAs on mount
  useEffect(() => {
    const fetchLoRAs = async () => {
      try {
        const result = await listUserLoRAs();
        setUserLoRAs(result.loras || []);
      } catch (err) {
        console.error("Failed to fetch LoRAs:", err);
      }
    };
    fetchLoRAs();
  }, []);

  // LoRA upload handler
  const handleLoRAUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".safetensors")) {
      showNotification("Only .safetensors files are supported", "warning", "LoRA Upload");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      showNotification("File too large. Maximum 200MB.", "warning", "LoRA Upload");
      return;
    }

    setIsUploadingLoRA(true);
    setUploadProgress(0);

    try {
      const result = await uploadLoRA(
        file,
        { lora_name: file.name.replace(/\.safetensors$/i, "") },
        (percent) => setUploadProgress(percent)
      );
      setUploadProgress(100);

      // Refresh list and auto-select
      const listResult = await listUserLoRAs();
      setUserLoRAs(listResult.loras || []);
      setSelectedLoRA(result.lora_id);

      showNotification("LoRA uploaded successfully!", "success", "LoRA Upload");
    } catch (err: any) {
      console.error("LoRA upload failed:", err);
      showNotification(err.message || "LoRA upload failed", "error", "LoRA Upload");
    } finally {
      setIsUploadingLoRA(false);
      setUploadProgress(null);
    }
  };

  // Delete session image (just remove from state)
  const handleDeleteSessionImage = (imageId: string) => {
    setGeneratedSessionImages((prev) => prev.filter((img) => img.id !== imageId));
    if (lightboxImage?.id === imageId) setLightboxImage(null);
    showNotification("Image removed", "success", "Delete");
  };

  // Delete DB image (remove from Supabase + refresh)
  const handleDeleteDBImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("ai_generation_outputs")
        .delete()
        .eq("id", imageId);
      if (error) throw error;
      setLatestGenerations((prev) => prev.filter((img) => img.id !== imageId));
      if (lightboxImage?.id === imageId) setLightboxImage(null);
      showNotification("Image deleted", "success", "Delete");
    } catch (err: any) {
      console.error("Delete failed:", err);
      showNotification(err.message || "Failed to delete image", "error", "Delete");
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    [textareaRef.current, bottomTextareaRef.current].forEach(ref => {
      if (ref) {
        ref.style.height = "auto";
        ref.style.height = Math.min(ref.scrollHeight, 120) + "px";
      }
    });
  }, [chatInput]);

  const fetchLatestGenerations = async () => {
    setLoadingLatest(true);
    try {
      const { data, error } = await supabase
        .from("ai_generation_outputs")
        .select("id, image_url, created_at, ai_generation_jobs ( prompt, model_id, created_at )")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        imageUrl: resolveStoredImageUrl(row.image_url),
        prompt: row.ai_generation_jobs?.prompt || "",
        createdAt: row.created_at,
        model: row.ai_generation_jobs?.model_id || undefined,
      }));

      setLatestGenerations(mapped);
    } catch (error: any) {
      console.error("Error fetching latest generations:", error);
      showNotification(
        error?.message || t("Failed to load latest generations."),
        "warning",
        t("Gallery")
      );
    } finally {
      setLoadingLatest(false);
    }
  };

  useEffect(() => {
    if (activeTab === "generations") {
      fetchLatestGenerations();
    }
  }, [activeTab]);

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      showNotification(t("Only image files are supported."), "warning", t("Upload"));
      return;
    }

    const newImages = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setVisionAIImages(p => [...p, ...newImages]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const buildAttachments = async (items: VisionAIImage[]): Promise<GrokAttachment[]> => {
    if (items.length === 0) return [];
    const results = await Promise.all(items.map(async (item) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      data: await fileToBase64(item.file),
      mimeType: item.file.type,
      file: item.file,
    })));
    return results;
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : chatInput;
    const trimmed = textToSend.trim();
    const hasAttachments = visionAIImages.length > 0;
    if ((!trimmed && !hasAttachments) || isAiResponding || isGenerating) return;

    const userMsg = trimmed || (hasAttachments ? t("Analyze these images.") : "");
    const timestamp = new Date().toISOString();
    const currentImages = [...visionAIImages];

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now() + 1}`;

    setChatInput("");
    setVisionAIImages([]);

    try {
      if (visionMode) {
        // Add user message + empty assistant placeholder immediately
        setMessages((p) => [
          ...p,
          { id: userMsgId, role: "user", content: userMsg, timestamp },
          { id: assistantMsgId, role: "assistant", content: "", timestamp: new Date().toISOString() },
        ]);

        setIsAiResponding(true);
        streamingContentRef.current = "";
        streamingMessageIdRef.current = assistantMsgId;

        const attachments = await buildAttachments(currentImages);
        const historyForApi = messages.map((m) => ({ role: m.role, content: m.content }));

        await streamMessageToGrok(
          historyForApi,
          userMsg,
          attachments,
          {
            onToken: (token: string) => {
              if (streamingMessageIdRef.current !== assistantMsgId) return;
              streamingContentRef.current += token;
              const content = streamingContentRef.current;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, content } : msg
                )
              );
            },
            onComplete: (fullText: string) => {
              if (streamingMessageIdRef.current !== assistantMsgId) return;
              const finalContent = fullText || streamingContentRef.current || "";
              streamingContentRef.current = finalContent;
              streamingMessageIdRef.current = null;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, content: finalContent } : msg
                )
              );
              setIsAiResponding(false);
            },
            onError: (error: Error) => {
              if (streamingMessageIdRef.current !== assistantMsgId) return;
              streamingMessageIdRef.current = null;
              const partial = streamingContentRef.current;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: partial ? partial + "\n\nError: connection lost." : t("Sorry, something went wrong. Please try again.") }
                    : msg
                )
              );
              setIsAiResponding(false);
              console.error("[ModelsPage] Stream error:", error);
            },
          }
        );
      } else {
        setMessages((p) => [...p, { id: userMsgId, role: "user", content: userMsg, timestamp }]);
        setIsGenerating(true);
        const referenceUrls = currentImages.length > 0
          ? await uploadGeneratedImages(currentImages.map((img) => img.file))
          : [];

        const seedNum = generationSettings.seed ? parseInt(generationSettings.seed, 10) : undefined;
        const selectedLoRAData = selectedLoRA
          ? userLoRAs.find((l) => l.id === selectedLoRA)
          : null;

        const result = await kiaraGenerate({
          model_id: selectedModel,
          prompt: userMsg,
          image_urls: referenceUrls,
          aspect_ratio: imageRatio,
          resolution: imageResolution,
          num_images: generationSettings.numberOfImages,
          ...(seedNum !== undefined && !isNaN(seedNum) ? { seed: seedNum } : {}),
          ...(selectedLoRAData ? {
            lora: {
              rh_lora_name: selectedLoRAData.rh_lora_name,
              strength_model: loraStrength,
            },
          } : {}),
        });

        const images = result.images || [];
        if (images.length) {
          const generated = images.map((url, idx) => ({
            id: `${Date.now()}-${idx}`,
            url,
            prompt: userMsg,
            createdAt: new Date().toISOString(),
            model: selectedModel,
            aspectRatio: imageRatio,
            resolution: imageResolution,
          }));
          setGeneratedSessionImages((prev) => [...generated, ...prev]);
          void fetchLatestGenerations();
        }

        setMessages((p) => [
          ...p,
          {
            id: assistantMsgId,
            role: "assistant",
            content: images.length
              ? t("Generated {{count}} image(s).", { count: images.length })
              : t("No images returned."),
            images,
            timestamp: new Date().toISOString(),
          }
        ]);
        setIsGenerating(false);
      }
    } catch (error: any) {
      console.error(error);
      streamingMessageIdRef.current = null;
      showNotification(
        error?.message || t("Generation failed. Please try again."),
        "error",
        t("Generation Error")
      );
      setIsAiResponding(false);
      setIsGenerating(false);
    }
  };

  // Shared props for InputCapsule
  const inputProps = {
    chatInput,
    setChatInput,
    visionAIImages,
    setVisionAIImages,
    isAiResponding,
    isGenerating,
    handleSend,
    fileInputRef,
    showSettings,
    setShowSettings,
    selectedModel,
    setSelectedModel,
    showModelMenu,
    setShowModelMenu,
    imageRatio,
    setImageRatio,
    imageResolution,
    setImageResolution,
    generationSettings,
    setGenerationSettings,
    t,
    userLoRAs,
    selectedLoRA,
    setSelectedLoRA,
    loraStrength,
    setLoraStrength,
    isUploadingLoRA,
    uploadProgress,
    loraFileInputRef,
  };

  return (
    <div
      className="fixed inset-0 h-full flex overflow-hidden font-sans bg-black text-white selection:bg-white/20 selection:text-white relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <NotificationContainer />
      {isDragging && (
        <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-xl border-2 border-white/10 flex items-center justify-center">
          <div className="text-white font-sans text-xs tracking-[0.3em] font-semibold uppercase animate-pulse">
            {t("Drop Images To Attach")}
          </div>
        </div>
      )}
      <style>{`
        /* ChatGPT-style font stack */
        .chat-text {
          font-family: "Söhne", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        /* Cursor blink for streaming */
        @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .streaming-cursor { animation: cursorBlink 0.8s ease-in-out infinite; }
      `}</style>

      {/* Sidebar */}
      <ModelsSidebar />

      {/* Main Content */}
      <div 
        className={`flex-1 flex flex-col min-w-0 relative bg-black transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]`}
        style={{ marginRight: visionMode ? '400px' : '0' }}
      >
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold uppercase tracking-widest text-white">
              {activeTab === "images" ? t("Gallery") : t("Create")}
            </h1>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">{t("System Online")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex bg-[#111] p-0.5 rounded-full border border-white/10 mr-4">
               <button onClick={() => setVisionMode(true)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${visionMode ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}>{t("AI")}</button>
               <button onClick={() => setVisionMode(false)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${!visionMode ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}>{t("Freestyle")}</button>
            </div>

            <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 transition-colors">
              <MoreHorizontal size={16} />
            </button>
            <button className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              {t("Share")}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-[1600px] mx-auto min-h-full">
            {activeTab === "generations" && (
              <div className="animate-fadeIn">
                {/* Empty State / Welcome */}
                {generatedSessionImages.length === 0 && latestGenerations.length === 0 && !isGenerating && !loadingLatest && (
                  <div className="py-20 text-center">
                    <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">{t("What will you create today?")}</h2>
                    <p className="text-zinc-500 font-light max-w-md mx-auto mb-16">
                      {t("Select AI mode for assistance or Freestyle for direct generation.")}
                    </p>
                    <div className="flex justify-center mb-12">
                      <span className="text-[180px] leading-none text-zinc-800 select-none animate-pulse">&#8734;</span>
                    </div>
                  </div>
                )}

                {/* Images Grid */}
                {(generatedSessionImages.length > 0 || latestGenerations.length > 0 || isGenerating) && (
                  <div className="grid grid-cols-5 gap-2.5">
                    {/* Loading skeletons */}
                    {isGenerating && Array.from({ length: Math.min(5, generationSettings.numberOfImages) }).map((_, idx) => (
                      <div key={`pending-${idx}`} className="aspect-square bg-[#111] rounded-2xl border border-white/[0.04] flex items-center justify-center">
                        <div className="w-5 h-5 border-[1.5px] border-white/10 border-t-white/50 rounded-full animate-spin" />
                      </div>
                    ))}

                    {/* Session images */}
                    {generatedSessionImages.map((img) => (
                      <div
                        key={img.id}
                        className="aspect-square bg-[#0a0a0a] rounded-2xl overflow-hidden relative group cursor-pointer border border-white/[0.04] hover:border-white/[0.12] transition-all duration-500"
                      >
                        <img
                          src={img.url}
                          onClick={() => setLightboxImage({ id: img.id, url: img.url, prompt: img.prompt, model: img.model, aspectRatio: img.aspectRatio, resolution: img.resolution, createdAt: img.createdAt, isSession: true })}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                        {/* Model label — bottom left */}
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                          <span className="text-[10px] font-medium text-white/70 tracking-wide">{img.model || "Kiara Z MAX"}</span>
                        </div>
                        {/* Action buttons — right side */}
                        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); /* TODO: like */ }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-pink-400 hover:border-pink-400/30 hover:bg-pink-500/10 transition-all duration-200"
                            title="Like"
                          >
                            <Heart size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadImage(img.url); }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
                            title="Download"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSessionImage(img.id); }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-all duration-200"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); /* TODO: menu */ }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
                            title="More"
                          >
                            <Ellipsis size={12} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* DB images */}
                    {latestGenerations.map((img) => (
                      <div
                        key={img.id}
                        className="aspect-square bg-[#0a0a0a] rounded-2xl overflow-hidden relative group cursor-pointer border border-white/[0.04] hover:border-white/[0.12] transition-all duration-500"
                      >
                        <img
                          src={img.imageUrl}
                          onClick={() => setLightboxImage({ id: img.id, url: img.imageUrl, prompt: img.prompt, model: img.model, createdAt: img.createdAt, isSession: false })}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                        {/* Model label — bottom left */}
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                          <span className="text-[10px] font-medium text-white/70 tracking-wide">{img.model || "Kiara Z MAX"}</span>
                        </div>
                        {/* Action buttons — right side */}
                        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-pink-400 hover:border-pink-400/30 hover:bg-pink-500/10 transition-all duration-200"
                            title="Like"
                          >
                            <Heart size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadImage(img.imageUrl); }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
                            title="Download"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDBImage(img.id); }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-all duration-200"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
                            title="More"
                          >
                            <Ellipsis size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "images" && <div className="animate-fadeIn"><ImagesGalleryContent /></div>}
          </div>
        </div>

        {/* BOTTOM INPUT BAR (Visible only in Freestyle Mode) */}
        <div 
          className={`fixed bottom-8 left-[260px] right-0 z-40 flex justify-center pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] transform ${!visionMode ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'}`}
        >
          <div className="pointer-events-auto w-full max-w-3xl px-6">
             <InputCapsule isBottom={true} textareaRef={bottomTextareaRef} {...inputProps} />
          </div>
        </div>
      </div>

      {/* Right Sidebar - Chat Interface (Visible only in AI Mode) */}
      <div 
        className={`fixed top-0 bottom-0 right-0 w-[400px] flex flex-col bg-black/60 backdrop-blur-2xl border-l border-white/5 z-30 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${visionMode ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Chat Header */}
        <div className="flex-shrink-0 h-16 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <span className="font-bold text-black text-xs">K</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t("Assistant")}</h3>
              <p className="text-[9px] text-emerald-500 font-mono uppercase tracking-widest">{t("Active")}</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); streamingMessageIdRef.current = null; streamingContentRef.current = ""; setIsAiResponding(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              <Plus size={12} />
              <span>{t("New")}</span>
            </button>
          )}
        </div>

        {/* Chat Messages */}
        <div data-no-translate="true" className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col h-full justify-center">
              <div className="px-4 space-y-3">
                {[
                  {
                    title: t("Cinematic Creation"),
                    desc: t("Generate high-fidelity scenes."),
                    prompt: t("Generate a cinematic wide shot of a futuristic city at sunset, highly detailed, 8k resolution."),
                    video: "https://imagine.animagic.art/imagine-one/home/campaigns/hailuo_bn.mp4"
                  },
                  {
                    title: t("Character Design"),
                    desc: t("Craft detailed personas."),
                    prompt: t("Create a detailed character sheet for a cyberpunk protagonist, neon accents, leather jacket, digital art style."),
                    video: "https://imagine.animagic.art/imagine-one/home/spotlight-cards/videos/imagineyou.mp4"
                  },
                  {
                    title: t("Motion Synthesis"),
                    desc: t("Bring static images to life."),
                    prompt: t("Generate a video of ocean waves crashing on a rocky shore, photorealistic, 4k, slow motion."),
                    video: "https://imagine.animagic.art/imagine-one/home/spotlight-cards/videos/veo31.mp4"
                  }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(item.prompt)}
                    className="relative w-full aspect-[2.4/1] rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all group text-left"
                  >
                    <video 
                      src={item.video} 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                      className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-700" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4 flex flex-col justify-end">
                      <h4 className="text-white font-bold text-sm tracking-tight">{item.title}</h4>
                      <p className="text-[10px] text-zinc-400 font-light">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMsgStreaming = streamingMessageIdRef.current === msg.id;
              return (
                <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" ? (
                    <div className="flex gap-3 max-w-[95%] w-full">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex-shrink-0 flex items-center justify-center ring-1 ring-white/10">
                        <span className="font-semibold text-white text-[11px]">K</span>
                      </div>
                      <div className="flex-1 pt-1 min-w-0">
                        {msg.content ? (
                          <MarkdownRenderer content={msg.content} isStreaming={isMsgStreaming} />
                        ) : isMsgStreaming ? (
                          <div className="flex items-center gap-1 py-1">
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse [animation-delay:300ms]" />
                          </div>
                        ) : null}
                        {isMsgStreaming && msg.content && (
                          <span className="inline-block w-[2px] h-[1.1em] bg-zinc-300 ml-0.5 streaming-cursor align-middle" />
                        )}
                        {msg.images && msg.images.length > 0 && !isMsgStreaming && (
                          <div className="grid grid-cols-2 gap-2 mt-4">
                            {msg.images.map((url, i) => (
                              <div key={`${url}-${i}`} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                <img src={url} alt={t("Generated")} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#1a1a1a] text-zinc-100 px-4 py-3 rounded-2xl rounded-br-md text-[14px] leading-[1.6] max-w-[80%] chat-text font-normal shadow-lg shadow-black/20">
                      {msg.content}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area (Sidebar) */}
        <div className="flex-shrink-0 p-5 pt-3 relative z-50 border-t border-white/5">
          <InputCapsule textareaRef={textareaRef} {...inputProps} />

          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*" />
          <input
            type="file"
            ref={loraFileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleLoRAUpload(e.target.files[0]);
              if (loraFileInputRef.current) loraFileInputRef.current.value = "";
            }}
            className="hidden"
            accept=".safetensors"
          />
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/97 backdrop-blur-2xl flex items-center justify-center animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close — bigger hit area */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.15] flex items-center justify-center text-white/50 hover:text-white transition-all duration-200 z-20 cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-16 max-w-[90vw] max-h-[88vh] px-12" onClick={(e) => e.stopPropagation()}>
            {/* Image */}
            <div className="flex-shrink-0 max-w-[60vw] max-h-[85vh] flex items-center justify-center">
              <img
                src={lightboxImage.url}
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
                alt=""
              />
            </div>

            {/* Metadata */}
            <div className="flex-shrink-0 w-[280px] flex flex-col justify-center py-8 space-y-10">
              {/* Prompt */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em]">Prompt</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lightboxImage.prompt || "");
                      showNotification("Prompt copied!", "success", "Clipboard");
                    }}
                    className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-white/30 hover:text-white/70 transition-all duration-200"
                    title="Copy prompt"
                  >
                    <Copy size={11} />
                  </button>
                </div>
                <p className="text-[13px] text-white/80 font-light leading-[1.7]">{lightboxImage.prompt}</p>
              </div>

              {/* Details */}
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Model</p>
                  <p className="text-[13px] text-white/90 font-medium">{lightboxImage.model || "Kiara Z MAX"}</p>
                </div>

                <div className="flex gap-10">
                  {lightboxImage.aspectRatio && (
                    <div>
                      <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Ratio</p>
                      <p className="text-[13px] text-white/90 font-medium">{lightboxImage.aspectRatio}</p>
                    </div>
                  )}
                  {lightboxImage.resolution && (
                    <div>
                      <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Quality</p>
                      <p className="text-[13px] text-white/90 font-medium">{lightboxImage.resolution === "2k" ? "2K Ultra" : "1K Standard"}</p>
                    </div>
                  )}
                </div>

                {lightboxImage.createdAt && (
                  <div>
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1.5">Created</p>
                    <p className="text-[13px] text-white/90 font-medium">
                      {new Date(lightboxImage.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" "}
                      <span className="text-white/40">
                        {new Date(lightboxImage.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                {/* Recreate — primary action */}
                <button
                  onClick={() => {
                    // Load all settings from this image
                    if (lightboxImage.prompt) setChatInput(lightboxImage.prompt);
                    if (lightboxImage.model) setSelectedModel(lightboxImage.model);
                    if (lightboxImage.aspectRatio) setImageRatio(lightboxImage.aspectRatio);
                    if (lightboxImage.resolution) setImageResolution(lightboxImage.resolution);
                    // Switch to freestyle mode for direct generation
                    setVisionMode(false);
                    setLightboxImage(null);
                    // Focus the input after a tick
                    setTimeout(() => bottomTextareaRef.current?.focus(), 100);
                    showNotification("Settings loaded — ready to recreate!", "success", "Recreate");
                  }}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-full bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all duration-200"
                >
                  <RotateCcw size={13} /> Recreate
                </button>

                <div className="flex items-center gap-2.5">
                  {/* Download */}
                  <button
                    onClick={() => downloadImage(lightboxImage.url)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/70 text-[11px] font-bold uppercase tracking-wider hover:bg-white/[0.12] hover:text-white transition-all duration-200"
                  >
                    <Download size={13} /> Download
                  </button>
                  {/* Like */}
                  <button
                    onClick={() => { /* TODO: like */ }}
                    className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-pink-500/10 border border-white/[0.06] hover:border-pink-400/30 flex items-center justify-center text-white/40 hover:text-pink-400 transition-all duration-200"
                  >
                    <Heart size={15} />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (lightboxImage.isSession) {
                        handleDeleteSessionImage(lightboxImage.id);
                      } else {
                        handleDeleteDBImage(lightboxImage.id);
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-400/30 flex items-center justify-center text-white/40 hover:text-red-400 transition-all duration-200"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                  {/* More */}
                  <button
                    onClick={() => { /* TODO: more menu */ }}
                    className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.06] hover:border-white/[0.15] flex items-center justify-center text-white/40 hover:text-white transition-all duration-200"
                  >
                    <Ellipsis size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
