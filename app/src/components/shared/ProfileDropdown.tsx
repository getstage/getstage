import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { signOut } from "@/lib/auth";
import type { User } from "@/types";

interface ProfileDropdownProps {
  user: User;
  onClose: () => void;
}

export function ProfileDropdown({ user, onClose }: ProfileDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[220px] rounded-xl border border-border-subtle bg-white p-1.5 shadow-sm"
    >
      {/* User info */}
      <div className="px-3 py-2.5">
        <p className="text-[14px] font-medium text-text-primary">{user.name}</p>
        <p className="text-[13px] text-text-secondary">{user.email}</p>
      </div>

      <div className="my-1 h-px bg-border-subtle" />

      {/* Menu items */}
      <Link
        to="/settings"
        onClick={onClose}
        className="flex w-full items-center rounded-lg px-3 py-2 text-[14px] text-text-primary transition-colors hover:bg-bg-subtle"
      >
        Settings
      </Link>

      <div className="my-1 h-px bg-border-subtle" />

      <button
        onClick={async () => {
          onClose();
          await signOut();
        }}
        className="flex w-full items-center rounded-lg px-3 py-2 text-[14px] text-text-primary transition-colors hover:bg-bg-subtle cursor-pointer"
      >
        Log out
      </button>
    </div>
  );
}
