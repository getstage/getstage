import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import stageLogo from "@/assets/logos/stage-logo-light.png";

type BillingStatus = "success" | "cancel" | "done";

// Public page (no auth) that Stripe checkout returns to when the purchase was
// started from the desktop app. It deep-links back into Stage via the stage://
// protocol; credits/subscription state are already synced by the webhook and
// update reactively in the app, so nothing needs to be passed back here.
export const Route = createFileRoute("/billing/return")({
  validateSearch: (search: Record<string, unknown>): { status: BillingStatus } => ({
    status:
      search.status === "success" || search.status === "cancel" || search.status === "done"
        ? search.status
        : "done",
  }),
  component: BillingReturnPage,
});

const COPY: Record<BillingStatus, { title: string; body: string }> = {
  success: {
    title: "Payment complete",
    body: "Your trial is active. Return to Stage to keep designing — your plan updates automatically.",
  },
  cancel: {
    title: "Checkout cancelled",
    body: "No charge was made. Return to Stage whenever you're ready to try again.",
  },
  done: {
    title: "All set",
    body: "Return to Stage — your billing changes are already applied to your account.",
  },
};

function triggerStageDeepLink(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function BillingReturnPage() {
  const { status } = Route.useSearch();
  const copy = COPY[status];
  const deepLink = `stage://billing/${status}`;

  return (
    <>
      <Helmet>
        <title>Return to Stage</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-white px-6 text-center">
        <img src={stageLogo} alt="Stage" className="h-8 w-auto" />

        <div className="flex max-w-md flex-col gap-3">
          <h1 className="text-2xl font-semibold text-neutral-900">{copy.title}</h1>
          <p className="text-sm leading-relaxed text-neutral-500">{copy.body}</p>
        </div>

        <button
          type="button"
          onClick={() => triggerStageDeepLink(deepLink)}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          Return to Stage
        </button>

        <p className="text-xs text-neutral-400">You can close this tab after returning to Stage.</p>
      </main>
    </>
  );
}
