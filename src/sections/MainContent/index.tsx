import { Hero } from "@/sections/Hero";
import { ContentSection } from "@/sections/ContentSection";

export const MainContent = () => {
  return (
    <div className="box-border caret-transparent grow pt-28 md:pt-24">
      <div className="box-border caret-transparent flex flex-col w-full">
        <div className="text-white box-border caret-transparent min-h-[1000px]">
          <Hero />
          <ContentSection />
        </div>
      </div>
    </div>
  );
};
