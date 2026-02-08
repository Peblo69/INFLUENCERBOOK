export type ChatFeatureContentProps = {
  iconUrl: string;
  iconAlt: string;
  title: string;
  description: string;
  buttonText: string;
  buttonAriaLabel: string;
  buttonIconUrl: string;
  buttonIconAlt: string;
  chatUrl: string;
  hasWrapper: boolean;
  titleVariant: string;
};

export const ChatFeatureContent = (props: ChatFeatureContentProps) => {
  return (
    <div
      className={`box-border caret-transparent flex flex-col justify-center min-h-0 min-w-0 w-auto p-2 md:min-h-[auto] md:min-w-[auto] md:w-6/12 ${props.hasWrapper ? "text-right" : ""}`}
    >
      <h2
        className={`text-4xl font-semibold items-center box-border caret-transparent flex tracking-[-0.9px] leading-10 mb-4 ${props.titleVariant}`}
      >
        <img
          src={props.iconUrl}
          alt={props.iconAlt}
          className="box-border caret-transparent h-9 w-9 mr-2"
        />
        {props.title}
      </h2>
      <p className="text-gray-300 box-border caret-transparent tracking-[-0.4px]">
        {props.description}
      </p>
      {props.hasWrapper ? (
        <div className="box-border caret-transparent flex justify-end">
          <a
            href="#"
            className="box-border caret-transparent block"
          >
            <button
              type="button"
              aria-label={props.buttonAriaLabel}
              className="text-indigo-500 text-xl items-center bg-transparent caret-transparent flex leading-7 text-center my-3 p-0"
            >
              {props.buttonText}
              <img
                src={props.buttonIconUrl}
                alt={props.buttonIconAlt}
                className="box-border caret-transparent h-5 w-5 ml-2"
              />
            </button>
          </a>
        </div>
      ) : (
        <a href="#" className="box-border caret-transparent block">
          <button
            type="button"
            aria-label={props.buttonAriaLabel}
            className="text-indigo-500 text-xl items-center bg-transparent caret-transparent flex leading-7 text-center my-3 p-0"
          >
            {props.buttonText}
            <img
              src={props.buttonIconUrl}
              alt={props.buttonIconAlt}
              className="box-border caret-transparent h-5 w-5 ml-2"
            />
          </button>
        </a>
      )}
    </div>
  );
};
