export function EditIcon() {
  return <img src="/logos/dashboard/edit.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px] shrink-0" />;
}

export function CardIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/dashboard/card-view.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/card-view.svg") center / contain no-repeat',
      }}
    />
  );
}

export function MatrixIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/dashboard/matrix-view.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/matrix-view.svg") center / contain no-repeat',
      }}
    />
  );
}

export function PatternIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
      <path d="M3.2 3.2h9.6v1.6H3.2V3.2Zm0 4h9.6v1.6H3.2V7.2Zm0 4h6.4v1.6H3.2v-1.6Z" />
    </svg>
  );
}

export function RegenerateIcon() {
  return <img src="/logos/dashboard/regenerate.svg" alt="" aria-hidden="true" className="h-3 w-3 shrink-0" />;
}

export function SaveIcon() {
  return (
    <img src="/logos/dashboard/save-changes.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-[15px] w-[15px]">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function NotionIcon() {
  return (
    <img src="/logos/integrations/notion.svg" alt="" aria-hidden="true" className="h-[13px] w-[13px] shrink-0" />
  );
}

export function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />
    </svg>
  );
}

export function ArrowLeftMiniIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[14px] w-[14px]">
      <path d="M8.75 3.5 5.25 7l3.5 3.5M5.5 7h6" />
    </svg>
  );
}

export function ArrowRightMiniIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[14px] w-[14px]">
      <path d="M5.25 3.5 8.75 7l-3.5 3.5M2.5 7h6" />
    </svg>
  );
}

export function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#525252" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m5 12 5-5 5 5" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#525252" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m5 8 5 5 5-5" />
    </svg>
  );
}
