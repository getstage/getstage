import { Link, useMatches } from "@tanstack/react-router";
import { ArrowLeft } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileDropdown } from "@/components/shared/ProfileDropdown";
import { useState } from "react";
import stageLogo from "@/assets/logos/stage-logo-light.png";

export function Navbar() {
  const { user } = useAuth();
  const matches = useMatches();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Determine breadcrumb context from current route
  const isProjectDetail = matches.some((m) => m.routeId.includes("project.$id"));
  const isTaskDetail = matches.some((m) => m.routeId.includes("task.$taskId"));

  return (
    <header className="top-0 z-40 bg-white">
      <div className="mx-auto flex h-[64px] w-full max-w-[1200px] items-center justify-between px-6 sm:px-10 lg:px-14">
        <div className="flex items-center gap-3">
          {isProjectDetail || isTaskDetail ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-[14px] text-text-secondary transition-colors hover:text-text-primary"
            >
              <ArrowLeft size={16} weight="regular" />
              Dashboard
            </Link>
          ) : (
            <Link to="/dashboard" className="inline-flex items-center">
              <img src={stageLogo} alt="Stage" className="h-[22px] w-auto" />
            </Link>
          )}
        </div>

        <div />

        <div className="flex items-center gap-4">
          {user?.plan === "free" && (
            <Link
              to="/settings"
              className="text-[14px] font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Upgrade
            </Link>
          )}

          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="cursor-pointer rounded-full transition-opacity hover:opacity-80"
            >
              <Avatar
                name={user?.name ?? "User"}
                src={user?.avatarUrl}
                size="sm"
              />
            </button>

            {dropdownOpen && (
              <ProfileDropdown
                user={user!}
                onClose={() => setDropdownOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
