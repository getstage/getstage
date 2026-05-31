import { SIDEBAR_NAV_ITEMS, isSidebarNavActive, sidebarLabelClassName } from "@/lib/dashboard/sidebarNav";
import { cn } from "@/lib/utils";

export function SidebarNavigation({
  collapsed,
  pathname,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  onNavigate: (routeKey: string) => void;
}) {
  const labelClassName = sidebarLabelClassName(collapsed);

  return (
    <div className={cn("flex w-full flex-col gap-[clamp(4px,1.5vh,8px)]", collapsed && "items-center")}>
      {SIDEBAR_NAV_ITEMS.map((item) => {
        const isActive = isSidebarNavActive(item.routeKey, pathname);

        return (
          <button
            key={item.name}
            type="button"
            onClick={() => onNavigate(item.routeKey)}
            aria-label={item.name}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-[32px] items-center overflow-hidden outline-none transition-[width,padding,gap,background-color,color,box-shadow,border-color] duration-200 ease-out",
              "cursor-pointer",
              collapsed
                ? "w-[32px] justify-center gap-0 rounded-[6px] px-0"
                : "w-full justify-start gap-[8px] rounded-[6px] px-[12px]",
              isActive
                ? "border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0a0a0a] text-[#fafafa] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]"
                : "bg-[#f5f5f5] text-[#525252] hover:bg-[#ebebeb]",
            )}
          >
            {item.routeKey === "dashboard" ? (
              <span
                aria-hidden="true"
                className="h-[15px] w-[15px] shrink-0 bg-current"
                style={{
                  WebkitMask: `url("${item.icon}") center / contain no-repeat`,
                  mask: `url("${item.icon}") center / contain no-repeat`,
                }}
              />
            ) : (
              <img
                src={item.icon}
                alt=""
                aria-hidden="true"
                className={cn(
                  "h-[15px] w-[15px] shrink-0",
                  isActive
                    ? "brightness-0 invert"
                    : "[filter:brightness(0)_saturate(100%)_invert(32%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(93%)_contrast(90%)]",
                )}
              />
            )}
            <span aria-hidden={collapsed} className={labelClassName}>
              {item.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
