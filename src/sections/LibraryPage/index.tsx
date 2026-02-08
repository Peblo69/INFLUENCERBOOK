import { CreateSidebar } from "@/sections/CreatePage/components/Sidebar";
import { ImageGrid } from "@/sections/GallerySection/components/ImageGrid";
import { useI18n } from "@/contexts/I18nContext";

type LibraryVariant =
  | "media"
  | "images"
  | "videos"
  | "likes"
  | "top"
  | "favorites"
  | "trash";

export const LibraryPage = ({ title, variant }: { title: string; variant: LibraryVariant }) => {
  const { t } = useI18n();
  // Map LibraryVariant to ImageGrid variant
  const imageGridVariant =
    variant === "favorites" || variant === "likes" ? "favorites" :
    variant === "images" ? "images" :
    variant === "videos" ? "videos" :
    "all";

  return (
    <main className="text-white box-border caret-transparent min-h-screen pt-20">
      <CreateSidebar />
      <section className="pl-60 pr-4">
        <div className="box-border caret-transparent max-w-none w-full mx-auto md:max-w-screen-xl">
          <div className="flex items-center justify-between py-3">
            <h1 className="text-xl font-semibold">{title}</h1>
            <div className="flex items-center gap-2">
              <button className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors" aria-label={t("Sort")} title={t("Sort (coming soon)")}></button>
              <button className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors" aria-label={t("Filter")} title={t("Filter (coming soon)")}></button>
            </div>
          </div>
          {/* Content variants */}
          {variant === "videos" ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-white/40 font-light">{t("Video generation coming soon")}</p>
                <p className="text-xs text-white/30 font-light mt-2">{t("WAN 2.1 Image-to-Video and Text-to-Video will be available here")}</p>
              </div>
            </div>
          ) : (
            <ImageGrid variant={imageGridVariant} />
          )}
        </div>
      </section>
    </main>
  );
};
