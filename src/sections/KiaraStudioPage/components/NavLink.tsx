export type NavLinkProps = {
  href: string;
  icon: string;
  label: string;
  hasChevron?: boolean;
  hasArrowOutward?: boolean;
};

export const NavLink = (props: NavLinkProps) => {
  return (
    <a
      href={props.href}
      className="text-neutral-300 font-medium items-center box-border caret-transparent gap-x-1 flex h-8 justify-start gap-y-1 text-nowrap w-full border my-1 px-3 rounded-xl border-solid border-transparent hover:text-zinc-50 hover:bg-zinc-800"
    >
      <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
        {props.icon}
      </span>
      {props.label.includes(" ") ? (
        <span className="box-border caret-transparent block basis-[0%] grow text-left text-nowrap">
          {props.label}
        </span>
      ) : (
        ` ${props.label} `
      )}
      {props.hasChevron && (
        <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
          chevron_right
        </span>
      )}
      {props.hasArrowOutward && (
        <span className="text-lg font-normal box-border caret-transparent block leading-[18px] text-nowrap font-google_symbols">
          arrow_outward
        </span>
      )}
    </a>
  );
};
