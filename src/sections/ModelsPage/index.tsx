import { useState, useRef, useEffect, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ModelsSidebar } from "./components/ModelsSidebar";
import { useNotifications } from "@/components/Notification";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/lib/supabase";
import { fileToBase64, uploadGeneratedImages } from "@/lib/supabase/storage";
import {
  kiaraGenerate,
  kiaraVisionTextToImage,
  listUserLoRAs,
  uploadLoRA,
  xaiEditImage,
  xaiGenerateImage,
  type LoRAModel,
  type KiaraVisionTaskResponse,
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
  ShieldAlert,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { trackActivity } from "@/services/activityTracker";

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

// ─── Model Capabilities Config ─────────────────────────────────────────
// Drives all settings pills dynamically based on each model's actual API support
const MODEL_CAPS: Record<string, {
  ratios: readonly string[];
  quality: readonly { v: string; label: string }[] | null;
  maxImages: number;
  maxRefImages: number;
  hasSeed: boolean;
  hasLoRA: boolean;
  tint: string;
  bgTint: string;
}> = {
  "kiara-z-max": {
    ratios: ["1:1","16:9","9:16","4:3","3:4"],
    quality: [{ v: "1k", label: "1K" }, { v: "2k", label: "2K" }],
    maxImages: 4, maxRefImages: 0, hasSeed: true, hasLoRA: true,
    tint: "group-focus-within:border-purple-400/20 group-focus-within:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
    bgTint: "bg-purple-500/20",
  },
  "kiara-grok-image": {
    ratios: ["auto","1:1","16:9","9:16","4:3","3:4","3:2","2:3","2:1","1:2","20:9","9:20","19.5:9","9:19.5"],
    quality: null, maxImages: 4, maxRefImages: 1, hasSeed: false, hasLoRA: false,
    tint: "group-focus-within:border-amber-400/20 group-focus-within:shadow-[0_0_30px_rgba(245,158,11,0.15)]",
    bgTint: "bg-amber-500/20",
  },
  "grok-imagine": {
    ratios: ["1:1","16:9","9:16","4:3","3:4","3:2","2:3","2:1","1:2","20:9","9:20","19.5:9","9:19.5"],
    quality: null, maxImages: 4, maxRefImages: 1, hasSeed: false, hasLoRA: false,
    tint: "group-focus-within:border-emerald-400/20 group-focus-within:shadow-[0_0_30px_rgba(52,211,153,0.15)]",
    bgTint: "bg-emerald-500/20",
  },
  "seedream-4": {
    ratios: ["1:1","16:9","9:16","4:3","3:4"],
    quality: [{ v: "2k", label: "2K" }, { v: "4k", label: "4K" }],
    maxImages: 6, maxRefImages: 10, hasSeed: true, hasLoRA: false,
    tint: "group-focus-within:border-cyan-400/20 group-focus-within:shadow-[0_0_30px_rgba(34,211,238,0.15)]",
    bgTint: "bg-cyan-500/20",
  },
  "seedream-45": {
    ratios: ["1:1","16:9","9:16","4:3","3:4"],
    quality: [{ v: "2k", label: "2K" }, { v: "4k", label: "4K" }],
    maxImages: 6, maxRefImages: 10, hasSeed: true, hasLoRA: false,
    tint: "group-focus-within:border-cyan-400/20 group-focus-within:shadow-[0_0_30px_rgba(34,211,238,0.15)]",
    bgTint: "bg-cyan-500/20",
  },
  "kiara-vision": {
    ratios: ["1:1","16:9","9:16","4:3","3:4"],
    quality: null, maxImages: 1, maxRefImages: 3, hasSeed: true, hasLoRA: false,
    tint: "group-focus-within:border-blue-400/20 group-focus-within:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
    bgTint: "bg-blue-500/20",
  },
  "kiara-vision-max": {
    ratios: ["1:1","16:9","9:16","4:3","3:4"],
    quality: null, maxImages: 1, maxRefImages: 3, hasSeed: true, hasLoRA: false,
    tint: "group-focus-within:border-blue-400/20 group-focus-within:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
    bgTint: "bg-blue-500/20",
  },
};

const DEFAULT_MODEL_CAPS = MODEL_CAPS["kiara-z-max"];

// Smart auto-switching: UI shows combined model, code resolves to t2i or edit
// based on whether the user attached reference images.
const MODEL_PAIRS: Record<string, { t2i: string; edit: string }> = {
  "grok-imagine": { t2i: "kiara-grok-imagine", edit: "kiara-grok-imagine-edit" },
  "seedream-4":   { t2i: "kiara-seedream-v4",  edit: "kiara-seedream-v4-edit" },
  "seedream-45":  { t2i: "kiara-seedream",      edit: "kiara-seedream-edit" },
};

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const MODEL_OPTIONS = [
  { id: "kiara-z-max", label: "Kiara Z MAX" },
  { id: "kiara-grok-image", label: "Grok Image" },
  { id: "grok-imagine", label: "Grok Imagine" },
  { id: "seedream-4", label: "Seedream 4" },
  { id: "seedream-45", label: "Seedream 4.5" },
  { id: "kiara-vision", label: "Kiara Vision" },
  { id: "kiara-vision-max", label: "Kiara Vision MAX" },
];

/** Pretty-print a model ID: strip "kiara-", remove hyphens, title-case */
const formatModelName = (raw?: string): string => {
  if (!raw) return "Kiara Z MAX";
  const opt = MODEL_OPTIONS.find(m => m.id === raw);
  if (opt) return opt.label;
  // Also check MODEL_PAIRS values (actual API model IDs)
  for (const [uiId, pair] of Object.entries(MODEL_PAIRS)) {
    if (pair.t2i === raw || pair.edit === raw) {
      const found = MODEL_OPTIONS.find(m => m.id === uiId);
      if (found) return found.label;
    }
  }
  return raw
    .replace(/^kiara-/, "")
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const IMAGES_PER_PAGE = 35;

// Influencer type
interface Influencer {
  id: string;
  name: string;
  avatar?: string;
  initial: string;
  color: string;
}

// Mock influencers data
const INFLUENCERS: Influencer[] = [
  { id: "1", name: "Claudia", initial: "C", color: "from-purple-500 via-fuchsia-500 to-pink-500" },
  { id: "2", name: "Kiara", initial: "K", color: "from-blue-500 via-cyan-500 to-teal-500" },
  { id: "3", name: "Aurora", initial: "A", color: "from-amber-500 via-orange-500 to-red-500" },
  { id: "4", name: "Sophia", initial: "S", color: "from-emerald-500 via-green-500 to-lime-500" },
  { id: "5", name: "Victoria", initial: "V", color: "from-indigo-500 via-violet-500 to-purple-500" },
];

// Influencer Selector Component
const InfluencerSelector = () => {
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(INFLUENCERS[0]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (influencer: Influencer) => {
    setSelectedInfluencer(influencer);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 group"
      >
        {/* Avatar */}
        {selectedInfluencer ? (
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${selectedInfluencer.color} flex items-center justify-center ring-1 ring-white/[0.15] shadow-lg`}>
            <span className="text-[10px] font-bold text-white">{selectedInfluencer.initial}</span>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-black border-2 border-white/40 flex items-center justify-center">
            <span className="text-[10px] font-medium text-white/60">+</span>
          </div>
        )}
        
        {/* Text - Matches "Influencer Studio" style */}
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/90 group-hover:text-white transition-colors">
          {selectedInfluencer ? selectedInfluencer.name : "Select"}
        </span>
        
        {/* Chevron with rotation animation */}
        <ChevronDown 
          size={14} 
          className={`text-white/40 transition-all duration-300 ${isOpen ? "rotate-180 text-white/70" : "group-hover:text-white/60"}`} 
        />
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`absolute top-full left-0 mt-2 w-56 origin-top-left transition-all duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] ${
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
      >
        {/* Glass container */}
        <div className="relative rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl">
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
          
          {/* Content */}
          <div className="relative">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-white/[0.06]">
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Switch Influencer</span>
            </div>
            
            {/* Influencer List */}
            <div className="p-1.5 space-y-0.5 max-h-[280px] overflow-y-auto custom-scrollbar">
              {INFLUENCERS.map((influencer, index) => (
                <button
                  key={influencer.id}
                  onClick={() => handleSelect(influencer)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 group/item ${
                    selectedInfluencer?.id === influencer.id
                      ? "bg-white/[0.08]"
                      : "hover:bg-white/[0.04]"
                  }`}
                  style={{
                    animationDelay: `${index * 30}ms`
                  }}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${influencer.color} flex items-center justify-center ring-1 ring-white/[0.1] flex-shrink-0`}>
                    <span className="text-[11px] font-bold text-white">{influencer.initial}</span>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 text-left">
                    <span className={`block text-[12px] font-medium transition-colors ${
                      selectedInfluencer?.id === influencer.id ? "text-white" : "text-white/70 group-hover/item:text-white/90"
                    }`}>
                      {influencer.name}
                    </span>
                    <span className="text-[9px] text-white/30">AI Influencer</span>
                  </div>
                  
                  {/* Checkmark for selected */}
                  {selectedInfluencer?.id === influencer.id && (
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L3.5 7L8.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Footer - Create New */}
            <div className="p-1.5 border-t border-white/[0.06]">
              <button className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-all group/new">
                <div className="w-8 h-8 rounded-full bg-black border-2 border-dashed border-white/30 flex items-center justify-center group-hover/new:border-white/50 transition-colors">
                  <span className="text-[14px] text-white/50 group-hover/new:text-white/70">+</span>
                </div>
                <span className="text-[12px] font-medium text-white/50 group-hover/new:text-white/70">Create New</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

interface PendingGenerationState {
  requestId: string;
  prompt: string;
  model: string;
  startedAt: string;
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
  pendingLoRAFile: File | null;
  setPendingLoRAFile: (v: File | null) => void;
  loraUploadName: string;
  setLoraUploadName: (v: string) => void;
  loraUploadTrigger: string;
  setLoraUploadTrigger: (v: string) => void;
  handleLoRAUploadConfirm: () => void;
}

// Portal-based popup — escapes overflow:hidden containers
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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position above the trigger button
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.top - 6, // 6px gap above trigger
      left: rect.left + rect.width / 2,
    });
  }, [isOpen, triggerRef]);

  // Click outside to close
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

  if (!isOpen || !pos) return null;

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[9999]"
      style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
    >
      <div className="relative rounded-xl overflow-hidden bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl">
        <div className="relative p-2">
          {children}
        </div>
      </div>
    </div>,
    document.body
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
  pendingLoRAFile,
  setPendingLoRAFile,
  loraUploadName,
  setLoraUploadName,
  loraUploadTrigger,
  setLoraUploadTrigger,
  handleLoRAUploadConfirm,
}) => {
  const canSend = (chatInput.trim().length > 0 || visionAIImages.length > 0) && !isAiResponding && !isGenerating;
  
  // Popup states
  const [modelOpen, setModelOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
  const [loraOpen, setLoraOpen] = useState(false);

  // Refs for positioning
  const modelRef = useRef<HTMLButtonElement>(null);
  const ratioRef = useRef<HTMLButtonElement>(null);
  const qualityRef = useRef<HTMLButtonElement>(null);
  const countRef = useRef<HTMLButtonElement>(null);
  const seedRef = useRef<HTMLButtonElement>(null);
  const loraRef = useRef<HTMLButtonElement>(null);

  const caps = MODEL_CAPS[selectedModel] || DEFAULT_MODEL_CAPS;
  const isCompactRatioGrid = caps.ratios.length > 5;

  const currentModelLabel = MODEL_OPTIONS.find(m => m.id === selectedModel)?.label || selectedModel;

  // Close all popups helper
  const closeAll = useCallback(() => {
    setModelOpen(false);
    setRatioOpen(false);
    setQualityOpen(false);
    setCountOpen(false);
    setSeedOpen(false);
    setLoraOpen(false);
  }, []);

  return (
    <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 group ${isBottom ? 'w-full max-w-3xl' : ''}`}>
      {/* Premium Glass Background - Very transparent with strong blur */}
      <div className="absolute inset-0 rounded-2xl bg-white/[0.03] backdrop-blur-2xl" />
      <div className="absolute inset-0 rounded-2xl backdrop-blur-[20px]" />
      
      {/* Frosted glass edge */}
      <div className={`absolute inset-0 rounded-2xl border transition-all duration-500 border-white/[0.08] ${caps.tint}`} />
      
      {/* Subtle inner sheen */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent opacity-50" />
      
      {/* Very subtle model tint */}
      <div className={`absolute inset-0 rounded-2xl opacity-10 transition-opacity duration-500 group-focus-within:opacity-20 ${caps.bgTint}`} />
      
      <div className="relative">
        {/* Image Attachments - compact row */}
        {visionAIImages.length > 0 && (
          <div className="flex gap-1.5 px-3 pt-2 pb-0 overflow-x-auto scrollbar-hide">
            {visionAIImages.map((img, i) => (
              <div key={i} className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/[0.08] flex-shrink-0 group/att">
                <img src={img.preview} className="w-full h-full object-cover opacity-80 group-hover/att:opacity-100 transition-all" />
                <button onClick={() => setVisionAIImages(p => p.filter((_, x) => x !== i))} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-all hover:bg-red-500/80">
                  <X size={8} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Settings Pills - positioned above textarea */}
        <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto scrollbar-hide">
          {/* Model Pill */}
          <div className="relative flex-shrink-0">
            <button
              ref={modelRef}
              onClick={() => { closeAll(); setModelOpen(!modelOpen); }}
              className={`flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                modelOpen
                  ? 'bg-white/[0.1] text-white'
                  : 'bg-transparent text-white/50 hover:text-white/70 hover:bg-white/[0.05]'
              }`}
            >
              <Layers size={12} strokeWidth={1.5} />
              <span className="max-w-[100px] truncate">{currentModelLabel}</span>
              <ChevronDown size={10} className={`transition-transform duration-200 ${modelOpen ? 'rotate-180' : ''}`} />
            </button>
            <SettingPopup isOpen={modelOpen} onClose={() => setModelOpen(false)} triggerRef={modelRef}>
              <div className="w-[160px]">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-medium mb-1.5 px-1">Model</p>
                <div className="space-y-0.5">
                  {MODEL_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m.id); setModelOpen(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-between ${
                        selectedModel === m.id
                          ? "bg-white/[0.1] text-white"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
                      }`}
                    >
                      {m.label}
                      {selectedModel === m.id && <Check size={12} className="text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </SettingPopup>
          </div>

          {/* Ratio Pill — hidden when model has no ratio options */}
          {caps.ratios.length > 0 && <div className="relative flex-shrink-0">
            <button
              ref={ratioRef}
              onClick={() => { closeAll(); setRatioOpen(!ratioOpen); }}
              className={`flex items-center gap-1 h-6 px-2.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                ratioOpen
                  ? 'bg-white/[0.1] text-white'
                  : 'bg-transparent text-white/50 hover:text-white/70 hover:bg-white/[0.05]'
              }`}
            >
              <span className="text-[10px]">{imageRatio}</span>
            </button>
            <SettingPopup isOpen={ratioOpen} onClose={() => setRatioOpen(false)} triggerRef={ratioRef}>
              <div className={isCompactRatioGrid ? "w-[220px]" : "w-[180px]"}>
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-medium mb-1.5 px-1">Aspect Ratio</p>
                {isCompactRatioGrid ? (
                  <div className="grid grid-cols-4 gap-0.5">
                    {caps.ratios.map((r) => (
                      <button
                        key={r}
                        onClick={() => { setImageRatio(r); setRatioOpen(false); }}
                        className={`py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                          imageRatio === r
                            ? "bg-white/[0.1] text-white"
                            : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-0.5">
                    {([
                      { r: "1:1", Icon: Square1x1Icon },
                      { r: "16:9", Icon: Wide16x9Icon },
                      { r: "9:16", Icon: Tall9x16Icon },
                      { r: "4:3", Icon: Wide4x3Icon },
                      { r: "3:4", Icon: Tall3x4Icon },
                    ] as const).map(({ r, Icon }) => (
                      <button
                        key={r}
                        onClick={() => { setImageRatio(r); setRatioOpen(false); }}
                        className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                          imageRatio === r
                            ? "bg-white/[0.1] text-white"
                            : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                        }`}
                      >
                        <Icon />
                        <span>{r}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SettingPopup>
          </div>}

          {/* Quality Pill — only shown when model has quality options */}
          {caps.quality && <div className="relative flex-shrink-0">
            <button
              ref={qualityRef}
              onClick={() => { closeAll(); setQualityOpen(!qualityOpen); }}
              className={`flex items-center gap-1 h-6 px-2.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                qualityOpen
                  ? 'bg-white/[0.1] text-white'
                  : imageResolution !== caps.quality[0].v
                    ? 'text-purple-300'
                    : 'text-white/50 hover:text-white/70'
              }`}
            >
              <span>{caps.quality.find(q => q.v === imageResolution)?.label || caps.quality[0].label}</span>
            </button>
            <SettingPopup isOpen={qualityOpen} onClose={() => setQualityOpen(false)} triggerRef={qualityRef}>
              <div className="w-[130px]">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-medium mb-1.5 px-1">Quality</p>
                <div className="flex gap-1">
                  {caps.quality.map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => { setImageResolution(v); setQualityOpen(false); }}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        imageResolution === v
                          ? "bg-white/[0.1] text-white"
                          : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </SettingPopup>
          </div>}

          {/* Count Pill — hidden when model only supports 1 image */}
          {caps.maxImages > 1 && <div className="relative flex-shrink-0">
            <button
              ref={countRef}
              onClick={() => { closeAll(); setCountOpen(!countOpen); }}
              className={`flex items-center gap-1 h-6 px-2.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                countOpen
                  ? 'bg-white/[0.1] text-white'
                  : generationSettings.numberOfImages > 1
                    ? 'text-blue-300'
                    : 'text-white/50 hover:text-white/70'
              }`}
            >
              <span>&times;{generationSettings.numberOfImages}</span>
            </button>
            <SettingPopup isOpen={countOpen} onClose={() => setCountOpen(false)} triggerRef={countRef}>
              <div className="w-[140px]">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-medium mb-1.5 px-1">Images</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: caps.maxImages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setGenerationSettings(p => ({ ...p, numberOfImages: n }))}
                      className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                        generationSettings.numberOfImages === n
                          ? "bg-white/[0.1] text-white"
                          : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </SettingPopup>
          </div>}

          {/* Seed Pill — hidden for models without seed support */}
          {caps.hasSeed && <div className="relative flex-shrink-0">
            <button
              ref={seedRef}
              onClick={() => { closeAll(); setSeedOpen(!seedOpen); }}
              className={`flex items-center gap-1 h-6 px-2.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                seedOpen
                  ? 'bg-white/[0.1] text-white'
                  : generationSettings.seed
                    ? 'text-emerald-300'
                    : 'text-white/50 hover:text-white/70'
              }`}
            >
              <span>{generationSettings.seed || "Seed"}</span>
            </button>
            <SettingPopup isOpen={seedOpen} onClose={() => setSeedOpen(false)} triggerRef={seedRef}>
              <div className="w-[140px]">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-medium mb-1.5 px-1">Seed</p>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Random"
                    value={generationSettings.seed}
                    onChange={(e) => setGenerationSettings(p => ({ ...p, seed: e.target.value.replace(/[^0-9]/g, "") }))}
                    className="w-full h-7 rounded-lg bg-black/50 border border-white/[0.08] px-2 text-[11px] text-white/80 placeholder:text-white/25 outline-none focus:border-white/[0.2] transition-colors"
                  />
                  {generationSettings.seed && (
                    <button
                      onClick={() => setGenerationSettings(p => ({ ...p, seed: "" }))}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>
            </SettingPopup>
          </div>}

          {/* LoRA Pill — only for Kiara Z MAX */}
          {caps.hasLoRA && <div className="relative flex-shrink-0">
            <button
              ref={loraRef}
              onClick={() => { closeAll(); setLoraOpen(!loraOpen); }}
              className={`flex items-center gap-1 h-6 px-2.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                loraOpen
                  ? 'bg-white/[0.1] text-white'
                  : selectedLoRA
                    ? 'text-amber-300'
                    : 'text-white/50 hover:text-white/70'
              }`}
            >
              <Sparkles size={11} strokeWidth={1.5} />
              <span className="max-w-[80px] truncate">{selectedLoRA ? (userLoRAs.find(l => l.id === selectedLoRA)?.name || "LoRA") : "LoRA"}</span>
            </button>
            <SettingPopup isOpen={loraOpen} onClose={() => { setLoraOpen(false); setPendingLoRAFile(null); }} triggerRef={loraRef}>
              <div className="w-[200px]">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-medium">LoRA Style</p>
                  <button
                    onClick={() => loraFileInputRef.current?.click()}
                    disabled={isUploadingLoRA}
                    className="flex items-center gap-0.5 text-[9px] text-white/40 hover:text-white/70 transition-colors font-medium"
                  >
                    {isUploadingLoRA ? (
                      <span className="text-blue-400">{uploadProgress}%</span>
                    ) : (
                      <><Plus size={10} /> Upload</>
                    )}
                  </button>
                </div>

                {/* Upload form — appears when file is selected */}
                {pendingLoRAFile && (
                  <div className="mb-2 p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] space-y-1.5">
                    <input
                      type="text"
                      placeholder="LoRA name"
                      value={loraUploadName}
                      onChange={(e) => setLoraUploadName(e.target.value)}
                      className="w-full h-6 rounded-md bg-black/40 border border-white/[0.08] px-2 text-[10px] text-white/80 placeholder:text-white/25 outline-none focus:border-white/[0.2] transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Trigger word"
                      value={loraUploadTrigger}
                      onChange={(e) => setLoraUploadTrigger(e.target.value)}
                      className="w-full h-6 rounded-md bg-black/40 border border-amber-500/20 px-2 text-[10px] text-amber-300 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPendingLoRAFile(null)}
                        className="flex-1 h-6 rounded-md text-[9px] font-medium text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLoRAUploadConfirm}
                        disabled={!loraUploadName.trim()}
                        className="flex-1 h-6 rounded-md text-[9px] font-semibold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-40 transition-all"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                )}

                {isUploadingLoRA && (
                  <div className="h-0.5 w-full rounded-full bg-white/[0.05] mb-2 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400/60 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}

                {/* LoRA list */}
                <div className="space-y-0.5 mb-1.5 max-h-[120px] overflow-y-auto scrollbar-hide">
                  <button
                    onClick={() => { setSelectedLoRA(null); setLoraOpen(false); }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-between ${
                      !selectedLoRA
                        ? "bg-white/[0.1] text-white"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
                    }`}
                  >
                    None
                    {!selectedLoRA && <Check size={12} className="text-emerald-400" />}
                  </button>
                  {userLoRAs.map((lora) => (
                    <button
                      key={lora.id}
                      onClick={() => {
                        setSelectedLoRA(lora.id);
                        setLoraStrength(lora.default_strength);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        selectedLoRA === lora.id
                          ? "bg-white/[0.1] text-white"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{lora.name}</span>
                        {selectedLoRA === lora.id && <Check size={12} className="text-amber-400 flex-shrink-0 ml-1" />}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Selected LoRA details — strength slider */}
                {selectedLoRA && (
                  <div className="px-1 pt-1.5 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-white/40 font-medium">Strength</span>
                      <span className="text-[10px] text-white/60 font-mono">{loraStrength.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={loraStrength}
                      onChange={(e) => setLoraStrength(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0.35) ${(loraStrength / 2) * 100}%, rgba(255,255,255,0.06) ${(loraStrength / 2) * 100}%, rgba(255,255,255,0.06) 100%)`
                      }}
                    />
                  </div>
                )}
              </div>
            </SettingPopup>
          </div>}
        </div>

        {/* Textarea - Compact and clean */}
        <textarea
          ref={textareaRef}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) handleSend(); } }}
          placeholder={isBottom ? t("Enter prompt...") : t("Message Kiara...")}
          rows={1}
          className={`w-full bg-transparent text-[14px] px-3 pt-1 pb-10 outline-none resize-none placeholder:text-white/25 placeholder:font-light text-white/90 max-h-[120px] chat-text leading-relaxed ${isBottom ? 'min-h-[44px]' : 'min-h-[40px]'}`}
        />

        {/* Bottom toolbar — tools left, send right */}
        <div className="absolute bottom-0 left-0 right-0 h-10 flex items-center justify-between px-1.5">
          {/* Left Tools */}
          <div className="flex items-center">
            <button onClick={() => fileInputRef.current?.click()} className="group/btn relative">
              <div className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 text-white/35 hover:text-white/70 hover:bg-white/[0.06]">
                <Paperclip size={15} strokeWidth={1.5} />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 backdrop-blur-md border border-white/10 rounded-md text-[10px] text-white/70 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Attach
              </div>
            </button>

            <button className="group/btn relative">
              <div className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 text-white/35 hover:text-white/70 hover:bg-white/[0.06]">
                <Mic size={15} strokeWidth={1.5} />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 backdrop-blur-md border border-white/10 rounded-md text-[10px] text-white/70 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Voice
              </div>
            </button>

            <button className="group/btn relative">
              <div className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 text-white/35 hover:text-white/70 hover:bg-white/[0.06]">
                <Globe size={15} strokeWidth={1.5} />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 backdrop-blur-md border border-white/10 rounded-md text-[10px] text-white/70 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Web
              </div>
            </button>
          </div>

          {/* Send Button - Right aligned */}
          <button
            onClick={() => handleSend()}
            disabled={!canSend}
            className="group/send relative disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${chatInput.trim() || visionAIImages.length > 0 ? 'bg-white text-black hover:scale-105' : 'text-white/25 hover:text-white/40'}`}>
              {isAiResponding || isGenerating ? (
                <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/80 rounded-full animate-spin" />
              ) : (
                <ArrowUpRight size={17} strokeWidth={2.5} className="transition-transform duration-200 group-hover/send:-translate-y-0.5 group-hover/send:translate-x-0.5" />
              )}
            </div>
          </button>
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
const PENDING_GENERATION_KEY = "kiara-models-pending-generation-v1";
const PENDING_GENERATION_TTL_MS = 10 * 60 * 1000;

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

const extractGeneratedImagePath = (value: string): string => {
  if (!value) return "";
  const match = value.match(/generated-images\/([^?]+)/i);
  if (!match) return value;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const dedupeSessionImagesByPath = (
  images: Array<{ id: string; url: string; prompt: string; createdAt: string }>
) => {
  const seen = new Set<string>();
  return images.filter((image) => {
    const key = extractGeneratedImagePath(image.url);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const dedupeGeneratedImagesByPath = (images: GeneratedImage[]) => {
  const seen = new Set<string>();
  return images.filter((image) => {
    const key = extractGeneratedImagePath(image.imageUrl);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const withCacheBuster = (url: string) => {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}cb=${Date.now()}`;
};

const readPendingGeneration = (): PendingGenerationState | null => {
  try {
    const raw = localStorage.getItem(PENDING_GENERATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingGenerationState;
    if (!parsed?.requestId || !parsed?.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writePendingGeneration = (value: PendingGenerationState | null) => {
  try {
    if (!value) {
      localStorage.removeItem(PENDING_GENERATION_KEY);
      return;
    }
    localStorage.setItem(PENDING_GENERATION_KEY, JSON.stringify(value));
  } catch {
    // ignore localStorage failures
  }
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

      // Filter out video outputs — gallery is for images only
      const VIDEO_MARKERS = ["runway-video/", "animate-x/", "grok-video/"];
      const isVideo = (url: string) =>
        VIDEO_MARKERS.some(m => url.includes(m)) || /\.(mp4|webm|mov)(\?|$)/.test(url);

      const mapped = (data || [])
        .filter((row: any) => !isVideo(row.image_url || ""))
        .map((row: any) => ({
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
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                  <span className="text-[10px] font-bold text-white tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{formatModelName(img.model)}</span>
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
                  <p className="text-[13px] text-white font-semibold">{formatModelName(selectedImage.model)}</p>
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

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [visionMode, setVisionMode] = useState(true);
  
  // Image Generation State
  const [visionAIImages, setVisionAIImages] = useState<VisionAIImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSessionImages, setGeneratedSessionImages] = useState<Array<{ id: string; url: string; prompt: string; createdAt: string; model?: string; aspectRatio?: string; resolution?: string; nsfw?: boolean }>>([]);
  const [latestGenerations, setLatestGenerations] = useState<GeneratedImage[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState<PendingGenerationState | null>(null);
  const [loadedGridImages, setLoadedGridImages] = useState<Record<string, true>>({});
  const [gridImageSrcOverrides, setGridImageSrcOverrides] = useState<Record<string, string>>({});

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamingContentRef = useRef("");
  const streamingMessageIdRef = useRef<string | null>(null);
  const sendLockRef = useRef(false);
  const retriedGridImagesRef = useRef<Set<string>>(new Set());

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);

  // Chat panel resize
  const CHAT_MIN = 340;
  const CHAT_MAX = 720;
  const CHAT_DEFAULT = 400;
  const [chatPanelWidth, setChatPanelWidth] = useState(() => {
    const saved = localStorage.getItem("kiara-chat-width");
    return saved ? Math.min(Math.max(Number(saved), CHAT_MIN), CHAT_MAX) : CHAT_DEFAULT;
  });
  const isDraggingPanel = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(CHAT_DEFAULT);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingPanel.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = chatPanelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingPanel.current) return;
      const delta = dragStartX.current - ev.clientX;
      const next = Math.min(CHAT_MAX, Math.max(CHAT_MIN, dragStartWidth.current + delta));
      setChatPanelWidth(next);
    };
    const onUp = () => {
      isDraggingPanel.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setChatPanelWidth((w) => { localStorage.setItem("kiara-chat-width", String(w)); return w; });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [chatPanelWidth]);

  // Grid density
  const [modelsGridIndex, setModelsGridIndex] = useState(() => {
    const saved = localStorage.getItem(MODELS_GRID_KEY);
    return saved ? Math.min(Number(saved), GRID_CONFIGS.length - 1) : 0;
  });
  const modelsGrid = GRID_CONFIGS[modelsGridIndex];
  const isCompactModelsGrid = modelsGrid.cols >= 8;
  const [gridContextMenu, setGridContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const gridContextMenuRef = useRef<HTMLDivElement>(null);

  const openGridContextMenu = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setGridContextMenu({ id, x: rect.right, y: rect.bottom + 4 });
  }, []);

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!gridContextMenu) return;
    const close = () => setGridContextMenu(null);
    const handleClick = (e: MouseEvent) => {
      if (gridContextMenuRef.current && !gridContextMenuRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("mousedown", handleClick); window.removeEventListener("scroll", close, true); };
  }, [gridContextMenu]);

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

  // Clamp settings when model changes — ensure values are valid for new model's capabilities
  useEffect(() => {
    const caps = MODEL_CAPS[selectedModel] || DEFAULT_MODEL_CAPS;
    // Clamp ratio
    if (caps.ratios.length > 0 && !caps.ratios.includes(imageRatio)) {
      setImageRatio(caps.ratios[0] as string);
    }
    // Clamp quality/resolution
    if (caps.quality) {
      if (!caps.quality.some(q => q.v === imageResolution)) {
        setImageResolution(caps.quality[0].v);
      }
    }
    // Clamp image count
    if (generationSettings.numberOfImages > caps.maxImages) {
      setGenerationSettings(p => ({ ...p, numberOfImages: caps.maxImages }));
    }
    // Clear seed if model doesn't support it
    if (!caps.hasSeed && generationSettings.seed) {
      setGenerationSettings(p => ({ ...p, seed: "" }));
    }
    // Clear LoRA if model doesn't support it
    if (!caps.hasLoRA && selectedLoRA) {
      setSelectedLoRA(null);
    }
  }, [selectedModel]); // eslint-disable-line react-hooks/exhaustive-deps

  // LoRA upload state — shows a mini form before actual upload starts
  const [pendingLoRAFile, setPendingLoRAFile] = useState<File | null>(null);
  const [loraUploadName, setLoraUploadName] = useState("");
  const [loraUploadTrigger, setLoraUploadTrigger] = useState("");

  // LoRA upload handler — validates then shows name/trigger form
  const handleLoRAFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".safetensors")) {
      showNotification("Only .safetensors files are supported", "warning", "LoRA Upload");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      showNotification("File too large. Maximum 200MB.", "warning", "LoRA Upload");
      return;
    }
    setPendingLoRAFile(file);
    setLoraUploadName(file.name.replace(/\.safetensors$/i, ""));
    setLoraUploadTrigger("");
  };

  const handleLoRAUploadConfirm = async () => {
    if (!pendingLoRAFile || !loraUploadName.trim()) return;

    setPendingLoRAFile(null);
    setIsUploadingLoRA(true);
    setUploadProgress(0);

    try {
      const result = await uploadLoRA(
        pendingLoRAFile,
        {
          lora_name: loraUploadName.trim(),
          trigger_word: loraUploadTrigger.trim(),
        },
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

  const fetchLatestGenerations = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoadingLatest(true);
    try {
      const { data, error } = await supabase
        .from("ai_generation_outputs")
        .select("id, image_url, created_at, ai_generation_jobs ( prompt, model_id, created_at )")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Filter out video outputs — only show images
      const VIDEO_PATH_MARKERS = ["runway-video/", "animate-x/", "grok-video/"];
      const isVideoOutput = (url: string) =>
        VIDEO_PATH_MARKERS.some(m => url.includes(m)) || /\.(mp4|webm|mov)(\?|$)/.test(url);

      const mapped = (data || [])
        .filter((row: any) => !isVideoOutput(row.image_url || ""))
        .slice(0, 6)
        .map((row: any) => ({
          id: row.id,
          imageUrl: resolveStoredImageUrl(row.image_url),
          prompt: row.ai_generation_jobs?.prompt || "",
          createdAt: row.created_at,
          model: row.ai_generation_jobs?.model_id || undefined,
        }));

      setLatestGenerations(dedupeGeneratedImagesByPath(mapped));
    } catch (error: any) {
      console.error("Error fetching latest generations:", error);
      if (!options?.silent) {
        showNotification(
          error?.message || t("Failed to load latest generations."),
          "warning",
          t("Gallery")
        );
      }
    } finally {
      if (!options?.silent) setLoadingLatest(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchLatestGenerations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolvePendingGeneration = useCallback(async (
    pending: PendingGenerationState,
    options?: { notifyOnFailure?: boolean; notifyOnSuccess?: boolean }
  ): Promise<"pending" | "completed" | "failed" | "expired"> => {
    const startedAtMs = new Date(pending.startedAt).getTime();
    if (!Number.isFinite(startedAtMs) || Date.now() - startedAtMs > PENDING_GENERATION_TTL_MS) {
      writePendingGeneration(null);
      setPendingGeneration(null);
      setIsGenerating(false);
      return "expired";
    }

    const { data: job, error: jobError } = await supabase
      .from("ai_generation_jobs")
      .select("id, status, error, created_at")
      .contains("params", { client_request_id: pending.requestId })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jobError) {
      console.error("[ModelsPage] Failed to resolve pending generation:", jobError);
      return "pending";
    }

    if (!job) return "pending";

    const status = String(job.status || "").toLowerCase();

    if (status === "completed") {
      const { data: outputs, error: outputsError } = await supabase
        .from("ai_generation_outputs")
        .select("id, image_url, created_at")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false });

      if (outputsError) {
        console.error("[ModelsPage] Failed to fetch pending outputs:", outputsError);
      } else if (Array.isArray(outputs) && outputs.length > 0) {
        const recovered = outputs.map((row: any) => ({
          id: String(row.id),
          url: resolveStoredImageUrl(row.image_url),
          prompt: pending.prompt,
          createdAt: row.created_at || new Date().toISOString(),
        }));
        setGeneratedSessionImages((prev) => dedupeSessionImagesByPath([...recovered, ...prev]));
      }

      writePendingGeneration(null);
      setPendingGeneration(null);
      setIsGenerating(false);
      void fetchLatestGenerations({ silent: true });
      if (options?.notifyOnSuccess) {
        showNotification("Background generation completed.", "success", "Generation");
      }
      return "completed";
    }

    if (status === "failed" || status === "canceled" || status === "cancelled") {
      writePendingGeneration(null);
      setPendingGeneration(null);
      setIsGenerating(false);
      if (options?.notifyOnFailure) {
        showNotification(job.error || t("Generation failed. Please try again."), "error", t("Generation Error"));
      }
      return "failed";
    }

    return "pending";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLatestGenerations]);

  useEffect(() => {
    const pending = readPendingGeneration();
    if (!pending) return;
    setPendingGeneration(pending);
    setIsGenerating(true);
    void resolvePendingGeneration(pending, { notifyOnFailure: true, notifyOnSuccess: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingGeneration) return;
    let failures = 0;
    const MAX_CONSECUTIVE_FAILURES = 10;
    const poll = async () => {
      try {
        const result = await resolvePendingGeneration(pendingGeneration, { notifyOnFailure: true });
        if (result !== "pending") failures = 0; // Reset on any definitive result
        else failures++;
      } catch {
        failures++;
      }
      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn("[ModelsPage] Too many poll failures, clearing pending generation");
        writePendingGeneration(null);
        setPendingGeneration(null);
        setIsGenerating(false);
      }
    };
    const timer = window.setInterval(() => {
      void poll();
    }, 5000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGeneration]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchLatestGenerations({ silent: true });
    }, 12000);
    return () => window.clearInterval(timer);
  }, [fetchLatestGenerations]);

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      showNotification(t("Only image files are supported."), "warning", t("Upload"));
      return;
    }

    // 20 MB per-file limit
    const oversized = imageFiles.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      const names = oversized.map(f => f.name).join(", ");
      showNotification(
        t("Image too large ({{names}}). Maximum {{limit}}MB per file.", { names, limit: MAX_FILE_SIZE_MB }),
        "error",
        t("File Limit"),
      );
      return;
    }

    // Model-specific reference image limits (from MODEL_CAPS)
    const refCaps = MODEL_CAPS[selectedModel] || DEFAULT_MODEL_CAPS;
    const maxImages = refCaps.maxRefImages || 5;
    const currentCount = visionAIImages.length;
    const remainingSlots = maxImages - currentCount;
    
    if (remainingSlots <= 0) {
      showNotification(t(`Maximum ${maxImages} reference images allowed.`), "warning", t("Upload"));
      return;
    }

    const newImages = imageFiles.slice(0, remainingSlots).map(file => ({ file, preview: URL.createObjectURL(file) }));
    setVisionAIImages(p => [...p, ...newImages]);
    
    if (imageFiles.length > remainingSlots) {
      showNotification(t(`Only ${remainingSlots} image${remainingSlots > 1 ? 's' : ''} added. Maximum ${maxImages} allowed.`), "info", t("Upload"));
    }
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

  const buildVisionReferenceImages = async (
    storageRefs: string[]
  ): Promise<Array<{ uri: string; tag: string }>> => {
    const refs = await Promise.all(
      storageRefs.map(async (value, idx) => {
        const tag = `ref_${idx + 1}`;
        if (value.startsWith("http://") || value.startsWith("https://")) {
          return { uri: value, tag };
        }

        // Prefer signed URLs to ensure the provider can fetch from private buckets.
        const { data: signed, error: signedError } = await supabase.storage
          .from("generated-images")
          .createSignedUrl(value, 3600);

        if (!signedError && signed?.signedUrl) {
          return { uri: signed.signedUrl, tag };
        }

        const { data } = supabase.storage.from("generated-images").getPublicUrl(value);
        return { uri: data.publicUrl, tag };
      })
    );

    return refs.filter((item) => Boolean(item.uri));
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : chatInput;
    const trimmed = textToSend.trim();
    const hasAttachments = visionAIImages.length > 0;
    if ((!trimmed && !hasAttachments) || isAiResponding || isGenerating || sendLockRef.current) return;
    sendLockRef.current = true;

    const userMsg = trimmed || (hasAttachments ? t("Analyze these images.") : "");
    const timestamp = new Date().toISOString();
    const currentImages = [...visionAIImages];
    let pendingRecord: PendingGenerationState | null = null;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now() + 1}`;

    setChatInput("");
    setVisionAIImages([]);

    try {
      if (visionMode) {
        void trackActivity("assistant_message_sent", {
          path: "/models",
          metadata: {
            message_length: userMsg.length,
            attachments: currentImages.length,
          },
        });

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
              void trackActivity("assistant_message_completed", {
                path: "/models",
                metadata: {
                  output_length: finalContent.length,
                },
              });
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
              void trackActivity("assistant_message_failed", {
                path: "/models",
                metadata: {
                  error: error?.message || "stream_error",
                },
              });
              setIsAiResponding(false);
              console.error("[ModelsPage] Stream error:", error);
            },
          }
        );
      } else {
        setMessages((p) => [...p, { id: userMsgId, role: "user", content: userMsg, timestamp }]);
        setIsGenerating(true);
        const clientRequestId =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        pendingRecord = {
          requestId: clientRequestId,
          prompt: userMsg,
          model: selectedModel,
          startedAt: new Date().toISOString(),
        };
        setPendingGeneration(pendingRecord);
        writePendingGeneration(pendingRecord);
        void trackActivity("generation_started", {
          path: "/models",
          metadata: {
            model: selectedModel,
            ratio: imageRatio,
            resolution: imageResolution,
            requested_images: generationSettings.numberOfImages,
            attachments: currentImages.length,
          },
        });
        const referenceUrls = currentImages.length > 0
          ? await uploadGeneratedImages(currentImages.map((img) => img.file))
          : [];

        const seedNum = generationSettings.seed ? parseInt(generationSettings.seed, 10) : undefined;
        const selectedLoRAData = selectedLoRA
          ? userLoRAs.find((l) => l.id === selectedLoRA)
          : null;

        let images: string[] = [];

        if (selectedModel === "kiara-grok-image") {
          const xaiModel = "grok-imagine-image";
          const referenceImage = referenceUrls[0]
            ? (await buildVisionReferenceImages([referenceUrls[0]]))[0]?.uri
            : undefined;

          if (referenceImage) {
            const editResult = await xaiEditImage({
              prompt: userMsg,
              model: xaiModel,
              image: { url: referenceImage },
              response_format: "url",
              n: generationSettings.numberOfImages,
            });
            images = (editResult.data || [])
              .map((item) => item?.url)
              .filter((value): value is string => typeof value === "string" && value.length > 0);
          } else {
            const generationResult = await xaiGenerateImage({
              prompt: userMsg,
              model: xaiModel,
              response_format: "url",
              n: generationSettings.numberOfImages,
            });
            images = (generationResult.data || [])
              .map((item) => item?.url)
              .filter((value): value is string => typeof value === "string" && value.length > 0);
          }
        } else if (selectedModel.startsWith("kiara-vision")) {
          // Route to Kiara Vision pipeline
          // gen4_image_turbo requires reference images; gen4_image works text-only
          const visionModelMap: Record<string, "gen4_image_turbo" | "gen4_image" | "gemini_2.5_flash"> = {
            "kiara-vision": "gen4_image_turbo",
            "kiara-vision-max": "gen4_image",
            "kiara-vision-flash": "gemini_2.5_flash",
          };
          const visionModel = visionModelMap[selectedModel] || "gen4_image";
          const ratioMap: Record<string, string> = {
            "1:1": "1024:1024",
            "16:9": "1360:768",
            "9:16": "1080:1920",
            "4:3": "1440:1080",
            "3:4": "1080:1440",
          };
          const visionRefImages = await buildVisionReferenceImages(referenceUrls);
          const baseParams = {
            promptText: userMsg,
            model: visionModel,
            ratio: ratioMap[imageRatio] || "1024:1024",
            ...(seedNum !== undefined && !isNaN(seedNum) ? { seed: seedNum } : {}),
          } as const;

          let visionResult: KiaraVisionTaskResponse;
          try {
            visionResult = await kiaraVisionTextToImage({
              ...baseParams,
              client_request_id: clientRequestId,
              ...(visionRefImages.length > 0 ? { referenceImages: visionRefImages } : {}),
            });
          } catch (visionError: any) {
            const message = String(visionError?.message || "");
            const isValidationError = /validation of body failed/i.test(message);

            if (!isValidationError) throw visionError;

            // Fallback: reduce payload to the strictest compatible shape for retries.
            const retryParams = {
              ...baseParams,
              client_request_id: clientRequestId,
              ...(visionModel === "gen4_image_turbo" && visionRefImages.length > 0
                ? { referenceImages: visionRefImages.slice(0, 1) }
                : {}),
            };

            visionResult = await kiaraVisionTextToImage(retryParams);
          }
          images = visionResult.images || [];
        } else {
          // Existing kiaraGenerate flow (RunningHub / FAL.ai)
          // referenceUrls are storage paths — convert to signed URLs so
          // external providers (fal.ai etc.) can actually download them.
          const resolvedRefs = referenceUrls.length > 0
            ? (await buildVisionReferenceImages(referenceUrls)).map((r) => r.uri)
            : [];

          // Smart model resolution: combined UI models auto-switch to t2i or edit
          const pair = MODEL_PAIRS[selectedModel];
          const actualModelId = pair
            ? (resolvedRefs.length > 0 ? pair.edit : pair.t2i)
            : selectedModel;

          const result = await kiaraGenerate({
            model_id: actualModelId,
            client_request_id: clientRequestId,
            prompt: userMsg,
            image_urls: resolvedRefs,
            aspect_ratio: imageRatio,
            resolution: imageResolution,
            num_images: generationSettings.numberOfImages,
            ...(seedNum !== undefined && !isNaN(seedNum) ? { seed: seedNum } : {}),
            ...(selectedLoRAData ? {
              lora: {
                rh_lora_name: selectedLoRAData.rh_lora_name,
                strength_model: loraStrength,
                trigger_word: selectedLoRAData.trigger_word || "",
              },
            } : {}),
          });

          // Provider flagged the content as NSFW — show flagged card, not a generic error
          if (result.nsfw) {
            const nsfwEntry = {
              id: `nsfw-${Date.now()}`,
              url: "",
              prompt: userMsg,
              createdAt: new Date().toISOString(),
              model: selectedModel,
              nsfw: true,
            };
            setGeneratedSessionImages((prev) => [nsfwEntry, ...prev]);
            setIsGenerating(false);
            setIsAiResponding(false);
            setPendingGeneration(null);
            writePendingGeneration(null);
            return;
          }

          images = result.images || [];
        }
        if (images.length) {
          void trackActivity("generation_succeeded", {
            path: "/models",
            metadata: {
            model: selectedModel,
            image_count: images.length,
          },
          });
          const generated = images.map((url, idx) => ({
            id: `${Date.now()}-${idx}`,
            url,
            prompt: userMsg,
            createdAt: new Date().toISOString(),
            model: selectedModel,
            aspectRatio: imageRatio,
            resolution: imageResolution,
          }));
          setGeneratedSessionImages((prev) => dedupeSessionImagesByPath([...generated, ...prev]));
        }
        if (!images.length) {
          void trackActivity("generation_empty", {
            path: "/models",
            metadata: {
              model: selectedModel,
            },
          });
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
        setPendingGeneration(null);
        writePendingGeneration(null);
        void fetchLatestGenerations({ silent: true });
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = String(error?.message || "");
      const uncertainGenerationState =
        !visionMode &&
        pendingRecord &&
        /failed to fetch|networkerror|network request failed|err_failed/i.test(errMsg);
      void trackActivity(visionMode ? "assistant_error" : "generation_failed", {
        path: "/models",
        metadata: {
          model: selectedModel,
          error: errMsg || "unknown_error",
        },
      });
      streamingMessageIdRef.current = null;
      if (!uncertainGenerationState) {
        showNotification(
          errMsg || t("Generation failed. Please try again."),
          "error",
          t("Generation Error")
        );
      }
      setIsAiResponding(false);

      if (uncertainGenerationState && pendingRecord) {
        setPendingGeneration(pendingRecord);
        writePendingGeneration(pendingRecord);
        setIsGenerating(true);
        showNotification("Connection dropped. Recovering generation status...", "warning", "Generation");
      } else {
        setPendingGeneration(null);
        writePendingGeneration(null);
        setIsGenerating(false);
      }
    } finally {
      sendLockRef.current = false;
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
    pendingLoRAFile,
    setPendingLoRAFile,
    loraUploadName,
    setLoraUploadName,
    loraUploadTrigger,
    setLoraUploadTrigger,
    handleLoRAUploadConfirm,
  };

  // Deduplicate: filter DB images whose storage path already appears in session images
  const sessionPaths = new Set(
    generatedSessionImages.map((img) => extractGeneratedImagePath(img.url))
  );
  const dedupedLatestGenerations = latestGenerations.filter((img) => {
    const path = extractGeneratedImagePath(img.imageUrl);
    return !sessionPaths.has(path);
  });
  const markGridImageLoaded = useCallback((key: string) => {
    setLoadedGridImages((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);
  const resolveGridImageSrc = useCallback(
    (key: string, baseSrc: string) => gridImageSrcOverrides[key] || baseSrc,
    [gridImageSrcOverrides]
  );
  const handleGridImageError = useCallback((key: string, src: string) => {
    if (!src || retriedGridImagesRef.current.has(key)) return;
    retriedGridImagesRef.current.add(key);
    setGridImageSrcOverrides((prev) => ({ ...prev, [key]: withCacheBuster(src) }));
  }, []);

  return (
    <div
      className="flex h-screen w-full overflow-hidden font-sans bg-black text-white selection:bg-white/20 selection:text-white relative"
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
        
        /* Premium Generating Animation */
        .generating-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            135deg,
            #0a0a0a 0%,
            #111111 25%,
            #0d0d0d 50%,
            #151515 75%,
            #0a0a0a 100%
          );
          background-size: 400% 400%;
          animation: gradientShift 4s ease infinite;
        }
        
        .generating-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at 30% 20%,
            rgba(60, 60, 60, 0.15) 0%,
            transparent 50%
          );
          animation: floatOrb1 6s ease-in-out infinite;
        }
        
        .generating-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at 70% 80%,
            rgba(40, 40, 40, 0.2) 0%,
            transparent 50%
          );
          animation: floatOrb2 8s ease-in-out infinite;
        }
        
        .generating-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 0%,
            transparent 40%,
            rgba(255,255,255,0.03) 50%,
            transparent 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
        }
        
        .generating-glow {
          position: absolute;
          inset: -50%;
          background: conic-gradient(
            from 0deg at 50% 50%,
            transparent 0deg,
            rgba(80, 80, 80, 0.1) 60deg,
            transparent 120deg,
            transparent 180deg,
            rgba(60, 60, 60, 0.08) 240deg,
            transparent 300deg,
            transparent 360deg
          );
          animation: rotate 10s linear infinite;
        }
        
        .generating-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        
        .generating-particles::before,
        .generating-particles::after {
          content: '';
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          box-shadow: 
            20px 40px 0 rgba(255,255,255,0.08),
            60px 10px 0 rgba(255,255,255,0.05),
            100px 80px 0 rgba(255,255,255,0.06),
            140px 30px 0 rgba(255,255,255,0.04);
          animation: particles 12s linear infinite;
        }
        
        .generating-particles::after {
          animation-delay: -6s;
          opacity: 0.5;
        }
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          33% { transform: translate(30px, -20px) scale(1.1); opacity: 0.7; }
          66% { transform: translate(-20px, 30px) scale(0.9); opacity: 0.4; }
        }
        
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate(-40px, -30px) scale(1.2); opacity: 0.6; }
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes particles {
          0% { transform: translateY(100%) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100%) rotate(360deg); opacity: 0; }
        }
        
        .generating-pulse {
          animation: pulseGlow 2s ease-in-out infinite;
        }
        
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.03), inset 0 0 20px rgba(255,255,255,0.02); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.06), inset 0 0 30px rgba(255,255,255,0.04); }
        }
      `}</style>

      {/* Sidebar */}
      <ModelsSidebar />

      {/* Main Content */}
      <div 
        className={`flex-1 flex flex-col min-w-0 h-full relative bg-black transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]`}
        style={{ marginRight: visionMode ? `${chatPanelWidth}px` : '0', transition: isDraggingPanel.current ? 'none' : undefined }}
      >
        {/* Header */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-white/5 bg-black/50 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold uppercase tracking-widest text-white">
              {t("Influencer Studio")}
            </h1>
            <div className="h-4 w-px bg-white/10" />
            {/* Influencer Selector */}
            <InfluencerSelector />
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
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-[1600px] mx-auto min-h-full">
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
                  <>
                  {/* Grid density buttons */}
                  <div className="flex items-center justify-end gap-1 mb-4">
                    {GRID_CONFIGS.map((cfg, i) => (
                      <button
                        key={cfg.cols}
                        onClick={() => { setModelsGridIndex(i); localStorage.setItem(MODELS_GRID_KEY, String(i)); }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          modelsGridIndex === i
                            ? "bg-white/[0.1] text-white border border-white/[0.12]"
                            : "text-white/30 hover:text-white/60 hover:bg-white/[0.05]"
                        }`}
                        title={`${cfg.cols} columns`}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          {Array.from({ length: Math.min(cfg.cols, 4) }).map((_, ci) =>
                            Array.from({ length: Math.min(cfg.cols, 4) }).map((_, ri) => {
                              const size = cfg.cols <= 5 ? 3 : cfg.cols <= 8 ? 2.5 : 2;
                              const gap = cfg.cols <= 5 ? 1 : 0.5;
                              return (
                                <rect
                                  key={`${ci}-${ri}`}
                                  x={ci * (size + gap)}
                                  y={ri * (size + gap)}
                                  width={size}
                                  height={size}
                                  rx={0.5}
                                  fill="currentColor"
                                />
                              );
                            })
                          )}
                        </svg>
                      </button>
                    ))}
                  </div>
                  <div className={`grid ${modelsGrid.gap}`} style={{ gridTemplateColumns: `repeat(${modelsGrid.cols}, minmax(0, 1fr))` }}>
                    {/* Loading skeletons - Premium Generating Animation */}
                    {isGenerating && Array.from({ length: Math.min(5, generationSettings.numberOfImages) }).map((_, idx) => (
                      <div 
                        key={`pending-${idx}`} 
                        className={`generating-card generating-pulse aspect-square ${modelsGrid.radius} border border-white/[0.06] flex items-center justify-center relative`}
                        style={{ animationDelay: `${idx * 0.15}s` }}
                      >
                        {/* Animated gradient orbs */}
                        <div className="generating-glow" />
                        <div className="generating-shimmer" />
                        <div className="generating-particles" />
                        
                        {/* Center content */}
                        <div className="relative z-10 flex flex-col items-center gap-3">
                          {/* Animated infinity/sparkle icon */}
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full border border-white/[0.1] flex items-center justify-center">
                              <Sparkles size={18} className="text-white/30" />
                            </div>
                            {/* Orbiting dots */}
                            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/40" />
                            </div>
                            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/20" />
                            </div>
                          </div>
                          
                          {/* Status text */}
                          <div className="text-center">
                            <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest">Generating</p>
                          </div>
                          
                          {/* Progress dots */}
                          <div className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                        
                        {/* Corner accent */}
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                          <span className="text-[9px] text-white/20">{idx + 1}</span>
                        </div>
                      </div>
                    ))}

                    {/* Session images */}
                    {generatedSessionImages.map((img, idx) => {
                      // ── NSFW flagged card ──
                      if (img.nsfw) {
                        return (
                          <div
                            key={img.id}
                            className={`aspect-square ${modelsGrid.radius} overflow-hidden relative border border-red-500/20 transition-all duration-500`}
                          >
                            {/* Blurred gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-red-950/80 via-zinc-900 to-red-950/60" style={{ filter: "blur(0px)" }} />
                            <div className="absolute inset-0 backdrop-blur-sm bg-black/30" />

                            {/* NSFW overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center z-10">
                              <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                                <ShieldAlert size={18} className="text-red-400" />
                              </div>
                              <span className="text-[13px] font-bold text-red-400 tracking-widest uppercase">NSFW</span>
                              <p className="text-[9px] text-white/40 leading-tight max-w-[120px]">
                                Content flagged by provider safety filter
                              </p>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDeleteSessionImage(img.id)}
                                className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 text-[10px] font-medium"
                              >
                                <Trash2 size={10} />
                                Delete
                              </button>

                              <p className="text-[8px] text-white/25 mt-0.5">Credits have been refunded</p>
                            </div>
                          </div>
                        );
                      }

                      const imageKey = `session:${img.id}`;
                      const imageSrc = resolveGridImageSrc(imageKey, img.url);
                      const isImageLoaded = Boolean(loadedGridImages[imageKey]);
                      return (
                      <div
                        key={img.id}
                        className={`aspect-square bg-[#0a0a0a] ${modelsGrid.radius} overflow-hidden relative group cursor-pointer border border-white/[0.04] hover:border-white/[0.12] transition-all duration-500`}
                      >
                        {!isImageLoaded && (
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse" />
                        )}
                        <img
                          src={imageSrc}
                          onClick={() => setLightboxImage({ id: img.id, url: img.url, prompt: img.prompt, model: img.model, aspectRatio: img.aspectRatio, resolution: img.resolution, createdAt: img.createdAt, isSession: true })}
                          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03] ${isImageLoaded ? "opacity-100" : "opacity-0"}`}
                          loading={idx < 10 ? "eager" : "lazy"}
                          fetchpriority={idx < 6 ? "high" : "auto"}
                          decoding="async"
                          onLoad={() => markGridImageLoaded(imageKey)}
                          onError={() => handleGridImageError(imageKey, imageSrc)}
                        />
                        {/* Model label — hidden on compact grid */}
                        {!isCompactModelsGrid && (
                          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                            <span className="text-[10px] font-bold text-white tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{formatModelName(img.model)}</span>
                          </div>
                        )}
                        {/* Action buttons */}
                        {isCompactModelsGrid ? (
                          <button
                            onClick={(e) => openGridContextMenu(`s:${img.id}`, e)}
                            className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-150"
                          >
                            <Ellipsis size={10} />
                          </button>
                        ) : (
                          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <button onClick={(e) => { e.stopPropagation(); }} className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-pink-400 hover:border-pink-400/30 hover:bg-pink-500/10 transition-all duration-200" title="Like">
                              <Heart size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); downloadImage(img.url); }} className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all duration-200" title="Download">
                              <Download size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSessionImage(img.id); }} className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-all duration-200" title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    )})}

                    {/* DB images (deduped against session) */}
                    {dedupedLatestGenerations.map((img, idx) => {
                      const imageKey = `db:${img.id}`;
                      const imageSrc = resolveGridImageSrc(imageKey, img.imageUrl);
                      const isImageLoaded = Boolean(loadedGridImages[imageKey]);
                      return (
                      <div
                        key={img.id}
                        className={`aspect-square bg-[#0a0a0a] ${modelsGrid.radius} overflow-hidden relative group cursor-pointer border border-white/[0.04] hover:border-white/[0.12] transition-all duration-500`}
                      >
                        {!isImageLoaded && (
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse" />
                        )}
                        <img
                          src={imageSrc}
                          onClick={() => setLightboxImage({ id: img.id, url: img.imageUrl, prompt: img.prompt, model: img.model, createdAt: img.createdAt, isSession: false })}
                          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03] ${isImageLoaded ? "opacity-100" : "opacity-0"}`}
                          loading={idx < 12 ? "eager" : "lazy"}
                          fetchpriority={idx < 8 ? "high" : "auto"}
                          decoding="async"
                          onLoad={() => markGridImageLoaded(imageKey)}
                          onError={() => handleGridImageError(imageKey, imageSrc)}
                        />
                        {/* Model label — hidden on compact grid */}
                        {!isCompactModelsGrid && (
                          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                            <span className="text-[10px] font-bold text-white tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{formatModelName(img.model)}</span>
                          </div>
                        )}
                        {/* Action buttons */}
                        {isCompactModelsGrid ? (
                          <button
                            onClick={(e) => openGridContextMenu(`d:${img.id}`, e)}
                            className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-150"
                          >
                            <Ellipsis size={10} />
                          </button>
                        ) : (
                          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <button onClick={(e) => { e.stopPropagation(); }} className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-pink-400 hover:border-pink-400/30 hover:bg-pink-500/10 transition-all duration-200" title="Like">
                              <Heart size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); downloadImage(img.imageUrl); }} className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all duration-200" title="Download">
                              <Download size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteDBImage(img.id); }} className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-all duration-200" title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                  </>
                )}
              </div>
          </div>
        </div>

        {/* FREESTYLE MODE - Model Showcase + Input */}
        <div 
          className={`fixed bottom-0 left-[260px] right-0 z-40 flex flex-col items-center pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] transform ${!visionMode ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'}`}
        >
          {/* Model Showcase - Above the input */}
          <div className="pointer-events-auto w-full max-w-3xl px-6 mb-3">
            <div className="relative rounded-2xl overflow-hidden backdrop-blur-2xl border border-white/[0.1] shadow-2xl">
              {/* Glass layers */}
              <div className="absolute inset-0 bg-white/[0.03]" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent" />
              
              {/* Animated Background Glow */}
              <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[100px] transition-all duration-1000 ${
                selectedModel === 'kiara-z-max' ? 'bg-purple-500/25' :
                selectedModel.startsWith('kiara-vision') ? 'bg-blue-500/25' :
                selectedModel.startsWith('seedream') ? 'bg-cyan-500/25' :
                'bg-amber-500/25'
              }`} />
              <div className={`absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[60px] transition-all duration-1000 ${
                selectedModel === 'kiara-z-max' ? 'bg-pink-500/15' :
                selectedModel.startsWith('kiara-vision') ? 'bg-cyan-500/15' :
                selectedModel.startsWith('seedream') ? 'bg-teal-500/15' :
                'bg-orange-500/15'
              }`} />

              <div className="relative p-4 flex items-center gap-4">
                {/* Left: Model Info */}
                <div className="flex-1">
                  {/* Model Badge */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      selectedModel === 'kiara-z-max' ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]' :
                      selectedModel.startsWith('kiara-vision') ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' :
                      selectedModel.startsWith('seedream') ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' :
                      'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    }`} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                      {selectedModel === 'kiara-z-max' ? 'Standard' :
                       selectedModel.startsWith('kiara-vision') ? 'Vision' :
                       selectedModel.startsWith('seedream') ? 'Seedream' :
                       selectedModel.includes('grok') ? 'Grok' :
                       'Pro'}
                    </span>
                  </div>

                  {/* Model Name - Big & Bold */}
                  <h2 className={`text-xl font-black tracking-tight leading-none mb-1 ${
                    selectedModel === 'kiara-z-max' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-white to-pink-200' :
                    selectedModel.startsWith('kiara-vision') ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-cyan-200' :
                    selectedModel.startsWith('seedream') ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-teal-200' :
                    'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-orange-200'
                  }`}>
                    {MODEL_OPTIONS.find(m => m.id === selectedModel)?.label || selectedModel}
                  </h2>

                  {/* Model Description */}
                  <p className="text-[11px] text-white/40 mt-1">
                    {selectedModel === 'kiara-z-max' ? 'Elite photorealistic generation' :
                     selectedModel.startsWith('kiara-vision') ? 'Character consistency with references' :
                     selectedModel.startsWith('seedream') ? 'Smart image editing & generation' :
                     selectedModel.includes('grok') ? 'xAI image generation & editing' :
                     'Maximum fidelity & creative power'}
                  </p>
                </div>

                {/* Right: Reference Images (all models with ref support) */}
                {(() => {
                  const refMax = (MODEL_CAPS[selectedModel] || DEFAULT_MODEL_CAPS).maxRefImages;
                  if (refMax <= 0) return null;
                  const displaySlots = Math.min(refMax, 4);
                  return (
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {visionAIImages.map((img, i) => (
                          <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 group">
                            <img src={img.preview} className="w-full h-full object-cover" />
                            <button
                              onClick={() => setVisionAIImages(p => p.filter((_, x) => x !== i))}
                              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} className="text-white" />
                            </button>
                            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center text-[8px] font-bold text-white">
                              {i + 1}
                            </div>
                          </div>
                        ))}

                        {/* Add Button */}
                        {visionAIImages.length < refMax && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-12 h-12 rounded-xl border border-dashed border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] flex flex-col items-center justify-center gap-0.5 transition-all group"
                          >
                            <Plus size={14} className="text-white/30 group-hover:text-white/50" />
                            <span className="text-[8px] text-white/30">{visionAIImages.length}/{refMax}</span>
                          </button>
                        )}

                        {/* Empty slots */}
                        {Array.from({ length: Math.max(0, displaySlots - 1 - visionAIImages.length) }).map((_, i) => (
                          <div key={`empty-${i}`} className="w-12 h-12 rounded-xl border border-white/[0.03] bg-white/[0.01]" />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Z MAX: Feature Tags */}
                {selectedModel === 'kiara-z-max' && (
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <div className="flex gap-1">
                      {['8K', 'Fast', 'Pro'].map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[9px] font-medium text-white/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[9px] text-white/30">Unmatched detail precision</span>
                  </div>
                )}

                {/* Model Logo */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                  selectedModel === 'kiara-z-max' ? 'bg-purple-500/10 border-purple-500/20' : 
                  selectedModel === 'kiara-vision' ? 'bg-blue-500/10 border-blue-500/20' : 
                  'bg-amber-500/10 border-amber-500/20'
                }`}>
                  <span className={`text-lg font-black ${
                    selectedModel === 'kiara-z-max' ? 'text-purple-300' : 
                    selectedModel === 'kiara-vision' ? 'text-blue-300' : 
                    'text-amber-300'
                  }`}>K</span>
                </div>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="pointer-events-auto w-full max-w-3xl px-6 mb-8">
             <InputCapsule isBottom={true} textareaRef={bottomTextareaRef} {...inputProps} />
          </div>
        </div>
      </div>

      {/* Chat Panel - Full height sidebar right, resizable */}
      <div
        className={`fixed top-0 bottom-0 right-0 flex flex-col bg-black/80 backdrop-blur-2xl border-l border-white/[0.06] z-30 transform ${visionMode ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: `${chatPanelWidth}px`, transition: isDraggingPanel.current ? 'none' : 'transform 700ms cubic-bezier(0.19,1,0.22,1)' }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 group"
        >
          <div className="absolute inset-y-0 left-0 w-px bg-white/[0.06] group-hover:bg-white/[0.15] transition-colors duration-200" />
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1.5 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-0.5 h-8 rounded-full bg-white/20" />
          </div>
        </div>
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
              if (e.target.files?.[0]) handleLoRAFileSelect(e.target.files[0]);
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
                  <p className="text-[13px] text-white font-semibold">{formatModelName(lightboxImage.model)}</p>
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

      {/* Portal context menu for compact grid */}
      {gridContextMenu && createPortal(
        <div
          ref={gridContextMenuRef}
          className="fixed z-[9999] min-w-[110px] py-1 rounded-lg bg-[#1c1c1c] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-fadeIn"
          style={{ top: gridContextMenu.y, left: gridContextMenu.x, transform: "translateX(-100%)" }}
        >
          {(() => {
            const [prefix, id] = gridContextMenu.id.split(":", 2);
            const isSession = prefix === "s";
            const imgUrl = isSession
              ? generatedSessionImages.find(i => i.id === id)?.url
              : dedupedLatestGenerations.find(i => i.id === id)?.imageUrl;
            return <>
              <button onClick={() => { if (imgUrl) downloadImage(imgUrl); setGridContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors">
                <Download size={11} /> Download
              </button>
              <div className="my-0.5 border-t border-white/[0.06]" />
              <button onClick={() => { isSession ? handleDeleteSessionImage(id) : handleDeleteDBImage(id); setGridContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors">
                <Trash2 size={11} /> Delete
              </button>
            </>;
          })()}
        </div>,
        document.body
      )}
    </div>
  );
};
