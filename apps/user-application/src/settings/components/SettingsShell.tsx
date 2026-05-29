import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { SettingsTab } from "../models/settings";
import {
  getSettingsTabRoute,
  SETTINGS_TABS,
  SETTINGS_TAB_ICON_PATHS,
} from "../helpers/settingsTabs";

export function SettingsShell({
  activeTab,
  children,
}: {
  activeTab: SettingsTab;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  function selectTab(tab: SettingsTab) {
    void navigate({ to: getSettingsTabRoute(tab) });
  }

  return (
    <div className="flex-1 px-[32px] py-[44px]">
      <div className="mx-auto flex w-full max-w-[674px] flex-col gap-[44px]">
        <div>
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="mb-[24px] inline-flex cursor-pointer items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#A3A3A3] transition-colors hover:text-[#737373]"
          >
            <ArrowLeftIcon />
            Back to dashboard
          </button>
          <header className="mb-[24px]">
            <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
              Settings
            </h1>
            <p className="mt-[8px] text-[13px] font-medium leading-[1.2] text-[#737373]">
              Manage your account
            </p>
          </header>

          <SettingsTabBar activeTab={activeTab} onSelect={selectTab} />
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />;
}

function SettingsTabBar({
  activeTab,
  onSelect,
}: {
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-[8px] overflow-x-auto rounded-[8px] bg-[#F5F5F5] p-[2px]">
      {SETTINGS_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={`inline-flex items-center gap-[8px] whitespace-nowrap rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none transition-all ${
              isActive
                ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
                : "text-[#737373] hover:bg-white"
            }`}
          >
            <SettingsTabIcon name={tab.icon} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingsTabIcon({ name }: { name: string }) {
  const iconPath = SETTINGS_TAB_ICON_PATHS[name] ?? SETTINGS_TAB_ICON_PATHS.profile;

  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: `url("${iconPath}") center / contain no-repeat`,
        mask: `url("${iconPath}") center / contain no-repeat`,
      }}
    />
  );
}
