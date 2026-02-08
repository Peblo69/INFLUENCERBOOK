export const HeroButton = () => {
  return (
    <button
      type="button"
      className="text-lg font-semibold items-center bg-transparent bg-[linear-gradient(to_right,rgb(79,70,229),rgb(127,134,255),rgb(79,70,229))] shadow-[rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0.1)_0px_10px_15px_-3px,rgba(0,0,0,0.1)_0px_4px_6px_-4px] caret-transparent flex justify-center leading-7 w-72 my-4 px-6 py-4 rounded-3xl md:py-5"
    >
      <span className="box-border caret-transparent block">
        Get Started For Free
      </span>
      <img
        src="/src/assets/fantasy-prompts-logo.svg"
        alt="Icon"
        className="text-2xl box-border caret-transparent h-6 leading-8 w-6 ml-3"
      />
    </button>
  );
};
