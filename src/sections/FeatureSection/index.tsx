import { FeatureImage } from "@/sections/FeatureSection/components/FeatureImage";
import { FeatureContent } from "@/sections/FeatureSection/components/FeatureContent";

export type FeatureSectionProps = {
  sectionVariant: string;
  imageFirst?: boolean;
  imageUrl: string;
  imageAlt: string;
  imageLinkHref: string;
  imageVariant?: string;
  contentContainerVariant: string;
  titleVariant: string;
  titleIcon?: string;
  titleText: string;
  descriptionVariant: string;
  descriptionText: string;
  buttonHref: string;
  buttonAriaLabel: string;
  buttonText: string;
  buttonIconSrc: string;
  alignButtonRight?: boolean;
};

export const FeatureSection = (props: FeatureSectionProps) => {
  const imageComponent = (
    <FeatureImage
      imageUrl={props.imageUrl}
      imageAlt={props.imageAlt}
      linkHref={props.imageLinkHref}
      variant={props.imageVariant}
    />
  );

  const contentComponent = (
    <FeatureContent
      containerVariant={props.contentContainerVariant}
      titleVariant={props.titleVariant}
      titleIcon={props.titleIcon}
      titleText={props.titleText}
      descriptionVariant={props.descriptionVariant}
      descriptionText={props.descriptionText}
      buttonHref={props.buttonHref}
      buttonAriaLabel={props.buttonAriaLabel}
      buttonText={props.buttonText}
      buttonIconSrc={props.buttonIconSrc}
      alignButtonRight={props.alignButtonRight}
    />
  );

  return (
    <section className={`box-border caret-transparent ${props.sectionVariant}`}>
      {props.imageFirst ? (
        <>
          {imageComponent}
          {contentComponent}
        </>
      ) : (
        <>
          {contentComponent}
          {imageComponent}
        </>
      )}
    </section>
  );
};
