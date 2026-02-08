export const ChatContent = () => {
  return (
    <div className="box-border caret-transparent p-4">
      <h2 className="text-4xl font-semibold items-center box-border caret-transparent flex tracking-[-0.9px] leading-10 mb-4">
        Chat with AI
      </h2>
      <p className="text-gray-300 box-border caret-transparent tracking-[-0.4px]">
        Experience the future of virtual companionship with Fantasy Prompts! Not only
        can you create stunning AI content, but you can also craft personalized
        AI Girlfriends and chat with them. Engage in conversations so natural
        and vibrant, you’ll forget you’re talking to a bot. Our advanced chat
        system infuses each interaction with unique personality and
        intelligence, making every exchange truly memorable.
      </p>
      <a
        href="#"
        className="box-border caret-transparent"
      >
        <button
          type="button"
          aria-label="Start chatting with AI"
          className="text-indigo-500 text-xl items-center bg-transparent caret-transparent flex leading-7 text-center my-3 p-0"
        >
          Start Chatting
          <img
            src="https://c.animaapp.com/mhpno8qmRay7LS/assets/icon-33.svg"
            alt="Icon"
            className="box-border caret-transparent h-5 w-5 ml-2"
          />
        </button>
      </a>
    </div>
  );
};
