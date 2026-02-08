export const GalleryNav = () => {
  return (
    <nav
      aria-label="Image filters"
      className="items-center box-border caret-transparent flex flex-col justify-center mb-6"
    >
      <ul className="items-center box-border caret-transparent flex flex-wrap justify-center gap-4 list-none pl-0">
        <li className="box-border caret-transparent">
          <a
            aria-label="Top images"
            href="#"
            className="box-border caret-transparent"
          >
            <button
              type="button"
              className="font-bold text-white items-center bg-transparent caret-transparent flex justify-center text-center px-2 py-1 md:px-3 md:py-2 transition-transform duration-200 ease-out hover:scale-[1.06] hover:text-white/90 hover:drop-shadow-md"
            >
              <span className="text-base md:text-lg box-border caret-transparent leading-tight">
                Top
              </span>
            </button>
          </a>
        </li>
        <li className="box-border caret-transparent">
          <a
            aria-label="Newest images"
            href="#"
            className="box-border caret-transparent"
          >
            <button
              type="button"
              className="font-bold text-white items-center bg-transparent caret-transparent flex justify-center text-center px-2 py-1 md:px-3 md:py-2 transition-transform duration-200 ease-out hover:scale-[1.06] hover:text-white/90 hover:drop-shadow-md"
            >
              <span className="text-base md:text-lg box-border caret-transparent leading-tight">
                Newest
              </span>
            </button>
          </a>
        </li>
        <li className="box-border caret-transparent">
          <a
            aria-label="Videos"
            href="#"
            className="box-border caret-transparent"
          >
            <button
              type="button"
              className="font-bold text-white items-center bg-transparent caret-transparent flex justify-center text-center px-2 py-1 md:px-3 md:py-2 transition-transform duration-200 ease-out hover:scale-[1.06] hover:text-white/90 hover:drop-shadow-md"
            >
              <span className="text-base md:text-lg box-border caret-transparent leading-tight">
                Video
              </span>
            </button>
          </a>
        </li>
        <li className="box-border caret-transparent">
          <a
            aria-label="Following"
            href="#"
            className="box-border caret-transparent"
          >
            <button
              type="button"
              className="font-bold text-white items-center bg-transparent caret-transparent flex justify-center text-center px-2 py-1 md:px-3 md:py-2 transition-transform duration-200 ease-out hover:scale-[1.06] hover:text-white/90 hover:drop-shadow-md"
            >
              <span className="text-base md:text-lg box-border caret-transparent leading-tight">
                Following
              </span>
            </button>
          </a>
        </li>
      </ul>
      <ul className="items-center box-border caret-transparent flex justify-center list-none pl-0 w-full mt-3">
        <li className="relative box-border caret-transparent flex justify-center">
          <select
            name="Style"
            className="text-sm font-semibold bg-zinc-800 caret-transparent block h-9 leading-5 opacity-70 text-center w-40 px-8 rounded-full hover:border-gray-400"
          >
            <option
              value="all"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              All Styles
            </option>
            <option
              value="Real"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              Real
            </option>
            <option
              value="Hyperreal"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              Hyperreal
            </option>
            <option
              value="Anime"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              Anime
            </option>
            <option
              value="Anime XL"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              Anime XL
            </option>
            <option
              value="Cinematic XL"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              Cinematic XL
            </option>
            <option
              value="Hardcore XL"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              Hardcore XL
            </option>
            <option
              value="Hyperanime"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              Hyperanime
            </option>
            <option
              value="K-Pop"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              K-Pop
            </option>
            <option
              value="Fur"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              Fur
            </option>
            <option
              value="Furtoon"
              className="font-normal items-center box-border caret-transparent gap-x-[7px] min-h-6 min-w-6 gap-y-[7px] hover:bg-[lab(99.9988_0.0188053_-0.00110865_/_0.1)]"
            >
              Furtoon
            </option>
          </select>
        </li>
      </ul>
    </nav>
  );
};
