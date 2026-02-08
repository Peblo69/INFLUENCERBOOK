export const ViewMoreButton = () => {
  return (
    <button
      type="button"
      className="text-base font-semibold items-center bg-zinc-800 shadow-[rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0.1)_0px_10px_15px_-3px,rgba(0,0,0,0.1)_0px_4px_6px_-4px] caret-transparent flex justify-center leading-6 text-center w-72 px-5 py-3 rounded-3xl md:text-lg md:leading-7"
    >
      Sign Up to View More
      <img
        src="https://c.animaapp.com/mhpno8qmRay7LS/assets/icon-32.svg"
        alt="Icon"
        className="text-base box-border caret-transparent h-4 leading-6 w-4 ml-2 md:text-lg md:h-[18px] md:leading-7 md:w-[18px]"
      />
    </button>
  );
};
