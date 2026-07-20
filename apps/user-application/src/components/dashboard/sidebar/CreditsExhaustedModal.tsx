import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAction as useConvexAction } from "convex/react";
import { api } from "@/lib/convexApi";
import { useCreditSummaryQuery, useSettingsOverviewQuery } from "@/hooks/convex-data";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { openExternalLink } from "@/lib/settings/openExternalLink";

type CreditsExhaustedModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTopUp: () => void;
  onSeePlans: () => void;
};

type Phase = "idle" | "activating" | "success" | "error";

const PLAN_DISPLAY: Record<string, { label: string; monthly: number; yearly: number }> = {
  start: { label: "Start", monthly: 19, yearly: 16 },
  pro: { label: "Pro", monthly: 29, yearly: 24 },
  team: { label: "Team", monthly: 49, yearly: 41 },
};

// Webhook (invoice.paid) can lag Stripe's acceptance by a few seconds. If credits
// haven't landed by this point, assume success and let the live query finish the
// refresh in the sidebar — better than trapping the user on a spinner.
const ACTIVATION_WATCHDOG_MS = 25_000;
const SUCCESS_AUTO_CLOSE_MS = 1600;

export function CreditsExhaustedModal({
  open,
  onOpenChange,
  onTopUp,
  onSeePlans,
}: CreditsExhaustedModalProps) {
  const overview = useSettingsOverviewQuery();
  const credits = useCreditSummaryQuery();
  const endTrialNow = useConvexAction(api.billing.endTrialNow);
  const createCustomerPortalSession = useConvexAction(api.billing.createCustomerPortalSession);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const subscription = overview.data?.subscription ?? null;
  const isTrialing = subscription?.status === "trialing";
  const isPaymentFailed =
    subscription?.status === "past_due" || subscription?.status === "unpaid";
  const plan = subscription?.plan ?? null;
  const planDisplay = plan ? PLAN_DISPLAY[plan] ?? null : null;
  const billingCycle = subscription?.billingCycle === "monthly" ? "monthly" : "yearly";
  const planPrice = planDisplay ? (billingCycle === "monthly" ? planDisplay.monthly : planDisplay.yearly) : null;
  const planLabel = planDisplay?.label ?? "your plan";

  // Reset to a fresh state every time the modal opens.
  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setError(null);
    }
  }, [open]);

  // Flip to success once the webhook lands the monthly grant and the live credit
  // query ticks above zero.
  useEffect(() => {
    if (phase === "activating" && (credits.data?.total ?? 0) > 0) {
      setPhase("success");
    }
  }, [phase, credits.data?.total]);

  // Watchdog: don't strand the user on "activating" if the webhook is slow.
  useEffect(() => {
    if (phase !== "activating") {
      return;
    }
    const timer = setTimeout(() => setPhase("success"), ACTIVATION_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // Auto-close shortly after success so the user lands back in the app.
  useEffect(() => {
    if (phase !== "success") {
      return;
    }
    const timer = setTimeout(() => onOpenChange(false), SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase, onOpenChange]);

  async function handleActivate() {
    setPhase("activating");
    setError(null);
    try {
      await endTrialNow({});
      // Credits arrive asynchronously via the invoice.paid webhook; the effects
      // above transition to success when the live balance updates (or on timeout).
    } catch (err) {
      setPhase("error");
      setError(
        toUserFacingErrorMessage(err, "We couldn't activate your plan. Please try again."),
      );
    }
  }

  async function handleUpdatePayment() {
    setPortalLoading(true);
    setError(null);
    try {
      const result = await createCustomerPortalSession({ platform: "desktop" });
      if (!result.url) {
        throw new Error("Portal URL missing.");
      }
      await openExternalLink(result.url);
      onOpenChange(false);
    } catch (err) {
      setPhase("error");
      setError(
        toUserFacingErrorMessage(err, "Could not open payment settings. Please try again."),
      );
    } finally {
      setPortalLoading(false);
    }
  }

  const { title, description } = copyForPhase(
    phase,
    isTrialing,
    isPaymentFailed,
    planLabel,
    planPrice,
    error,
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.1)] backdrop-blur-[5px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-32px)] w-[calc(100vw-32px)] max-w-[348px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] bg-[#F5F5F5] px-[4px] pt-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none">
          <div className="flex w-full flex-col items-center gap-[10px] px-[12px] py-[16px]">
            <img
              src="/logos/two-sparkles.svg"
              alt=""
              aria-hidden="true"
              className="h-[20px] w-[20px] shrink-0"
            />
            <div className="flex w-full flex-col items-center text-center leading-[1.5]">
              <Dialog.Title className="w-[220px] text-[15px] font-medium text-[#0A0A0A]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="w-full text-[13px] font-normal text-[#525252]">
                {description}
              </Dialog.Description>
            </div>
          </div>

          <div className="flex w-full items-center justify-end p-[6px]">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-[6px]">
              {renderButtons({
                phase,
                isTrialing,
                isPaymentFailed,
                planLabel,
                portalLoading,
                onActivate: handleActivate,
                onUpdatePayment: () => void handleUpdatePayment(),
                onTopUp,
                onSeePlans,
                onClose: () => onOpenChange(false),
              })}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function copyForPhase(
  phase: Phase,
  isTrialing: boolean,
  isPaymentFailed: boolean,
  planLabel: string,
  planPrice: number | null,
  error: string | null,
): { title: string; description: string } {
  if (phase === "activating") {
    return {
      title: "Activating your plan…",
      description: `We're starting your ${planLabel} subscription. Your credits will appear in a moment.`,
    };
  }
  if (phase === "success") {
    return {
      title: "You're all set!",
      description: `${planLabel} is active. Your credits are ready — happy generating.`,
    };
  }
  if (phase === "error") {
    return {
      title: isPaymentFailed ? "Couldn’t open payment settings." : "We couldn't activate your plan.",
      description: error ?? "Something went wrong. Please try again.",
    };
  }
  if (isPaymentFailed) {
    return {
      title: "Payment failed",
      description:
        "We couldn’t charge your card, so AI credits are paused. Update your payment method to restore access.",
    };
  }
  if (isTrialing) {
    return {
      title: "You've used all your trial credits.",
      description:
        planPrice != null
          ? `Activate ${planLabel} to keep generating. Your card on file will be charged $${planPrice}/mo.`
          : `Activate ${planLabel} to keep generating. Your card on file will be charged.`,
    };
  }
  return {
    title: "You're out of AI credits.",
    description: "Top up credits or pick a plan to keep generating.",
  };
}

function renderButtons(args: {
  phase: Phase;
  isTrialing: boolean;
  isPaymentFailed: boolean;
  planLabel: string;
  portalLoading: boolean;
  onActivate: () => void;
  onUpdatePayment: () => void;
  onTopUp: () => void;
  onSeePlans: () => void;
  onClose: () => void;
}) {
  const {
    phase,
    isTrialing,
    isPaymentFailed,
    planLabel,
    portalLoading,
    onActivate,
    onUpdatePayment,
    onTopUp,
    onSeePlans,
    onClose,
  } = args;

  if (phase === "activating") {
    return (
      <button
        type="button"
        disabled
        className="flex h-[34px] w-full cursor-not-allowed items-center justify-center gap-[8px] rounded-[6px] border-[0.5px] border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      >
        <span className="inline-block h-[14px] w-[14px] animate-spin rounded-full border-2 border-white border-t-transparent" />
        <span>Activating…</span>
      </button>
    );
  }

  if (phase === "success") {
    return (
      <button
        type="button"
        onClick={onClose}
        className="flex h-[34px] w-full cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      >
        Done
      </button>
    );
  }

  if (phase === "error") {
    return (
      <>
        <button
          type="button"
          onClick={onActivate}
          className="flex h-[34px] w-full cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[34px] w-full cursor-pointer items-center justify-center px-[10px] py-[8px] text-[13px] font-medium leading-none text-[#737373] transition-colors hover:text-[#525252]"
        >
          Maybe later
        </button>
      </>
    );
  }

  // idle
  if (isPaymentFailed) {
    return (
      <>
        <button
          type="button"
          onClick={onUpdatePayment}
          disabled={portalLoading}
          className="flex h-[34px] w-full cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:cursor-not-allowed disabled:opacity-60 [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
        >
          {portalLoading ? "Opening…" : "Update payment method"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[34px] w-full cursor-pointer items-center justify-center px-[10px] py-[8px] text-[13px] font-medium leading-none text-[#737373] transition-colors hover:text-[#525252]"
        >
          Maybe later
        </button>
      </>
    );
  }

  if (isTrialing) {
    return (
      <>
        <button
          type="button"
          onClick={onActivate}
          className="flex h-[34px] w-full cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
        >
          Activate {planLabel} now
        </button>
        <button
          type="button"
          onClick={onTopUp}
          className="flex h-[34px] w-full cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-white px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.05)] transition-colors hover:bg-[#FAFAFA]"
        >
          Top up credits
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[34px] w-full cursor-pointer items-center justify-center px-[10px] py-[8px] text-[13px] font-medium leading-none text-[#737373] transition-colors hover:text-[#525252]"
        >
          Maybe later
        </button>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onTopUp}
        className="flex h-[34px] w-full cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
      >
        Top up credits
      </button>
      <button
        type="button"
        onClick={onSeePlans}
        className="flex h-[34px] w-full cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-white px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.05)] transition-colors hover:bg-[#FAFAFA]"
      >
        See plans
      </button>
      <button
        type="button"
        onClick={onClose}
        className="flex h-[34px] w-full cursor-pointer items-center justify-center px-[10px] py-[8px] text-[13px] font-medium leading-none text-[#737373] transition-colors hover:text-[#525252]"
      >
        Maybe later
      </button>
    </>
  );
}
