import { Link } from "@tanstack/react-router";
import { SettingsCard } from "./SettingsPrimitives";

export function DeveloperPanel() {
  return (
    <SettingsCard title="Developer API">
      <div className="px-[12px] pb-[12px]">
        <p className="text-[13px] leading-[1.5] text-[#525252]">
          Developer API keys are not used for Claude, Codex, Research, or Voice in the desktop app yet.
          Connect providers in{" "}
          <Link to="/integrations" className="font-medium text-[#221E6C] underline-offset-2 hover:underline">
            Integrations
          </Link>{" "}
          instead.
        </p>
        <p className="mt-[10px] text-[12px] leading-[1.45] text-[#737373]">
          This page will return when the public Stage API ships. For launch week, ignore any placeholder keys
          you may have seen here before.
        </p>
      </div>
    </SettingsCard>
  );
}
