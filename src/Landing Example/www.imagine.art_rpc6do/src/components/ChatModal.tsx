export const ChatModal = () => {
  return (
    <div className="fixed backdrop-blur-sm bg-white shadow-[rgba(0,0,0,0)_0px_260px_73px_0px,rgba(0,0,0,0.01)_0px_166px_67px_0px,rgba(0,0,0,0.02)_0px_94px_56px_0px,rgba(0,0,0,0.03)_0px_42px_42px_0px,rgba(0,0,0,0.04)_0px_10px_23px_0px] box-border caret-transparent hidden flex-col h-[850px] justify-between max-h-[824px] w-[406px] z-50 overflow-hidden rounded-[20px] right-4 bottom-[85px]">
      <div className="absolute items-center box-border caret-transparent flex h-full justify-center w-full">
        <img
          src="https://c.animaapp.com/mh3wk20yFxCibU/assets/icon-23.svg"
          alt="Icon"
          className="box-border caret-transparent h-[30px] w-[30px]"
        />
      </div>
    </div>
  );
};
