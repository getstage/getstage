import { type ReactNode } from "react";
import { usePlatform } from "../platform";
import type { SettingsTab } from "./model";
import { SETTINGS_TABS, SETTINGS_TAB_ICON_PATHS } from "./tabs";
import { BackButton } from "../ui/BackButton";

// Each app routes the tabs itself; `hiddenTabs` leaves out tabs an app can't offer (the web has no Shortcuts).
export function SettingsShell({
  activeTab,
  onSelectTab,
  hiddenTabs = [],
  children,
}: {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  hiddenTabs?: SettingsTab[];
  children: ReactNode;
}) {
  const platform = usePlatform();

  return (
    <div className="flex-1 px-[32px] py-[44px]">
      <div className="mx-auto flex w-full max-w-[674px] flex-col gap-[44px]">
        <div>
          <BackButton label="Back to dashboard" onClick={() => platform.navigate("dashboard")} />
          <header className="mb-[24px] mt-[24px]">
            <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
              Settings
            </h1>
            <p className="mt-[8px] text-[13px] font-medium leading-[1.2] text-[#737373]">
              Manage your account
            </p>
          </header>

          <SettingsTabBar activeTab={activeTab} hiddenTabs={hiddenTabs} onSelect={onSelectTab} />
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

function SettingsTabBar({
  activeTab,
  hiddenTabs,
  onSelect,
}: {
  activeTab: SettingsTab;
  hiddenTabs: SettingsTab[];
  onSelect: (tab: SettingsTab) => void;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-[8px] overflow-x-auto rounded-[8px] bg-[#F5F5F5] p-[2px]">
      {SETTINGS_TABS.filter((tab) => !hiddenTabs.includes(tab.key)).map((tab) => {
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
