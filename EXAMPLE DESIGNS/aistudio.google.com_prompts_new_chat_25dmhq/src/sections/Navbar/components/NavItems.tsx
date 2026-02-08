import { NavLink } from "@/components/NavLink";
import { PlaygroundNavItem } from "@/sections/Navbar/components/PlaygroundNavItem";

export const NavItems = () => {
  return (
    <div className="box-border caret-transparent">
      <NavLink href="https://aistudio.google.com/" icon="home" label="Home" />
      <div className="box-border caret-transparent">
        <PlaygroundNavItem />
        <div className="box-border caret-transparent">
          <div className="relative text-stone-200 caret-transparent block overflow-hidden rounded-xl">
            <div className="box-border caret-transparent grid grid-cols-[100%] grid-rows-[1fr]">
              <div
                role="region"
                className="box-border caret-transparent flex flex-col leading-[21px]"
              >
                <div className="box-border caret-transparent pb-4">
                  <ul className="box-border caret-transparent overflow-hidden pl-0"></ul>
                  <p className="text-xs box-border caret-transparent leading-5 ml-3.5 my-1">
                    {" "}
                    No prompts yet{" "}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <NavLink
        href="https://aistudio.google.com/apps"
        icon="design_services"
        label="Build"
        hasChevron={true}
      />
      <NavLink
        href="https://aistudio.google.com/api-keys"
        icon="speed"
        label="Dashboard"
        hasChevron={true}
      />
      <NavLink
        href="https://ai.google.dev/gemini-api/docs"
        icon="developer_guide"
        label="Documentation"
        hasArrowOutward={true}
      />
    </div>
  );
};
