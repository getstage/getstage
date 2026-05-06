import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { INTEGRATION_ICONS } from "../data";

export function IntegrationsMockup() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const icons = iconRefs.current.filter((icon): icon is HTMLDivElement => icon !== null);
    if (icons.length === 0) {
      return;
    }

    // Initial state: all icons at rest
    gsap.set(icons, {
      y: 0,
      scale: 1,
      opacity: 0.7,
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(icons, { opacity: 1 });
      return;
    }

    // Staggered entrance
    gsap.fromTo(
      icons,
      { y: 16, opacity: 0, scale: 0.85 },
      {
        y: 0,
        opacity: 0.7,
        scale: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: "back.out(1.4)",
      },
    );

    // Looping highlight: each icon pops up in sequence
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 0.6,
      delay: 1,
    });

    icons.forEach((icon, index) => {
      tl.to(
        icon,
        {
          y: -6,
          scale: 1.12,
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        },
        index === 0 ? 0 : `>+=0.1`,
      ).to(
        icon,
        {
          y: 0,
          scale: 1,
          opacity: 0.7,
          duration: 0.35,
          ease: "power2.inOut",
        },
        ">+=0.3",
      );
    });

    return () => {
      tl.kill();
      icons.forEach((icon) => gsap.killTweensOf(icon));
    };
  }, []);

  return (
    <div className="landing-integrations-orbit" ref={containerRef} aria-hidden="true">
      <div className="landing-integrations-track">
        {INTEGRATION_ICONS.map((icon, index) => (
          <div
            key={icon.name}
            className="landing-integration-chip"
            ref={(element) => {
              iconRefs.current[index] = element;
            }}
          >
            <img src={icon.src} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}
