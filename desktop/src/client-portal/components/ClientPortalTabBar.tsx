import { useNavigate } from "@tanstack/react-router";
import { SettingsIcon } from "@/settings/components/SettingsIcons";
import { cn } from "@/lib/utils";

export function ClientPortalTabBar({ activeTab }: { activeTab: "brand" | "projects" }) {
  const navigate = useNavigate();
  return (
    <div className="grid w-fit max-w-full grid-cols-2 gap-[2px] overflow-x-auto rounded-[8px] bg-[#F5F5F5] p-[2px]">
      <button
        type="button"
        onClick={() => navigate({ to: "/settings/portal" })}
        className={`inline-flex items-center justify-center gap-[8px] whitespace-nowrap rounded-[6px] py-[6px] px-[12px] text-[13px] font-medium leading-[1.25] transition-all ${
          activeTab === "brand"
            ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
            : "text-[#737373] hover:bg-white"
        }`}
      >
        <SettingsIcon name="paint" className="h-[15px] w-[15px]" />
        Brand Settings
      </button>
      <button
        type="button"
        onClick={() => navigate({ to: "/client-portal" })}
        className={`inline-flex items-center justify-center gap-[8px] whitespace-nowrap rounded-[6px] py-[6px] px-[12px] text-[13px] font-medium leading-[1.25] transition-all ${
          activeTab === "projects"
            ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
            : "text-[#737373] hover:bg-white"
        }`}
      >
        <img
          src="/logos/dashboard/projects.svg"
          alt=""
          aria-hidden="true"
          className={cn(
            "h-[15px] w-[15px] shrink-0",
            activeTab === "projects"
              ? "brightness-0 invert"
              : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(180deg)_brightness(95%)_contrast(88%)]",
          )}
        />
        All projects
      </button>
    </div>
  );
}
