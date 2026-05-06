import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import onboardingImage from "@/assets/onboarding/onboarding.webp";
import { cn } from "@/lib/utils";

gsap.registerPlugin(SplitText, useGSAP);

export function WelcomeSlide({ userName }: { userName?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);

  useGSAP(
    () => {
      if (!containerRef.current || !titleRef.current || !subtitleRef.current) {
        return;
      }

      const titleSplit = new SplitText(titleRef.current, { type: "lines,words" });
      const subtitleSplit = new SplitText(subtitleRef.current, { type: "lines" });

      gsap.set(titleSplit.lines, { y: 12, opacity: 0 });
      gsap.set(titleSplit.words, {
        y: 18,
        opacity: 0,
        color: "var(--color-text-secondary)",
        filter: "blur(5px)",
      });
      gsap.set(subtitleSplit.lines, { y: 12, opacity: 0 });
      gsap.set("[data-welcome-preview]", { y: 18, opacity: 0, scale: 0.992 });

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        delay: 0.05,
      });

      timeline.to(titleSplit.lines, { y: 0, opacity: 1, duration: 0.46 });
      timeline.to(
        titleSplit.words,
        {
          y: 0,
          opacity: 1,
          color: "var(--color-text-primary)",
          filter: "blur(0px)",
          stagger: 0.032,
          duration: 0.56,
        },
        "-=0.32",
      );
      timeline.to(
        subtitleSplit.lines,
        {
          y: 0,
          opacity: 1,
          duration: 0.46,
          stagger: 0.09,
          ease: "power2.out",
        },
        "-=0.28",
      );
      timeline.to(
        "[data-welcome-preview]",
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.24",
      );

      return () => {
        timeline.kill();
        titleSplit.revert();
        subtitleSplit.revert();
      };
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="pb-1">
      <h3
        ref={titleRef}
        className="mt-2 font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary"
      >
        Welcome to Stage{userName ? `, ${userName}` : ""}. You&apos;re in.
      </h3>
      <p ref={subtitleRef} className="mt-2 max-w-[620px] text-[15px] leading-normal text-text-secondary">
        We&apos;ll personalize your setup and launch a dashboard that feels useful from day one.
      </p>

      <div data-welcome-preview className="mt-6">
        <WelcomeOnboardingImageTour />
      </div>
    </div>
  );
}

function WelcomeOnboardingImageTour() {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const image = scopeRef.current?.querySelector<HTMLElement>("[data-tour-image]");
      if (!image) {
        return;
      }

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.set(image, {
        transformOrigin: "center center",
        scale: 1,
        xPercent: 0,
        yPercent: 0,
      });

      if (reducedMotion) {
        return;
      }

      const stops = {
        first: { scale: 1.74, xPercent: 34, yPercent: 33 },
        second: { scale: 1.8, xPercent: -35, yPercent: 0 },
        third: { scale: 1.73, xPercent: 33, yPercent: -32 },
      } as const;

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.2,
        delay: 1.2,
      });

      tl.to(image, {
        scale: stops.first.scale,
        xPercent: stops.first.xPercent,
        yPercent: stops.first.yPercent,
        duration: 1,
        ease: "power3.inOut",
      })
        .to(image, {
          scale: stops.second.scale,
          xPercent: stops.second.xPercent,
          yPercent: stops.second.yPercent,
          duration: 1.85,
          ease: "power2.inOut",
        })
        .to(image, {
          scale: stops.third.scale,
          xPercent: stops.third.xPercent,
          yPercent: stops.third.yPercent,
          duration: 1.82,
          ease: "power2.inOut",
        })
        .to(image, {
          scale: 1,
          xPercent: 0,
          yPercent: 0,
          duration: 0.82,
          ease: "power2.inOut",
        });

      return () => {
        tl.kill();
        gsap.killTweensOf(image);
      };
    },
    { scope: scopeRef },
  );

  return (
    <div ref={scopeRef} className="relative overflow-hidden rounded-[12px]">
      <img
        data-tour-image
        src={onboardingImage}
        alt="Onboarding walkthrough"
        className="block h-auto w-full"
        loading="lazy"
      />
    </div>
  );
}

export function StaticOnboardingImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative overflow-hidden rounded-[12px]">
      <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" />
    </div>
  );
}

export function LoadingStage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex max-w-[420px] flex-col items-center gap-4 text-center">
      <div className="flex gap-1.5">
        <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
        <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_0.2s_infinite] rounded-full bg-accent" />
        <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_0.4s_infinite] rounded-full bg-accent" />
      </div>
      <div className="font-heading text-[clamp(1.625rem,5vw,1.875rem)] leading-[1.12] font-semibold tracking-[-0.45px] text-text-primary">
        {title}
      </div>
      <div className="text-[15px] leading-normal text-text-secondary">{subtitle}</div>
    </div>
  );
}

export function CreatingDashboardText({
  userName,
  isReady,
  onDone,
}: {
  userName?: string;
  isReady: boolean;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const hasCompletedRef = useRef(false);
  const hasCelebratedRef = useRef(false);
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [text, setText] = useState("Setting up your dashboard...");

  useEffect(() => {
    hasCompletedRef.current = false;
    hasCelebratedRef.current = false;
    setPhase("loading");
    setText("Setting up your dashboard...");
  }, []);

  useEffect(() => {
    if (!isReady || phase !== "loading" || !textRef.current) {
      return;
    }

    const split = new SplitText(textRef.current, { type: "words" });
    const timeline = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        split.revert();
        setText(`You're all set${userName ? `, ${userName}` : ""}.`);
        setPhase("ready");
      },
    });

    timeline.to(split.words, {
      opacity: 0,
      y: -10,
      filter: "blur(4px)",
      duration: 0.24,
      stagger: 0.03,
      ease: "power2.in",
    });

    return () => {
      timeline.kill();
      split.revert();
    };
  }, [isReady, phase, userName]);

  useGSAP(
    () => {
      if (!textRef.current || phase !== "loading") {
        return;
      }

      const split = new SplitText(textRef.current, { type: "words" });
      const words = split.words;
      gsap.set(words, { color: "var(--color-text-secondary)", y: 0, opacity: 0.65 });

      const timeline = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.14,
        defaults: { ease: "power2.inOut" },
      });

      timeline.fromTo(
        words,
        { opacity: 0.55, y: 4, filter: "blur(3px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.46, stagger: 0.055 },
        0,
      );
      timeline.to(
        words,
        {
          color: "var(--color-accent)",
          duration: 0.62,
          stagger: 0.05,
        },
        0,
      );
      timeline.to(
        words,
        {
          color: "var(--color-text-secondary)",
          opacity: 0.72,
          y: -1,
          duration: 0.5,
          stagger: 0.045,
        },
        ">",
      );

      return () => {
        timeline.kill();
        split.revert();
      };
    },
    { scope: rootRef, dependencies: [phase] },
  );

  useEffect(() => {
    if (phase !== "ready" || hasCelebratedRef.current) {
      return;
    }

    hasCelebratedRef.current = true;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      try {
        fireOnboardingConfetti();
      } catch {
        // Keep progression resilient if confetti fails in some browsers/extensions.
      }
    }
  }, [phase]);

  useGSAP(
    () => {
      if (!textRef.current || phase !== "ready") {
        return;
      }

      gsap.set(textRef.current, {
        color: "var(--color-text-primary)",
        y: 12,
        opacity: 0,
      });

      const timeline = gsap.timeline();
      timeline.to(textRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.42,
        ease: "power2.out",
      });

      const doneCall = gsap.delayedCall(1.35, () => {
        if (hasCompletedRef.current) {
          return;
        }

        hasCompletedRef.current = true;
        onDone();
      });

      return () => {
        timeline.kill();
        doneCall.kill();
      };
    },
    { scope: rootRef, dependencies: [phase, onDone, text] },
  );

  return (
    <div ref={rootRef} className="flex min-h-[150px] items-center justify-center text-center">
      <div
        ref={textRef}
        className={cn(
          "font-heading text-[clamp(1.625rem,5vw,1.875rem)] leading-[1.12] font-semibold tracking-[-0.45px] wrap-normal text-balance",
          phase === "loading" ? "text-text-secondary" : "text-text-primary",
        )}
      >
        {text}
      </div>
    </div>
  );
}

function fireOnboardingConfetti() {
  const colors = ["#8782F5", "#7670E0", "#EEEDFE", "#1A1A2E"];

  confetti({
    particleCount: 110,
    spread: 72,
    startVelocity: 42,
    origin: { y: 0.68 },
    scalar: 0.9,
    colors,
  });

  confetti({
    particleCount: 70,
    angle: 60,
    spread: 58,
    startVelocity: 36,
    origin: { x: 0.2, y: 0.72 },
    scalar: 0.88,
    colors,
  });

  confetti({
    particleCount: 70,
    angle: 120,
    spread: 58,
    startVelocity: 36,
    origin: { x: 0.8, y: 0.72 },
    scalar: 0.88,
    colors,
  });
}
