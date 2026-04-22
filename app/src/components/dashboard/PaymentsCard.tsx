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
      className="h-full flex-1"
      title="Revenue Overview"
      subtitle="Track outstanding and received payments"
      action={<CardTab label={new Date().getFullYear().toString()} />}
    >
      {total > 0 ? (
        <>
          <div className="mb-5 flex gap-8">
            <Metric label="Outstanding" tone="default" value={outstandingDisplay} />
            <Metric label="Received" tone="accent" value={receivedDisplay} />
          </div>

          <div className="mb-5 flex h-1.5 gap-[3px] overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[#9e99f8]"
              style={{ flex: receivedPct }}
            />
            <div
              className="h-full rounded-full bg-[#d6d3d1]"
              style={{ flex: outstandingPct }}
            />
          </div>

          {paymentRows.length > 0 ? (
            <div>
              {paymentRows.map((row, index) => {
                const rowAmountDisplay = formatCurrencyDisplay(row.amount);
                const isPending = row.status === "pending";

                return (
                  <div
                    key={row.name}
                    className={`flex items-center gap-2.5 py-[9px] ${
                      index > 0 ? "border-t border-[#f0f0f0]" : ""
                    }`}
                  >
                    <div className="flex h-[13px] w-[13px] shrink-0 items-center justify-center">
                      {isPending ? (
                        <div className="h-[13px] w-[13px] rounded-[2px] bg-[#0a0a0a]" />
                      ) : (
                        <img src="/logos/dashboard/check.svg" alt="" aria-hidden="true" className="h-[13px] w-[13px]" />
                      )}
                    </div>
                    <span className="flex-1 truncate text-[13px] text-[#0a0a0a]">
                      {row.name}
                    </span>
                    <span
                      className={`shrink-0 text-[13px] font-medium ${
                        isPending ? "text-[#737373]" : "text-[#16a34a]"
                      }`}
                      title={rowAmountDisplay.isCompact ? rowAmountDisplay.full : undefined}
                      aria-label={rowAmountDisplay.isCompact ? rowAmountDisplay.full : undefined}
                    >
                      {isPending
                        ? `Pending ${rowAmountDisplay.short}`
                        : `${rowAmountDisplay.short}`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-[#737373]">No payments yet.</p>
          )}
        </>
      ) : (
        <p className="text-[13px] text-[#737373]">No payments yet.</p>
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
      <p className="mb-1 text-[12px] text-[#737373]">{label}</p>
      <p
        className={`text-[22px] leading-none font-semibold tracking-[-0.5px] tabular-nums ${
          tone === "accent" ? "text-[#16a34a]" : "text-[#0a0a0a]"
        }`}
        title={value.isCompact ? value.full : undefined}
        aria-label={value.isCompact ? value.full : undefined}
      >
        {value.short}
      </p>
    </div>
  );
}
