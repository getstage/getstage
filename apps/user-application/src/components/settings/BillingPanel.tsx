import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAction as useConvexAction } from "convex/react";
import { api } from "@/lib/convexApi";
import { useCreditSummaryQuery, usePurchaseHistoryQuery, useSettingsOverviewQuery, type PurchaseHistoryItem } from "@/hooks/convex-data";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { SettingsIcon } from "./SettingsIcons";
import { SaveButton, SettingsCard, SettingsRow } from "./SettingsPrimitives";
import {
  formatSubscriptionPeriodDate,
  subscriptionPeriodLabel,
} from "@/lib/billing/subscriptionPeriodLabel";
import { openExternalLink } from "@/lib/settings/openExternalLink";

type TopupSize = "small" | "medium" | "large";

type CreditPack = {
  size: TopupSize;
  credits: number;
  price: number;
  name: string;
  description: string;
  eyebrow?: string;
  featured?: boolean;
};

// Locked top-up pricing (source of truth: TEAM_CREDITS_PAYMENTS_PLAN.md).
const CREDIT_PACKS: readonly CreditPack[] = [
  {
    size: "small",
    credits: 3_000,
    price: 9,
    name: "Small",
    description: "A half month of extra usage",
  },
  {
    size: "medium",
    credits: 7_500,
    price: 19,
    name: "Medium",
    description: "Doubles your monthly credits",
    eyebrow: "Most Popular",
    featured: true,
  },
  {
    size: "large",
    credits: 18_000,
    price: 39,
    name: "Large",
    description: "~3 months of extra usage",
    eyebrow: "Best Value",
  },
];

const PLAN_DISPLAY_NAME: Record<string, string> = {
  free: "Free",
  start: "Stage Start",
  pro: "Stage Pro",
  team: "Stage Team",
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function BillingPanel() {
  const navigate = useNavigate();
  const overview = useSettingsOverviewQuery();
  const credits = useCreditSummaryQuery();
  const purchases = usePurchaseHistoryQuery();
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const createCustomerPortalSession = useConvexAction(api.billing.createCustomerPortalSession);
  const [pendingTopup, setPendingTopup] = useState<TopupSize | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const subscription = overview.data?.subscription ?? null;
  const plan = overview.data?.profile.plan ?? "free";
  const planName = PLAN_DISPLAY_NAME[plan] ?? capitalize(plan);
  const billingCycle = subscription ? capitalize(subscription.billingCycle) : "—";
  const periodLabel = subscriptionPeriodLabel(subscription, "billing");
  const periodDate = formatSubscriptionPeriodDate(subscription?.currentPeriodEnd ?? null, "billing");
  const isTrialing = subscription?.status === "trialing";
  const paymentLabel = subscription?.paymentMethodBrand
    ? `${capitalize(subscription.paymentMethodBrand)} ${subscription.paymentMethodLast4 ? `•••• ${subscription.paymentMethodLast4}` : ""}`
    : "Manage in customer portal";

  const remaining = credits.data?.total ?? 0;
  const usedByKind = credits.data?.usedByKind ?? { voice: 0, moodboard: 0, reference: 0, other: 0 };
  const usedTotal = usedByKind.voice + usedByKind.moodboard + usedByKind.reference + usedByKind.other;
  const granted = remaining + usedTotal;
  const usedPercent = granted > 0 ? Math.round((usedTotal / granted) * 100) : 0;

  function openSubscriptions() {
    sessionStorage.setItem("stage:subscriptions-back-label", "Back to billing & credits");
    void navigate({ to: "/subscriptions" });
  }

  async function buyTopup(size: TopupSize) {
    setActionError(null);
    setPendingTopup(size);
    try {
      const result = await createCheckoutSession({ kind: "topup", topupSize: size, platform: "desktop" });
      if (!result.url) {
        throw new Error("Checkout URL missing.");
      }
      await openExternalLink(result.url);
    } catch (error) {
      setActionError(toUserFacingErrorMessage(error, "Checkout could not be started. Please try again."));
      setPendingTopup(null);
    }
  }

  async function openPortal() {
    setActionError(null);
    setPortalLoading(true);
    try {
      const result = await createCustomerPortalSession({ platform: "desktop" });
      if (!result.url) {
        throw new Error("Portal URL missing.");
      }
      await openExternalLink(result.url);
    } catch (error) {
      setActionError(toUserFacingErrorMessage(error, "Checkout could not be started. Please try again."));
      setPortalLoading(false);
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
                  <div className="mt-[4px] flex flex-wrap items-center gap-[8px]">
                    <p className="text-[15px] font-medium leading-none text-[#171717]">{planName}</p>
                    {isTrialing ? (
                      <span className="rounded-[4px] bg-[#F5F3FF] px-[6px] py-[2px] text-[11px] font-medium leading-none text-[#5B54C9]">
                        Free trial
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-[44px]">
                  <PlanDetail label="Billing Cycle" value={billingCycle} />
                  <PlanDetail label={periodLabel} value={periodDate} />
                </div>
              </div>
              <button
                type="button"
                onClick={openSubscriptions}
                className="shrink-0 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-[filter,transform] hover:brightness-105 active:translate-y-px [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
              >
                {plan === "free" ? "Upgrade" : "Change Plan"}
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
                <span className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{paymentLabel}</span>
              </div>
              <SaveButton onClick={openPortal} disabled={portalLoading || plan === "free"}>
                {portalLoading ? "Loading…" : "Update Payment Method"}
              </SaveButton>
            </div>
          </SettingsRow>
        </SettingsCard>

        {actionError ? (
          <p className="text-[12px] font-medium leading-[1.5] text-[#B91C1C]">{actionError}</p>
        ) : null}
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
                <p className="text-[16px] font-semibold leading-[1.2] tracking-[-0.16px] text-[#0A0A0A]">{usedTotal.toLocaleString("en-US")}</p>
                <p className="text-[12px] font-medium leading-[1.5] text-[#737373]">of {granted.toLocaleString("en-US")} credits used</p>
              </div>
              <p className="text-[11px] font-medium leading-[1.5] text-[#737373]">{usedPercent}% used</p>
            </div>
            <div className="h-[7px] w-full overflow-hidden rounded-[4px] bg-[#E5E5E5]">
              <div className="h-full rounded-[4px] bg-[#3B368E]" style={{ width: `${usedPercent}%` }} />
            </div>
            <p className="text-[11px] font-medium leading-[1.5] text-[#737373]">
              {remaining.toLocaleString("en-US")} credits remaining · Credits don't roll over
            </p>
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title="Additional Top-up">
          <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
            Add extra AI credits — they stack on top of your monthly balance and never expire.
          </p>
          <div className="grid grid-cols-3 gap-[4px]">
            {CREDIT_PACKS.map((pack) => (
              <article
                key={pack.name}
                className={`flex min-w-0 flex-col gap-[12px] rounded-[8px] p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
                  pack.featured
                    ? "bg-[linear-gradient(180deg,rgba(158,153,248,0.05)_0%,#fff_100%)]"
                    : "bg-white"
                }`}
              >
                {pack.eyebrow ? (
                  <div className="flex min-h-[20px] items-center justify-between gap-[6px] text-[13px] font-medium leading-[1.5] text-[#463FBA]">
                    <span>{pack.eyebrow}</span>
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-[12px]">
                  <div className="leading-[1.5] text-[#0A0A0A]">
                    <p className="text-[14px] font-semibold">{pack.credits.toLocaleString("en-US")} Credits</p>
                    <p className="text-[13px] font-medium">{pack.name}</p>
                  </div>
                  <p className="text-[12px] font-normal leading-[1.5] text-[#525252]">{pack.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => buyTopup(pack.size)}
                  disabled={pendingTopup !== null}
                  className={`w-full whitespace-nowrap rounded-[6px] px-[10px] py-[6px] text-[12px] font-medium leading-none shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-[filter,transform] hover:brightness-[0.98] active:translate-y-px disabled:opacity-60 ${
                    pack.featured
                      ? "border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-[#FAFAFA] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
                      : "bg-[#F5F5F5] text-[#171717]"
                  }`}
                >
                  {pendingTopup === pack.size ? "Loading…" : `Add ${pack.name} Pack for $${pack.price}`}
                </button>
              </article>
            ))}
          </div>
        </SettingsCard>

        <PurchaseHistory purchases={purchases.data} isLoading={purchases.isLoading} />
      </section>
    </div>
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

function formatAmount(cents: number, currency: string) {
  const dollars = (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency.toUpperCase() === "USD" ? "$" : currency.toUpperCase()}${dollars}`;
}

function formatDate(timestampMs: number) {
  return new Date(timestampMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PurchaseHistory({
  purchases,
  isLoading,
}: {
  purchases: PurchaseHistoryItem[] | undefined;
  isLoading: boolean;
}) {
  const columns = "grid-cols-[repeat(5,minmax(0,1fr))]";
  const rows = purchases ?? [];

  return (
    <section className="overflow-hidden rounded-[10px] bg-[#F5F5F5] p-[4px]">
      <div className={`grid ${columns} gap-[24px] px-[16px] py-[12px]`}>
        {["Purchase", "Status", "Amount", "Date", "Credits"].map((heading) => (
          <p key={heading} className="text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">{heading}</p>
        ))}
      </div>
      <div className="rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] px-[16px] py-[16px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        {isLoading ? (
          <p className="text-[13px] text-[#737373]">Loading purchases…</p>
        ) : rows.length === 0 ? (
          <p className="text-[13px] text-[#737373]">No purchases yet.</p>
        ) : (
          rows.map((purchase, index) => (
            <div
              key={purchase.id}
              className={`grid ${columns} items-center gap-[24px] ${index > 0 ? "mt-[20px] border-t border-[#E5E5E5] pt-[20px]" : ""}`}
            >
              <p className="truncate text-[13px] font-medium leading-none text-[#171717]">{purchase.description}</p>
              <div>
                <span className="inline-flex rounded-[2px] bg-[#DCFCE7] px-[6px] py-[2px] text-[12px] font-normal leading-none text-[#052E16]">
                  Completed
                </span>
              </div>
              <p className="text-[13px] font-medium leading-none text-[#525252]">{formatAmount(purchase.amountCents, purchase.currency)}</p>
              <p className="text-[13px] font-medium leading-none text-[#525252]">{formatDate(purchase.createdAt)}</p>
              <p className="text-[13px] font-medium leading-none text-[#525252]">{purchase.credits.toLocaleString("en-US")}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
