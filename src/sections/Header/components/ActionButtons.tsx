import { UpgradeButton } from "@/components/UpgradeButton";
import { NotificationButton } from "@/components/NotificationButton";
import { UserProfileMenu } from "@/components/UserProfileMenu";

export const ActionButtons = () => {
  return (
    <div className="box-border caret-transparent flex items-center gap-2">
      <UpgradeButton />
      <NotificationButton />
      <UserProfileMenu />
    </div>
  );
};
