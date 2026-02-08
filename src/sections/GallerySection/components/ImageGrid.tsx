import { useState, useEffect } from "react";
import { getUserGenerations, type Generation, toggleGenerationFavorite } from "@/lib/supabase/database";

interface ImageGridProps {
  variant?: "all" | "images" | "videos" | "favorites";
}

export const ImageGrid = ({ variant = "all" }: ImageGridProps) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null);

  // Load generations from database
  useEffect(() => {
    loadGenerations();
  }, [variant]);

  const loadGenerations = async () => {
    setIsLoading(true);
    try {
      const data = await getUserGenerations({
        limit: 50,
        favoritesOnly: variant === "favorites",
        includeDeleted: false,
      });
      setGenerations(data);
    } catch (error) {
      console.error("Failed to load generations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleGenerationFavorite(id);
      // Update local state
      setGenerations(prev =>
        prev.map(gen =>
          gen.id === id ? { ...gen, is_favorite: !gen.is_favorite } : gen
        )
      );
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleDownload = async (imageUrl: string, taskId: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `generation-${taskId}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download image");
    }
  };

  // Extract images from generations (handle multiple output_images per generation)
  const allImages = generations.flatMap(gen =>
    (gen.output_images || []).map((url, idx) => ({
      ...gen,
      imageUrl: url,
      imageIndex: idx,
    }))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-white/40 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-white/60">Loading your creations...</p>
        </div>
      </div>
    );
  }

  if (allImages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-white/40 font-light">
            {variant === "favorites" ? "No favorite images yet" : "No images generated yet"}
          </p>
          <p className="text-xs text-white/30 font-light mt-2">
            {variant === "favorites"
              ? "Star images to add them to your favorites"
              : "Start creating by going to the Models page"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <section
        aria-label="Generated images gallery"
        className="grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        {allImages.map((item, idx) => {
          const modelLabel =
            item.model_type === "wan-2.1" || item.model_type === "wan-2.2"
              ? "WAN"
              : item.model_type === "seedream-v4" || item.model_type === "seedream-v4.5"
              ? "Seedream"
              : item.model_type === "qwen"
              ? "Qwen"
              : "AI";

          return (
            <article
              key={`${item.id}-${item.imageIndex}`}
              className="group relative shadow-[rgb(255,255,255)_0px_0px_0px_0px,rgb(44,39,54)_0px_0px_0px_1px] overflow-hidden rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-all duration-300"
            >
              <div className="overflow-hidden rounded-md">
                <div className="relative shadow-[rgba(0,0,0,0.1)_0px_4px_6px_-1px] overflow-hidden rounded-md">
                  <div className="relative w-full pt-[150%]">
                    <div className="absolute overflow-hidden rounded-md inset-0">
                      <button
                        onClick={() => setSelectedImage(item)}
                        className="w-full h-full cursor-pointer"
                        aria-label="View image"
                      >
                        <img
                          alt={item.prompt.substring(0, 50)}
                          src={item.imageUrl}
                          className="absolute h-full max-w-full object-cover w-full z-[2] rounded-md inset-0 group-hover:scale-105 transition-transform duration-300"
                        />
                      </button>

                      {/* Overlay buttons */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item.imageUrl, item.task_id || item.id);
                          }}
                          className="px-4 py-2 bg-white/90 hover:bg-white text-black rounded-lg text-xs font-bold transition-all"
                          aria-label="Download"
                        >
                          Download
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(item.id);
                          }}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            item.is_favorite
                              ? "bg-red-500/90 hover:bg-red-500 text-white"
                              : "bg-white/90 hover:bg-white text-black"
                          }`}
                          aria-label="Favorite"
                        >
                          {item.is_favorite ? "★ Favorited" : "☆ Favorite"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Model badge */}
                  <div className="absolute bottom-2 left-2 z-20">
                    <div className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-white/20">
                      <div className="text-xs font-black text-white">{modelLabel}</div>
                    </div>
                  </div>

                  {/* Favorite indicator */}
                  {item.is_favorite && (
                    <div className="absolute top-2 right-2 z-20">
                      <div className="w-8 h-8 rounded-full bg-red-500/90 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-white text-lg">★</span>
                      </div>
                    </div>
                  )}

                  {/* NSFW indicator */}
                  {item.has_nsfw_contents &&
                    item.has_nsfw_contents[item.imageIndex] && (
                      <div className="absolute top-2 left-2 z-20">
                        <div className="px-2 py-1 rounded bg-red-500/90 backdrop-blur-sm">
                          <span className="text-white text-[10px] font-bold">NSFW</span>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 flex items-center justify-center transition-all duration-200 z-10"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-full h-full flex items-center justify-between gap-8 px-8" onClick={(e) => e.stopPropagation()}>
            {/* Image */}
            <div className="flex-1 flex items-center justify-center">
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.prompt}
                className="max-h-[90vh] max-w-full object-contain rounded-xl border-2 border-white/20 shadow-2xl"
              />
            </div>

            {/* Details Sidebar */}
            <div className="w-[400px] h-[90vh] bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-white/10 p-6 overflow-y-auto">
              <h2 className="text-lg font-bold text-white mb-4">Details</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 mb-1 font-semibold">Model</p>
                  <p className="text-sm text-white">{selectedImage.model_type}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 mb-1 font-semibold">Prompt</p>
                  <p className="text-sm text-white/80 leading-relaxed">{selectedImage.prompt}</p>
                </div>

                {selectedImage.negative_prompt && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/40 mb-1 font-semibold">Negative Prompt</p>
                    <p className="text-sm text-white/60 leading-relaxed">{selectedImage.negative_prompt}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/40 mb-1 font-semibold">Size</p>
                    <p className="text-sm text-white">{selectedImage.image_size}</p>
                  </div>
                  {selectedImage.seed && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-1 font-semibold">Seed</p>
                      <p className="text-sm text-white font-mono">{selectedImage.seed}</p>
                    </div>
                  )}
                </div>

                {selectedImage.inference_time && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/40 mb-1 font-semibold">Inference Time</p>
                    <p className="text-sm text-white">{(selectedImage.inference_time / 1000).toFixed(2)}s</p>
                  </div>
                )}

                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 mb-1 font-semibold">Created</p>
                  <p className="text-sm text-white">{new Date(selectedImage.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => handleDownload(selectedImage.imageUrl, selectedImage.task_id || selectedImage.id)}
                  className="w-full py-3 bg-white hover:bg-white/90 text-black rounded-lg text-xs font-bold tracking-widest transition-all duration-200"
                >
                  DOWNLOAD
                </button>
                <button
                  onClick={() => {
                    handleToggleFavorite(selectedImage.id);
                    setSelectedImage({ ...selectedImage, is_favorite: !selectedImage.is_favorite });
                  }}
                  className={`w-full py-3 rounded-lg text-xs font-bold tracking-widest transition-all duration-200 ${
                    selectedImage.is_favorite
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "border-2 border-white hover:bg-white/10 text-white"
                  }`}
                >
                  {selectedImage.is_favorite ? "★ FAVORITED" : "☆ ADD TO FAVORITES"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
