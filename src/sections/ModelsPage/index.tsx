import { useState, useRef, useEffect, memo } from "react";
import { ModelsSidebar } from "./components/ModelsSidebar";
import { useNotifications } from "@/components/Notification";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/lib/supabase";
import { fileToBase64, uploadGeneratedImages } from "@/lib/supabase/storage";
import {
  kiaraGenerate,
  listUserLoRAs,
  initLoRAUpload,
  uploadFileToPresignedUrl,
  confirmLoRAUpload,
  computeFileMD5,
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
} from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

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
    <div className={`bg-[#0a0a0a] border border-white/10 rounded-[24px] shadow-2xl relative focus-within:border-white/20 transition-all duration-300 ${isBottom ? 'w-full max-w-3xl backdrop-blur-xl bg-[#0a0a0a]/90 p-2' : 'p-1.5'}`}>

    {visionAIImages.length > 0 && (
      <div className="flex gap-2 px-3 pt-2 pb-1 overflow-x-auto">
        {visionAIImages.map((img, i) => (
          <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 group">
            <img src={img.preview} className="w-full h-full object-cover" />
            <button onClick={() => setVisionAIImages(p => p.filter((_, x) => x !== i))} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={12} className="text-white" />
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
      placeholder={isBottom ? t("Enter your prompt for direct generation...") : t("Message Kiara...")}
      className={`w-full bg-transparent text-[14px] px-3 py-2.5 outline-none resize-none placeholder:text-zinc-500 text-zinc-100 max-h-[120px] chat-text ${isBottom ? 'min-h-[48px]' : 'min-h-[40px]'}`}
      rows={1}
    />

    <div className="px-1.5 pb-1 flex items-center justify-between">
      <div className="flex items-center gap-0.5">
        <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded-full hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
          <Paperclip size={14} />
        </button>
        {isBottom && (
          <>
            <button className="w-7 h-7 rounded-full hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              <Mic size={14} />
            </button>
            <button className="w-7 h-7 rounded-full hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              <Globe size={14} />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {isBottom && (
          <>
            {/* Active settings chips — click to open settings */}
            <div className="flex items-center gap-1.5 mr-1">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${imageRatio !== "1:1" ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-zinc-500 border border-white/10'}`}>
                {imageRatio}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${imageResolution !== "1k" ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-zinc-500 border border-white/10'}`}>
                {imageResolution === "1k" ? "1K" : "2K"}
              </span>
              {generationSettings.numberOfImages > 1 && (
                <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold tracking-wide">
                  x{generationSettings.numberOfImages}
                </span>
              )}
              {selectedLoRA && (
                <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold tracking-wide">
                  LoRA
                </span>
              )}
            </div>

            {/* Models Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowModelMenu(!showModelMenu); setShowSettings(false); }}
                className="group w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all duration-200 hover:scale-110 active:scale-95"
                title={t("Models")}
              >
                <Layers size={13} className="transition-transform duration-300 group-hover:rotate-12" />
              </button>
              {showModelMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl animate-fadeIn overflow-hidden z-[100]">
                  <div className="px-3 py-2 border-b border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t("Select Model")}</span>
                  </div>
                  {[
                    { id: "kiara-z-max", name: "Kiara Z MAX", desc: "Premium quality" },
                  ].map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { setSelectedModel(model.id); setShowModelMenu(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors ${selectedModel === model.id ? 'bg-white/5' : ''}`}
                    >
                      <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0">
                        {selectedModel === model.id && <Check size={10} className="text-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{model.name}</p>
                        <p className="text-[10px] text-zinc-500">{model.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Config Button */}
            <div className="relative">
              <button
                onClick={() => { setShowSettings(!showSettings); setShowModelMenu(false); }}
                className={`group w-8 h-8 rounded-full border border-white/5 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${showSettings ? 'bg-white text-black' : 'bg-black/40 hover:bg-black/60 text-zinc-500 hover:text-zinc-300'}`}
                title={t("Config")}
              >
                <Settings size={13} className="transition-transform duration-300 group-hover:rotate-90" />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 w-72 bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 shadow-2xl z-[100] backdrop-blur-xl animate-fadeIn">
                  <div className="space-y-5">
                    {/* Aspect Ratio */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5 block">{t("Aspect Ratio")}</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {["1:1", "16:9", "9:16", "4:3", "3:4"].map((r) => (
                          <button
                            key={r}
                            onClick={() => { setImageRatio(r); setShowSettings(false); }}
                            className={`py-2 rounded-lg text-[11px] font-bold transition-all duration-150 ${imageRatio === r ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Resolution */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5 block">{t("Resolution")}</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "1k", label: "1K", desc: "~1024px" },
                          { id: "2k", label: "2K", desc: "~2048px" },
                        ].map((r) => (
                          <button
                            key={r.id}
                            onClick={() => { setImageResolution(r.id); setShowSettings(false); }}
                            className={`py-2 rounded-lg text-[11px] font-bold transition-all duration-150 ${imageResolution === r.id ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"}`}
                          >
                            {r.label} <span className="opacity-50">{r.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Image Count */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t("Image Count")}</label>
                        <span className="text-[12px] font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full">{generationSettings.numberOfImages}</span>
                      </div>
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
                        className="w-full accent-white"
                      />
                    </div>
                    {/* Seed */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5 block">{t("Seed")}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={t("Random")}
                        value={generationSettings.seed}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setGenerationSettings((prev) => ({ ...prev, seed: val }));
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20 transition-colors font-mono"
                      />
                      <p className="text-[9px] text-zinc-600 mt-1.5">{t("Leave empty for random seed each generation")}</p>
                    </div>
                    {/* LoRA */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t("LoRA")}</label>
                        <button
                          onClick={() => loraFileInputRef.current?.click()}
                          disabled={isUploadingLoRA}
                          className="text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider disabled:opacity-50"
                        >
                          {isUploadingLoRA ? `${uploadProgress ?? 0}%` : t("+ Upload")}
                        </button>
                      </div>
                      {isUploadingLoRA && (
                        <div className="w-full h-1.5 bg-white/5 rounded-full mb-2.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress ?? 0}%` }}
                          />
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
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="">{t("None (default)")}</option>
                        {userLoRAs.map((lora) => (
                          <option key={lora.id} value={lora.id}>
                            {lora.name} {lora.trigger_word ? `(${lora.trigger_word})` : ""}
                          </option>
                        ))}
                      </select>
                      {selectedLoRA && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t("Strength")}</label>
                            <span className="text-[12px] font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full">{loraStrength.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={loraStrength}
                            onChange={(e) => setLoraStrength(parseFloat(e.target.value))}
                            className="w-full accent-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        <button
          onClick={() => handleSend()}
          disabled={!canSend}
          className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-95"
        >
          <ArrowUpRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
    </div>
  );
};

const IMAGES_PER_ROW = 5;
const ROWS_PER_PAGE = 6;
const IMAGES_PER_PAGE = IMAGES_PER_ROW * ROWS_PER_PAGE;


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
          <div className="grid grid-cols-5 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                onClick={() => setSelectedImage(img)}
                className="aspect-square bg-zinc-900 rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-white/20 transition-all duration-300 relative group"
              >
                <img src={img.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                  <p className="text-[10px] text-white/80 line-clamp-2">{img.prompt}</p>
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
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-10" onClick={() => setSelectedImage(null)}>
          <div className="max-w-6xl w-full h-[80vh] flex gap-8" onClick={e => e.stopPropagation()}>
            <div className="flex-1 bg-[#050505] rounded-3xl border border-white/10 flex items-center justify-center p-4">
              <img src={selectedImage.imageUrl} className="max-w-full max-h-full object-contain shadow-2xl" />
            </div>
            <div className="w-[350px] bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-xl font-bold text-white">{t("Details")}</h3>
                <button onClick={() => setSelectedImage(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">{t("Prompt")}</label>
                  <p className="text-sm text-zinc-300 font-light leading-relaxed">{selectedImage.prompt}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 block">{t("Model")}</label>
                    <p className="text-sm text-white">{selectedImage.model || t("Standard")}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 block">{t("Date")}</label>
                    <p className="text-sm text-white">{new Date(selectedImage.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => window.open(selectedImage.imageUrl, '_blank')}
                className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                <Download size={18} /> {t("Download")}
              </button>
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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxPrompt, setLightboxPrompt] = useState("");

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
    if (file.size > 500 * 1024 * 1024) {
      showNotification("File too large. Maximum 500MB.", "warning", "LoRA Upload");
      return;
    }

    setIsUploadingLoRA(true);
    setUploadProgress(0);

    try {
      // Step 1: Compute MD5
      const md5Hex = await computeFileMD5(file);
      setUploadProgress(5);

      // Step 2: Get presigned URL from RunningHub
      const initResult = await initLoRAUpload({
        lora_name: file.name.replace(/\.safetensors$/i, ""),
        md5_hex: md5Hex,
        file_size_bytes: file.size,
      });
      setUploadProgress(10);

      // Step 3: Upload file directly to presigned URL
      await uploadFileToPresignedUrl(initResult.upload_url, file, (percent) => {
        setUploadProgress(10 + Math.round(percent * 0.85)); // 10-95%
      });
      setUploadProgress(95);

      // Step 4: Confirm upload
      await confirmLoRAUpload(initResult.lora_id);
      setUploadProgress(100);

      // Refresh list and auto-select
      const result = await listUserLoRAs();
      setUserLoRAs(result.loras || []);
      setSelectedLoRA(initResult.lora_id);

      showNotification("LoRA uploaded successfully!", "success", "LoRA Upload");
    } catch (err: any) {
      console.error("LoRA upload failed:", err);
      showNotification(err.message || "LoRA upload failed", "error", "LoRA Upload");
    } finally {
      setIsUploadingLoRA(false);
      setUploadProgress(null);
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

                {/* Images Grid — clean on background */}
                {(generatedSessionImages.length > 0 || latestGenerations.length > 0 || isGenerating) && (
                  <div className="grid grid-cols-5 gap-3">
                    {/* Loading skeletons first */}
                    {isGenerating && Array.from({ length: Math.min(5, generationSettings.numberOfImages) }).map((_, idx) => (
                      <div key={`pending-${idx}`} className="aspect-square bg-white/5 rounded-xl border border-white/10 animate-pulse flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                      </div>
                    ))}

                    {/* Session images */}
                    {generatedSessionImages.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => { setLightboxUrl(img.url); setLightboxPrompt(img.prompt); }}
                        className="aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 relative group cursor-pointer"
                      >
                        <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                          <p className="text-[10px] text-white/80 line-clamp-2">{img.prompt}</p>
                        </div>
                      </div>
                    ))}

                    {/* Previously generated images from DB */}
                    {latestGenerations.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => { setLightboxUrl(img.imageUrl); setLightboxPrompt(img.prompt); }}
                        className="aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 relative group cursor-pointer"
                      >
                        <img src={img.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                          <p className="text-[10px] text-white/80 line-clamp-2">{img.prompt}</p>
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
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar">
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
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 animate-fadeIn"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <X size={20} />
          </button>
          <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              alt=""
            />
            {lightboxPrompt && (
              <p className="text-xs text-zinc-400 max-w-lg text-center line-clamp-2">{lightboxPrompt}</p>
            )}
            <button
              onClick={() => window.open(lightboxUrl, "_blank")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Download size={14} /> {t("Download")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
