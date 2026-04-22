import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileDropdown } from "@/components/shared/ProfileDropdown";
import stageLogo from "@/assets/logos/stage-logo-light.png";

export function TopBar() {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="flex w-full items-center justify-between">
      {/* Left: Stage logo */}
      <Link to="/dashboard" className="shrink-0 outline-none focus:outline-none">
        <img src={stageLogo} alt="Stage" className="h-[18px] w-auto" />
      </Link>

      {/* Right: User avatar + name */}
      {user ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-[#f5f5f5] outline-none focus:outline-none"
          >
            <Avatar
              name={user.name}
              src={user.avatarUrl}
              size="sm"
              className="h-6 w-6 text-[10px]"
            />
            <span className="text-[13px] font-medium text-[#0a0a0a]">
              {user.name}
            </span>
          </button>

          {dropdownOpen && (
            <ProfileDropdown
              user={user}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </div>
      ) : null}
    </header>
  );
}
