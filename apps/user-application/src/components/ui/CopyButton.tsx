import { useState } from "react";

/** Copy-to-clipboard button that briefly confirms with a checkmark + "Copied". */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable; the value stays visible to copy manually.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={copied ? "Copied" : `${label} to clipboard`}
      className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[#D4D4D4] bg-white px-2.5 text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.2)] transition-colors hover:bg-[#F5F5F5]"
    >
      {copied ? (
        <svg viewBox="0 0 14 14" fill="none" className="h-[14px] w-[14px]" aria-hidden="true">
          <path d="M2.5 7.5 5.5 10.5 11.5 3.5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 14 14" fill="none" className="h-[14px] w-[14px]" aria-hidden="true">
          <rect x="4.5" y="4.5" width="7" height="7" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
          <path d="M2.5 9.5V3.25c0-.41.34-.75.75-.75H8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
