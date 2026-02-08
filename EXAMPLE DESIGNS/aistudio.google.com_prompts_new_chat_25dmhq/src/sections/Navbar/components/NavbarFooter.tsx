import { NavbarDisclaimer } from "@/sections/Navbar/components/NavbarDisclaimer";
import { ApiKeyButton } from "@/components/ApiKeyButton";
import { SettingsMenu } from "@/components/SettingsMenu";
import { AccountSwitcher } from "@/components/AccountSwitcher";

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
