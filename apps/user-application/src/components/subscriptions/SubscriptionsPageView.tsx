import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAction as useConvexAction } from "convex/react";
import type { ReactNode } from "react";
import { api } from "@/lib/convexApi";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";

type Tier = "start" | "pro" | "team";
type BillingCycle = "monthly" | "yearly";

const PLAN_LABEL: Record<string, string> = {
  start: "Start",
  pro: "Pro",
  team: "Team",
  free: "Free",
};

const MIN_TEAM_SEATS = 3;
const TEAM_MONTHLY_PRICE = 49;
const TEAM_YEARLY_PRICE = 41;
const TEAM_EXTRA_MONTHLY_SEAT_PRICE = 15;
const TEAM_EXTRA_YEARLY_SEAT_PRICE = 12;

const PLAN_FEATURES: Record<Tier, Array<{ iconSrc: string; label: string }>> = {
  start: [
    { iconSrc: "/logos/pricing/folder.svg", label: "1 seat, 5,000 credits/mo (~20 projects)" },
    { iconSrc: "/logos/ai-workflow.svg", label: "Full design workflow" },
    { iconSrc: "/logos/pricing/connect.svg", label: "Bring your own Claude or Codex" },
    { iconSrc: "/logos/pricing/portal.svg", label: "Standard client portal" },
    { iconSrc: "/logos/support.svg", label: "Standard support" },
  ],
  pro: [
    { iconSrc: "/logos/pricing/folder.svg", label: "10,000 credits/mo (~40 projects)" },
    { iconSrc: "/logos/pricing/folder.svg", label: "Unlimited projects" },
    { iconSrc: "/logos/pricing/portal.svg", label: "Custom client portal (your brand, your domain)" },
    { iconSrc: "/logos/pricing/storage.svg", label: "Top up credits anytime" },
    { iconSrc: "/logos/support.svg", label: "Priority support" },
  ],
  team: [
    { iconSrc: "/logos/dashboard/clients.svg", label: "3 seats included" },
    { iconSrc: "/logos/dashboard/account.svg", label: "Unlimited extra seats ($15/mo each)" },
    { iconSrc: "/logos/pricing/folder.svg", label: "18,000 pooled credits/mo (~70 projects)" },
    { iconSrc: "/logos/pricing/connect.svg", label: "Shared workspace & integrations" },
    { iconSrc: "/logos/support.svg", label: "Priority support" },
  ],
};

export function SubscriptionsPageView() {
  const navigate = useNavigate();
  const overview = useSettingsOverviewQuery();
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const [billingPeriod, setBillingPeriod] = useState<BillingCycle>("monthly");
  const [teamSeats, setTeamSeats] = useState(MIN_TEAM_SEATS);
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const isYearly = billingPeriod === "yearly";
  const isSubscribed = overview.data?.profile.plan !== "free";
  const isTrialing = overview.data?.subscription?.status === "trialing";
  const planLabel = PLAN_LABEL[overview.data?.profile.plan ?? "free"] ?? "Stage";
  const teamPrice = useMemo(
    () =>
      (isYearly ? TEAM_YEARLY_PRICE : TEAM_MONTHLY_PRICE) +
      Math.max(0, teamSeats - MIN_TEAM_SEATS) *
        (isYearly ? TEAM_EXTRA_YEARLY_SEAT_PRICE : TEAM_EXTRA_MONTHLY_SEAT_PRICE),
    [isYearly, teamSeats],
  );
  const pricePeriod = isYearly ? "/month, billed yearly" : "/month";
  const backLabel = getBackLabel();

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/settings/billing" });
  }

  async function startTrial(tier: Tier, seats?: number) {
    setCheckoutError(null);
    setPendingTier(tier);
    try {
      const result = await createCheckoutSession({
        kind: "subscription",
        tier,
        billingCycle: billingPeriod,
        isTrial: true,
        ...(seats !== undefined ? { seats } : {}),
        platform: "desktop",
      });
      if (!result.url) {
        throw new Error("Checkout URL missing.");
      }
      await openExternalLink(result.url);
    } catch (error) {
      setCheckoutError(toUserFacingErrorMessage(error, "Checkout could not be started. Please try again."));
    } finally {
      setPendingTier(null);
    }
  }

  return (
    <div className="flex h-dvh w-full min-w-0 overflow-hidden bg-white">
      <div className="flex h-full w-full min-w-0 flex-col items-center overflow-auto px-[clamp(10px,3vw,56px)] pb-[clamp(18px,3vw,40px)] pt-[64px] min-[900px]:py-[clamp(14px,3vw,40px)]">
        <div className="flex w-full max-w-[1098px] flex-col gap-[clamp(18px,3vw,32px)] min-[900px]:min-h-full min-[900px]:justify-center">
          <div className="flex w-full flex-col gap-[32px]">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex w-fit items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#a3a3a3] transition-colors hover:text-[#737373]"
            >
              <ArrowLeftIcon />
              {backLabel}
            </button>

            <header className="flex w-full flex-col gap-[28px]">
              <div className="flex items-center gap-[2px]">
                <img src="/logos/stage.svg" alt="" aria-hidden="true" className="h-[23px] w-[19px] object-contain brightness-0" />
                <span className="text-[19px] font-semibold leading-none tracking-[-0.06em] text-black">Stage</span>
              </div>
              <div className="flex flex-col gap-[20px] min-[720px]:flex-row min-[720px]:items-end min-[720px]:justify-between">
                <div>
                  <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]">
                    Pick your Stage plan
                  </h1>
                  <p className="mt-[10px] text-[13px] font-medium leading-[1.5] text-[#525252]">
                    14-day free trial. Card required, cancel anytime.
                  </p>
                </div>
                <div className="flex w-fit rounded-[8px] bg-[#f5f5f5] p-[2px]">
                  <BillingPeriodButton active={!isYearly} onClick={() => setBillingPeriod("monthly")}>
                    Monthly
                  </BillingPeriodButton>
                  <BillingPeriodButton active={isYearly} onClick={() => setBillingPeriod("yearly")}>
                    Yearly · Save 17%
                  </BillingPeriodButton>
                </div>
              </div>
            </header>
          </div>

          {!overview.isLoading && isSubscribed ? (
            <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-[20px] rounded-[12px] bg-[#f5f5f5] px-[24px] py-[32px] text-center">
              <h2 className="text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]">
                {isTrialing ? "Your trial has started" : "You're already on Stage"}
              </h2>
              <p className="text-[13px] font-medium leading-[1.5] text-[#525252]">
                {isTrialing
                  ? `You're on Stage ${planLabel}. Head back to the app and start your first project.`
                  : `Your ${planLabel} plan is active. Manage billing in Settings.`}
              </p>
              <button
                type="button"
                onClick={() => void navigate({ to: "/projects" })}
                className="inline-flex items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] px-[16px] py-[10px] text-[13px] font-medium leading-none text-[#fafafa]"
              >
                Open Stage
              </button>
            </section>
          ) : (
          <>
          <section className="mx-auto w-full rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex flex-col gap-[4px] min-[900px]:flex-row">
              <PlanCard
                name="Start"
                price={isYearly ? 16 : 19}
                pricePeriod={pricePeriod}
                description="For builders shipping their first real products."
                features={PLAN_FEATURES.start}
                cta="Start 14-Day Trial"
                onCtaClick={() => startTrial("start")}
                ctaLoading={pendingTier === "start"}
                ctaDisabled={pendingTier !== null}
              />
              <PlanCard
                name="Pro"
                price={isYearly ? 24 : 29}
                pricePeriod={pricePeriod}
                description="For freelancers who need full control."
                features={PLAN_FEATURES.pro}
                cta="Start 14-Day Trial"
                popular
                primary
                onCtaClick={() => startTrial("pro")}
                ctaLoading={pendingTier === "pro"}
                ctaDisabled={pendingTier !== null}
              />
              <PlanCard
                name="Team"
                price={teamPrice}
                pricePeriod={pricePeriod}
                description="For small teams building together."
                features={PLAN_FEATURES.team}
                cta="Start 14-Day Trial"
                meta="Team Plan"
                onCtaClick={() => startTrial("team", teamSeats)}
                ctaLoading={pendingTier === "team"}
                ctaDisabled={pendingTier !== null}
                seatControl={
                  <SeatControl
                    seats={teamSeats}
                    onDecrease={() => setTeamSeats((seats) => Math.max(MIN_TEAM_SEATS, seats - 1))}
                    onIncrease={() => setTeamSeats((seats) => seats + 1)}
                  />
                }
              />
            </div>
          </section>

          {checkoutError ? (
            <p className="text-center text-[12px] font-medium leading-[1.5] text-[#B91C1C]">{checkoutError}</p>
          ) : null}

          <p className="text-center text-[13px] font-medium leading-[1.5] text-[#737373]">
            You connect your own AI provider (Claude, Codex). No usage limits from Stage.
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />;
}

function PlanCard({
  name,
  price,
  pricePeriod,
  description,
  features,
  note,
  cta,
  meta,
  popular = false,
  primary = false,
  seatControl,
  onCtaClick,
  ctaLoading = false,
  ctaDisabled = false,
  className,
}: {
  name: string;
  price: number;
  pricePeriod: string;
  description: string;
  features: Array<{ iconSrc: string; label: string }>;
  note?: string;
  cta: string;
  meta?: string;
  popular?: boolean;
  primary?: boolean;
  seatControl?: ReactNode;
  onCtaClick: () => void;
  ctaLoading?: boolean;
  ctaDisabled?: boolean;
  className?: string;
}) {
  return (
    <article
      className={`${primary
        ? "flex w-full flex-col gap-[24px] rounded-[8px] bg-[linear-gradient(180deg,rgba(158,153,248,0.09)_0%,rgba(158,153,248,0.045)_16%,#ffffff_44%)] p-[12px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] min-[900px]:min-h-[429px] min-[900px]:min-w-0 min-[900px]:flex-1"
        : "flex w-full flex-col gap-[24px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] min-[900px]:min-h-[429px] min-[900px]:min-w-0 min-[900px]:flex-1"
      } ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-[16px]">
        <p className={primary ? "bg-gradient-to-r from-[#463fba] via-[rgba(70,63,186,0.75)] to-[#463fba] bg-clip-text text-[13px] font-medium leading-[1.5] text-transparent" : "text-[13px] font-medium leading-[1.5] text-[#0a0a0a]"}>
          {name}
        </p>
        {popular ? (
          <p className="bg-gradient-to-r from-[#463fba] via-[rgba(70,63,186,0.75)] to-[#463fba] bg-clip-text text-[13px] font-medium leading-[1.5] text-transparent">
            Most Popular
          </p>
        ) : meta ? (
          <p className="text-[13px] font-medium leading-[1.5] text-[#525252]">{meta}</p>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-[12px]">
        <div className="min-w-0">
          <p className="text-[19px] font-semibold leading-none text-[#171717]">${price}</p>
          <p className="mt-[3px] text-[13px] font-medium leading-none text-[#525252]">{pricePeriod}</p>
          <p className="mt-[10px] text-[13px] font-normal leading-[1.35] text-[#525252]">{description}</p>
        </div>
        {seatControl}
      </div>

      <div className="flex flex-1 flex-col gap-[12px]">
        {features.map((feature) => (
          <FeatureRow key={feature.label} iconSrc={feature.iconSrc}>
            {feature.label}
          </FeatureRow>
        ))}
        {note ? <p className="mt-auto text-[13px] font-medium leading-[1.35] text-[#525252]">{note}</p> : null}
      </div>

      <button
        type="button"
        onClick={onCtaClick}
        disabled={ctaDisabled}
        className={
          primary
            ? "flex w-full items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] px-[12px] py-[10px] text-[13px] font-medium leading-none text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)] disabled:opacity-60"
            : "flex w-full items-center justify-center rounded-[6px] bg-[linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)] px-[10px] py-[10px] text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] disabled:opacity-60"
        }
      >
        {ctaLoading ? "Loading…" : cta}
      </button>
    </article>
  );
}

function BillingPeriodButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-[6px] bg-white px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#0a0a0a] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          : "rounded-[6px] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#737373]"
      }
    >
      {children}
    </button>
  );
}

function getBackLabel() {
  const storedLabel = sessionStorage.getItem("stage:subscriptions-back-label");
  if (storedLabel) return storedLabel;

  const previousPath = document.referrer ? new URL(document.referrer).pathname : "";
  const currentSearch = new URLSearchParams(window.location.search);
  const from = currentSearch.get("from") ?? previousPath;

  if (from.includes("client-portal")) return "Back to client portal";
  if (from.includes("onboarding")) return "Back to onboarding";
  if (from.includes("settings")) return "Back to billing";
  return "Back to billing";
}

function FeatureRow({ iconSrc, children }: { iconSrc: string; children: string }) {
  return (
    <div className="flex items-start gap-[8px] text-[13px] font-medium leading-[1.25] text-[#525252]">
      <span
        aria-hidden="true"
        className="mt-[-1px] h-[16px] w-[16px] shrink-0 bg-current text-[#525252]"
        style={{
          WebkitMask: `url("${iconSrc}") center / contain no-repeat`,
          mask: `url("${iconSrc}") center / contain no-repeat`,
        }}
      />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

function SeatControl({
  seats,
  onDecrease,
  onIncrease,
}: {
  seats: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-[8px] bg-[#f5f5f5] p-[2px]">
      <SeatButton label="Remove seat" disabled={seats <= MIN_TEAM_SEATS} onClick={onDecrease}>
        -
      </SeatButton>
      <div className="flex h-[26px] min-w-[32px] items-center justify-center rounded-[6px] px-[10px] text-[13px] font-medium leading-none text-[#0a0a0a]">
        {seats}
      </div>
      <SeatButton label="Add seat" onClick={onIncrease}>
        +
      </SeatButton>
    </div>
  );
}

function SeatButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] bg-white text-[16px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="translate-y-[-1px]">{children}</span>
    </button>
  );
}
