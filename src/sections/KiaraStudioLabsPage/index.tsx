import { InpaintStudio } from "@/sections/KiaraVision/components/InpaintStudio";
import { ModelsSidebar } from "@/sections/ModelsPage/components/ModelsSidebar";

export const KiaraStudioLabsPage = () => {
  return (
    <main className="h-screen overflow-hidden bg-black text-white font-sans">
      <div className="h-full flex">
        <ModelsSidebar />
        <section className="flex-1 min-w-0">
          <InpaintStudio />
        </section>
      </div>
    </main>
  );
};
