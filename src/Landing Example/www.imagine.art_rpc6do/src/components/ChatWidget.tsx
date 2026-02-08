export const ChatWidget = () => {
  return (
    <div className="fixed box-border caret-transparent gap-x-[50px] hidden flex-col leading-[normal] max-w-[262.5px] gap-y-[50px] z-[2147483644] rounded-[10px] right-4 bottom-[85px] font-sans_serif md:max-w-4xl">
      <div className="absolute text-black text-xs font-bold items-center bg-neutral-200 shadow-[rgba(150,150,150,0.15)_0px_6px_24px_0px,rgba(150,150,150,0.15)_0px_0px_0px_1px] box-border caret-transparent hidden h-[22px] justify-center right-[-7px] text-center top-[-7px] w-[22px] z-[2147483643] rounded-[50%]">
        ✕
      </div>
      <div className="box-border caret-transparent flex justify-end">
        <div className="text-black text-sm bg-white shadow-[rgba(150,150,150,0.2)_0px_10px_30px_0px,rgba(150,150,150,0.2)_0px_0px_0px_1px] box-border caret-transparent m-2 p-5 rounded-[10px]">
          Hello! 👋 I'm here to help! How can I assist you with Kiara Vision today?
        </div>
      </div>
    </div>
  );
};
