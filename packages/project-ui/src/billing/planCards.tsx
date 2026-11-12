// Plan cards shared by the Subscriptions page and the onboarding paywall, so both
// show the same horizontal "Pick your Stage plan" view.
export type Tier = "start" | "pro" | "team";
export type BillingCycle = "monthly" | "yearly";

const PLAN_LABEL: Record<string, string> = {
  start: "Solo",
  pro: "Studio",
  team: "Agency",
  free: "Free",
};

export const PLAN_FEATURES: Record<Tier, Array<{ iconSrc: string; label: string }>> = {
  start: [
    { iconSrc: "/logos/pricing/folder.svg", label: "1 seat, 2,000 AI credits/mo" },
    { iconSrc: "/logos/ai-workflow.svg", label: "Full design workflow" },
    { iconSrc: "/logos/pricing/connect.svg", label: "Bring your own Claude or Codex" },
    { iconSrc: "/logos/pricing/portal.svg", label: "Standard client portal" },
    { iconSrc: "/logos/support.svg", label: "Standard support" },
  ],
  pro: [
    { iconSrc: "/logos/dashboard/clients.svg", label: "5 workspace seats" },
    { iconSrc: "/logos/pricing/folder.svg", label: "10,000 pooled AI credits/mo" },
    { iconSrc: "/logos/pricing/folder.svg", label: "Unlimited projects" },
    { iconSrc: "/logos/pricing/portal.svg", label: "Custom client portal (your brand, your domain)" },
    { iconSrc: "/logos/pricing/storage.svg", label: "Top up credits anytime" },
    { iconSrc: "/logos/support.svg", label: "Priority support" },
  ],
  team: [
    { iconSrc: "/logos/dashboard/clients.svg", label: "15 workspace seats" },
    { iconSrc: "/logos/pricing/folder.svg", label: "30,000 pooled AI credits/mo" },
    { iconSrc: "/logos/pricing/folder.svg", label: "Unlimited projects" },
    { iconSrc: "/logos/pricing/portal.svg", label: "Custom client portals with your brand" },
    { iconSrc: "/logos/pricing/connect.svg", label: "Shared workspace & integrations" },
    { iconSrc: "/logos/support.svg", label: "Priority support" },
  ],
};

export const PLANS: Array<{
  tier: Tier;
  name: string;
  prices: Record<BillingCycle, number>;
  description: string;
  popular?: boolean;
  meta?: string;
}> = [
  { tier: "start", name: "Solo", prices: { monthly: 29, yearly: 290 }, description: "For individual product builders." },
  {
    tier: "pro",
    name: "Studio",
    prices: { monthly: 99, yearly: 990 },
    description: "For design teams collaborating on the same projects.",
    popular: true,
  },
  {
    tier: "team",
    name: "Agency",
    prices: { monthly: 249, yearly: 2490 },
    description: "For agencies managing multiple client projects.",
    meta: "Agency Plan",
  },
];

export function BillingPeriodToggle({ value, onChange }: { value: BillingCycle; onChange: (value: BillingCycle) => void }) {
  return (
    <div className="flex w-fit rounded-[8px] bg-[#f5f5f5] p-[2px]">
      <BillingPeriodButton active={value === "monthly"} onClick={() => onChange("monthly")}>
        Monthly
      </BillingPeriodButton>
      <BillingPeriodButton active={value === "yearly"} onClick={() => onChange("yearly")}>
        Yearly · Save 17%
      </BillingPeriodButton>
    </div>
  );
}

export function planCta(tier: Tier, currentPlan: string | undefined, isSubscribed: boolean) {
  if (isSubscribed && currentPlan === tier) {
    return "Current plan";
  }
  if (isSubscribed) {
    return `Switch to ${PLAN_LABEL[tier]}`;
  }
  return "Start 14-Day Trial";
}

export function PlanCard({
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
