import { useState } from "react";
import { copyTextToClipboard } from "@/lib/copyToClipboard";

function CopyCheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.5 7.5 5.5 10.5 11.5 3.5"
        stroke="#16A34A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M2.5 9.5V3.25c0-.41.34-.75.75-.75H8.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Copy-to-clipboard button that briefly confirms with a checkmark + "Copied". */
export function CopyButton({
  value,
  label = "Copy",
  copied,
  onCopy,
}: {
  value: string;
  label?: string;
  copied?: boolean;
  onCopy?: () => void | Promise<void>;
}) {
  const [localCopied, setLocalCopied] = useState(false);
  const isCopied = copied ?? localCopied;

  async function copy() {
    if (onCopy) {
      await onCopy();
      return;
    }

    const didCopy = await copyTextToClipboard(value);
    if (!didCopy) return;

    setLocalCopied(true);
    window.setTimeout(() => setLocalCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={isCopied ? "Copied" : `${label} to clipboard`}
      className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[#D4D4D4] bg-white px-2.5 text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.2)] transition-colors hover:bg-[#F5F5F5]"
    >
      {isCopied ? <CopyCheckIcon className="h-[14px] w-[14px]" /> : <CopyIcon className="h-[14px] w-[14px]" />}
      {isCopied ? "Copied" : label}
    </button>
  );
}

/** Pairing code display — click the code or Copy button to copy with check feedback. */
export function PairingCodeCopy({
  value,
  codeClassName = "font-mono text-[20px] font-semibold tracking-[0.18em] text-[#171717]",
}: {
  value: string;
  codeClassName?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const didCopy = await copyTextToClipboard(value);
    if (!didCopy) return;

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? "Pairing code copied" : "Copy pairing code"}
        className={`inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-[6px] px-1 py-0.5 text-left transition-colors hover:bg-[#F5F5F5] ${codeClassName}`}
      >
        {copied ? <CopyCheckIcon className="h-[18px] w-[18px] shrink-0" /> : null}
        <span>{value}</span>
      </button>
      <CopyButton value={value} copied={copied} onCopy={copy} />
    </div>
  );
}
