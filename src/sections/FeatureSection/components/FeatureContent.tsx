export type FeatureContentProps = {
  containerVariant: string;
  titleVariant: string;
  titleIcon?: string;
  titleText: string;
  descriptionVariant: string;
  descriptionText: string;
  buttonHref: string;
  buttonAriaLabel: string;
  buttonText: string;
  buttonIconSrc: string;
  alignButtonRight?: boolean;
};

export const FeatureContent = (props: FeatureContentProps) => {
  const buttonElement = (
    <button
      type="button"
      aria-label={props.buttonAriaLabel}
      className="text-indigo-500 text-xl items-center bg-transparent caret-transparent flex leading-7 text-center my-3 p-0"
    >
      {props.buttonText}
      <img
        src={props.buttonIconSrc}
        alt="Icon"
        className="box-border caret-transparent h-5 w-5 ml-2"
      />
    </button>
  );

  const linkElement = (
    <a href={props.buttonHref} className="box-border caret-transparent block">
      {buttonElement}
    </a>
  );

  return (
    <div className={`box-border caret-transparent ${props.containerVariant}`}>
      <h2
        className={`font-semibold items-center box-border caret-transparent flex mb-4 ${props.titleVariant}`}
      >
        {props.titleIcon && (
          <img
            src={props.titleIcon}
            alt="Icon"
            className="box-border caret-transparent h-9 w-9 mr-2"
          />
        )}
        {props.titleText}
      </h2>
      <p
        className={`text-gray-300 box-border caret-transparent ${props.descriptionVariant}`}
      >
        {props.descriptionText}
      </p>
      {props.alignButtonRight ? (
        <div className="box-border caret-transparent flex justify-end">
          {linkElement}
        </div>
      ) : (
        linkElement
      )}
    </div>
  );
};
