import type { ReactNode } from "react";
import { LandingOverlays } from "./markup/LandingOverlays";
import { Navigation } from "./markup/Navigation";
import { SiteFooter } from "./markup/SiteFooter";
import { useStageLanding } from "./useStageLanding";

const TITLE = "Get started with Stage";
const DESCRIPTION =
  "Download Stage for macOS and start with the thinking behind your next product.";

export function StageDownloadPage() {
  useStageLanding({
    title: TITLE,
    description: DESCRIPTION,
    bodyClass: "download-page",
    autoDownload: true,
  });

  return (
    <>
      <div id="top" />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation />
      <main className="download-main" id="main">
        <div className="download-content">
          <header className="download-intro">
            <h1>You’re almost there!</h1>
            <p>Your download will begin automatically.</p>
            <p id="download-status" role="status">
              Did not work? <span>Download Stage manually.</span>
            </p>
          </header>
          <ol className="onboarding-grid">
            <OnboardingStep
              image="screen-1.webp"
              alt="Stage app icon in the macOS Dock"
            >
              Open <strong>Stage</strong> from your Applications folder
            </OnboardingStep>
            <OnboardingStep
              image="screen-2.webp"
              alt="Stage project type selection with Web Design selected"
            >
              Choose the type of <strong>project</strong> you’re building
            </OnboardingStep>
            <OnboardingStep
              image="screen-3.webp"
              alt="Stage navigation with the Research section selected"
            >
              Open <strong>Research</strong> to start your project
            </OnboardingStep>
          </ol>
        </div>
      </main>
      <SiteFooter />
      <LandingOverlays />
    </>
  );
}

function OnboardingStep({
  image,
  alt,
  children,
}: {
  image: string;
  alt: string;
  children: ReactNode;
}) {
  return (
    <li className="onboarding-step">
      <figure className="onboarding-art">
        <img
          src={`/landing-preview/assets/${image}`}
          width={1440}
          height={900}
          alt={alt}
        />
      </figure>
      <p>{children}</p>
    </li>
  );
}
