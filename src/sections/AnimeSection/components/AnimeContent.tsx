export type AnimeContentProps = {
  iconSrc: string;
  title: string;
  description: string;
  buttonAriaLabel: string;
  buttonIconSrc: string;
  containerVariant?: string;
  titleVariant?: string;
  hasButtonWrapper?: boolean;
};

export const AnimeContent = (props: AnimeContentProps) => {
  const button = (
    <a
      href="#"
      className="box-border caret-transparent block"
    >
      <button
        type="button"
        aria-label={props.buttonAriaLabel}
        className="text-indigo-500 text-xl items-center bg-transparent caret-transparent flex leading-7 text-center my-3 p-0"
      >
        Get Started
        <img
          src={props.buttonIconSrc}
          alt="Icon"
          className="box-border caret-transparent h-5 w-5 ml-2"
        />
      </button>
    </a>
  );

  return (
    <div
      className={`box-border caret-transparent flex flex-col justify-center min-h-0 min-w-0 w-auto p-2 md:min-h-[auto] md:min-w-[auto] md:w-6/12 ${props.containerVariant || ""}`}
    >
      <h2
        className={`text-4xl font-semibold items-center box-border caret-transparent flex tracking-[-0.9px] leading-10 mb-4 ${props.titleVariant || ""}`}
      >
        <img
          src={props.iconSrc}
          alt="Icon"
          className="box-border caret-transparent h-9 w-9 mr-2"
        />
        {props.title}
      </h2>
      <p className="text-gray-300 box-border caret-transparent tracking-[-0.4px]">
        {props.description}
      </p>
      {props.hasButtonWrapper ? (
        <div className="box-border caret-transparent flex justify-end">
          {button}
        </div>
      ) : (
        button
      )}
    </div>
  );
};
