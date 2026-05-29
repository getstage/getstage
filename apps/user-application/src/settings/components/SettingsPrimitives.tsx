import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { surfaceStyles, textStyles } from "@/styles/recipes";

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
    <section className={cn(surfaceStyles.frame, className)}>
      {title ? (
        <div className="px-[12px] pb-[12px] pt-[8px]">
          <h2 className={cn(textStyles.body, "text-ink")}>
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
    <div className={cn(surfaceStyles.card, "p-5", className)}>
      {children}
    </div>
  );
}

export function SaveButton({
  children = "Save",
  disabled = false,
  onClick,
}: {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function handleSave() {
    if (disabled || status !== "idle") return;
    setStatus("saving");
    await onClick?.();
    window.setTimeout(() => {
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 2000);
    }, 800);
  }

  return (
    <button
      type="button"
      onClick={() => void handleSave()}
      disabled={disabled || status !== "idle"}
      className={cn(
        "inline-flex min-h-[30px] min-w-[64px] items-center justify-center rounded-control bg-input-bg px-4 py-2 text-[12px] font-medium leading-none text-ink-soft shadow-stage-hairline transition-colors hover:bg-input-bg-hover",
        (disabled || status !== "idle") && "cursor-default opacity-70",
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
        active ? "bg-accent" : "bg-line",
      )}
    >
      <span
        className={cn(
          "h-[16px] w-[16px] rounded-full transition-transform",
          active ? "translate-x-[16px] bg-white" : "translate-x-0 bg-ink-subtle",
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
