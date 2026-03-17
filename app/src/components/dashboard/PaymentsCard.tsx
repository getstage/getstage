import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { formatCurrencyDisplay } from "@/lib/format";
import type { DashboardPaymentSummary } from "@/components/dashboard/dashboardTypes";

type PaymentsCardProps = {
  paymentSummary: DashboardPaymentSummary;
};

export function PaymentsCard({ paymentSummary }: PaymentsCardProps) {
  const paymentRows = paymentSummary?.rows ?? [];
  const outstandingDisplay = formatCurrencyDisplay(paymentSummary?.outstandingTotal ?? 0);
  const receivedDisplay = formatCurrencyDisplay(paymentSummary?.receivedTotal ?? 0);

  return (
    <DashboardCard title="Payments">
      <div className="grid gap-5 md:grid-cols-[minmax(240px,0.95fr)_minmax(0,1fr)] md:items-start">
        <div className="grid min-w-0 grid-cols-2 gap-5 md:pr-3">
          <Metric label="Outstanding" tone="default" value={outstandingDisplay} />
          <Metric label="Received" tone="accent" value={receivedDisplay} />
        </div>

        {paymentRows.length > 0 ? (
          <div className="min-w-0 space-y-2 border-t border-border-subtle pt-3 md:border-t-0 md:border-l md:pl-5 md:pt-0">
            {paymentRows.map((row) => {
              const rowAmountDisplay = formatCurrencyDisplay(row.amount);
              const isPending = row.status === "pending";

              return (
                <div key={row.name} className="flex items-center gap-2 text-[13px]">
                  <div className="h-5 w-5 overflow-hidden rounded-full bg-input-bg">
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
                  <span className="truncate text-text-primary">{row.name}</span>
                  <span
                    className={`ml-auto whitespace-nowrap text-[13px] ${
                      isPending ? "text-text-secondary" : "font-medium text-accent"
                    }`}
                    title={rowAmountDisplay.isCompact ? rowAmountDisplay.full : undefined}
                    aria-label={rowAmountDisplay.isCompact ? rowAmountDisplay.full : undefined}
                  >
                    {isPending ? `Pending ${rowAmountDisplay.short}` : `✓ ${rowAmountDisplay.short}`}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-text-secondary">No payment rows.</p>
        )}
      </div>
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
      <p className="text-[12px] text-text-secondary">{label}</p>
      <p
        className={`mt-1 font-heading text-[18px] leading-none font-semibold whitespace-nowrap tabular-nums ${
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
