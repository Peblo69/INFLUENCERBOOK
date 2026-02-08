export type FeatureGridProps = {
  features: Array<{
    iconUrl: string;
    title: string;
    description: string;
    buttonUrl: string;
    buttonAriaLabel: string;
  }>;
  buttonIconUrl: string;
};

export const FeatureGrid = (props: FeatureGridProps) => {
  return (
    <div className="box-border caret-transparent block my-24 md:flex">
      {props.features.map((feature, index) => (
        <div
          key={index}
          className="box-border caret-transparent flex flex-col justify-center min-h-0 min-w-0 w-auto p-2 md:min-h-[auto] md:min-w-[auto] md:w-6/12"
        >
          <h2 className="text-4xl font-semibold items-center box-border caret-transparent flex tracking-[-0.9px] leading-10 mb-4">
            <img
              src={feature.iconUrl}
              alt="Icon"
              className="box-border caret-transparent h-9 w-9 mr-2"
            />
            {feature.title}
          </h2>
          <p className="text-gray-300 box-border caret-transparent tracking-[-0.4px]">
            {feature.description}
          </p>
          <a
            href={feature.buttonUrl}
            className="box-border caret-transparent block"
          >
            <button
              type="button"
              aria-label={feature.buttonAriaLabel}
              className="text-indigo-500 items-center bg-transparent caret-transparent flex text-center my-3 p-0"
            >
              Get Started
              <img
                src={props.buttonIconUrl}
                alt="Icon"
                className="box-border caret-transparent h-4 w-4 ml-2"
              />
            </button>
          </a>
        </div>
      ))}
    </div>
  );
};
