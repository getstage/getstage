import { cn } from "@/lib/utils";

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  avatarSrc?: string;
};

const FEATURED: Testimonial = {
  name: "Liam Chen",
  role: "Product Designer",
  quote:
    "Stage completely changed how I start every project. Instead of jumping into prompts, I get real research, strategy, and clear direction first, so the final product feels intentional. It's the thinking layer I never knew my workflow was missing.",
  avatarSrc: "/auth/liam-chen.webp",
};

const SIDE_TESTIMONIALS: [Testimonial, Testimonial] = [
  {
    name: "Alex Kim",
    role: "Freelance Designer",
    quote:
      "I used to jump straight into prompts and hope for the best. Stage gives me scope, research, and clear direction first, so my user flows feel clean and polished.",
  },
  {
    name: "Maya Rodriguez",
    role: "Indie Founder",
    quote:
      "As a non-designer founder, I could never stick to one exact process. Stage gives me a repeatable workflow I can trust before I open Figma.",
  },
];

type AuthTestimonialCarouselProps = {
  variant?: "desktop" | "mobile";
  className?: string;
};

function TestimonialCard({
  testimonial,
  featured = false,
  className,
}: {
  testimonial: Testimonial;
  featured?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex shrink-0 flex-col rounded-[12px] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.12)]",
        featured ? "w-[min(340px,78vw)]" : "w-[min(280px,62vw)]",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {testimonial.avatarSrc ? (
          <img
            src={testimonial.avatarSrc}
            alt=""
            width={52}
            height={52}
            className="size-[52px] shrink-0 rounded-[8px] object-cover"
          />
        ) : (
          <div className="size-[52px] shrink-0 rounded-[8px] bg-[#F5F5F5]" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">
            {testimonial.name}
          </p>
          <p className="truncate text-[13px] font-normal leading-[1.5] text-[#737373]">
            {testimonial.role}
          </p>
        </div>
      </div>
      <p className="mt-4 font-[family-name:var(--font-serif,'Iowan_Old_Style',Georgia,serif)] text-[14px] font-normal leading-[1.55] text-[#262626]">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
    </article>
  );
}

export function AuthTestimonialCarousel({
  variant = "desktop",
  className,
}: AuthTestimonialCarouselProps) {
  const isMobile = variant === "mobile";
  const backgroundSrc = isMobile ? "/auth/auth-mobile.webp" : "/auth/auth.webp";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[8px]",
        isMobile ? "h-[400px] w-full shrink-0" : "h-full w-full",
        className,
      )}
    >
      <img
        src={backgroundSrc}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          isMobile ? "px-3" : "px-6",
        )}
      >
        <div className="flex items-stretch justify-center gap-3 lg:gap-4">
          <TestimonialCard
            testimonial={SIDE_TESTIMONIALS[0]}
            className="hidden scale-[0.92] opacity-45 sm:flex"
          />
          <TestimonialCard testimonial={FEATURED} featured />
          <TestimonialCard
            testimonial={SIDE_TESTIMONIALS[1]}
            className="hidden scale-[0.92] opacity-45 sm:flex"
          />
        </div>
      </div>
    </div>
  );
}
