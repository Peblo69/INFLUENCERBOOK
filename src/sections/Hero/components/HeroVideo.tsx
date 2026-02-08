export const HeroVideo = () => {
  const fallback = "https://picsum.photos/id/1027/1600/900";
  const src = "/src/replicate-prediction-6b2tda2jgdrga0ctcert8q70jr.png"; // Use replicate prediction image
  return (
    <figure className="box-border caret-transparent w-full min-h-[60vh] flex items-center justify-center pt-10 pb-0">
      <div className="relative box-border caret-transparent w-[90vw] md:w-[1100px]">
        <img
          src={src}
          alt="Top banner"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.src = fallback;
          }}
          className="box-border caret-transparent w-full h-auto object-contain opacity-80 brightness-[98%] contrast-[108%] saturate-[115%] rounded-lg z-10 [mask-image:linear-gradient(to_right,transparent_0%,black_14%,black_86%,transparent_100%),linear-gradient(to_bottom,black_78%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_14%,black_86%,transparent_100%),linear-gradient(to_bottom,black_78%,transparent_100%)] [mask-composite:intersect] [-webkit-mask-composite:source-over,destination-in] [mask-size:100%_100%] [-webkit-mask-size:100%_100%] [mask-position:center] [-webkit-mask-position:center] [mask-repeat:no-repeat] [-webkit-mask-repeat:no-repeat]"
        />
        {/* Decorative text overlapping the image at the bottom */}
        <div className="relative -mt-14 md:-mt-18 lg:-mt-22 z-20 pointer-events-none flex justify-center">
          <span className="inline-block font-extrabold tracking-tight leading-tight text-white drop-shadow-md text-5xl md:text-7xl lg:text-8xl max-w-none text-center [transform:scaleX(.9)_scaleY(1.08)]">
            <span className="block whitespace-nowrap">Made with Fantasy</span>
            <span className="block whitespace-nowrap">Prompts</span>
          </span>
        </div>
      </div>
    </figure>
  );
};
