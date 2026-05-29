import { useNavigate } from "@tanstack/react-router";
import { settingsSnapshot } from "../data/settingsSnapshot";
import { SettingsIcon } from "./SettingsIcons";
import { SaveButton, SettingsCard, SettingsRow } from "./SettingsPrimitives";

export function BillingPanel() {
  const navigate = useNavigate();
  const { billing } = settingsSnapshot;

  return (
    <div className="flex flex-col gap-[22px]">
      <SettingsCard title="Current plan">
        <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
          Your Stage subscription, checkout, and customer portal.
        </p>
        <SettingsRow>
          <div className="flex items-end justify-between gap-[20px]">
            <div className="flex flex-col gap-[24px]">
              <div>
                <p className="text-[13px] font-normal leading-[1.5] text-[#525252]">Your current plan</p>
                <p className="mt-[4px] text-[15px] font-medium leading-none text-[#171717]">{billing.planName}</p>
              </div>
              <div className="flex gap-[44px]">
                <div>
                  <p className="text-[13px] font-normal leading-[1.5] text-[#525252]">Billing Cycle</p>
                  <p className="mt-[4px] text-[13px] font-medium leading-none text-[#171717]">{billing.billingCycle}</p>
                </div>
                <div>
                  <p className="text-[13px] font-normal leading-[1.5] text-[#525252]">Renews on</p>
                  <p className="mt-[4px] text-[13px] font-medium leading-none text-[#171717]">{billing.renewsOn}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem("stage:subscriptions-back-label", "Back to billing");
                void navigate({ to: "/subscriptions" });
              }}
              className="rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
            >
              Upgrade to Team Plan
            </button>
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Payment method">
        <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
          Card details come from your active Stage subscription.
        </p>
        <SettingsRow>
          <div className="flex items-center justify-between gap-[20px]">
            <div className="flex items-center gap-[12px]">
              <SettingsIcon name="visa" className="h-[12px] w-auto shrink-0" />
              <span className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{billing.paymentMethod}</span>
            </div>
            <SaveButton>Update Payment Method</SaveButton>
          </div>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
