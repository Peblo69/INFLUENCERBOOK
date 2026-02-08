export const CookieBanner = () => {
  return (
    <div
      role="region"
      className="text-base items-center bg-blue-800 border-b-stone-900 border-l-zinc-200 border-r-zinc-200 border-t-zinc-200 box-border caret-transparent hidden shrink-0 overflow-hidden px-6 py-1 border-b"
    >
      <p className="text-sm font-medium box-border caret-transparent basis-[0%] grow mr-3 my-3.5">
        <span className="box-border caret-transparent">
          Kiara Studio uses cookies to deliver and enhance the
          quality of its services and to analyze traffic.
        </span>
        <a
          href="#"
          aria-label="Learn more about how we use cookies. Opens in a new tab."
          className="text-indigo-400 box-border caret-transparent"
        >
          Learn more
        </a>
      </p>
      <button className="text-sm font-medium items-end bg-blue-800 caret-transparent block float-right text-center text-nowrap p-3 hover:bg-blue-900 hover:border-blue-800 hover:rounded-[10px]">
        OK, got it
      </button>
    </div>
  );
};
