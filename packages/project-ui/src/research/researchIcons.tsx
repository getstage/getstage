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
    <span
      aria-hidden="true"
      className="h-4 w-4 bg-current"
      style={{
        WebkitMask: 'url("/logos/recognised-patterns.svg") center / contain no-repeat',
        mask: 'url("/logos/recognised-patterns.svg") center / contain no-repeat',
      }}
    />
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
    <svg viewBox="0 0 14 14" fill="none" className="h-[14px] w-[14px] rotate-180">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.65106 3.13024C7.93584 2.84548 8.39749 2.84548 8.68227 3.13024L12.0364 6.48439C12.1732 6.62113 12.25 6.80663 12.25 7C12.25 7.19338 12.1732 7.37882 12.0364 7.51561L8.68227 10.8698C8.39749 11.1545 7.93584 11.1545 7.65106 10.8698C7.36633 10.585 7.36633 10.1233 7.65106 9.83856L9.76045 7.72917H2.47917C2.07646 7.72917 1.75 7.40268 1.75 7C1.75 6.59727 2.07646 6.27083 2.47917 6.27083H9.76045L7.65106 4.16143C7.36633 3.87668 7.36633 3.41499 7.65106 3.13024Z"
      />
    </svg>
  );
}

export function ArrowRightMiniIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" className="h-[14px] w-[14px]">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.65106 3.13024C7.93584 2.84548 8.39749 2.84548 8.68227 3.13024L12.0364 6.48439C12.1732 6.62113 12.25 6.80663 12.25 7C12.25 7.19338 12.1732 7.37882 12.0364 7.51561L8.68227 10.8698C8.39749 11.1545 7.93584 11.1545 7.65106 10.8698C7.36633 10.585 7.36633 10.1233 7.65106 9.83856L9.76045 7.72917H2.47917C2.07646 7.72917 1.75 7.40268 1.75 7C1.75 6.59727 2.07646 6.27083 2.47917 6.27083H9.76045L7.65106 4.16143C7.36633 3.87668 7.36633 3.41499 7.65106 3.13024Z"
      />
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
