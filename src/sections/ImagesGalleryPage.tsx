import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ModelsSidebar } from "@/sections/ModelsPage/components/ModelsSidebar";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/contexts/I18nContext";
import {
  Image as ImageIcon,
  Film,
  RefreshCw,
  Download,
  Heart,
  Trash2,
  Ellipsis,
  X,
  Copy,
} from "lucide-react";

const IMAGES_PER_PAGE = 35;

const GRID_CONFIGS = [
  { cols: 5, gap: "gap-2.5", radius: "rounded-2xl" },
  { cols: 8, gap: "gap-1.5", radius: "rounded-xl" },
  { cols: 12, gap: "gap-1", radius: "rounded-lg" },
] as const;

const GALLERY_GRID_KEY = "kiara-gallery-grid";

type AssetType = "image" | "video";
type FilterType = "all" | "image" | "video" | "liked";

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  model?: string;
  assetType: AssetType;
  liked?: boolean;
}

const detectAssetType = (url: string): AssetType => {
  const lower = url.toLowerCase();
  if (lower.includes("runway-video/") || lower.includes("animate-x/") || lower.includes("grok-video/") || lower.match(/\.(mp4|webm|mov)(\?|$)/)) return "video";
  return "image";
};

/** Pretty-print a model ID: strip "kiara-", remove hyphens, title-case */
const formatModelName = (raw?: string): string => {
  if (!raw) return "Kiara Z MAX";
  const NAMES: Record<string, string> = {
    "kiara-z-max": "Kiara Z MAX",
    "kiara-grok-image": "Grok Image",
    "kiara-grok-imagine": "Grok Imagine",
    "kiara-grok-imagine-edit": "Grok Imagine",
    "grok-imagine": "Grok Imagine",
    "kiara-seedream-v4": "Seedream 4",
    "kiara-seedream-v4-edit": "Seedream 4",
    "seedream-4": "Seedream 4",
    "kiara-seedream": "Seedream 4.5",
    "kiara-seedream-edit": "Seedream 4.5",
    "seedream-45": "Seedream 4.5",
    "kiara-vision": "Kiara Vision",
    "kiara-vision-max": "Kiara Vision MAX",
  };
  if (NAMES[raw]) return NAMES[raw];
  return raw
    .replace(/^kiara-/, "")
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const resolveImageUrl = (path: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const { data } = supabase.storage.from("generated-images").getPublicUrl(path);
  return data.publicUrl;
};

const downloadAsset = async (url: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const t = blob.type;
    const ext = t.includes("mp4") ? ".mp4" : t.includes("webm") ? ".webm" : t.includes("png") ? ".png" : t.includes("webp") ? ".webp" : ".jpg";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kiara-${Date.now()}${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
};

export const ImagesGalleryPage = () => {
  const { t } = useI18n();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [gridIndex, setGridIndex] = useState(() => {
    const saved = localStorage.getItem(GALLERY_GRID_KEY);
    return saved ? Math.min(Number(saved), GRID_CONFIGS.length - 1) : 0;
  });
  const grid = GRID_CONFIGS[gridIndex];
  const isCompactGrid = grid.cols >= 8;
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const openContextMenu = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ id, x: rect.right, y: rect.bottom + 4 });
  }, []);

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("mousedown", handleClick); window.removeEventListener("scroll", close, true); };
  }, [contextMenu]);

  const totalPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { count } = await supabase
        .from("ai_generation_outputs")
        .select("id", { count: "exact", head: true });
      setTotalImages(count || 0);

      const from = (currentPage - 1) * IMAGES_PER_PAGE;
      const to = from + IMAGES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("ai_generation_outputs")
        .select("id, image_url, created_at, ai_generation_jobs ( prompt, model_id, created_at )")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) { console.error("Error fetching images:", error); setImages([]); return; }

      setImages((data || []).map((row: any) => {
        const url = resolveImageUrl(row.image_url);
        return {
          id: row.id,
          imageUrl: url,
          prompt: row.ai_generation_jobs?.prompt || "",
          createdAt: row.created_at,
          model: row.ai_generation_jobs?.model_id || undefined,
          assetType: detectAssetType(row.image_url || url),
          liked: false,
        };
      }));
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchImages(); }, [currentPage]);

  const filteredImages = activeFilter === "all"
    ? images
    : activeFilter === "liked"
      ? images.filter((img) => img.liked)
      : images.filter((img) => img.assetType === activeFilter);

  const toggleLike = (id: string) => {
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, liked: !img.liked } : img));
  };

  const handleDelete = async (imageId: string) => {
    try {
      const { error } = await supabase.from("ai_generation_outputs").delete().eq("id", imageId);
      if (error) throw error;
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      setTotalImages((prev) => Math.max(0, prev - 1));
      if (selectedImage?.id === imageId) setSelectedImage(null);
    } catch (err: any) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-black text-white selection:bg-white/20 selection:text-white">
      {/* Sidebar */}
      <ModelsSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-black">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold uppercase tracking-widest text-white">{t("Assets")}</h1>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
              {t("{{count}} items", { count: totalImages })}
            </span>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1">
            <div className="flex bg-white/[0.03] p-0.5 rounded-full border border-white/[0.06]">
              {([
                { key: "all" as FilterType, label: t("All") },
                { key: "image" as FilterType, label: t("Image") },
                { key: "video" as FilterType, label: t("Video") },
                { key: "liked" as FilterType, label: t("Liked") },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeFilter === key
                      ? "bg-white text-black shadow-lg"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-white/[0.06] mx-2" />

            <button
              onClick={fetchImages}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-500 hover:text-white border border-white/[0.06] transition-all"
              title={t("Refresh")}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-[1600px] mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("Loading Library...")}</p>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-zinc-500">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  {activeFilter === "video" ? <Film size={24} /> : activeFilter === "liked" ? <Heart size={24} /> : <ImageIcon size={24} />}
                </div>
                <p className="text-sm">
                  {activeFilter === "all" ? t("No assets yet") : activeFilter === "liked" ? t("No liked assets") : t("No {{type}} assets found", { type: activeFilter })}
                </p>
                {activeFilter === "all" && <p className="text-xs text-zinc-600">{t("Generate your first image from the Models page")}</p>}
                {activeFilter !== "all" && (
                  <button onClick={() => setActiveFilter("all")} className="text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-4 decoration-white/10 hover:decoration-white/30">
                    {t("Show all assets")}
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Grid density buttons */}
                <div className="flex items-center justify-end gap-1 mb-4">
                  {GRID_CONFIGS.map((cfg, i) => (
                    <button
                      key={cfg.cols}
                      onClick={() => { setGridIndex(i); localStorage.setItem(GALLERY_GRID_KEY, String(i)); }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        gridIndex === i
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
                <div className={`grid ${grid.gap}`} style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}>
                  {filteredImages.map((img) => (
                    <div
                      key={img.id}
                      className={`aspect-square bg-[#0a0a0a] ${grid.radius} overflow-hidden relative group cursor-pointer border border-white/[0.04] hover:border-white/[0.12] transition-all duration-500`}
                    >
                      {img.assetType === "video" ? (
                        <video
                          src={img.imageUrl}
                          onClick={() => setSelectedImage(img)}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03]"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        />
                      ) : (
                        <img
                          src={img.imageUrl}
                          onClick={() => setSelectedImage(img)}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      )}
                      {/* Asset type badge */}
                      {img.assetType === "video" && (
                        <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-1">
                          <Film size={9} className="text-white/60" />
                          <span className="text-[8px] font-bold text-white/50 uppercase">Video</span>
                        </div>
                      )}
                      {/* Liked indicator */}
                      {img.liked && (
                        <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-pink-500/20 backdrop-blur-sm flex items-center justify-center" style={img.assetType === "video" ? { left: "auto", right: "auto", top: "2.5rem" } : {}}>
                          <Heart size={10} className="text-pink-400 fill-pink-400" />
                        </div>
                      )}
                      {!isCompactGrid && (
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                          <span className="text-[10px] font-bold text-white tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{formatModelName(img.model)}</span>
                        </div>
                      )}
                      {isCompactGrid ? (
                        /* ── Compact: single 3-dot → portal dropdown ── */
                        <button
                          onClick={(e) => openContextMenu(img.id, e)}
                          className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-150"
                        >
                          <Ellipsis size={10} />
                        </button>
                      ) : (
                        /* ── Large: individual action buttons ── */
                        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleLike(img.id); }}
                            className={`w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border flex items-center justify-center transition-all duration-200 ${
                              img.liked
                                ? "border-pink-400/30 bg-pink-500/10 text-pink-400"
                                : "border-white/10 text-white/60 hover:text-pink-400 hover:border-pink-400/30 hover:bg-pink-500/10"
                            }`}
                          >
                            <Heart size={12} className={img.liked ? "fill-pink-400" : ""} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadAsset(img.imageUrl); }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-all duration-200"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 py-8">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase"
                    >
                      {t("Prev")}
                    </button>
                    <span className="px-4 py-2 text-xs font-mono text-zinc-500 flex items-center">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase"
                    >
                      {t("Next")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/97 backdrop-blur-2xl flex items-center justify-center animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
            className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.15] flex items-center justify-center text-white/50 hover:text-white transition-all duration-200 z-20"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-16 max-w-[90vw] max-h-[88vh] px-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 max-w-[60vw] max-h-[85vh] flex items-center justify-center">
              {selectedImage.assetType === "video" ? (
                <video
                  src={selectedImage.imageUrl}
                  className="max-w-full max-h-[85vh] rounded-xl"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <img src={selectedImage.imageUrl} className="max-w-full max-h-[85vh] object-contain rounded-xl" alt="" />
              )}
            </div>

            <div className="flex-shrink-0 w-[280px] flex flex-col justify-center py-8 space-y-10">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em]">{t("Prompt")}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedImage.prompt || "")}
                    className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-white/30 hover:text-white/70 transition-all duration-200"
                  >
                    <Copy size={11} />
                  </button>
                </div>
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
                  onClick={() => downloadAsset(selectedImage.imageUrl)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all duration-200"
                >
                  <Download size={13} /> {t("Download")}
                </button>
                <button className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-pink-500/10 border border-white/[0.06] hover:border-pink-400/30 flex items-center justify-center text-white/40 hover:text-pink-400 transition-all duration-200">
                  <Heart size={15} />
                </button>
                <button
                  onClick={() => handleDelete(selectedImage.id)}
                  className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-400/30 flex items-center justify-center text-white/40 hover:text-red-400 transition-all duration-200"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Portal context menu for compact grid */}
      {contextMenu && createPortal(
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] min-w-[110px] py-1 rounded-lg bg-[#1c1c1c] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-fadeIn"
          style={{ top: contextMenu.y, left: contextMenu.x, transform: "translateX(-100%)" }}
        >
          {(() => {
            const img = filteredImages.find(i => i.id === contextMenu.id);
            if (!img) return null;
            return <>
              <button onClick={() => { toggleLike(img.id); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/70 hover:text-pink-400 hover:bg-white/[0.04] transition-colors">
                <Heart size={11} className={img.liked ? "fill-pink-400 text-pink-400" : ""} /> {img.liked ? "Unlike" : "Like"}
              </button>
              <button onClick={() => { downloadAsset(img.imageUrl); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors">
                <Download size={11} /> Download
              </button>
              <div className="my-0.5 border-t border-white/[0.06]" />
              <button onClick={() => { handleDelete(img.id); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors">
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
