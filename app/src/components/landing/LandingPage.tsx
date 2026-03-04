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

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>Stage — Project clarity for designers and freelancers</title>
        <meta
          name="description"
          content="Track projects, manage phases, monitor payments. Everything you need to run your creative work without the chaos."
        />
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
