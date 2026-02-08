export const UpgradeBanner = () => {
  return (
    <div className="relative text-white items-center bg-[linear-gradient(to_right,rgb(28,26,34),rgb(44,39,54),rgb(15,13,20))] shadow-[rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0.1)_0px_4px_6px_-1px,rgba(0,0,0,0.1)_0px_2px_4px_-2px] box-border caret-transparent flex justify-center py-2">
      <div className="items-center box-border caret-transparent flex justify-center">
        <div className="items-center box-border caret-transparent flex flex-col justify-center mr-4">
          <h2 className="text-lg font-bold items-center box-border caret-transparent flex justify-center leading-7 uppercase">
            Upgrades
          </h2>
        </div>
        <a
          aria-label="Get Gems"
          href="#"
          className="font-bold box-border caret-transparent block"
        >
          <div className="text-sm font-semibold items-center bg-[linear-gradient(to_right,rgb(79,70,229),rgb(127,134,255),rgb(79,70,229))] shadow-[rgb(255,255,255)_0px_0px_0px_0px,rgb(156,163,175)_0px_0px_0px_2px,rgba(0,0,0,0.1)_0px_10px_15px_-3px,rgba(0,0,0,0.1)_0px_4px_6px_-4px] box-border caret-transparent flex justify-center leading-5 text-center px-6 py-1 rounded-3xl">
            <p className="box-border caret-transparent uppercase">
              <span className="box-border caret-transparent hidden md:inline">
                shop
              </span>
              50% Off!
            </p>
          </div>
        </a>
        <a
          href="#"
          className="items-center box-border caret-transparent hidden min-h-0 min-w-0 md:block md:min-h-[auto] md:min-w-[auto]"
        >
          <button className="text-gray-300 text-xs font-medium items-center bg-transparent caret-transparent flex justify-center leading-4 text-center ml-3 px-0 py-2">
            See Pricing{" "}
            <img
              src="https://c.animaapp.com/mhpno8qmRay7LS/assets/icon-13.svg"
              alt="Icon"
              className="box-border caret-transparent h-3 w-3 ml-1"
            />
          </button>
        </a>
      </div>
      <button className="absolute text-xs font-bold bg-transparent caret-transparent block leading-4 text-center mr-2 mt-2 p-0 right-0 top-0 hover:text-gray-300">
        <img
          src="https://c.animaapp.com/mhpno8qmRay7LS/assets/icon-14.svg"
          alt="Icon"
          className="box-border caret-transparent h-3 w-3"
        />
      </button>
    </div>
  );
};
