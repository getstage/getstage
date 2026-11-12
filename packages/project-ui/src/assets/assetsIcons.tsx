export function UploadFolderIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-6 w-6 shrink-0 bg-[#525252]"
      style={{
        WebkitMask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
      }}
    />
  );
}

export function ImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6 text-[#525252]">
      <rect x="6" y="7" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9.5" cy="10.5" r="1" fill="currentColor" />
      <path d="m7.5 15 3.25-3.25 2.25 2.25 1.5-1.5L17 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AssetMenuIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: `url("${src}") center / contain no-repeat`,
        mask: `url("${src}") center / contain no-repeat`,
      }}
    />
  );
}

export function ResearchReportIcon() {
  return (
    <img src="/logos/dashboard/research-report.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
  );
}

export function CalendarIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[13px] w-[13px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/dashboard/calendar-2.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/calendar-2.svg") center / contain no-repeat',
      }}
    />
  );
}

export function PdfIcon() {
  return (
    <img src="/logos/dashboard/pdf.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
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
