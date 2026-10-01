import type { ReactNode } from "react";
import { LandingOverlays } from "@/components/stage-landing/markup/LandingOverlays";
import { Navigation } from "@/components/stage-landing/markup/Navigation";
import { SiteFooter } from "@/components/stage-landing/markup/SiteFooter";
import { useStageLanding } from "@/components/stage-landing/useStageLanding";
import { TRIAL_CTA } from "@/marketing/site";

// Shell for use-case and blog pages: the landing navigation, footer and styles.
// Links are plain anchors so the same markup pre-renders without a router.
export function MarketingLayout({
  title,
  description,
  children,
  bodyClass = "",
}: {
  title: string;
  description: string;
  children: ReactNode;
  bodyClass?: string;
}) {
  useStageLanding({ title, description, bodyClass: `content-page ${bodyClass}` });

  return (
    <>
      <div id="top" />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation />
      <main className="content-main" id="main">
        {children}
      </main>
      <SiteFooter />
      <LandingOverlays />
    </>
  );
}

export function TrialCallout({ heading }: { heading: string }) {
  return (
    <section className="content-cta">
      <h2>{heading}</h2>
      <p>Includes a 14-day free trial. Stage runs natively on macOS.</p>
      <a className="button button-primary" href={TRIAL_CTA.href}>
        {TRIAL_CTA.label}
      </a>
    </section>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="content-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
