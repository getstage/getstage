import type { ReactNode } from "react";

export function PanelTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-3 pb-3 pt-2">
      <h2 className="text-[13px] font-semibold leading-[1.5] text-[#0A0A0A]">{title}</h2>
      <p className="mt-1 text-[12px] font-medium leading-[1.5] text-[#525252]">{description}</p>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[38px] items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  purple,
  size = "compact",
}: {
  children: ReactNode;
  onClick?: () => void;
  purple?: boolean;
  size?: "compact" | "action";
}) {
  const heightClass = size === "action" ? "h-[38px]" : "h-[32px]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex ${heightClass} items-center justify-center gap-2 rounded-[6px] bg-white pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA] ${
        purple ? "text-[#7C3AED]" : "text-[#525252]"
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "blue" | "rose" | "stone" | "purple";
  children: ReactNode;
}) {
  const classes = {
    blue: "bg-[#DBEAFE] text-[#172554]",
    rose: "bg-[#FFE4E6] text-[#4C0519]",
    stone: "bg-[#E7E5E4] text-[#57534E]",
    purple: "bg-[#F3E8FF] text-[#3B0764]",
  };

  return (
    <span className={`inline-flex h-[18px] items-center rounded-[2px] px-[6px] text-[12px] font-normal leading-[1.25] ${classes[tone]}`}>
      {children}
    </span>
  );
}
