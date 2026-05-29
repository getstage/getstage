import { ArrowRight } from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";

export function AlmostSetupPreview({
  onContinue,
  errorMessage,
}: {
  onContinue: () => void;
  errorMessage: string | null;
}) {
  return (
    <div className="h-full w-full">
      <div className="grid h-full w-full overflow-hidden bg-white md:grid-cols-[570fr_846fr]">
        <div className="flex min-h-0 items-center overflow-hidden px-[clamp(24px,5.03vw,72px)]">
          <div className="flex w-full flex-col items-start gap-4 sm:gap-8">
            <img src={stageLogo} alt="Stage" className="h-[23px] w-auto" />
            <div>
              <h3 className="text-[21px] leading-[1.2] font-semibold text-[#0A0A0A]">
                You&apos;re almost setup.
              </h3>
              <p className="mt-2.5 text-[13px] leading-[1.5] font-medium text-[#525252]">
                Here&apos;s your workspace, set up and ready to go
              </p>
            </div>
            <button
              type="button"
              onClick={onContinue}
              className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] pl-2.5 pr-3 text-[13px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25),0_0.5px_1.5px_rgba(0,0,0,0.15)] transition-opacity hover:opacity-95 focus:outline-none"
            >
              <span>Continue</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </div>
        <div className="hidden min-h-0 bg-white py-2 pr-2 md:block">
          <img
            src="/onboarding/onboarding-setup.webp"
            alt=""
            className="h-full w-full object-contain object-right"
          />
        </div>
      </div>
      {errorMessage ? (
        <p className="mt-4 text-[13px] leading-normal text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}

export function ProSuccessCard() {
  return (
    <div className="mx-auto w-full max-w-[520px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-gradient-to-b from-[rgba(158,153,248,0.12)] to-white px-6 py-[72px] text-center shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <img src={stageLogo} alt="Stage" className="mx-auto h-[22px] w-auto" />
        <h3 className="mt-8 font-heading text-[18px] font-semibold leading-[1.2] text-text-primary">
          You&apos;re on Pro now 🚀
        </h3>
        <p className="mx-auto mt-2 max-w-[422px] text-[12px] font-medium leading-[1.5] text-text-secondary">
          Unlock advanced workflows, deeper integrations, and faster execution. Connect Claude,
          Figma, and your tools to start building your workspace.
        </p>
      </div>
    </div>
  );
}
