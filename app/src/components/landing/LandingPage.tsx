import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  FaqSection,
  FeaturesSection,
  FinalCtaSection,
  FooterSection,
  HeroDemoSection,
  HeroSection,
  Nav,
  PricingSection,
  StepsSection,
  TrustSection,
} from "./sections";
import "@/styles/landing.css";

const DEFAULT_SITE_URL = "https://usestage.com";
const LANDING_TITLE = "Stage — Project clarity for designers and freelancers";
const LANDING_DESCRIPTION =
  "Track projects, manage phases, and monitor payments. Stage gives designers and freelancers a calm, focused way to run creative work without the chaos.";

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const canonicalUrl =
    typeof window === "undefined"
      ? DEFAULT_SITE_URL
      : new URL("/", window.location.origin).toString();
  const ogImageUrl =
    typeof window === "undefined"
      ? `${DEFAULT_SITE_URL}/og-image.png`
      : new URL("/og-image.png", window.location.origin).toString();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{LANDING_TITLE}</title>
        <meta name="description" content={LANDING_DESCRIPTION} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={LANDING_TITLE} />
        <meta property="og:description" content={LANDING_DESCRIPTION} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta
          property="og:image:alt"
          content="Stage logo with the message Project clarity for designers and freelancers."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={LANDING_TITLE} />
        <meta name="twitter:description" content={LANDING_DESCRIPTION} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Helmet>

      <div className="landing-page">
        <Nav scrolled={scrolled} />
        <HeroSection />
        <HeroDemoSection />
        <TrustSection />

        <FeaturesSection />
        <StepsSection />
        <PricingSection />

        <FaqSection />
        <FinalCtaSection />
        <FooterSection />
      </div>
    </>
  );
}
