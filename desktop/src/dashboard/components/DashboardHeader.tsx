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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-[8px]">
        <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">
          {greeting}
        </h1>
        <p className="text-[13px] font-medium text-[#737373]">
          {subheading}
        </p>
      </div>

      <div className="flex items-center gap-[12px]">
        <button
          type="button"
          className="rounded-[6px] bg-[#fafafa] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium text-[#737373] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-all duration-150 hover:text-[#0a0a0a]"
        >
          This Month
        </button>

        <button
          type="button"
          onClick={() => void navigate({ to: "/projects/create" })}
          className="inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] pl-[10px] pr-[12px] py-[6px] text-[13px] font-medium text-[#fafafa] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
          style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}
        >
          <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5 brightness-0 invert" />
          Create Project
        </button>
      </div>
    </div>
  );
}
