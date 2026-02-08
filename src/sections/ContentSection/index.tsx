import { GallerySection } from "@/sections/GallerySection";
import { FeatureSection } from "@/sections/FeatureSection";
import { ChatSection } from "@/sections/ChatSection";
import { ChatFeatureSection } from "@/sections/ChatFeatureSection";
import { CTASection } from "@/sections/CTASection";
import { AnimeSection } from "@/sections/AnimeSection";
import { GridFeatureSection } from "@/sections/GridFeatureSection";
import { FAQSection } from "@/sections/FAQSection";
import { FinalCTA } from "@/sections/FinalCTA";

export const ContentSection = () => {
  return (
    <main className="box-border caret-transparent w-9/12 mt-24 mx-auto px-0 py-3 md:px-8">
      <GallerySection />
      <FeatureSection
        sectionVariant="w-auto mx-auto my-12 md:w-[66.6667%]"
        imageUrl="/src/assets/starfield.svg"
        imageAlt="Nude blonde in spaceship"
        imageLinkHref="#"
        contentContainerVariant="p-4"
        titleVariant="text-5xl tracking-[-1.2px] leading-[48px]"
        titleText="Create AI Girls"
        descriptionVariant="text-lg tracking-[-0.45px] leading-7"
        descriptionText="Generate Your Perfect AI Girl With Fantasy Prompts! Generate any AI Images you can imagine. Enjoy AI image creation in a range of different styles, from Anime, Cinematic and Art. Fantasy Prompts features the most advanced models for AI Girl, AI Waifu and AI girlfriend creation. It allows you to design your perfect AI girl with the best results."
        buttonHref="#"
        buttonAriaLabel="Get started for Create AI Girls"
        buttonText="Get Started"
        buttonIconSrc="/src/assets/fantasy-prompts-logo.svg"
      />
      <FeatureSection
        sectionVariant="block my-24 md:flex"
        imageUrl="/src/assets/starfield.svg"
        imageAlt="NSFW AI Character feature"
        imageLinkHref="#"
        imageVariant="min-h-0 min-w-0 w-auto md:min-h-[auto] md:min-w-[auto] md:w-6/12"
        contentContainerVariant="flex flex-col justify-center min-h-0 min-w-0 text-right w-auto p-2 md:min-h-[auto] md:min-w-[auto] md:w-6/12"
        titleVariant="text-4xl justify-end tracking-[-0.9px] leading-10"
        titleIcon="/src/assets/fantasy-prompts-logo.svg"
        titleText="Create AI Characters"
        descriptionVariant="tracking-[-0.4px]"
        descriptionText="Pick a reference image from Explore and create an AI character which you can put in any scenario in any style. Creating AI Characters has never been so easy!"
        buttonHref="#"
        buttonAriaLabel="Get started for AI Posing"
        buttonText="Get Started"
        buttonIconSrc="/src/assets/fantasy-prompts-logo.svg"
        alignButtonRight={true}
      />
      <FeatureSection
        sectionVariant="block my-24 md:flex"
        imageFirst={false}
        imageUrl="/src/assets/starfield.svg"
        imageAlt="Image cloning example"
        imageLinkHref="#"
        imageVariant="min-h-0 min-w-0 w-auto md:min-h-[auto] md:min-w-[auto] md:w-6/12"
        contentContainerVariant="flex flex-col justify-center min-h-0 min-w-0 w-auto p-2 md:min-h-[auto] md:min-w-[auto] md:w-6/12"
        titleVariant="text-4xl tracking-[-0.9px] leading-10"
        titleIcon="/src/assets/fantasy-prompts-logo.svg"
        titleText="Clone AI Art"
        descriptionVariant="tracking-[-0.4px]"
        descriptionText="Explore over 2 million AI images and videos made by our community. Clone and make variations on any image or video you want and let your imagination run wild."
        buttonHref="#"
        buttonAriaLabel="Get started for Clone AI Art Safely"
        buttonText="Get Started"
        buttonIconSrc="/src/assets/fantasy-prompts-logo.svg"
      />
      <FeatureSection
        sectionVariant="block my-24 md:flex"
        imageUrl="/src/assets/starfield.svg"
        imageAlt="Pose prompt example"
        imageLinkHref="#"
        imageVariant="min-h-0 min-w-0 w-auto md:min-h-[auto] md:min-w-[auto] md:w-6/12"
        contentContainerVariant="flex flex-col justify-center min-h-0 min-w-0 text-right w-auto p-2 md:min-h-[auto] md:min-w-[auto] md:w-6/12"
        titleVariant="text-4xl justify-end tracking-[-0.9px] leading-10"
        titleIcon="/src/assets/fantasy-prompts-logo.svg"
        titleText="AI Posing"
        descriptionVariant="tracking-[-0.4px]"
        descriptionText="Fantasy Prompts’ pose feature lets you put your AI girl in any pose you want. Never before has posing your character been so easy."
        buttonHref="#"
        buttonAriaLabel="Get started for AI Posing"
        buttonText="Get Started"
        buttonIconSrc="/src/assets/fantasy-prompts-logo.svg"
        alignButtonRight={true}
      />
      <FeatureSection
        sectionVariant="block my-24 md:flex"
        contentContainerVariant="flex flex-col justify-center min-h-0 min-w-0 w-auto p-2 md:min-h-[auto] md:min-w-[auto] md:w-6/12"
        titleVariant="text-4xl tracking-[-0.9px] leading-10"
        titleIcon="/src/assets/fantasy-prompts-logo.svg"
        titleText="Any AI Art Style"
        descriptionVariant="tracking-[-0.4px]"
        descriptionText="Choose from a wide selection of AI styles. Create realistic, AI Anime, or artistic AI images."
        buttonHref="#"
        buttonAriaLabel="Get started for Any AI Art Style"
        buttonText="Get Started"
        buttonIconSrc="/src/assets/fantasy-prompts-logo.svg"
        imageUrl="/src/assets/starfield.svg"
        imageAlt="Image styles showcase"
        imageLinkHref="#"
        imageVariant="min-h-0 min-w-0 w-auto md:min-h-[auto] md:min-w-[auto] md:w-6/12"
      />
      <ChatSection />
      <ChatFeatureSection
        imageUrl="/src/assets/starfield.svg"
        iconUrl="/src/assets/fantasy-prompts-logo.svg"
        iconAlt="Icon"
        title="Selfies & Voice Messages"
        description="Dive into full immersion with realistic interactions. Receive captivating selfies and engaging voice messages from your AI Girlfriends, making your conversations feel more authentic and exciting."
        buttonText="Start Chatting"
        buttonAriaLabel="Start chat for Selfies & Voice Messages"
        buttonIconUrl="/src/assets/fantasy-prompts-logo.svg"
        buttonIconAlt="Icon"
        chatUrl="#"
        hasWrapper={true}
        titleVariant="justify-end"
        imagePosition="left"
      />
      <ChatFeatureSection
        iconUrl="/src/assets/fantasy-prompts-logo.svg"
        iconAlt="Icon"
        title="Explore Endless Profiles"
        description="Discover a vast collection of AI Characters created by our vibrant community. Whether you’re looking for men, women, or even fantasy characters, there’s an endless array of profiles waiting for you."
        buttonText="Start Chatting"
        buttonAriaLabel="Start chatting to explore profiles"
        buttonIconUrl="/src/assets/fantasy-prompts-logo.svg"
        buttonIconAlt="Icon"
        chatUrl="#"
        hasWrapper={false}
        titleVariant=""
        imageUrl="/src/assets/starfield.svg"
        imagePosition="right"
      />
      <ChatFeatureSection
        imageUrl="/src/assets/starfield.svg"
        iconUrl="/src/assets/fantasy-prompts-logo.svg"
        iconAlt="Icon"
        title="Create Your Dream Character"
        description="Bring your ideal AI Girlfriend to life with Fantasy Prompts. Customize every detail from appearance and personality to interests and hobbies. Create a companion that perfectly matches your desires and start an unforgettable journey."
        buttonText="Start Chatting"
        buttonAriaLabel="Create your dream character"
        buttonIconUrl="/src/assets/fantasy-prompts-logo.svg"
        buttonIconAlt="Icon"
        chatUrl="#"
        hasWrapper={true}
        titleVariant="justify-end"
        imagePosition="left"
      />
      <CTASection />
      <AnimeSection
        iconSrc="/src/assets/fantasy-prompts-logo.svg"
        title="Create Anime AI Images and Video"
        description="Experience the thrill of bringing your boldest fantasies to life with our anime AI generator. Delve into the world of unrestricted AI anime images and video creation, available in a diverse array of styles. Fantasy Prompts is equipped with the most sophisticated AI models for realistic, hyperrealistic and anime image generation, empowering you to craft your ideal AI waifu with unparalleled results."
        buttonAriaLabel="Get started for Create Anime AI"
        buttonIconSrc="/src/assets/fantasy-prompts-logo.svg"
        imageAlt="AI Anime Images"
        imageUrl="/src/assets/starfield.svg"
        layout="content-first"
      />
      <AnimeSection
        layout="image-first"
        imageAlt="Edit AI Anime Images"
        imageUrl="/src/assets/starfield.svg"
        iconSrc="/src/assets/fantasy-prompts-logo.svg"
        title="Edit AI Anime Images"
        description="With our Tweak mode, modifying any anime image becomes effortless. Just select a section of the image and seamlessly replace it with your desired AI creation. This feature makes editing anime images incredibly straightforward and user-friendly."
        buttonAriaLabel="Get started for Edit AI Anime Images"
        buttonIconSrc="/src/assets/fantasy-prompts-logo.svg"
        containerVariant="text-right"
        hasButtonWrapper={true}
      />
      <AnimeSection
        iconSrc="/src/assets/fantasy-prompts-logo.svg"
        title="Clone AI Anime Art"
        description="Dive into our vast library of over 20 million Anime images and videos, all crafted by our vibrant community. You have the freedom to clone and alter any anime image, giving you the power to unleash your creativity without limits."
        buttonAriaLabel="Get started for Clone AI Anime Art"
        buttonIconSrc="/src/assets/fantasy-prompts-logo.svg"
        imageAlt="Clone images with AI"
        imageUrl="/src/assets/starfield.svg"
        layout="content-first"
      />
      <GridFeatureSection />
      <FAQSection />
      <FinalCTA />
    </main>
  );
};
