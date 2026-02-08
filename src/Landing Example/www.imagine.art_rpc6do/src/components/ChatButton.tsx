export const ChatButton = () => {
  return (
    <button
      type="button"
      aria-label="chat-button"
      className="fixed bg-white shadow-[rgba(0,0,0,0.2)_0px_4px_8px_0px] caret-transparent hidden h-[55px] text-center w-[55px] z-50 p-0 rounded-[27.5px] right-4 bottom-4"
    >
      <div className="items-center box-border caret-transparent flex h-full justify-center w-full z-[2147483646]">
        <img
          src="https://c.animaapp.com/mh3wk20yFxCibU/assets/icon-22.svg"
          alt="Icon"
          className="box-border caret-transparent h-[55px] w-[55px]"
        />
      </div>
    </button>
  );
};
