import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Avatar } from "@/components/ui/Avatar";
import stageLogo from "@/assets/logos/stage-logo-light.png";

type CreationNavigationProps = {
  userName: string;
  userAvatarUrl?: string;
};

export function CreationNavigation({
  userName,
  userAvatarUrl,
}: CreationNavigationProps) {
  return (
    <nav className="flex items-center justify-between px-14 py-[18px]">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="inline-flex items-center">
          <img src={stageLogo} alt="Stage" className="h-[22px] w-auto" />
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={14} weight="regular" />
          Dashboard
        </Link>
      </div>

      <Avatar name={userName} src={userAvatarUrl} size="sm" />
    </nav>
  );
}
