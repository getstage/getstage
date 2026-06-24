import { useEffect, useRef, useState } from "react";
import { sidebarLabelClassName } from "@/lib/dashboard/sidebarNav";
import { cn } from "@/lib/utils";
import { SidebarRoundAvatar } from "./SidebarRoundAvatar";

export function SidebarAccountMenu({
  collapsed,
  canExpand,
  accountInitials,
  accountLabel,
  accountAvatarUrl,
  accountMeta,
  onCollapsedChange,
  onOpenSettings,
  onLogOut,
}: {
  collapsed: boolean;
  canExpand: boolean;
  accountInitials: string;
  accountLabel: string;
  accountAvatarUrl?: string;
  accountMeta: string;
  onCollapsedChange: (collapsed: boolean) => void;
  onOpenSettings: () => void;
  onLogOut: () => Promise<void>;
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const labelClassName = sidebarLabelClassName(collapsed);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  async function logOut() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onLogOut();
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error("[stage-sidebar] log out failed", error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  function openSettings() {
    setIsUserMenuOpen(false);
    onOpenSettings();
  }

  return (
    <div
      ref={userMenuRef}
      className={cn("relative flex w-full shrink-0 flex-col gap-[clamp(4px,1.5vh,8px)]", collapsed && "items-center")}
    >
      <button
        type="button"
        aria-label="Help & Feedback"
        className={cn(
          "flex h-[32px] items-center overflow-hidden bg-[#f5f5f5] text-[#525252] transition-[width,padding,gap,background-color] duration-200 ease-out hover:bg-[#ebebeb]",
          "cursor-pointer",
          collapsed
            ? "w-[32px] justify-center gap-0 rounded-[6px] px-0"
            : "w-full justify-start gap-[8px] rounded-[6px] px-[12px]",
        )}
      >
        <img
          src="/logos/dashboard/question.svg"
          alt={collapsed ? "Help & Feedback" : ""}
          aria-hidden={!collapsed}
          className="h-[15px] w-[15px]"
        />
        <span aria-hidden={collapsed} className={labelClassName}>
          Help & Feedback
        </span>
      </button>

      <div className="relative w-full">
        {isUserMenuOpen && !collapsed ? (
          <div
            className="absolute bottom-[44px] left-0 z-50 w-full rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            role="menu"
            aria-label="Account menu"
          >
            <div className="rounded-[6px] bg-white p-[8px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <div className="px-[4px] pb-[8px] pt-[2px]">
                <p className="truncate text-[13px] font-semibold leading-[1.25] text-[#0A0A0A]">
                  {accountLabel}
                </p>
                <p className="mt-[3px] truncate text-[12px] font-medium leading-[1.25] text-[#737373]">
                  {accountMeta}
                </p>
              </div>
              <div className="border-t border-[#E5E5E5] pt-[2px]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={openSettings}
                  className="flex h-[32px] w-full cursor-pointer items-center rounded-[6px] px-[8px] text-left text-[13px] font-medium leading-none text-[#171717] outline-none transition-colors hover:bg-[#F5F5F5]"
                >
                  Settings
                </button>
              </div>
              <div className="border-t border-[#E5E5E5] pt-[2px]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logOut()}
                  disabled={isLoggingOut}
                  className="flex h-[32px] w-full cursor-pointer items-center rounded-[6px] px-[8px] text-left text-[13px] font-medium leading-none text-[#171717] outline-none transition-colors hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoggingOut ? "Logging out…" : "Log out"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          aria-label={accountLabel}
          aria-haspopup="menu"
          aria-expanded={isUserMenuOpen}
          onClick={() => {
            if (collapsed && canExpand) {
              onCollapsedChange(false);
              return;
            }
            if (collapsed) return;

            setIsUserMenuOpen((current) => !current);
          }}
          className={cn(
            "flex h-[36px] cursor-pointer items-center overflow-hidden bg-[#f5f5f5] outline-none transition-[width,padding,background-color] duration-200 ease-out hover:bg-[#ebebeb]",
            collapsed
              ? "w-[32px] justify-center rounded-[6px] px-0"
              : "w-full justify-between rounded-[6px] px-[12px]",
          )}
        >
          <div className={cn("flex items-center", collapsed ? "gap-0" : "gap-[8px]")}>
            <SidebarRoundAvatar
              imageUrl={accountAvatarUrl}
              label={accountLabel}
              initials={accountInitials}
              accentColor="#e5e5e5"
              fallbackTextClassName="text-[#525252]"
            />
            <span aria-hidden={collapsed} className={cn(labelClassName, "text-[#0a0a0a]")}>
              {accountLabel}
            </span>
          </div>
          <img
            src="/logos/dashboard/dots.svg"
            alt=""
            aria-hidden="true"
            className={cn(
              "h-[15px] shrink-0 transition-[width,opacity] duration-150",
              collapsed ? "w-0 opacity-0" : "w-[15px] opacity-100",
            )}
          />
        </button>
      </div>
    </div>
  );
}
