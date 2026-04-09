import { DashboardCard, CardTab } from "@/components/dashboard/DashboardCard";
import { formatCurrencyDisplay } from "@/lib/format";
import type { DashboardPaymentSummary } from "@/components/dashboard/dashboardTypes";

type PaymentsCardProps = {
  paymentSummary: DashboardPaymentSummary;
};

export function PaymentsCard({ paymentSummary }: PaymentsCardProps) {
  const paymentRows = paymentSummary?.rows ?? [];
  const outstandingDisplay = formatCurrencyDisplay(paymentSummary?.outstandingTotal ?? 0);
  const receivedDisplay = formatCurrencyDisplay(paymentSummary?.receivedTotal ?? 0);
  const outstandingRaw = paymentSummary?.outstandingTotal ?? 0;
  const receivedRaw = paymentSummary?.receivedTotal ?? 0;
  const total = outstandingRaw + receivedRaw;
  const receivedPct = total > 0 ? Math.round((receivedRaw / total) * 100) : 0;
  const outstandingPct = 100 - receivedPct;

  return (
    <DashboardCard
      className="h-full"
      title="Revenue"
      action={<CardTab label={new Date().getFullYear().toString()} />}
    >
      <div className="mb-5 flex gap-8">
        <Metric label="Outstanding" tone="default" value={outstandingDisplay} />
        <Metric label="Received" tone="accent" value={receivedDisplay} />
      </div>

      {total > 0 && (
        <div className="mb-5 flex h-1.5 gap-[3px] overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-accent"
            style={{ flex: receivedPct }}
          />
          <div
            className="h-full rounded-full bg-border"
            style={{ flex: outstandingPct }}
          />
        </div>
      )}

      {paymentRows.length > 0 ? (
        <div>
          {paymentRows.map((row, index) => {
            const rowAmountDisplay = formatCurrencyDisplay(row.amount);
            const isPending = row.status === "pending";

            return (
              <div
                key={row.name}
                className={`flex items-center gap-2.5 py-[9px] ${
                  index > 0 ? "border-t border-border-subtle" : ""
                }`}
              >
                <div className="h-[22px] w-[22px] shrink-0 overflow-hidden rounded-full bg-input-bg">
                  {row.avatarUrl ? (
                    <img
                      src={row.avatarUrl}
                      alt={row.name}
                      className="h-full w-full object-cover"
                    />
                  ) : row.name === "Stripe customer" ? (
                    <img
                      src="/favicon.svg"
                      alt="Stage"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <span className="flex-1 truncate text-[13px] text-text-primary">
                  {row.name}
                </span>
                <span
                  className={`shrink-0 text-[13px] font-medium ${
                    isPending ? "text-text-secondary" : "text-accent"
                  }`}
                  title={rowAmountDisplay.isCompact ? rowAmountDisplay.full : undefined}
                  aria-label={rowAmountDisplay.isCompact ? rowAmountDisplay.full : undefined}
                >
                  {isPending
                    ? `Pending ${rowAmountDisplay.short}`
                    : `✓ ${rowAmountDisplay.short}`}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[13px] text-text-secondary">No payments yet.</p>
      )}
    </DashboardCard>
  );
}

type CurrencyDisplay = ReturnType<typeof formatCurrencyDisplay>;

type MetricProps = {
  label: string;
  value: CurrencyDisplay;
  tone: "default" | "accent";
};

function Metric({ label, value, tone }: MetricProps) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[12px] text-text-secondary">{label}</p>
      <p
        className={`font-heading text-[22px] leading-none font-semibold tracking-[-0.5px] tabular-nums ${
          tone === "accent" ? "text-accent" : "text-text-primary"
        }`}
        title={value.isCompact ? value.full : undefined}
        aria-label={value.isCompact ? value.full : undefined}
      >
        {value.short}
      </p>
    </div>
  );
}
