export function FigmaIcon() {
  return (
    <img src="/logos/integrations/figma.svg" alt="" aria-hidden="true" className="h-[15px] w-[10px] shrink-0" />
  );
}

export function FolderUploadIcon() {
  return <UploadFromDeviceIcon className="h-5 w-5" />;
}

export function FolderIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/dashboard/folder.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/folder.svg") center / contain no-repeat',
      }}
    />
  );
}

export function DirectionIcon({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-current`}
      style={{
        WebkitMask: 'url("/logos/direction.svg") center / contain no-repeat',
        mask: 'url("/logos/direction.svg") center / contain no-repeat',
      }}
    />
  );
}

export function UploadFromDeviceIcon({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-current`}
      style={{
        WebkitMask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
      }}
    />
  );
}

export function GenerateWithAiIcon({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-current`}
      style={{
        WebkitMask: 'url("/logos/ai-generated.svg") center / contain no-repeat',
        mask: 'url("/logos/ai-generated.svg") center / contain no-repeat',
      }}
    />
  );
}

export function PlusIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className={`${className} shrink-0`}
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4 text-[#171717]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m4 8.4 2.4 2.4L12 5.2" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[14px] w-[14px] shrink-0 text-[#EF4444]"
    >
      <path d="M3.5 5h9M6.5 5V3.8h3V5M5 5l.4 7.2c.1.6.5 1 1.1 1h3c.6 0 1-.4 1.1-1L11 5" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
    </svg>
  );
}

export function EditIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/dashboard/edit.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/edit.svg") center / contain no-repeat',
      }}
    />
  );
}

export function RegenerateIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/style-guide-regenerate.svg") center / contain no-repeat',
        mask: 'url("/logos/style-guide-regenerate.svg") center / contain no-repeat',
      }}
    />
  );
}

export function MonitorIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-[13px] w-[13px] shrink-0">
      <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h8a1.5 1.5 0 0 1 1.5 1.5v5.8a1.5 1.5 0 0 1-1.5 1.5H8.75v1.4h2.05a.65.65 0 1 1 0 1.3H5.2a.65.65 0 1 1 0-1.3h2.05v-1.4H4a1.5 1.5 0 0 1-1.5-1.5V3.5Z" />
    </svg>
  );
}
