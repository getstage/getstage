export function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path d="M3.5 8h8M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0">
      <path d="M12.5 8h-8M7.5 4.5 4 8l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WireframeAssetIcon({ src, className }: { src: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-current`}
      style={{
        WebkitMask: `url("${src}") center / contain no-repeat`,
        mask: `url("${src}") center / contain no-repeat`,
      }}
    />
  );
}

export function UploadFromDeviceIcon({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-[#525252]`}
      style={{
        WebkitMask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
      }}
    />
  );
}

export function BookOpenIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={`${className} shrink-0`}>
      <path d="M2.5 3.2c0-.55.45-1 1-1H6c.82 0 1.55.4 2 .98.45-.58 1.18-.98 2-.98h2.5c.55 0 1 .45 1 1v8.5c0 .55-.45 1-1 1H9.8c-.42 0-.82.17-1.12.46l-.33.32a.5.5 0 0 1-.7 0l-.33-.32a1.6 1.6 0 0 0-1.12-.46H3.5c-.55 0-1-.45-1-1V3.2Zm1.5.5v7.5h2.2c.45 0 .9.1 1.3.3V4.7A1.5 1.5 0 0 0 6 3.7H4Zm4.5 7.8c.4-.2.85-.3 1.3-.3H12V3.7h-2a1.5 1.5 0 0 0-1.5 1.5v6.3Z" />
    </svg>
  );
}

export function MonitorIcon({ className = "h-[13px] w-[13px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={`${className} shrink-0`}>
      <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h8a1.5 1.5 0 0 1 1.5 1.5v5.8a1.5 1.5 0 0 1-1.5 1.5H8.75v1.4h2.05a.65.65 0 1 1 0 1.3H5.2a.65.65 0 1 1 0-1.3h2.05v-1.4H4a1.5 1.5 0 0 1-1.5-1.5V3.5Z" />
    </svg>
  );
}

export function CloseSmallIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0">
      <path d="m4.25 4.25 5.5 5.5m0-5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-[14px] w-[14px]">
      <path d="M5.5 2.5h5l.5 1H14v1.4H2V3.5h3l.5-1ZM4 6h8l-.55 7A1.5 1.5 0 0 1 9.95 14.4h-3.9a1.5 1.5 0 0 1-1.5-1.4L4 6Z" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0">
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3 w-3">
      <path d="m4 8 2.4 2.4L12 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DoneCircleIcon() {
  return (
    <img src="/logos/dashboard/created-check.svg" alt="" aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
  );
}

export function SpinnerIcon() {
  return (
    <img src="/logos/dashboard/loading.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />
  );
}

export function PendingIcon() {
  return (
    <img src="/logos/dashboard/pending-check.svg" alt="" aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
  );
}

export function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6 text-[#525252]">
      <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <path d="m6.5 17 4.2-4 2.4 2.2 1.8-1.7 2.6 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 bg-[#737373]"
      style={{
        WebkitMask: 'url("/logos/dashboard/ai-generated.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/ai-generated.svg") center / contain no-repeat',
      }}
    />
  );
}

export function FigmaIcon() {
  return (
    <img src="/logos/integrations/figma.svg" alt="" aria-hidden="true" className="h-[15px] w-[10px] shrink-0" />
  );
}

export function LofiWireframeIcon({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-current`}
      style={{
        WebkitMask: 'url("/logos/dashboard/lofi-wireframe.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/lofi-wireframe.svg") center / contain no-repeat',
      }}
    />
  );
}

export function HifiWireframeIcon({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-current`}
      style={{
        WebkitMask: 'url("/logos/dashboard/hifi-wireframe.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/hifi-wireframe.svg") center / contain no-repeat',
      }}
    />
  );
}
