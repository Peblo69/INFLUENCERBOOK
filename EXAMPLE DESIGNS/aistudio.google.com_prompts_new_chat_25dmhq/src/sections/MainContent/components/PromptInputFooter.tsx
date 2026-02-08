export const PromptInputFooter = () => {
  return (
    <footer className="relative items-end box-border caret-transparent flex flex-col pb-2 px-5">
      <div className="box-border caret-transparent block order-2 w-full md:order-none">
        <div className="relative bg-white/10 box-border caret-transparent max-w-[1000px] border mx-auto my-[3px] pl-6 pr-2 py-2 rounded-[40px] border-solid border-transparent md:pl-8 md:pr-3 md:py-3">
          <div className="box-border caret-transparent">
            <div className="relative items-end box-border caret-transparent gap-x-1.5 flex basis-[0%] grow gap-y-1.5">
              <div className="items-center box-border caret-transparent flex basis-[0%] grow min-h-9">
                <div className="box-border caret-transparent block basis-[0%] grow">
                  <section className="box-border caret-transparent flex flex-col">
                    <div className="relative box-border caret-transparent">
                      <div className="box-border caret-transparent flex basis-0 flex-col grow">
                        <div className="items-stretch box-border caret-transparent grid max-h-[200px] min-h-5 overflow-x-hidden overflow-y-auto">
                          <textarea
                            placeholder=""
                            aria-label="Type something or tab to choose an example prompt"
                            className="bg-transparent caret-transparent block col-start-1 row-start-1 min-w-3.5 overflow-hidden p-0"
                          ></textarea>
                        </div>
                      </div>
                      <div className="absolute text-neutral-500 box-border caret-transparent pointer-events-none overflow-hidden inset-0">
                        <div className="box-border caret-transparent">
                          <p className="text-gray-400 box-border caret-transparent gap-x-1 flex gap-y-1">
                            <span className="box-border caret-transparent block text-ellipsis text-nowrap overflow-hidden">
                              Plot sin(x) from 0 to 2*pi. Generate the resulting
                              graph image.
                            </span>
                            <span className="text-lg box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
                              {" "}
                              keyboard_tab{" "}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <section className="box-border caret-transparent gap-x-3.5 hidden gap-y-3.5 overflow-auto mt-2 pt-4"></section>
                  </section>
                </div>
              </div>
              <div className="items-center box-border caret-transparent flex h-9">
                <div className="box-border caret-transparent block">
                  <button
                    aria-label="Insert assets such as images, videos, files, or audio"
                    className="text-neutral-300 font-medium items-center aspect-square bg-transparent caret-transparent gap-x-1 flex h-8 justify-center gap-y-1 text-center text-nowrap border p-0 rounded-[50%] border-solid border-transparent hover:text-zinc-50 hover:bg-neutral-700"
                  >
                    <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
                      add_circle
                    </span>
                  </button>
                  <div className="box-border caret-transparent hidden"></div>
                </div>
              </div>
              <div className="items-center box-border caret-transparent flex h-9">
                <div className="box-border caret-transparent block">
                  <button
                    aria-label="Run"
                    type="submit"
                    className="relative text-neutral-700 font-medium items-center bg-amber-100 caret-transparent flex h-9 text-center text-nowrap border overflow-hidden pl-3 pr-4 py-0 rounded-[18px] border-solid border-transparent"
                  >
                    <span className="absolute text-stone-500 aspect-square box-border caret-transparent block text-nowrap w-full z-0 rounded-[50%] left-0 top-0"></span>
                    <div className="relative text-stone-500 items-center box-border caret-transparent gap-x-2 flex justify-center gap-y-2 text-nowrap">
                      <span className="items-center box-border caret-transparent gap-x-2 flex gap-y-2 text-nowrap">
                        <span className="tabular-nums box-border caret-transparent block text-nowrap">
                          Run
                        </span>
                        <span className="items-center box-border caret-transparent flex text-nowrap px-0.5 rounded-[20px]">
                          <span className="text-xs content-center box-border caret-transparent block text-nowrap">
                            {" "}
                            Ctrl{" "}
                          </span>
                          <div
                            role="img"
                            className="text-xl font-bold content-center bg-no-repeat box-border caret-transparent block fill-stone-500 h-6 text-nowrap w-5 overflow-hidden font-google_symbols"
                          >
                            {" "}
                            keyboard_return{" "}
                          </div>
                        </span>
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
