import { NavbarDisclaimer } from "@/sections/KiaraStudioPage/sections/Navbar/components/NavbarDisclaimer";
import { ApiKeyButton } from "@/sections/KiaraStudioPage/components/ApiKeyButton";
import { SettingsMenu } from "@/sections/KiaraStudioPage/components/SettingsMenu";
import { AccountSwitcher } from "@/sections/KiaraStudioPage/components/AccountSwitcher";

export const NavbarFooter = () => {
  return (
    <div className="box-border caret-transparent flex flex-col pb-4">
      <div className="box-border caret-transparent block mb-1">
        <NavbarDisclaimer />
      </div>
      <ApiKeyButton />
      <SettingsMenu />
      <AccountSwitcher />
    </div>
  );
};
