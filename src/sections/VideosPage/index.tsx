import { VideoCreator } from "@/sections/KiaraVision/components/VideoCreator";
import { ModelsSidebar } from "@/sections/ModelsPage/components/ModelsSidebar";

export const VideosPage = () => {
  return (
    <main className="h-screen overflow-hidden bg-black text-white font-sans">
      <div className="h-full flex">
        <ModelsSidebar />
        <section className="flex-1 min-w-0">
          <VideoCreator />
        </section>
      </div>
    </main>
  );
};
