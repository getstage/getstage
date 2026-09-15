import { ClosingSection } from "./markup/ClosingSection";
import { ExportSection } from "./markup/ExportSection";
import { FaqSection } from "./markup/FaqSection";
import { FlowsSection } from "./markup/FlowsSection";
import { HeroSection } from "./markup/HeroSection";
import { IntegrationsSection } from "./markup/IntegrationsSection";
import { LandingOverlays } from "./markup/LandingOverlays";
import { MoodboardSection } from "./markup/MoodboardSection";
import { Navigation } from "./markup/Navigation";
import { PricingSection } from "./markup/PricingSection";
import { ProblemSection } from "./markup/ProblemSection";
import { ResearchSection } from "./markup/ResearchSection";
import { SiteFooter } from "./markup/SiteFooter";
import { SkillsSection } from "./markup/SkillsSection";
import { SkipLink } from "./markup/SkipLink";
import { TestimonialsSection } from "./markup/TestimonialsSection";

export function StageLandingMarkup() {
  return (
    <>
      <SkipLink />
      <Navigation />
      <main id="main">
        <HeroSection />
        <ProblemSection />
        <ResearchSection />
        <MoodboardSection />
        <FlowsSection />
        <SkillsSection />
        <ExportSection />
        <IntegrationsSection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
        <ClosingSection />
      </main>
      <SiteFooter />
      <LandingOverlays />
    </>
  );
}
