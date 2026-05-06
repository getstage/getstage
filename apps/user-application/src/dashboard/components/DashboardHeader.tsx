import { useNavigate } from "@tanstack/react-router";

export function DashboardHeader({
  greeting,
  subheading,
}: {
  greeting: string;
  subheading: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="grid gap-[14px] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="flex min-w-0 flex-col gap-[8px]">
        <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">
          {greeting}
        </h1>
        <p className="max-w-[360px] text-[13px] font-medium text-[#737373]">
          {subheading}
        </p>
      </div>

      <div className="flex w-full min-w-0 items-center gap-[10px] lg:w-auto">
        <button
          type="button"
          className="shrink-0 rounded-[6px] bg-[#fafafa] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium text-[#737373] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-all duration-150 hover:text-[#0a0a0a]"
        >
          This Month
        </button>

        <button
          type="button"
          onClick={() => void navigate({ to: "/projects/create" })}
          className="inline-flex h-[34px] min-w-0 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium text-[#fafafa] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90 max-[460px]:flex-1"
          style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}
        >
          <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5 brightness-0 invert" />
          Create Project
        </button>
      </div>
    </div>
  );
}
