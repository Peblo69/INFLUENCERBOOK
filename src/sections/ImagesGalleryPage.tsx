import { useState, useEffect } from 'react';
import { CreateSidebar } from "@/sections/CreatePage/components/Sidebar";
import { supabase } from '@/lib/supabase';

const IMAGES_PER_ROW = 5;
const ROWS_PER_PAGE = 7;
const IMAGES_PER_PAGE = IMAGES_PER_ROW * ROWS_PER_PAGE; // 35 images per page

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  model?: string;
}

export const ImagesGalleryPage = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const totalPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

  const resolveImageUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("generated-images").getPublicUrl(path);
    return data.publicUrl;
  };

  // Fetch images from Supabase
  useEffect(() => {
    fetchImages();
  }, [currentPage]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found');
        setLoading(false);
        return;
      }

      // Get total count
      const { count } = await supabase
        .from('ai_generation_outputs')
        .select('id', { count: 'exact', head: true });

      setTotalImages(count || 0);

      // Fetch images for current page
      const from = (currentPage - 1) * IMAGES_PER_PAGE;
      const to = from + IMAGES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('ai_generation_outputs')
        .select('id, image_url, created_at, ai_generation_jobs ( prompt, model_id, created_at )')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching images:', error);
      } else {
        const mapped = (data || []).map((row: any) => ({
          id: row.id,
          imageUrl: resolveImageUrl(row.image_url),
          prompt: row.ai_generation_jobs?.prompt || '',
          createdAt: row.created_at,
          model: row.ai_generation_jobs?.model_id || undefined,
        }));

        setImages(mapped);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <main className="text-white box-border caret-transparent min-h-screen pt-20">
      <CreateSidebar />
      <section className="pl-60 pr-4 pb-8">
        <div className="box-border caret-transparent max-w-none w-full mx-auto md:max-w-screen-xl">
          {/* Header */}
          <div className="flex items-center justify-between py-3 mb-6">
            <div>
              <h1 className="text-xl font-semibold">Generated Images</h1>
              <p className="text-sm text-white/50 mt-1">
                {totalImages} total images • Page {currentPage} of {totalPages || 1}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchImages()}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                <p className="text-sm text-white/40">Loading images...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && images.length === 0 && (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-white/40 font-light">No images generated yet</p>
                <p className="text-xs text-white/30 font-light mt-2">Generate your first image in Kiara Vision!</p>
              </div>
            </div>
          )}

          {/* Image Grid - 5 per row, 7 rows max */}
          {!loading && images.length > 0 && (
            <>
              <div className="grid grid-cols-5 gap-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-purple-500 transition-all cursor-pointer group"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.prompt?.substring(0, 50) || 'Generated image'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <p className="text-xs text-white/90 line-clamp-2">
                        {image.prompt?.substring(0, 80) || 'No prompt'}
                      </p>
                      <p className="text-[10px] text-white/50 mt-1">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-6 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg transition-colors text-sm ${
                          currentPage === pageNum
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-6 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Image Detail Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[100000] flex items-center justify-center p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-6xl w-full max-h-full overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white text-3xl font-light"
              >
                ×
              </button>
              <img
                src={selectedImage.imageUrl}
                alt="Full size"
                className="w-full h-auto rounded-lg"
              />
              <div className="mt-4 bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <h3 className="text-sm font-semibold text-white/90 mb-2">Prompt:</h3>
                <p className="text-sm text-white/70 whitespace-pre-wrap">{selectedImage.prompt || 'No prompt'}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-white/50">
                  <span>Created: {new Date(selectedImage.createdAt).toLocaleString()}</span>
                  {selectedImage.model && <span>Model: {selectedImage.model}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
