import stageLogo from "@/assets/logos/stage-logo-light.png";
import { cn } from "@/lib/utils";

export function SidebarCollapseControl({
  collapsed,
  canExpand,
  onCollapsedChange,
}: {
  collapsed: boolean;
  canExpand: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  return (
    <div className={cn("flex w-full shrink-0 items-center", collapsed ? "justify-center" : "justify-between")}>
      {collapsed ? (
        <button
          type="button"
          onClick={() => canExpand && onCollapsedChange(false)}
          className={cn(
            "group relative flex h-[32px] w-[32px] items-center justify-center rounded-[6px] outline-none transition-colors",
            canExpand ? "cursor-pointer hover:bg-[#ebebeb]" : "cursor-default",
          )}
          aria-label={canExpand ? "Expand sidebar" : "Stage"}
          aria-disabled={!canExpand}
        >
          <span
            aria-hidden="true"
            className={cn(
              "relative h-[32px] w-[29px] overflow-hidden transition-opacity duration-150",
              canExpand && "group-hover:opacity-0",
            )}
          >
            <img
              src={stageLogo}
              alt=""
              className="absolute left-0 top-0 h-[32px] w-auto max-w-none"
            />
          </span>
          {canExpand ? (
            <img
              src="/logos/dashboard/close.svg"
              alt=""
              aria-hidden="true"
              className="absolute h-[20px] w-[20px] rotate-180 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            />
          ) : null}
        </button>
      ) : (
        <div className="flex items-center gap-[2px]">
          <img src={stageLogo} alt="Stage" className="h-[22px] w-auto" />
        </div>
      )}
      {!collapsed ? (
        <button
          type="button"
          onClick={() => onCollapsedChange(true)}
          className="cursor-pointer rounded-[4px] outline-none transition-colors hover:bg-[#e5e5e5]"
        >
          <img
            src="/logos/dashboard/close.svg"
            alt="Collapse sidebar"
            className="h-[20px] w-[20px]"
          />
        </button>
      ) : null}
    </div>
  );
}
