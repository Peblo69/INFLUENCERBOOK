import { CookieBanner } from "@/components/CookieBanner";
import { Navbar } from "@/sections/Navbar";
import { MainContent } from "@/sections/MainContent";

export const App = () => {
  return (
    <body className="text-zinc-200 text-sm not-italic normal-nums font-normal accent-auto bg-stone-900 box-border caret-transparent flex flex-col h-full tracking-[normal] leading-5 list-outside list-disc pointer-events-auto text-start indent-[0px] normal-case visible overflow-hidden border-separate font-inter">
      <CookieBanner />
      <div className="box-border caret-transparent flex flex-col grow">
        <div className="box-border caret-transparent block"></div>
        <div className="bg-black box-border caret-transparent flex grow h-0 w-full">
          <div className="backdrop-blur-[200px] bg-zinc-900 box-border caret-transparent flex flex-col h-full w-full overflow-hidden">
            <button className="absolute text-white/30 font-medium bg-stone-950/30 caret-transparent block left-[-500px] text-center border-stone-300/30">
              Skip to main content
            </button>
            <div className="box-border caret-transparent block"></div>
            <div className="box-border caret-transparent flex basis-[0%] grow shrink-0 overflow-hidden">
              <div className="absolute bg-black/30 box-border caret-transparent block h-full w-full z-[4] md:static md:bg-transparent md:hidden md:h-auto md:w-auto md:z-auto"></div>
              <div className="absolute bg-black/30 box-border caret-transparent block h-full w-full z-[4] md:static md:bg-transparent md:hidden md:h-auto md:w-auto md:z-auto"></div>
              <Navbar />
              <MainContent />
            </div>
          </div>
        </div>
      </div>
      <iframe
        src="cid://frame-2DE146775CFD3D7AAB21CF034661CA4C@mhtml.blink"
        className="box-border caret-transparent hidden border-zinc-100"
      ></iframe>
      <div className="fixed box-border caret-transparent hidden h-full pointer-events-none w-full z-[1000] left-0 top-0"></div>
    </body>
  );
};
