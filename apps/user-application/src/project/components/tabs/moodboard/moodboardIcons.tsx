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

export function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 text-[#171717]"
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
