import { GalleryHeader } from "@/sections/GallerySection/components/GalleryHeader";
import { GalleryNav } from "@/sections/GallerySection/components/GalleryNav";
import { ImageGrid } from "@/sections/GallerySection/components/ImageGrid";
import { ViewMoreButton } from "@/components/ViewMoreButton";

export const GallerySection = () => {
  return (
    <section className="box-border caret-transparent max-w-none w-full mx-auto pb-8 px-0 md:max-w-screen-xl md:px-4">
      <GalleryHeader />
      <GalleryNav />
      <ImageGrid />
      <div className="box-border caret-transparent flex justify-center mt-10 mb-36">
        <a
          href="#"
          className="box-border caret-transparent block"
        >
          <ViewMoreButton />
        </a>
      </div>
    </section>
  );
};
