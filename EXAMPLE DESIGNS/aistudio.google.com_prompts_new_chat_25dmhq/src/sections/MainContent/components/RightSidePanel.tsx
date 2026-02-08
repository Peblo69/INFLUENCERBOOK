export const RightSidePanel = () => {
  return (
    <div className="fixed box-border caret-transparent flex h-full min-h-0 min-w-0 z-[5] right-0 inset-y-0 md:static md:min-h-[auto] md:min-w-[auto] md:z-auto md:right-auto md:inset-y-auto">
      <div className="box-border caret-transparent w-[300px]">
        <div className="text-stone-300 backdrop-blur-[3px] bg-stone-900 border-b-stone-300 border-l-zinc-800 border-r-stone-300 border-t-stone-300 box-border caret-transparent gap-x-0 flex flex-col shrink-0 h-full gap-y-0 w-[300px] z-[4] border-l md:bg-transparent md:z-auto">
          <div className="items-center box-border caret-transparent flex justify-between pt-4 px-4">
            <h2 className="text-xs box-border caret-transparent text-nowrap">
              Run settings
            </h2>
            <div className="items-center box-border caret-transparent gap-x-0 flex gap-y-0 ml-auto">
              <div className="box-border caret-transparent block">
                <button
                  aria-label="Get code"
                  className="text-neutral-300 text-xs items-center bg-transparent caret-transparent gap-x-1 flex h-7 justify-center gap-y-1 text-center text-nowrap border px-3 py-0 rounded-xl border-solid border-transparent hover:text-zinc-50 hover:bg-neutral-700"
                >
                  <span className="text-lg box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
                    code
                  </span>
                  Get code
                </button>
              </div>
              <button
                aria-label="Reset default settings"
                className="text-neutral-300 text-xs items-center aspect-square bg-transparent caret-transparent gap-x-1 flex h-7 justify-center gap-y-1 text-center text-nowrap border p-0 rounded-[50%] border-solid border-transparent hover:text-zinc-50 hover:bg-neutral-700"
              >
                <span className="text-lg box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
                  reset_settings
                </span>
              </button>
              <button
                aria-label="Close run settings panel"
                className="text-neutral-300 text-xs items-center aspect-square bg-transparent caret-transparent gap-x-1 flex h-7 justify-center gap-y-1 text-center text-nowrap border p-0 rounded-[50%] border-solid border-transparent hover:text-zinc-50 hover:bg-neutral-700"
              >
                <span className="text-lg box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
                  close
                </span>
              </button>
            </div>
          </div>
          <div className="relative box-border caret-transparent flex basis-[0%] flex-col grow w-[300px] overflow-hidden">
            <div className="box-border caret-transparent flex basis-[0%] flex-col grow overflow-x-hidden overflow-y-auto p-4">
              <div className="box-border caret-transparent block">
                <div className="box-border caret-transparent gap-x-0 flex flex-col gap-y-0">
                  <div className="items-center box-border caret-transparent gap-x-1 flex justify-between gap-y-1">
                    <div className="box-border caret-transparent basis-[0%] grow">
                      <div className="box-border caret-transparent w-full">
                        <button className="text-white/30 font-medium bg-neutral-800 caret-transparent w-full border border-zinc-800 px-3 py-2 rounded-xl border-solid hover:bg-zinc-800 hover:border-neutral-700">
                          <span className="text-neutral-300 font-normal box-border caret-transparent block mb-2">
                            Nano Banana
                          </span>
                          <span className="text-neutral-400 text-xs font-normal box-border caret-transparent flow-root text-ellipsis overflow-hidden">
                            gemini-2.5-flash-image
                          </span>
                          <span className="text-neutral-400 text-xs font-normal box-border caret-transparent flow-root text-ellipsis overflow-hidden">
                            State-of-the-art image generation and editing model.
                          </span>
                        </button>
                        <div
                          title="Model selection"
                          className="box-border caret-transparent"
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="items-start box-border caret-transparent grid my-2">
                    <button
                      aria-label="System instructions"
                      className="text-white/30 font-medium bg-neutral-800 caret-transparent block col-start-1 row-start-1 w-full border border-zinc-800 px-3 py-2 rounded-xl border-solid hover:bg-zinc-800 hover:border-neutral-700"
                    >
                      <span className="text-neutral-300 font-normal box-border caret-transparent block mb-2">
                        System instructions
                      </span>
                      <span className="text-neutral-400 text-xs font-normal box-border caret-transparent flow-root text-ellipsis overflow-hidden">
                        Optional tone and style instructions for the model
                      </span>
                    </button>
                    <div className="box-border caret-transparent block"></div>
                  </div>
                  <div
                    role="separator"
                    className="border-b-stone-300 border-l-stone-300 border-r-stone-300 box-border caret-transparent block my-2 border-t-white/10 border-t"
                  ></div>
                  <div className="items-start box-border caret-transparent flex flex-col justify-center mt-2">
                    <div className="items-center box-border caret-transparent gap-x-2 flex justify-between gap-y-2 mt-1 -mb-2.5">
                      <div className="box-border caret-transparent w-fit">
                        <h3 className="box-border caret-transparent">
                          Temperature
                        </h3>
                      </div>
                    </div>
                    <div className="box-border caret-transparent flex flex-col justify-center w-full">
                      <div className="box-border caret-transparent block w-full">
                        <div className="items-center box-border caret-transparent gap-x-2 flex justify-between gap-y-2">
                          <div className="relative box-border caret-transparent block h-12 align-middle w-[65%] mr-2">
                            <div className="absolute box-border caret-transparent h-1 pointer-events-none translate-y-[-50.0%] w-full top-2/4">
                              <div className="absolute bg-zinc-700 box-border caret-transparent flex h-1 opacity-[0.24] w-full rounded-full left-0 top-0 before:accent-auto before:box-border before:caret-transparent before:text-stone-300 before:block before:text-sm before:not-italic before:normal-nums before:font-normal before:h-full before:tracking-[normal] before:leading-5 before:list-outside before:list-disc before:pointer-events-none before:absolute before:text-start before:indent-[0px] before:normal-case before:visible before:w-full before:border before:rounded-full before:border-separate before:border-solid before:border-transparent before:left-0 before:top-0 before:font-inter"></div>
                              <div className="absolute box-border caret-transparent flex h-1 w-full overflow-hidden rounded-full top-0">
                                <div className="relative box-border caret-transparent h-full origin-[0%_50%] w-full border-neutral-400 border-t-4 scale-x-[0.982759px] left-0"></div>
                              </div>
                            </div>
                            <div className="absolute box-border caret-transparent flex h-12 pointer-events-none translate-x-[171px] w-12 -left-6">
                              <div className="absolute bg-neutral-400 shadow-[rgba(0,0,0,0.2)_0px_2px_1px_-1px,rgba(0,0,0,0.14)_0px_1px_1px_0px,rgba(0,0,0,0.12)_0px_1px_3px_0px] box-border caret-transparent h-3.5 translate-x-[-50.0%] translate-y-[-50.0%] w-3.5 border-neutral-400 rounded-full border-[7px] border-solid left-2/4 top-2/4"></div>
                              <div className="relative box-border caret-transparent h-full w-full overflow-hidden"></div>
                            </div>
                          </div>
                          <input
                            type="number"
                            className="text-neutral-700 text-xs bg-transparent box-border caret-transparent block h-7 w-12 border border-zinc-800 px-2 rounded-lg border-solid"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="items-start box-border caret-transparent gap-x-1 flex flex-col justify-center gap-y-1 mb-2">
                    <div className="items-center box-border caret-transparent gap-x-2 flex justify-between gap-y-2 mt-1">
                      <div className="box-border caret-transparent w-fit">
                        <h3 className="box-border caret-transparent">
                          Aspect ratio
                        </h3>
                      </div>
                    </div>
                    <div className="box-border caret-transparent w-full">
                      <div className="text-base box-border caret-transparent inline-flex flex-col leading-6 text-left w-full">
                        <div className="relative text-neutral-300 items-center bg-neutral-800 box-border caret-transparent flex grow max-h-8 text-ellipsis text-nowrap w-full z-0 overflow-hidden p-2 rounded-xl">
                          <div className="items-baseline box-border caret-transparent flex max-h-8 text-nowrap w-full">
                            <div className="absolute box-border caret-transparent flex h-full max-w-full pointer-events-none text-nowrap w-full z-[1] top-0 inset-x-0">
                              <div className="box-border caret-transparent h-full text-nowrap w-3 border-zinc-800 rounded-l-xl border-b border-l border-t"></div>
                              <div className="border-b-zinc-800 border-r-zinc-800 border-t-zinc-800 box-border caret-transparent hidden shrink-0 h-full max-w-[calc(100%_-_60px)] text-nowrap -ml-px border-l-transparent border-b border-l border-t"></div>
                              <div className="box-border caret-transparent grow h-full text-nowrap border-zinc-800 rounded-r-xl border-b border-r border-t"></div>
                            </div>
                            <div className="relative text-sm box-border caret-transparent grow leading-5 max-h-8 text-nowrap w-[180px]">
                              <div
                                role="combobox"
                                aria-label="Aspect ratio"
                                className="text-stone-200 box-border caret-transparent inline-block text-nowrap w-full"
                              >
                                <div className="relative items-center box-border caret-transparent inline-flex text-nowrap w-full">
                                  <div className="box-border caret-transparent text-ellipsis text-nowrap w-full overflow-hidden">
                                    <span className="box-border caret-transparent text-ellipsis text-nowrap overflow-hidden">
                                      <span className="box-border caret-transparent text-nowrap">
                                        Auto
                                      </span>
                                    </span>
                                  </div>
                                  <div className="items-center box-border caret-transparent flex shrink-0 h-6 text-nowrap"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="relative text-xs box-border caret-transparent leading-4 w-full">
                          <div className="box-border caret-transparent flex px-4 top-0 inset-x-0">
                            <div className="box-border caret-transparent basis-3 grow shrink-0"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    role="separator"
                    className="border-b-stone-300 border-l-stone-300 border-r-stone-300 box-border caret-transparent block my-2 border-t-white/10 border-t"
                  ></div>
                  <div className="items-center box-border caret-transparent gap-x-1 flex justify-between gap-y-1 my-2">
                    <div className="items-center box-border caret-transparent gap-x-1 flex justify-between gap-y-1 w-full mt-1">
                      <button
                        aria-label="Expand or collapse advanced settings"
                        className="text-neutral-300 font-medium items-center aspect-square bg-transparent caret-transparent gap-x-1 flex h-8 justify-center order-2 gap-y-1 text-center text-nowrap border p-0 rounded-[50%] border-solid border-transparent hover:text-zinc-50 hover:bg-neutral-700"
                      >
                        <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
                          expand_more
                        </span>
                      </button>
                      <p className="text-neutral-400 text-xs box-border caret-transparent">
                        Advanced settings
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
