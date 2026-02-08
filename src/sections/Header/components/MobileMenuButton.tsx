export const MobileMenuButton = () => {
  return (
    <div className="items-center box-border caret-transparent flex h-8 justify-center min-h-[auto] min-w-[auto] w-8 border border-gray-500 ml-2 rounded-full border-solid md:min-h-0 md:min-w-0">
      <button
        aria-label="Toggle Search"
        className="text-white bg-transparent caret-transparent block min-h-[auto] min-w-[auto] text-center p-0 md:min-h-0 md:min-w-0"
      >
        <img
          src="/src/assets/fantasy-prompts-logo.svg"
          alt="Icon"
          className="box-border caret-transparent h-4 w-4 m-3"
        />
      </button>
    </div>
  );
};
