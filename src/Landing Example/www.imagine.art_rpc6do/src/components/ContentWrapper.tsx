import { Header } from "../sections/Header";
import { HeroSection } from "../sections/HeroSection";
import { Footer } from "../sections/Footer";

export const ContentWrapper = () => {
  return (
    <div className="box-border caret-transparent flex basis-[0%] flex-col grow">
      <Header />
      <HeroSection />
      <Footer />
    </div>
  );
};
