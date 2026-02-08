import { FeatureGrid } from "@/sections/GridFeatureSection/components/FeatureGrid";

export const GridFeatureSection = () => {
  return (
    <section className="bg-zinc-950 box-border caret-transparent px-12 py-3 rounded-3xl">
      <FeatureGrid
        features={[
          {
            iconUrl: "/src/assets/fantasy-prompts-logo.svg",
            title: "Private AI Generating",
            description:
              "Create AI images in private mode to create your AI Girls in peace, with enhanced privacy.",
            buttonUrl: "#",
            buttonAriaLabel: "Get started for Private AI Generating",
          },
          {
            iconUrl: "/src/assets/fantasy-prompts-logo.svg",
            title: "AI Girl Images",
            description:
              "Fantasy Prompts is the best platform for generating AI Girls.",
            buttonUrl: "#",
            buttonAriaLabel: "Get started for AI Girl Images",
          },
        ]}
        buttonIconUrl="/src/assets/fantasy-prompts-logo.svg"
      />
      <FeatureGrid
        features={[
          {
            iconUrl: "/src/assets/fantasy-prompts-logo.svg",
            title: "Mobile Girl Generation",
            description:
              "Create images anywhere with our mobile and desktop optimized site.",
            buttonUrl: "#",
            buttonAriaLabel: "Get started for Mobile Girl Generation",
          },
          {
            iconUrl: "/src/assets/fantasy-prompts-logo.svg",
            title: "Fastest Girl Generator",
            description:
              "Stop waiting, Fantasy Prompts is the fastest, most stable AI Art Generator.",
            buttonUrl: "#",
            buttonAriaLabel: "Get started for Fastest Girl Generator",
          },
        ]}
        buttonIconUrl="/src/assets/fantasy-prompts-logo.svg"
      />
    </section>
  );
};
