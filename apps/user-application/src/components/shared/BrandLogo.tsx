import { useState } from "react";
import { brandLogoUrl, normalizeBrandDomain } from "@/config/brandfetch";

type BrandLogoProps = {
  url: string;
  name: string;
  fallbackColor: string;
  fallbackMark: string;
  size: number;
  rounded: string;
};

export function BrandLogo({ url, name, fallbackColor, fallbackMark, size, rounded }: BrandLogoProps) {
  const domain = normalizeBrandDomain(url);
  const src = domain ? brandLogoUrl(domain, size * 2) : null;

  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src !== null && failedSrc === src;

  if (!src || failed) {
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

  return (
    <img
      src={src}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      onError={() => setFailedSrc(src)}
      className={`shrink-0 bg-white object-contain ${rounded}`}
      style={{ width: size, height: size }}
    />
  );
}
