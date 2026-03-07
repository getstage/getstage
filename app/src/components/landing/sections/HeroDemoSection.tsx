import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import demoImage from "@/assets/landing-images/demo.webp";
import heroBgImage from "@/assets/landing-images/hero-bg.webp";
import { INTEGRATION_ICONS } from "./data";

gsap.registerPlugin(ScrollTrigger);

export function HeroDemoSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mockupRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!sectionRef.current || !mockupRef.current) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set(mockupRef.current, {
          clearProps: "transform",
        });
        return;
      }

      const mm = gsap.matchMedia();

      mm.add("(min-width: 821px)", () => {
        gsap.set(mockupRef.current, {
          transformPerspective: 1600,
          transformOrigin: "50% 100%",
          rotateX: 17,
          y: 36,
          scale: 0.965,
        });

        gsap.to(mockupRef.current, {
          rotateX: 0,
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 76%",
            end: "top 32%",
            scrub: 0.9,
          },
        });
      });

      mm.add("(max-width: 820px)", () => {
        const isSmallPhone = window.matchMedia("(max-width: 480px)").matches;

        gsap.set(mockupRef.current, {
          transformPerspective: isSmallPhone ? 1400 : 1300,
          transformOrigin: "50% 106%",
          rotateX: isSmallPhone ? 17 : 14,
          y: isSmallPhone ? 30 : 24,
          scale: isSmallPhone ? 0.945 : 0.965,
          force3D: true,
        });

        gsap.to(mockupRef.current, {
          rotateX: 0,
          y: 0,
          scale: 1,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: mockupRef.current,
            start: "top 94%",
            end: isSmallPhone ? "top 38%" : "top 44%",
            scrub: 1.05,
            invalidateOnRefresh: true,
          },
        });
      });

      return () => mm.revert();
    }, sectionRef);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className="landing-hero-demo-section" aria-label="Stage demo">
      <div
        className="landing-hero-demo-bg"
        style={{ backgroundImage: `url(${heroBgImage})` }}
        aria-hidden="true"
      />
      <svg
        className="landing-hero-clip-defs"
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id="landing-hero-demo-strip-clip" clipPathUnits="objectBoundingBox">
            <path
              fill="#FFFFFF"
              d="M0 0H1L0.950085 0.861851C0.945349 0.943624 0.930201 1 0.912961 1H0.087039C0.0698 1 0.05465 0.943624 0.049914 0.861851L0 0Z"
            />
          </clipPath>
        </defs>
      </svg>
      <div className="landing-hero-integration-strip">
        <span className="landing-hero-integration-label">Integrate with</span>
        <div className="landing-hero-integration-icons">
          {INTEGRATION_ICONS.map((icon) => (
            <span key={`hero-int-${icon.name}`} className="landing-hero-integration-logo">
              <img src={icon.src} alt={icon.name} loading="lazy" />
            </span>
          ))}
        </div>
      </div>
      <div className="landing-container landing-hero-demo-wrap">
        <div ref={mockupRef} className="landing-hero-mockup">
          <div className="landing-hero-macbook-screen-shell">
            <div className="landing-hero-macbook-toolbar" aria-hidden="true">
              <div className="landing-hero-macbook-lights">
                <span className="red" />
                <span className="yellow" />
                <span className="green" />
              </div>
              <span className="landing-hero-macbook-url">getstage.co</span>
            </div>
            <div className="landing-hero-macbook-screen">
              <img
                src={demoImage}
                alt="Stage dashboard demo"
                className="landing-hero-demo-image"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
