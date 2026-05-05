import { useNavigate } from "@tanstack/react-router";
import { SettingsIcon } from "@/settings/components/SettingsIcons";

export function ClientPortalTabBar({ activeTab }: { activeTab: "brand" | "projects" }) {
  const navigate = useNavigate();
  return (
    <div className="flex w-fit max-w-full items-center gap-[8px] overflow-x-auto rounded-[8px] bg-[#F5F5F5] p-[2px]">
      <button
        type="button"
        onClick={() => navigate({ to: "/settings/portal" })}
        className={`inline-flex items-center gap-[8px] whitespace-nowrap rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none transition-all ${
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
        className={`inline-flex items-center gap-[8px] whitespace-nowrap rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none transition-all ${
          activeTab === "projects"
            ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
            : "text-[#737373] hover:bg-white"
        }`}
      >
        <SettingsIcon name="briefcase" className="h-[15px] w-[15px]" />
        All projects
      </button>
    </div>
  );
}
