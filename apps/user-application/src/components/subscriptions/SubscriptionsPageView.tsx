import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

const MIN_STUDIO_SEATS = 3;
const STUDIO_BASE_PRICE = 49;
const STUDIO_EXTRA_SEAT_PRICE = 15;

const PLAN_FEATURES = {
  start: [
    { iconSrc: "/logos/pricing/folder.svg", label: "3 active projects" },
    { iconSrc: "/logos/pricing/connect.svg", label: "Connect Claude, Figma, Notion & more" },
    { iconSrc: "/logos/pricing/portal.svg", label: "Client portal (Stage branding)" },
    { iconSrc: "/logos/pricing/storage.svg", label: "Unlimited file storage" },
    { iconSrc: "/logos/ai-workflow.svg", label: "Full AI workflow access" },
    { iconSrc: "/logos/support.svg", label: "Standard support" },
  ],
  pro: [
    { iconSrc: "/logos/pricing/folder.svg", label: "Unlimited projects" },
    { iconSrc: "/logos/pricing/connect.svg", label: "Connect Claude, Figma, Notion & more" },
    { iconSrc: "/logos/pricing/portal.svg", label: "Custom client portal (your brand, your domain)" },
    { iconSrc: "/logos/pricing/storage.svg", label: "Unlimited file storage" },
    { iconSrc: "/logos/ai-workflow.svg", label: "Full AI workflow access" },
    { iconSrc: "/logos/support.svg", label: "Priority support" },
  ],
  studio: [
    { iconSrc: "/logos/dashboard/clients.svg", label: "3 seats included" },
    { iconSrc: "/logos/dashboard/account.svg", label: "Unlimited additional seats ($15/seat)" },
    { iconSrc: "/logos/pricing/folder.svg", label: "Unlimited projects" },
    { iconSrc: "/logos/pricing/portal.svg", label: "Custom client portal (your brand, your domain)" },
    { iconSrc: "/logos/pricing/connect.svg", label: "Shared workspace & integrations" },
    { iconSrc: "/logos/permission.svg", label: "Role permissions (owner, designer, viewer)" },
    { iconSrc: "/logos/support.svg", label: "Priority support" },
  ],
};

export function SubscriptionsPageView() {
  const navigate = useNavigate();
  const [studioSeats, setStudioSeats] = useState(MIN_STUDIO_SEATS);
  const studioPrice = useMemo(
    () => STUDIO_BASE_PRICE + Math.max(0, studioSeats - MIN_STUDIO_SEATS) * STUDIO_EXTRA_SEAT_PRICE,
    [studioSeats],
  );
  const backLabel = getBackLabel();

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    void navigate({ to: "/settings/billing" });
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
            <div>
              <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]">
                Want to connect Claude, Figma & Notion?
              </h1>
              <p className="mt-[10px] text-[13px] font-medium leading-[1.5] text-[#525252]">
                Upgrade your workspace plan to unlock integrations.
              </p>
            </div>
            </header>
          </div>

          <section className="mx-auto w-full rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex flex-col gap-[4px] min-[900px]:flex-row">
              <PlanCard
                name="Start"
                price={9}
                description="For solo designers getting started."
                features={PLAN_FEATURES.start}
                note="Billed $99/year when paid annually"
                cta="Get Started"
              />
              <PlanCard
                name="Pro"
                price={19}
                description="For freelancers who need full control."
                features={PLAN_FEATURES.pro}
                cta="Start 7-Day Trial"
                popular
                primary
              />
              <PlanCard
                name="Studio"
                price={studioPrice}
                description="For design teams and studios."
                features={PLAN_FEATURES.studio}
                note="Billed $99/year when paid annually"
                cta="Start 7-Day Trial"
                meta="Team Plan"
                seatControl={
                  <SeatControl
                    seats={studioSeats}
                    onDecrease={() => setStudioSeats((seats) => Math.max(MIN_STUDIO_SEATS, seats - 1))}
                    onIncrease={() => setStudioSeats((seats) => seats + 1)}
                  />
                }
              />
            </div>
          </section>

          <p className="text-center text-[13px] font-medium leading-[1.5] text-[#737373]">
            You connect your own AI provider (Claude, Codex). No usage limits from Stage.
          </p>
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
  description,
  features,
  note,
  cta,
  meta,
  popular = false,
  primary = false,
  seatControl,
  className,
}: {
  name: string;
  price: number;
  description: string;
  features: Array<{ iconSrc: string; label: string }>;
  note?: string;
  cta: string;
  meta?: string;
  popular?: boolean;
  primary?: boolean;
  seatControl?: ReactNode;
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
          <p className="mt-[3px] text-[13px] font-medium leading-none text-[#525252]">/month</p>
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
        className={
          primary
            ? "flex w-full items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] px-[12px] py-[10px] text-[13px] font-medium leading-none text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
            : "flex w-full items-center justify-center rounded-[6px] bg-[linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)] px-[10px] py-[10px] text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
        }
      >
        {cta}
      </button>
    </article>
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
      <SeatButton label="Remove seat" disabled={seats <= MIN_STUDIO_SEATS} onClick={onDecrease}>
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
