import { ChatFeatureImage } from "@/sections/ChatFeatureSection/components/ChatFeatureImage";
import { ChatFeatureContent } from "@/sections/ChatFeatureSection/components/ChatFeatureContent";

export type ChatFeatureSectionProps = {
  imageUrl: string;
  iconUrl: string;
  iconAlt: string;
  title: string;
  description: string;
  buttonText: string;
  buttonAriaLabel: string;
  buttonIconUrl: string;
  buttonIconAlt: string;
  chatUrl: string;
  hasWrapper: boolean;
  titleVariant: string;
  imagePosition: "left" | "right";
};

export const ChatFeatureSection = (props: ChatFeatureSectionProps) => {
  return (
    <section className="box-border caret-transparent block my-24 md:flex">
      {props.imagePosition === "left" && (
        <ChatFeatureImage imageUrl={props.imageUrl} />
      )}
      <ChatFeatureContent
        iconUrl={props.iconUrl}
        iconAlt={props.iconAlt}
        title={props.title}
        description={props.description}
        buttonText={props.buttonText}
        buttonAriaLabel={props.buttonAriaLabel}
        buttonIconUrl={props.buttonIconUrl}
        buttonIconAlt={props.buttonIconAlt}
        chatUrl={props.chatUrl}
        hasWrapper={props.hasWrapper}
        titleVariant={props.titleVariant}
      />
      {props.imagePosition === "right" && (
        <ChatFeatureImage imageUrl={props.imageUrl} />
      )}
    </section>
  );
};
