import { DashboardCard, CardTab } from "@/components/dashboard/DashboardCard";
import { formatCurrencyDisplay } from "@/lib/format";
import type { DashboardPaymentSummary } from "@/components/dashboard/dashboardTypes";

type PaymentsCardProps = {
  paymentSummary: DashboardPaymentSummary;
};

export function PaymentsCard({ paymentSummary }: PaymentsCardProps) {
  const outstandingDisplay = formatCurrencyDisplay(paymentSummary?.outstandingTotal ?? 0);
  const receivedDisplay = formatCurrencyDisplay(paymentSummary?.receivedTotal ?? 0);

  return (
    <DashboardCard
      className="flex h-full flex-1 flex-col"
      title="Revenue Overview"
      subtitle="Track outstanding and received payments"
      action={<CardTab label="This Month" />}
    >
      <div className="flex flex-1 flex-col">
        <div className="flex gap-[16px]">
          <div className="flex flex-1 flex-col gap-[6px]">
            <p
              className="text-[18px] font-medium leading-[1.2] tracking-[-0.18px] text-[#0a0a0a]"
              title={outstandingDisplay.isCompact ? outstandingDisplay.full : undefined}
            >
              {outstandingDisplay.short}
            </p>
            <div className="flex items-center gap-[6px]">
              <div className="flex h-[13px] w-[13px] items-center justify-center">
                <div className="h-[13px] w-[13px] rounded-[2px] bg-[#0a0a0a]" />
              </div>
              <span className="text-[12px] font-medium leading-[1.5] text-[#737373]">
                Outstanding
              </span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-[6px]">
            <p
              className="text-[18px] font-medium leading-[1.2] tracking-[-0.18px] text-[#0a0a0a]"
              title={receivedDisplay.isCompact ? receivedDisplay.full : undefined}
            >
              {receivedDisplay.short}
            </p>
            <div className="flex items-center gap-[6px]">
              <img src="/logos/dashboard/check.svg" alt="" aria-hidden="true" className="h-[13px] w-[13px]" />
              <span className="text-[12px] font-medium leading-[1.5] text-[#16a34a]">
                Received
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-[24px] text-[12px] font-normal leading-[1.5] text-[#737373]">
        No payments yet.
      </p>
    </DashboardCard>
  );
}
