import { useState } from "react";
import { useDesktopSession } from "@/hooks/engine/useDesktopSession";
import { useDesktopUpdate } from "@/hooks/useDesktopUpdate";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { useStageWidgetVisibility } from "@/hooks/companion/useStageWidgetVisibility";
import { AccountPanel as SharedAccountPanel } from "@stage/project-ui/settings/AccountPanel";
import { SettingsCard, SettingsRow } from "@stage/project-ui/settings/SettingsPrimitives";
import { cn } from "@/lib/utils";

// Account settings in Stage for Mac: the shared panel plus the app-only settings (widget, updates, desktop session).
export function AccountPanel() {
  const desktop = useDesktopBridge();
  return <SharedAccountPanel desktopSettings={<DesktopAccountSettings />} onAccountDeleted={() => desktop.auth.logout()} />;
}

function DesktopAccountSettings() {
  const desktop = useDesktopBridge();
  const { status: updateStatus, isDesktop, checkForUpdates } = useDesktopUpdate();
  const session = useDesktopSession();
  const [authStatus, setAuthStatus] = useState<
    "idle" | "opening" | "opened" | "error"
  >("idle");
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const { enabled: allowStageWidgetEverywhere, setEnabled: setAllowStageWidgetEverywhere } =
    useStageWidgetVisibility();
  const desktopSession = session.data ?? null;

  function updateAllowStageWidgetEverywhere(nextValue: boolean) {
    setAllowStageWidgetEverywhere(nextValue);
  }

  async function openDesktopLogin() {
    setAuthStatus("opening");

    try {
      await desktop.auth.openLogin();
      setAuthStatus("opened");
    } catch {
      setAuthStatus("error");
    }
  }

  async function handleCheckForUpdates() {
    setIsCheckingUpdates(true);
    try {
      await checkForUpdates();
    } finally {
      setIsCheckingUpdates(false);
    }
  }

  const authStatusLabel =
    authStatus === "opening"
      ? "Opening browser"
      : session.isLoading
        ? "Checking session"
        : desktopSession?.hasAccessToken
          ? "Connected to Stage web"
          : authStatus === "opened"
            ? "Browser opened"
            : authStatus === "error"
              ? "Could not open browser"
              : "Not connected";

  return (
    <>
      <SettingsCard>
        <SettingsRow className="px-[20px] py-[18px]">
          <div className="flex items-center justify-between gap-[20px]">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold leading-none text-[#171717]">
                Allow Stage widget everywhere
              </h2>
              <p className="mt-[6px] text-[12px] font-normal leading-[1.5] text-[#525252]">
                Manage where you want to see your widget.
              </p>
            </div>
            <StageWidgetToggle
              checked={allowStageWidgetEverywhere}
              onCheckedChange={updateAllowStageWidgetEverywhere}
            />
          </div>
        </SettingsRow>
      </SettingsCard>

      {isDesktop ? (
        <SettingsCard title="Desktop app">
          <SettingsRow>
            <div className="flex items-center justify-between gap-[20px]">
              <div>
                <h2 className="text-[15px] font-semibold leading-none text-[#171717]">
                  Stage for macOS
                </h2>
                <p className="mt-[4px] max-w-[471px] text-[12px] font-normal leading-[1.5] text-[#171717]">
                  {updateStatus?.availableVersion
                    ? `Version ${updateStatus.availableVersion} is available. You are on ${updateStatus.currentVersion}.`
                    : `You are on version ${updateStatus?.currentVersion ?? "…"}.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCheckForUpdates()}
                disabled={isCheckingUpdates || updateStatus?.isChecking}
                className="rounded-[6px] border border-[#E5E5E5] bg-white px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#171717] transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCheckingUpdates || updateStatus?.isChecking ? "Checking…" : "Check for updates"}
              </button>
            </div>
          </SettingsRow>
        </SettingsCard>
      ) : null}

      <SettingsCard title="Desktop session">
        <SettingsRow>
          <div className="flex items-center justify-between gap-[20px]">
            <div>
              <h2 className="text-[15px] font-semibold leading-none text-[#171717]">Stage web session</h2>
              <p className="mt-[4px] max-w-[471px] text-[12px] font-normal leading-[1.5] text-[#171717]">
                {desktopSession?.name ?? desktopSession?.email ?? authStatusLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void openDesktopLogin()}
              disabled={authStatus === "opening" || session.isLoading}
              className="rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {desktopSession?.hasAccessToken ? "Refresh session" : "Log in with Stage"}
            </button>
          </div>
        </SettingsRow>
      </SettingsCard>
    </>
  );
}

function StageWidgetToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Allow Stage widget everywhere"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-[24px] w-[44px] shrink-0 rounded-full p-[2px] transition-colors duration-150 ease-out",
        checked ? "bg-[#8D87FF]" : "bg-[#D4D4D4]",
      )}
    >
      <span
        className={cn(
          "block h-[20px] w-[20px] rounded-full bg-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-transform duration-150 ease-out",
          checked ? "translate-x-[20px]" : "translate-x-0",
        )}
      />
    </button>
  );
}
