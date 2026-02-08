import { Link } from "react-router-dom";

export const MobileNavLinks = () => {
  return (
    <div className="box-border caret-transparent flex min-h-[auto] min-w-[auto] ml-2 md:min-h-0 md:min-w-0">
      <Link
        to="/"
        className="text-white font-semibold items-center box-border caret-transparent flex flex-col justify-center min-h-[auto] min-w-[auto] text-center w-16 py-2 rounded-2xl md:min-h-0 md:min-w-0 hover:bg-zinc-900"
      >
        <img
          src="/src/assets/fantasy-prompts-logo.svg"
          alt="Icon"
          className="box-border caret-transparent h-6 w-4"
        />
        <div className="relative text-xs box-border caret-transparent leading-4 min-h-[auto] min-w-[auto] md:min-h-0 md:min-w-0">
          Explore
        </div>
      </Link>
      <Link
        to="/assistant"
        className="text-white font-semibold items-center box-border caret-transparent flex flex-col justify-center min-h-[auto] min-w-[auto] text-center w-16 py-2 rounded-2xl md:min-h-0 md:min-w-0 hover:bg-zinc-900"
      >
        <img
          src="/src/assets/fantasy-prompts-logo.svg"
          alt="Icon"
          className="box-border caret-transparent h-6 w-4"
        />
        <div className="relative text-xs box-border caret-transparent leading-4 min-h-[auto] min-w-[auto] md:min-h-0 md:min-w-0">
          Assistant
        </div>
      </Link>
      <button
        type="button"
        className="relative text-white font-semibold items-center box-border caret-transparent flex flex-col justify-center min-h-[auto] min-w-[auto] text-center w-16 py-2 rounded-2xl md:min-h-0 md:min-w-0 hover:bg-zinc-900"
      >
        <img
          src="/src/assets/fantasy-prompts-logo.svg"
          alt="Icon"
          className="box-border caret-transparent h-6 w-4"
        />
        <div className="relative text-xs box-border caret-transparent leading-4 min-h-[auto] min-w-[auto] md:min-h-0 md:min-w-0">
          Tweak
        </div>
      </button>
      <button
        type="button"
        className="relative text-white font-semibold items-center box-border caret-transparent flex flex-col justify-center min-h-[auto] min-w-[auto] text-center w-16 py-2 rounded-2xl md:min-h-0 md:min-w-0 hover:bg-zinc-900"
      >
        <img
          src="/src/assets/fantasy-prompts-logo.svg"
          alt="Icon"
          className="box-border caret-transparent h-6 w-4"
        />
        <div className="relative text-xs box-border caret-transparent leading-4 min-h-[auto] min-w-[auto] md:min-h-0 md:min-w-0">
          Chat
        </div>
      </button>
    </div>
  );
};
