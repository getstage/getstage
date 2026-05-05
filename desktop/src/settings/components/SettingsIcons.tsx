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
      <svg {...common}>
        <circle cx="10" cy="6.5" r="3" />
        <path d="M4.5 17c.8-3.1 2.6-4.6 5.5-4.6s4.7 1.5 5.5 4.6" />
      </svg>
    ),
    billing: (
      <svg {...common}>
        <rect x="3" y="5" width="14" height="10" rx="2" />
        <path d="M3 8h14" />
      </svg>
    ),
    clients: (
      <svg {...common}>
        <circle cx="7" cy="7" r="2.5" />
        <circle cx="13.5" cy="8" r="2" />
        <path d="M3 16c.6-2.5 2-3.7 4-3.7s3.4 1.2 4 3.7" />
        <path d="M10.5 16c.5-1.8 1.6-2.7 3.2-2.7 1.5 0 2.6.9 3.1 2.7" />
      </svg>
    ),
    developer: (
      <svg {...common}>
        <path d="M7.5 6L4 10l3.5 4" />
        <path d="M12.5 6L16 10l-3.5 4" />
      </svg>
    ),
    account: (
      <svg {...common}>
        <path d="M10 3l6 2.6v4.6c0 3.1-2.2 5.4-6 6.8-3.8-1.4-6-3.7-6-6.8V5.6L10 3z" />
      </svg>
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
    copy: (
      <img src="/logos/dashboard/copy.svg" alt="" aria-hidden="true" className={className} />
    ),
  };

  return icons[name] ?? icons.profile;
}
