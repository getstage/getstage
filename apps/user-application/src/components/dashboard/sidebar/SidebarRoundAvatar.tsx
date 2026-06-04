import { useState } from "react";
import { cn } from "@/lib/utils";

type SidebarRoundAvatarProps = {
  imageUrl?: string;
  label: string;
  initials: string;
  className?: string;
  accentColor?: string;
  fallbackTextClassName?: string;
};

export function SidebarRoundAvatar({
  imageUrl,
  label,
  initials,
  className,
  accentColor = "#8782F5",
  fallbackTextClassName = "text-white",
}: SidebarRoundAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  if (showImage) {
    return (
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        className={cn("h-[24px] w-[24px] shrink-0 rounded-full object-cover", className)}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
        fallbackTextClassName,
        className,
      )}
      style={{ background: accentColor }}
      title={label}
    >
      {initials}
    </div>
  );
}
