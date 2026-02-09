import { useState, useRef, useEffect, memo, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Ratio,
  Hash,
  Sparkles,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

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

const IMAGES_PER_PAGE = 35;

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  model?: string;
}

interface LightboxImage {
  id: string;
  url: string;
  prompt: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  createdAt?: string;
  isSession?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  streaming?: boolean;
}

interface VisionAIImage {
  file: File;
  preview: string;
  base64: string;
}

interface GenerationSettingsState {
  numberOfImages: number;
  seed: string;
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
  userLoRAs: LoRAModel[];
  selectedLoRA: string | null;
  setSelectedLoRA: (v: string | null) => void;
  loraStrength: number;
  setLoraStrength: (v: number) => void;
  isUploadingLoRA: boolean;
  uploadProgress: number | null;
  loraFileInputRef: React.RefObject<HTMLInputElement | null>;
}

// Simple popup component
const SettingPopup = ({ 
  isOpen, 
  onClose, 
  children, 
  triggerRef 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
  triggerRef: React.RefObject<HTMLElement | null>;
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        const trigger = triggerRef.current;
        if (trigger && !trigger.contains(e.target as Node)) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div 
      ref={popupRef}
      className="absolute bottom-full mb-2 right-0 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="relative rounded-[16px] overflow-hidden bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/[0.08] shadow-2xl">
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative p-3">
          {children}
        </div>
      </div>
    </div>
  );
};

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
  
  // Popup states
  const [ratioOpen, setRatioOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
  const [loraOpen, setLoraOpen] = useState(false);
  
  // Refs for positioning
  const ratioRef = useRef<HTMLButtonElement>(null);
  const qualityRef = useRef<HTMLButtonElement>(null);
  const countRef = useRef<HTMLButtonElement>(null);
  const seedRef = useRef<HTMLButtonElement>(null);
  const loraRef = useRef<HTMLButtonElement>(null);
  
  // Close all popups helper
  const closeAll = useCallback(() => {
    setRatioOpen(false);
    setQualityOpen(false);
    setCountOpen(false);
    setSeedOpen(false);
    setLoraOpen(false);
  }, []);

  return (
    <div className={`relative rounded-[20px] overflow-hidden transition-all duration-300 group ${isBottom ? 'w-full max-w-3xl' : ''}`}>
      {/* Animated gradient border glow */}
      <div className="absolute -inset-[1px] rounded-[20px] bg-gradient-to-r from-purple-500/20 via-pink-500/20 via-blue-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
      
      {/* Multi-layer glass background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-white/[0.02]" />
      <div className="absolute inset-0 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 rounded-[20px] border border-white/[0.08] group-focus-within:border-white/[0.15] transition-colors duration-300" />
      <div className="absolute inset-0 rounded-[20px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
      
      <div className="relative p-1">
        {visionAIImages.length > 0 && (
          <div className="flex gap-2 px-3 pt-2 pb-1 overflow-x-auto scrollbar-hide">
            {visionAIImages.map((img, i) => (
              <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/[0.1] flex-shrink-0 group/att ring-1 ring-white/5 backdrop-blur-sm">
                <img src={img.preview} className="w-full h-full object-cover opacity-90 group-hover/att:opacity-100 transition-all" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                <button onClick={() => setVisionAIImages(p => p.filter((_, x) => x !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-all hover:bg-red-500/80 hover:border-red-400/50">
                  <X size={10} className="text-white" />
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
          className={`w-full bg-transparent text-[14px] px-4 py-3 outline-none resize-none placeholder:text-white/30 placeholder:font-light text-white/90 max-h-[120px] chat-text leading-relaxed ${isBottom ? 'min-h-[44px]' : 'min-h-[40px]'}`}
          rows={1}
        />

        {/* Toolbar with Setting Popups */}
        <div className="flex items-center justify-between px-2 pb-2">
          {/* Left Tools */}
          <div className="flex items-center gap-1">
            <button className="group/btn relative">
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 text-white/40 hover:text-white/70 hover:bg-white/[0.05]">
                <Plus size={17} strokeWidth={1.5} />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-[10px] text-white/70 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Tools
              </div>
            </button>
            
            <button onClick={() => fileInputRef.current?.click()} className="group/btn relative">
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 text-white/40 hover:text-white/70 hover:bg-white/[0.05]">
                <Paperclip size={17} strokeWidth={1.5} />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-[10px] text-white/70 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Attach
              </div>
            </button>
            
            <button className="group/btn relative">
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 text-white/40 hover:text-white/70 hover:bg-white/[0.05]">
                <Mic size={17} strokeWidth={1.5} />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-[10px] text-white/70 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Voice
              </div>
            </button>
            
            <button className="group/btn relative">
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 text-white/40 hover:text-white/70 hover:bg-white/[0.05]">
                <Globe size={17} strokeWidth={1.5} />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-[10px] text-white/70 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Web
              </div>
            </button>
          </div>

          {/* Right Actions - Settings Popups */}
          <div className="flex items-center gap-1.5">
            {/* Ratio Popup */}
            <div className="relative">
              <button
                ref={ratioRef}
                onClick={() => { closeAll(); setRatioOpen(!ratioOpen); }}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${ratioOpen ? 'text-white bg-white/[0.08] border border-white/[0.12]' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}
              >
                <Ratio size={15} strokeWidth={1.5} />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white/[0.08] text-[6px] flex items-center justify-center text-white/50 font-medium">{imageRatio.split(':')[0]}</span>
              </button>
              <SettingPopup isOpen={ratioOpen} onClose={() => setRatioOpen(false)} triggerRef={ratioRef}>
                <div className="w-[160px]">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/30 mb-2">Aspect Ratio</p>
                  <div className="grid grid-cols-3 gap-1">
                    {["1:1", "16:9", "9:16", "4:3", "3:4"].map((r) => (
                      <button
                        key={r}
                        onClick={() => { setImageRatio(r); setRatioOpen(false); }}
                        className={`py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                          imageRatio === r
                            ? "bg-white/[0.12] text-white border-white/[0.15]"
                            : "text-white/40 border-white/[0.04] hover:text-white/70 hover:bg-white/[0.05]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </SettingPopup>
            </div>

            {/* Quality Popup */}
            <div className="relative">
              <button
                ref={qualityRef}
                onClick={() => { closeAll(); setQualityOpen(!qualityOpen); }}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${qualityOpen ? 'text-white bg-white/[0.08] border border-white/[0.12]' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}
              >
                <span className="text-[9px] font-semibold">{imageResolution.toUpperCase()}</span>
              </button>
              <SettingPopup isOpen={qualityOpen} onClose={() => setQualityOpen(false)} triggerRef={qualityRef}>
                <div className="w-[100px]">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/30 mb-2">Quality</p>
                  <div className="flex gap-1">
                    {["1k", "2k"].map((res) => (
                      <button
                        key={res}
                        onClick={() => { setImageResolution(res); setQualityOpen(false); }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                          imageResolution === res
                            ? "bg-white/[0.12] text-white border-white/[0.15]"
                            : "text-white/40 border-white/[0.04] hover:text-white/70 hover:bg-white/[0.05]"
                        }`}
                      >
                        {res.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </SettingPopup>
            </div>

            {/* Count Popup */}
            <div className="relative">
              <button
                ref={countRef}
                onClick={() => { closeAll(); setCountOpen(!countOpen); }}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${countOpen ? 'text-white bg-white/[0.08] border border-white/[0.12]' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}
              >
                <span className="text-[9px] font-semibold">{generationSettings.numberOfImages}</span>
              </button>
              <SettingPopup isOpen={countOpen} onClose={() => setCountOpen(false)} triggerRef={countRef}>
                <div className="w-[120px]">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/30 mb-2">Images</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="4"
                      value={generationSettings.numberOfImages}
                      onChange={(e) => setGenerationSettings(p => ({ ...p, numberOfImages: parseInt(e.target.value) }))}
                      className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${(generationSettings.numberOfImages - 1) / 3 * 100}%, rgba(255,255,255,0.06) ${(generationSettings.numberOfImages - 1) / 3 * 100}%, rgba(255,255,255,0.06) 100%)`
                      }}
                    />
                    <span className="text-[11px] font-medium text-white/70 w-4 text-center">{generationSettings.numberOfImages}</span>
                  </div>
                </div>
              </SettingPopup>
            </div>

            {/* Seed Popup */}
            <div className="relative">
              <button
                ref={seedRef}
                onClick={() => { closeAll(); setSeedOpen(!seedOpen); }}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${seedOpen || generationSettings.seed ? 'text-white bg-white/[0.08] border border-white/[0.12]' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}
              >
                <Hash size={15} strokeWidth={1.5} />
                {generationSettings.seed && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500/80" />}
              </button>
              <SettingPopup isOpen={seedOpen} onClose={() => setSeedOpen(false)} triggerRef={seedRef}>
                <div className="w-[140px]">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/30 mb-2">Seed</p>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Random"
                      value={generationSettings.seed}
                      onChange={(e) => setGenerationSettings(p => ({ ...p, seed: e.target.value.replace(/[^0-9]/g, "") }))}
                      className="w-full h-8 rounded-lg bg-black/50 border border-white/[0.08] px-2.5 text-[11px] text-white/70 placeholder:text-white/20 outline-none focus:border-white/[0.15]"
                    />
                    {generationSettings.seed && (
                      <button
                        onClick={() => setGenerationSettings(p => ({ ...p, seed: "" }))}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </SettingPopup>
            </div>

            {/* LoRA Popup */}
            <div className="relative">
              <button
                ref={loraRef}
                onClick={() => { closeAll(); setLoraOpen(!loraOpen); }}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${loraOpen || selectedLoRA ? 'text-white bg-white/[0.08] border border-white/[0.12]' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}
              >
                <Sparkles size={15} strokeWidth={1.5} />
                {selectedLoRA && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500/80" />}
              </button>
              <SettingPopup isOpen={loraOpen} onClose={() => setLoraOpen(false)} triggerRef={loraRef}>
                <div className="w-[180px]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">LoRA</p>
                    <button
                      onClick={() => loraFileInputRef.current?.click()}
                      disabled={isUploadingLoRA}
                      className="text-[9px] text-white/40 hover:text-white/70 transition-colors"
                    >
                      {isUploadingLoRA ? `${uploadProgress}%` : "+"}
                    </button>
                  </div>
                  {isUploadingLoRA && (
                    <div className="h-0.5 w-full rounded-full bg-white/[0.05] mb-2">
                      <div className="h-full rounded-full bg-white/30 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
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
                    className="w-full h-8 rounded-lg bg-black/50 border border-white/[0.08] px-2 text-[11px] text-white/70 outline-none focus:border-white/[0.15] cursor-pointer mb-2"
                  >
                    <option value="">None</option>
                    {userLoRAs.map((lora) => (
                      <option key={lora.id} value={lora.id}>{lora.name}</option>
                    ))}
                  </select>
                  {selectedLoRA && (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={loraStrength}
                        onChange={(e) => setLoraStrength(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.25) ${(loraStrength / 2) * 100}%, rgba(255,255,255,0.06) ${(loraStrength / 2) * 100}%, rgba(255,255,255,0.06) 100%)`
                        }}
                      />
                      <span className="text-[9px] text-white/50 w-8 text-right">{loraStrength.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </SettingPopup>
            </div>

            <div className="w-px h-5 bg-white/[0.06] mx-1" />
            
            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!canSend}
              className="group/send relative disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className={`absolute inset-0 rounded-xl bg-white/20 blur-md transition-opacity duration-300 ${chatInput.trim() || visionAIImages.length > 0 ? 'opacity-0 group-hover/send:opacity-100' : 'opacity-0'}`} />
              <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${chatInput.trim() || visionAIImages.length > 0 ? 'bg-white/[0.08] border-white/20 text-white/90 group-hover/send:bg-white/[0.15] group-hover/send:border-white/30 group-hover/send:text-white group-hover/send:scale-105' : 'bg-transparent border-white/[0.06] text-white/20'}`}>
                <ArrowUpRight size={18} strokeWidth={2} className="transition-transform duration-300 group-hover/send:-translate-y-0.5 group-hover/send:translate-x-0.5" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Grid density presets
const GRID_CONFIGS = [
  { cols: 5, perPage: 30, gap: "gap-2.5", radius: "rounded-2xl" },
  { cols: 8, perPage: 48, gap: "gap-1.5", radius: "rounded-xl" },
  { cols: 12, perPage: 60, gap: "gap-1", radius: "rounded-lg" },
] as const;

const GRID_STORAGE_KEY = "kiara-gallery-grid";
const MODELS_GRID_KEY = "kiara-models-grid";

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
          font-family: "S+�hne", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif;
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
                        {/* Model label G�� bottom left */}
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                          <span className="text-[10px] font-medium text-white/70 tracking-wide">{img.model || "Kiara Z MAX"}</span>
                        </div>
                        {/* Action buttons G�� right side */}
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
                        {/* Model label G�� bottom left */}
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                          <span className="text-[10px] font-medium text-white/70 tracking-wide">{img.model || "Kiara Z MAX"}</span>
                        </div>
                        {/* Action buttons G�� right side */}
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
          {/* Close G�� bigger hit area */}
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
                {/* Recreate G�� primary action */}
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
                    showNotification("Settings loaded G�� ready to recreate!", "success", "Recreate");
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
