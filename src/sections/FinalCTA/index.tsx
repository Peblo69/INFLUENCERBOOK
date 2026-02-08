export const FinalCTA = () => {
  return (
    <section className="items-center bg-[linear-gradient(to_right,rgb(28,26,34),rgb(44,39,54),rgb(15,13,20))] bg-size-[cover,cover] box-border caret-transparent flex flex-col h-60 justify-center text-center bg-[position:50%,50%_50%,50%] mt-20 rounded-xl">
      <h2 className="text-base font-semibold box-border caret-transparent leading-6 md:text-2xl md:leading-8">
        Try out Fantasy Prompts&#39; amazing NSFW AI tools!
      </h2>
      <a
        href="#"
        className="box-border caret-transparent block"
      >
        <button
          type="button"
          aria-label="Start Creating"
          className="text-indigo-600 text-base font-semibold items-center bg-white shadow-[rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0.1)_0px_10px_15px_-3px,rgba(0,0,0,0.1)_0px_4px_6px_-4px] caret-transparent flex justify-center leading-6 w-72 my-4 px-5 py-3 rounded-full md:text-lg md:leading-7"
        >
          Start Creating
          <img
            src="https://c.animaapp.com/mhpno8qmRay7LS/assets/icon-47.svg"
            alt="Icon"
            className="text-base box-border caret-transparent h-4 leading-6 w-4 ml-2 md:text-lg md:h-[18px] md:leading-7 md:w-[18px]"
          />
        </button>
      </a>
    </section>
  );
};
