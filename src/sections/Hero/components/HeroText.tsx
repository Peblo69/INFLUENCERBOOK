import { HeroButton } from "@/sections/Hero/components/HeroButton";

export const HeroText = () => {
  return (
    <div className="box-border caret-transparent min-h-0 min-w-0 text-center w-auto ml-3 mt-3 md:min-h-[auto] md:min-w-[auto] md:w-[66.6667%]">
      <h1 className="text-4xl font-semibold box-border caret-transparent tracking-[-0.9px] leading-10 mb-2 md:text-6xl md:tracking-[-1.5px] md:leading-[60px]">
        NSFW AI Generator
      </h1>
      <p className="text-gray-300 text-sm font-light box-border caret-transparent tracking-[-0.35px] leading-5 mx-auto md:text-xl md:tracking-[-0.5px] md:leading-7">
        Chat with your AI girlfriend, generate NSFW images &amp; videos—from
        realistic to anime—and make AI influencers.
      </p>
      <div className="box-border caret-transparent flex justify-center mt-0 rounded-xl md:mt-4">
        <a
          aria-label="Get started for free"
          href="#"
          className="box-border caret-transparent block"
        >
          <HeroButton />
        </a>
      </div>
    </div>
  );
};
