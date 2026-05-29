import { settingsSnapshot } from "../data/settingsSnapshot";
import { SettingsIcon } from "./SettingsIcons";
import { CopyButton, SettingsCard, SettingsRow } from "./SettingsPrimitives";

export function DeveloperPanel() {
  const { developer } = settingsSnapshot;

  return (
    <SettingsCard title="Your API Key">
      <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
        Manage your API key and Prompt Generated
      </p>
      <div className="flex flex-col gap-[4px]">
        <SettingsRow>
          <label className="mb-[8px] block text-[12px] font-medium leading-none text-[#262626]">API Key</label>
          <div className="flex min-h-[30px] items-center justify-between rounded-[6px] bg-[#F5F5F5] px-[12px] py-[6px] text-[12px] font-medium leading-none text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            {developer.apiKey}
            <CopyButton
              text={developer.apiKey}
              icon={<SettingsIcon name="copy" className="h-[18px] w-[18px] text-[#737373]" />}
            />
          </div>
        </SettingsRow>
        <SettingsRow>
          <label className="mb-[8px] block text-[12px] font-medium leading-none text-[#262626]">Generated Prompt</label>
          <div className="flex items-start justify-between gap-[16px] rounded-[6px] bg-[#F5F5F5] px-[12px] py-[10px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <pre className="min-h-[288px] whitespace-pre-wrap font-sans text-[12px] font-medium leading-[1.5] text-[#525252]">
              {developer.generatedPrompt}
            </pre>
            <div className="pt-1">
              <CopyButton
                text={developer.generatedPrompt}
                icon={<SettingsIcon name="copy" className="h-[18px] w-[18px] text-[#737373]" />}
              />
            </div>
          </div>
        </SettingsRow>
      </div>
    </SettingsCard>
  );
}
