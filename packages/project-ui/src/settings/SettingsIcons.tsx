import type { ReactNode } from "react";

type IconProps = {
  name: string;
  className?: string;
};

export function SettingsIcon({ name, className = "h-[18px] w-[18px]" }: IconProps) {
  const common = {
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  const icons: Record<string, ReactNode> = {
    profile: (
      <img src="/logos/dashboard/profile.svg" alt="" aria-hidden="true" className={className} />
    ),
    billing: (
      <img src="/logos/dashboard/billing.svg" alt="" aria-hidden="true" className={className} />
    ),
    clients: (
      <img src="/logos/dashboard/clients.svg" alt="" aria-hidden="true" className={className} />
    ),
    developer: (
      <img src="/logos/dashboard/developer.svg" alt="" aria-hidden="true" className={className} />
    ),
    account: (
      <img src="/logos/dashboard/account.svg" alt="" aria-hidden="true" className={className} />
    ),
    paint: (
      <svg {...common}>
        <path d="M5 4h10v4H5z" />
        <path d="M8 8v8" />
        <path d="M12 8v4" />
      </svg>
    ),
    briefcase: (
      <svg {...common}>
        <rect x="3" y="7" width="14" height="9" rx="2" />
        <path d="M7.5 7V5.5A1.5 1.5 0 019 4h2a1.5 1.5 0 011.5 1.5V7" />
      </svg>
    ),
    users: (
      <svg {...common}>
        <circle cx="7.5" cy="7.5" r="2.3" />
        <circle cx="13" cy="8.3" r="1.8" />
        <path d="M3.5 16c.7-2.4 2-3.5 4-3.5s3.4 1.1 4 3.5" />
        <path d="M11 15.8c.5-1.6 1.4-2.4 2.7-2.4 1.2 0 2.1.7 2.8 2.4" />
      </svg>
    ),
    home: (
      <svg {...common}>
        <path d="M3.5 9.5L10 4l6.5 5.5" />
        <path d="M5.5 8.5V16h9V8.5" />
      </svg>
    ),
    spark: (
      <img src="/logos/dashboard/ai-generated.svg" alt="" aria-hidden="true" className={className} />
    ),
    claude: (
      <img src="/logos/integrations/claude.svg" alt="" aria-hidden="true" className={className} />
    ),
    code: (
      <img src="/logos/integrations/codex.svg" alt="" aria-hidden="true" className={className} />
    ),
    figma: (
      <img src="/logos/integrations/figma.svg" alt="" aria-hidden="true" className={className} />
    ),
    document: (
      <img src="/logos/integrations/notion.svg" alt="" aria-hidden="true" className={className} />
    ),
    sheet: (
      <img src="/logos/integrations/google-sheets.svg" alt="" aria-hidden="true" className={className} />
    ),
    paper: (
      <svg {...common} stroke="none" fill="currentColor">
        <path d="M16.5 12.2h-4.7V6.5H6.1v5.7h5.7v4.7H4.4V6.5h1.7V4.6h10.4v7.6Z" />
      </svg>
    ),
    copy: (
      <img src="/logos/dashboard/copy.svg" alt="" aria-hidden="true" className={className} />
    ),
    visa: (
      <img src="/logos/visa_inc_logo.svg.svg" alt="Visa" aria-hidden="true" className={className} />
    ),
    upload: (
      <img src="/logos/dashboard/upload.svg" alt="" aria-hidden="true" className={className} />
    ),
    freelancer: (
      <img src="/logos/dashboard/freelancer.svg" alt="" aria-hidden="true" className={className} />
    ),
    studio: (
      <img src="/logos/dashboard/studio.svg" alt="" aria-hidden="true" className={className} />
    ),
    "in-house": (
      <img src="/logos/dashboard/in-house.svg" alt="" aria-hidden="true" className={className} />
    ),
    agency: (
      <img src="/logos/dashboard/agency.svg" alt="" aria-hidden="true" className={className} />
    ),
  };

  return icons[name] ?? icons.profile;
}
