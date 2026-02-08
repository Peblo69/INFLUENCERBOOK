export type AnimeImageProps = {
  alt: string;
  imageUrl: string;
  href?: string;
};

export const AnimeImage = (props: AnimeImageProps) => {
  return (
    <figure className="box-border caret-transparent min-h-0 min-w-0 w-auto p-2 md:min-h-[auto] md:min-w-[auto] md:w-6/12">
      <a
        href={props.href || "#"}
        className="box-border caret-transparent"
      >
        <img
          alt={props.alt}
          src={props.imageUrl}
          className="text-transparent aspect-[auto_1080_/_703] box-border max-w-full w-[1080px] rounded-xl"
        />
      </a>
    </figure>
  );
};
