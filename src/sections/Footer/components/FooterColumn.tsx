export type FooterColumnProps = {
  title: string;
  links: Array<{
    href: string;
    text: string;
  }>;
  className?: string;
};

export const FooterColumn = (props: FooterColumnProps) => {
  return (
    <div
      className={`text-gray-300 text-sm items-start box-border caret-transparent flex flex-col leading-5 ${props.className || ""}`}
    >
      <p className="text-white font-semibold box-border caret-transparent">
        {props.title}
      </p>
      <div className="box-border caret-transparent grid grid-cols-[repeat(2,minmax(0px,1fr))]">
        {props.links.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className="box-border caret-transparent block underline mr-2"
          >
            {link.text}
          </a>
        ))}
      </div>
    </div>
  );
};
