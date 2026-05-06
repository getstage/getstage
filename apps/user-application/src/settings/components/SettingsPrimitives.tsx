import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]", className)}>
      {title ? (
        <div className="px-[12px] pb-[12px] pt-[8px]">
          <h2 className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">
            {title}
          </h2>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SettingsRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[8px] bg-white p-[20px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]", className)}>
      {children}
    </div>
  );
}

export function SaveButton({
  children = "Save",
  onClick,
}: {
  children?: ReactNode;
  onClick?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const handleSave = () => {
    if (status !== "idle") return;
    setStatus("saving");
    onClick?.();
    setTimeout(() => {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    }, 800);
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={status !== "idle"}
      className={cn(
        "inline-flex min-h-[30px] min-w-[64px] items-center justify-center rounded-[6px] bg-[#F5F5F5] px-[16px] py-[8px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EBEBEB]",
        status !== "idle" && "opacity-70 cursor-default",
      )}
    >
      {status === "idle" && children}
      {status === "saving" && "Saving..."}
      {status === "saved" && "Saved"}
    </button>
  );
}

export function MockToggle({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[20px] w-[36px] items-center rounded-full p-[2px] transition-colors",
        active ? "bg-[#8782F5]" : "bg-[#E5E5E5]",
      )}
    >
      <span
        className={cn(
          "h-[16px] w-[16px] rounded-full transition-transform",
          active ? "translate-x-[16px] bg-white" : "translate-x-0 bg-[#737373]",
        )}
      />
    </span>
  );
}

export function CopyButton({ text, icon }: { text: string; icon: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[4px] transition-colors hover:bg-black/5"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px] text-[#15803D]">
          <path d="M3.5 8L6.5 11L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        icon
      )}
    </button>
  );
}
