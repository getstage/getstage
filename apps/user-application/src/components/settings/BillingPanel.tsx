import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { settingsSnapshot } from "@/data/settings/settingsSnapshot";
import type { BillingSettings } from "@/models/settings/settings";
import { SettingsIcon } from "./SettingsIcons";
import { SaveButton, SettingsCard, SettingsRow } from "./SettingsPrimitives";

type CreditPack = {
  credits: string;
  name: string;
  description: string;
  action: string;
  icon: string;
  eyebrow?: string;
  badge?: string;
  featured?: boolean;
};

type CreditPurchaseState = "confirm" | "success" | "failed";

const CREDIT_PACKS: readonly CreditPack[] = [
  {
    credits: "3,000 Credits",
    name: "Small",
    description: "A half month of extra usage",
    action: "Add Small Pack for $9",
    icon: "/logos/credits.svg",
  },
  {
    eyebrow: "Most Popular",
    credits: "7,500 Credits",
    name: "Medium",
    description: "Doubles your monthly credits",
    action: "Add Medium Pack for $19",
    icon: "/logos/two-sparkles.svg",
    featured: true,
  },
  {
    eyebrow: "Best Value",
    badge: "Save ~30%",
    credits: "18,000 Credits",
    name: "Large",
    description: "~ 3 months of extra usage",
    action: "Add Large Pack for $39",
    icon: "/logos/sparkles-3.svg",
  },
];

export function BillingPanel() {
  const navigate = useNavigate();
  const { billing } = settingsSnapshot;
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [purchaseState, setPurchaseState] = useState<CreditPurchaseState>("confirm");
  const creditsUsedPercentage = (billing.creditsUsed / billing.creditsTotal) * 100;

  function openSubscriptions() {
    sessionStorage.setItem("stage:subscriptions-back-label", "Back to billing & credits");
    void navigate({ to: "/subscriptions" });
  }

  function openCreditDialog(pack: CreditPack) {
    setSelectedPack(pack);
    setPurchaseState("confirm");
  }

  function closeCreditDialog() {
    setSelectedPack(null);
    setPurchaseState("confirm");
  }

  function addCredits() {
    try {
      setPurchaseState("success");
    } catch {
      setPurchaseState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-[44px]">
      <section className="flex flex-col gap-[22px]">
        <SectionHeading
          title="Billing and Payment Method"
          description="Manage your subscription here"
        />

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
                  <PlanDetail label="Billing Cycle" value={billing.billingCycle} />
                  <PlanDetail label="Renews on" value={billing.renewsOn} />
                </div>
              </div>
              <button
                type="button"
                onClick={openSubscriptions}
                className="shrink-0 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-[filter,transform] hover:brightness-105 active:translate-y-px [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
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
                <SettingsIcon name="visa" className="h-[10px] w-auto shrink-0" />
                <span className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{billing.paymentMethod}</span>
              </div>
              <SaveButton onClick={openSubscriptions}>Update Payment Method</SaveButton>
            </div>
          </SettingsRow>
        </SettingsCard>
      </section>

      <div className="h-px w-full bg-[#E5E5E5]" />

      <section className="flex flex-col gap-[22px]">
        <SectionHeading
          title="AI Usage and Credits"
          description="Manage your AI usage and add extra credits"
        />

        <SettingsCard title="Usage">
          <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
            Check out your current AI Usage
          </p>
          <SettingsRow className="flex flex-col gap-[12px]">
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-[4px]">
                <p className="text-[16px] font-semibold leading-[1.2] tracking-[-0.16px] text-[#0A0A0A]">{billing.creditsUsed.toLocaleString("en-US")}</p>
                <p className="text-[12px] font-medium leading-[1.5] text-[#737373]">of {billing.creditsTotal.toLocaleString("en-US")} credits</p>
              </div>
              <p className="text-[11px] font-medium leading-[1.5] text-[#737373]">{Math.round(creditsUsedPercentage)}% used</p>
            </div>
            <div className="h-[7px] w-full overflow-hidden rounded-[4px] bg-[#E5E5E5]">
              <div className="h-full rounded-[4px] bg-[#3B368E]" style={{ width: `${creditsUsedPercentage}%` }} />
            </div>
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title="Additional Top-up">
          <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
            Add Extra AI-Credits
          </p>
          <div className="grid grid-cols-3 gap-[4px]">
            {CREDIT_PACKS.map((pack) => (
              <article
                key={pack.name}
                className={`flex min-h-[168px] min-w-0 flex-col justify-between rounded-[8px] p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
                  pack.featured
                    ? "bg-[linear-gradient(180deg,rgba(158,153,248,0.05)_0%,#fff_100%)]"
                    : "bg-white"
                }`}
              >
                <div className="flex flex-col gap-[8px]">
                  <div className="flex min-h-[20px] items-start justify-between gap-[8px]">
                    <CreditPackIcon src={pack.icon} accent={Boolean(pack.featured)} />
                    {pack.eyebrow ? (
                      <span className="bg-gradient-to-r from-[#463FBA] via-[rgba(70,63,186,0.75)] to-[#463FBA] bg-clip-text text-[13px] font-medium leading-[1.5] text-transparent">
                        {pack.eyebrow}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-[12px] leading-[1.5]">
                    <div className="text-[#0A0A0A]">
                      <p className="text-[14px] font-semibold">{pack.credits}</p>
                      <div className="flex items-center gap-[4px]">
                        <p className="text-[13px] font-medium">{pack.name}</p>
                        {pack.badge ? (
                          <p className="bg-gradient-to-r from-[#463FBA] via-[rgba(70,63,186,0.75)] to-[#463FBA] bg-clip-text text-[11px] font-medium text-transparent">
                            ({pack.badge})
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[12px] font-normal leading-[1.5] text-[#525252]">{pack.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openCreditDialog(pack)}
                  className={`w-full whitespace-nowrap rounded-[6px] px-[10px] py-[6px] text-[12px] font-medium leading-none shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-[filter,transform] hover:brightness-[0.98] active:translate-y-px ${
                    pack.featured
                      ? "border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-[#FAFAFA] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
                      : "bg-[#F5F5F5] text-[#171717]"
                  }`}
                >
                  {pack.action}
                </button>
              </article>
            ))}
          </div>
        </SettingsCard>

        <PurchaseHistory purchases={billing.purchases} />
      </section>

      {selectedPack ? (
        <CreditPurchaseDialog
          pack={selectedPack}
          state={purchaseState}
          onAddCredits={addCredits}
          onClose={closeCreditDialog}
          onSeeOtherPlans={openSubscriptions}
          onTryAgain={() => setPurchaseState("confirm")}
          onUpdateCardDetails={openSubscriptions}
        />
      ) : null}
    </div>
  );
}

function CreditPackIcon({ src, accent }: { src: string; accent: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`h-[20px] w-[20px] shrink-0 ${accent ? "bg-[#4B3DCB]" : "bg-[#0A0A0A]"}`}
      style={{
        WebkitMask: `url("${src}") center / contain no-repeat`,
        mask: `url("${src}") center / contain no-repeat`,
      }}
    />
  );
}

function CreditPurchaseDialog({
  pack,
  state,
  onAddCredits,
  onClose,
  onSeeOtherPlans,
  onTryAgain,
  onUpdateCardDetails,
}: {
  pack: CreditPack;
  state: CreditPurchaseState;
  onAddCredits: () => void;
  onClose: () => void;
  onSeeOtherPlans: () => void;
  onTryAgain: () => void;
  onUpdateCardDetails: () => void;
}) {
  const credits = pack.credits.replace(" Credits", "");
  const price = pack.action.match(/\$\d+/)?.[0] ?? "";
  const isConfirm = state === "confirm";
  const isSuccess = state === "success";
  const title = isConfirm
    ? "Adding Extra Credits"
    : isSuccess
      ? "Credits Added Successfully"
      : "Transaction Unsuccessful";
  const description = isConfirm
    ? "Confirm the details and add your extra AI credits instantly!"
    : isSuccess
      ? "Your Credits will be reflected on your account in just few seconds"
      : "Please check your card details again or make sure you have a stable internet connection";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/10 p-[24px] backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-purchase-title"
      onClick={onClose}
    >
      <section
        className="w-full max-w-[348px] rounded-[12px] bg-[#F5F5F5] px-[4px] pt-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex w-full flex-col items-center gap-[10px] px-[12px] py-[16px] text-center">
          {isConfirm ? (
            <CreditPackIcon src="/logos/two-sparkles.svg" accent={false} />
          ) : (
            <img
              src={isSuccess ? "/logos/successful.svg" : "/logos/failed.svg"}
              alt=""
              aria-hidden="true"
              className="h-[32px] w-[32px]"
            />
          )}
          <div className="flex w-full flex-col items-center leading-[1.5]">
            <h2 id="credit-purchase-title" className="w-[min(277px,100%)] text-[15px] font-medium text-[#0A0A0A]">
              {title}
            </h2>
            <p className="w-[min(277px,100%)] text-[13px] font-normal text-[#525252]">
              {description}
            </p>
          </div>
        </div>

        <div className="rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white px-[12px] pb-[20px] pt-[16px] shadow-[0_0.45px_1px_rgba(10,10,10,0.05)]">
          <div className="flex flex-col gap-[12px]">
            <div className="flex flex-col gap-[4px]">
              <CreditPurchaseRow label="Model" value={pack.name} />
              {isConfirm ? (
                <>
                  <CreditPurchaseRow label="Credits" value={credits} />
                  <CreditPurchaseRow label="Price" value={price} />
                </>
              ) : (
                <>
                  <CreditPurchaseRow label="Credits Added" value={credits} />
                  <CreditPurchaseStatusRow success={isSuccess} />
                  <CreditPurchaseRow label="Invoice No." value={isSuccess ? "#123214" : "-"} />
                </>
              )}
            </div>
            {isConfirm ? (
              <>
                <div className="h-px w-full bg-[#E5E5E5]" />
                <CreditPurchaseRow label="Card Details" value="xxxx xxxx xxxx 1234" muted />
                <CreditPurchaseRow label="Invoice will be sent on" value="hi@maybepratik.com" muted />
              </>
            ) : isSuccess ? (
              <>
                <div className="h-px w-full bg-[#E5E5E5]" />
                <p className="text-center text-[12px] font-medium leading-[1.5] text-[#404040]">
                  Invoice Reciept has been sent on your email ID
                </p>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-[6px] p-[6px]">
          {isConfirm ? (
            <>
              <CreditPrimaryButton onClick={onAddCredits}>Add Credits</CreditPrimaryButton>
              <CreditSecondaryButton onClick={onSeeOtherPlans}>See Other Plans</CreditSecondaryButton>
            </>
          ) : isSuccess ? (
            <>
              <CreditPrimaryButton onClick={onClose}>Download Invoice</CreditPrimaryButton>
              <CreditSecondaryButton onClick={onClose}>Close</CreditSecondaryButton>
            </>
          ) : (
            <>
              <CreditPrimaryButton onClick={onTryAgain}>Try Again</CreditPrimaryButton>
              <CreditSecondaryButton onClick={onUpdateCardDetails}>Update Card Details</CreditSecondaryButton>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-[6px] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#525252]"
              >
                Close
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function CreditPurchaseRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[12px]">
      <p className="whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#404040]">{label}</p>
      <p className={`truncate text-right text-[11px] font-medium leading-[1.5] ${muted ? "text-[#737373]" : "text-[#262626]"}`}>
        {value}
      </p>
    </div>
  );
}

function CreditPurchaseStatusRow({ success }: { success: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[12px]">
      <p className="whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#404040]">Status</p>
      <span
        className={`rounded-[2px] px-[6px] py-[2px] text-[12px] font-normal leading-none ${
          success ? "bg-[#D1FAE5] text-[#022C22]" : "bg-[#FEE2E2] text-[#450A0A]"
        }`}
      >
        {success ? "Successful" : "Failed"}
      </span>
    </div>
  );
}

function CreditPrimaryButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
    >
      {children}
    </button>
  );
}

function CreditSecondaryButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-white px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.05)]"
    >
      {children}
    </button>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-[4px]">
      <h2 className="text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">{title}</h2>
      <p className="text-[12px] font-medium leading-[1.5] text-[#737373]">{description}</p>
    </div>
  );
}

function PlanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] font-normal leading-[1.5] text-[#525252]">{label}</p>
      <p className="mt-[4px] text-[13px] font-medium leading-none text-[#171717]">{value}</p>
    </div>
  );
}

function PurchaseHistory({ purchases }: { purchases: BillingSettings["purchases"] }) {
  const columns = "grid-cols-[repeat(5,minmax(0,1fr))]";

  return (
    <section className="overflow-hidden rounded-[10px] bg-[#F5F5F5] p-[4px]">
      <div className={`grid ${columns} gap-[24px] px-[16px] py-[12px]`}>
        {['Purchase', 'Status', 'Amount', 'Date', 'Actions'].map((heading) => (
          <p key={heading} className="text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">{heading}</p>
        ))}
      </div>
      <div className="rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] px-[16px] py-[16px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        {purchases.length === 0 ? (
          <p className="text-[13px] text-[#737373]">No purchases yet.</p>
        ) : purchases.map((purchase, index) => (
          <div
            key={purchase.id}
            className={`grid ${columns} items-center gap-[24px] ${index > 0 ? "mt-[20px] border-t border-[#E5E5E5] pt-[20px]" : ""}`}
          >
            <p className="truncate text-[13px] font-medium leading-none text-[#171717]">Credit Top-up</p>
            <div>
              <span className="inline-flex rounded-[2px] bg-[#DCFCE7] px-[6px] py-[2px] text-[12px] font-normal leading-none text-[#052E16]">
                Completed
              </span>
            </div>
            <p className="text-[13px] font-medium leading-none text-[#525252]">{purchase.amount}</p>
            <p className="text-[13px] font-medium leading-none text-[#525252]">{purchase.date}</p>
            <button type="button" className="inline-flex items-center gap-[8px] text-[13px] font-medium leading-none text-[#171717] hover:text-[#463FBA]">
              Invoice
              <DownloadIcon />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" className="h-[14px] w-[14px]" aria-hidden="true">
      <path d="M7 1.75v7m0 0L4.4 6.15M7 8.75l2.6-2.6M2.25 9.5v1.25c0 .83.67 1.5 1.5 1.5h6.5c.83 0 1.5-.67 1.5-1.5V9.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
