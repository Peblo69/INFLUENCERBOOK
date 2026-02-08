export const Logo = () => {
  return (
    <div className="items-center backdrop-blur-xl bg-[oklab(0.168402_0.0000076443_0.00000336766_/_0.8)] box-border caret-transparent gap-x-4 flex pointer-events-auto gap-y-4 w-fit pl-3.5 pr-2 py-2 rounded-2xl md:p-[11px]">
      <a
        href="#"
        className="box-border caret-transparent block"
      >
        <img
          src="https://c.animaapp.com/mh3wk20yFxCibU/assets/icon-3.svg"
          alt="Icon"
          className="box-border caret-transparent h-[26px] w-[26px]"
        />
      </a>
      <div className="box-border caret-transparent block min-h-[auto] min-w-[auto] md:hidden md:min-h-0 md:min-w-0">
        <button
          type="button"
          className="text-white/30 font-medium items-center bg-transparent caret-transparent gap-x-2.5 inline-flex h-10 justify-center pointer-events-none gap-y-2.5 text-center text-nowrap w-10 p-0 rounded-xl"
        >
          <img
            src="https://c.animaapp.com/mh3wk20yFxCibU/assets/icon-4.svg"
            alt="Icon"
            className="box-border caret-transparent shrink-0 h-5 text-nowrap w-5"
          />
        </button>
      </div>
    </div>
  );
};
