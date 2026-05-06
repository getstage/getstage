import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "project";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-[12px]",
  md: "h-9 w-9 text-[13px]",
  lg: "h-12 w-12 text-[15px]",
};

export function Avatar({
  name,
  src,
  size = "md",
  variant = "default",
  className,
}: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "rounded-full object-cover",
          sizeMap[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-medium",
        variant === "project"
          ? "bg-[rgba(135,130,245,0.16)] text-accent ring-1 ring-[rgba(135,130,245,0.14)]"
          : "bg-input-bg text-text-primary",
        sizeMap[size],
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
