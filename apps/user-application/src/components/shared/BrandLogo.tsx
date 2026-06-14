import { useEffect, useState } from "react";

const BRANDFETCH_CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID as string | undefined;

type BrandLogoProps = {
  url: string;
  name: string;
  fallbackColor: string;
  fallbackMark: string;
  size: number;
  rounded: string;
};

function normalizeDomain(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function BrandLogo({ url, name, fallbackColor, fallbackMark, size, rounded }: BrandLogoProps) {
  const domain = normalizeDomain(url);
  const canFetch = Boolean(domain && BRANDFETCH_CLIENT_ID);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [domain]);

  const showFallback = !canFetch || failed;

  if (showFallback) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center text-white ${rounded}`}
        style={{
          width: size,
          height: size,
          background: fallbackColor,
          fontSize: Math.max(9, Math.round(size * 0.4)),
          fontWeight: 600,
          lineHeight: 1.25,
        }}
        aria-label={name}
      >
        {fallbackMark}
      </div>
    );
  }

  const src = `https://cdn.brandfetch.io/${domain}/w/${size * 2}/h/${size * 2}?c=${BRANDFETCH_CLIENT_ID}`;

  return (
    <img
      src={src}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`shrink-0 bg-white object-contain ${rounded}`}
      style={{ width: size, height: size }}
    />
  );
}
