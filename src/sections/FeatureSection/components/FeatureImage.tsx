export type FeatureImageProps = {
  imageUrl: string;
  imageAlt: string;
  linkHref: string;
  variant?: string;
};

export const FeatureImage = (props: FeatureImageProps) => {
  return (
    <figure
      className={`box-border caret-transparent p-2 ${props.variant || ""}`}
    >
      <a href={props.linkHref} className="box-border caret-transparent">
        <img
          alt={props.imageAlt}
          src={props.imageUrl}
          className="text-transparent aspect-[auto_1080_/_703] box-border max-w-full w-[1080px] rounded-xl"
        />
      </a>
    </figure>
  );
};
