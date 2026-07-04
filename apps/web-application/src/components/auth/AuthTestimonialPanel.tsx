import { cn } from "@/lib/utils";

const TESTIMONIAL = {
  name: "Liam Chen",
  role: "Product Designer",
  quote:
    "Stage completely changed how I start every project. Instead of jumping into prompts, I get real research, strategy, and clear direction first, so the final product feels intentional. It's the thinking layer I never knew my workflow was missing.",
  avatarSrc: "/auth/liam-chen.png",
} as const;

type AuthTestimonialPanelProps = {
  variant?: "desktop" | "mobile";
  className?: string;
};

function AuthTestimonialCard({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        "rounded-[12px] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <img
          src={TESTIMONIAL.avatarSrc}
          alt=""
          width={52}
          height={52}
          className="size-[52px] shrink-0 rounded-[8px] object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">
            {TESTIMONIAL.name}
          </p>
          <p className="truncate text-[13px] font-normal leading-[1.5] text-[#737373]">
            {TESTIMONIAL.role}
          </p>
        </div>
      </div>
      <p className="mt-4 font-[family-name:var(--font-serif,'Iowan_Old_Style',Georgia,serif)] text-[14px] font-normal leading-[1.55] text-[#262626]">
        &ldquo;{TESTIMONIAL.quote}&rdquo;
      </p>
    </article>
  );
}

export function AuthTestimonialPanel({ variant = "desktop", className }: AuthTestimonialPanelProps) {
  const isMobile = variant === "mobile";
  const backgroundSrc = isMobile ? "/auth/auth-cta-mobile.webp" : "/auth/auth-cta.webp";

  if (isMobile) {
    return (
      <div
        className={cn(
          "relative flex h-[400px] w-full shrink-0 items-center justify-center overflow-hidden rounded-[8px]",
          className,
        )}
      >
        <img
          src={backgroundSrc}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-right-top"
        />
        <AuthTestimonialCard className="absolute bottom-[12%] left-1/2 w-[min(320px,calc(100%-40px))] -translate-x-1/2" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-end overflow-hidden rounded-[8px]",
        className,
      )}
    >
      <img
        src={backgroundSrc}
        alt=""
        aria-hidden="true"
        className="h-full max-h-full w-auto object-contain object-right"
      />
      <AuthTestimonialCard className="absolute left-[36%] top-[47%] w-[min(320px,42%)] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}
