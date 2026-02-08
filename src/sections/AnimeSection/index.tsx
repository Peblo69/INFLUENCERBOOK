import { AnimeContent } from "@/sections/AnimeSection/components/AnimeContent";
import { AnimeImage } from "@/sections/AnimeSection/components/AnimeImage";

export type AnimeSectionProps = {
  iconSrc: string;
  title: string;
  description: string;
  buttonAriaLabel: string;
  buttonIconSrc: string;
  imageAlt: string;
  imageUrl: string;
  layout: "content-first" | "image-first";
  containerVariant?: string;
  hasButtonWrapper?: boolean;
};

export const AnimeSection = (props: AnimeSectionProps) => {
  const contentElement = (
    <AnimeContent
      iconSrc={props.iconSrc}
      title={props.title}
      description={props.description}
      buttonAriaLabel={props.buttonAriaLabel}
      buttonIconSrc={props.buttonIconSrc}
      containerVariant={props.containerVariant}
      hasButtonWrapper={props.hasButtonWrapper}
    />
  );

  const imageElement = (
    <AnimeImage alt={props.imageAlt} imageUrl={props.imageUrl} />
  );

  return (
    <section className="box-border caret-transparent block my-24 md:flex">
      {props.layout === "content-first" ? (
        <>
          {contentElement}
          {imageElement}
        </>
      ) : (
        <>
          {imageElement}
          {contentElement}
        </>
      )}
    </section>
  );
};
