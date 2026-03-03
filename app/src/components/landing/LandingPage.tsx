import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ClockCountdown,
  Lightning,
  Plus,
  SealCheck,
} from "@phosphor-icons/react";
import { gsap } from "gsap";
import { Helmet } from "react-helmet-async";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import createProjectImage from "@/assets/landing-images/create-project.webp";
import heroBgImage from "@/assets/landing-images/hero-bg.webp";
import demoImage from "@/assets/landing-images/demo.webp";
import phaseManagementImage from "@/assets/landing-images/phase-management.webp";
import timelineOverviewImage from "@/assets/landing-images/timeline-overview.webp";
import "@/styles/landing.css";

const FAQ_ITEMS = [
  {
    question: "Is it really free to get started?",
    answer:
      "Yes! Stage offers a generous free tier that lets you manage up to 3 projects with all core features included. No credit card required, no time limits.",
  },
  {
    question: "Do I need a credit card to sign up?",
    answer:
      "No. You can sign up and start using Stage immediately with just your email address. We only ask for payment information if you choose to upgrade to Pro.",
  },
  {
    question: "What happens if I cancel my plan?",
    answer:
      "Your projects and data remain accessible on the free tier. You won't lose any work — you'll just lose access to Pro features like AI roadmaps and Stripe integration.",
  },
  {
    question: "Do you have a free trial?",
    answer:
      "We don't have a traditional trial because our free tier is already generous. You can use Stage for free with up to 3 projects, forever. Upgrade to Pro when you need more.",
  },
  {
    question: "How does Stripe integration work?",
    answer:
      "Connect your Stripe account in Settings. Stage automatically syncs your invoices and payments, showing outstanding and received amounts directly on your dashboard.",
  },
  {
    question: "Can I share progress with my clients?",
    answer:
      "Yes! Each project has a Client Portal — a read-only, branded link you can share. Clients see real-time progress without needing to create an account or log in.",
  },
  {
    question: "Can I invite my team to a project?",
    answer:
      "Team collaboration is on our roadmap for an upcoming release. Currently, Stage is optimized for individual creatives and freelancers.",
  },
  {
    question: "How many projects can I have?",
    answer:
      "Free tier: up to 3 active projects. Pro plan: unlimited projects with no restrictions.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Yes. You can export all project data, timelines, and payment records at any time. Your data is always yours.",
  },
];

const PRICING_FEATURES = [
  "Unlimited projects",
  "AI-generated roadmaps",
  "Client portal & sharing",
  "Stripe payment tracking",
  "All project types",
  "Priority support",
];

const FREE_PRICING_FEATURES = [
  "Up to 3 active projects",
  "Phase and task tracking",
  "Timeline overview",
  "Basic project analytics",
  "Project data export",
] as const;

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number>(0);

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
        <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
          <div className="landing-nav-inner">
            <a href="#" className="landing-nav-logo">
              <img src={stageLogo} alt="Stage" />
            </a>
            <div className="landing-nav-right">
              <div className="landing-nav-links">
                <a href="#features" className="landing-nav-link">
                  Features
                </a>
                <a href="#pricing" className="landing-nav-link">
                  Pricing
                </a>
                <a href="#faq" className="landing-nav-link">
                  FAQ
                </a>
              </div>
              <div className="landing-nav-auth">
                <Link to="/auth" className="landing-nav-signin">
                  Sign in
                </Link>
                <Link to="/auth" className="landing-btn landing-btn-cta">
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <section className="landing-hero">
          <div className="landing-container">
            <Link to="/auth" className="landing-hero-badge" aria-label="Go to login">
              <span className="landing-hero-badge-pill">NEW</span>
              <span className="landing-hero-badge-text">Just launched v1</span>
              <span className="landing-hero-badge-arrow" aria-hidden="true">
                ›
              </span>
            </Link>
            <h1 className="landing-hero-title">Project clarity for designers and freelancers</h1>
            <p className="landing-hero-subtitle">
              Track projects, manage phases, monitor payments. Everything you need to run your
              creative work — without the chaos.
            </p>
            <div className="landing-hero-buttons">
              <Link to="/auth" className="landing-btn landing-btn-cta">
                Get started
              </Link>
              <a href="#features" className="landing-btn landing-btn-ghost landing-btn-secondary">
                See demo
              </a>
            </div>
          </div>
        </section>

        <section className="landing-hero-demo-section" aria-label="Stage demo">
          <div
            className="landing-hero-demo-bg"
            style={{ backgroundImage: `url(${heroBgImage})` }}
            aria-hidden="true"
          />
          <div className="landing-container landing-hero-demo-wrap">
            <div className="landing-hero-mockup">
              <img
                src={demoImage}
                alt="Stage dashboard demo"
                className="landing-hero-demo-image"
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="landing-trust">
          <div className="landing-container">
            <div className="landing-trust-grid">
              <div>
                <div className="landing-trust-icon" aria-hidden="true">
                  <Lightning weight="duotone" />
                </div>
                <div className="landing-trust-title">Lightweight setup</div>
                <div className="landing-trust-desc">Under 5kb, won't slow your workflow</div>
              </div>
              <div>
                <div className="landing-trust-icon" aria-hidden="true">
                  <ClockCountdown weight="duotone" />
                </div>
                <div className="landing-trust-title">One-minute onboarding</div>
                <div className="landing-trust-desc">Create your first project in 60 seconds</div>
              </div>
              <div>
                <div className="landing-trust-icon" aria-hidden="true">
                  <SealCheck weight="duotone" />
                </div>
                <div className="landing-trust-title">No complexity</div>
                <div className="landing-trust-desc">Built for creatives, not enterprise teams</div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-features" id="features">
          <div className="landing-container">
            <div className="landing-section-label">Features</div>
            <h2 className="landing-section-title">
              Everything you need to manage your creative projects
            </h2>
            <p className="landing-section-subtitle">
              From timeline overview to revenue tracking, get the full picture without the clutter.
            </p>

            <div className="landing-features-grid">
              <div className="landing-features-row r1">
                <FeatureCard
                  title="Timeline Overview"
                  description="See all your projects mapped across time. The elevation curve shows workload density at a glance."
                  points={[
                    "Real-time workload visualization",
                    "Hover to inspect any date",
                    "Filter by week, month, quarter, or year",
                  ]}
                  mockup={
                    <FeatureImage
                      src={timelineOverviewImage}
                      alt="Timeline overview in the Stage dashboard"
                    />
                  }
                  mockupType="image"
                  featured
                />
                <FeatureCard
                  title="Client Portal"
                  description="Share a live, read-only view with your clients. They see progress without the noise."
                  points={["Branded sharing links", "Real-time sync", "No client login required"]}
                  mockup={<PortalMockup />}
                  gray
                />
              </div>

              <div className="landing-features-row r2">
                <FeatureCard
                  title="Phase Management"
                  description="Break projects into clear phases with tasks. Drag, reorder, check off."
                  points={[
                    "Drag-to-reorder phases",
                    "AI-generated roadmaps",
                    "Progress tracking per phase",
                  ]}
                  mockup={
                    <FeatureImage
                      src={phaseManagementImage}
                      alt="Phase management view in Stage"
                    />
                  }
                  mockupType="image"
                />
                <FeatureCard
                  title="Payment Tracking"
                  description="Connect Stripe and see who's paid and who hasn't, right on your dashboard."
                  points={[
                    "Stripe integration",
                    "Outstanding vs received",
                    "Payment history per project",
                  ]}
                  mockup={<PaymentMockup />}
                  gray
                />
              </div>

              <div className="landing-features-row r3">
                <SmallFeatureCard
                  title="Privacy-first"
                  description="Your data stays yours. No selling, no tracking, no ads. GDPR-compliant by default."
                  mockup={<PrivacyMockup />}
                />
                <SmallFeatureCard
                  title="Integrations"
                  description="Connect with Stripe today. Figma, Notion, and Slack coming soon."
                  mockup={<IntegrationsMockup />}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-steps">
          <div className="landing-container">
            <div className="landing-section-label">How it works</div>
            <h2 className="landing-section-title">Get started in minutes</h2>
            <p className="landing-section-subtitle">
              Setting up Stage is faster than making coffee. No credit card, no contracts, no onboarding calls.
            </p>
            <div className="landing-steps-grid">
              <article className="landing-step-card">
                <img
                  src={createProjectImage}
                  alt="Create project flow in Stage"
                  className="landing-step-card-image"
                  loading="lazy"
                />
                <div className="landing-step-card-body">
                  <div className="landing-step-content">
                    <div className="landing-step-title">Create a project</div>
                    <div className="landing-step-desc">
                      Name your client, pick a project type, and you're in.
                    </div>
                  </div>
                </div>
              </article>
              <article className="landing-step-card">
                <img
                  src={phaseManagementImage}
                  alt="Phase progress tracking in Stage"
                  className="landing-step-card-image"
                  loading="lazy"
                />
                <div className="landing-step-card-body">
                  <div className="landing-step-content">
                    <div className="landing-step-title">Track progress</div>
                    <div className="landing-step-desc">
                      Add phases, check off tasks, connect Stripe for payments.
                    </div>
                  </div>
                </div>
              </article>
              <article className="landing-step-card">
                <img
                  src={timelineOverviewImage}
                  alt="Timeline insights in Stage dashboard"
                  className="landing-step-card-image"
                  loading="lazy"
                />
                <div className="landing-step-card-body">
                  <div className="landing-step-content">
                    <div className="landing-step-title">Stay informed</div>
                    <div className="landing-step-desc">
                      See your timeline, workload curve, and revenue at a glance.
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-pricing" id="pricing">
          <div className="landing-container">
            <div className="landing-section-label">Pricing</div>
            <h2 className="landing-section-title">Simplified pricing</h2>
            <p className="landing-section-subtitle">
              No confusing tiers. One plan for the complete experience, and a generous free tier to start.
            </p>
            <div className="landing-pricing-layout">
              <div className="landing-pricing-card free">
                <div className="landing-pricing-head">
                  <div className="landing-pricing-plan-name">Free</div>
                </div>
                <div className="landing-pricing-price">
                  <span className="landing-pricing-amount">$0</span>
                  <span className="landing-pricing-period">/month</span>
                </div>
                <div className="landing-pricing-billing">
                  Perfect to get started and run your first client projects in Stage.
                </div>

                <ul className="landing-pricing-features">
                  {FREE_PRICING_FEATURES.map((feature) => (
                    <li key={feature} className="landing-pricing-feature">
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/auth"
                  className="landing-btn landing-btn-ghost landing-btn-secondary landing-pricing-cta landing-pricing-cta-secondary"
                >
                  Start free
                </Link>
                <div className="landing-pricing-free">Upgrade anytime as your workload grows.</div>
              </div>

              <div className="landing-pricing-card pro">
                <div className="landing-pricing-head">
                  <div className="landing-pricing-plan-name">Pro</div>
                  <span className="landing-pricing-tag">Annual billing</span>
                </div>
                <div className="landing-pricing-price">
                  <span className="landing-pricing-amount">$9</span>
                  <span className="landing-pricing-period">/month</span>
                </div>
                <div className="landing-pricing-billing">Billed annually ($108/year)</div>

                <ul className="landing-pricing-features">
                  {PRICING_FEATURES.map((feature) => (
                    <li key={feature} className="landing-pricing-feature">
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link to="/auth" className="landing-btn landing-btn-cta landing-pricing-cta">
                  Get started
                </Link>
                <div className="landing-pricing-free">
                  Free tier available — no credit card required
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-faq" id="faq">
          <div className="landing-container">
            <div className="landing-faq-layout">
              <div className="landing-faq-header">
                <div className="landing-section-label">FAQ</div>
                <h2 className="landing-section-title">Frequently asked questions</h2>
                <p className="landing-section-subtitle">
                  Quick answers to common questions about pricing, billing, and getting started.
                </p>
              </div>
              <div className="landing-faq-list">
                {FAQ_ITEMS.map((item, index) => (
                  <div key={item.question} className={`landing-faq-item ${openFaq === index ? "open" : ""}`}>
                    <button
                      type="button"
                      className="landing-faq-question"
                      onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                      aria-expanded={openFaq === index}
                      aria-controls={`landing-faq-answer-${index}`}
                    >
                      <span className="landing-faq-question-text">{item.question}</span>
                      <span className="landing-faq-icon" aria-hidden="true">
                        <Plus weight="bold" />
                      </span>
                    </button>
                    <div className="landing-faq-answer" id={`landing-faq-answer-${index}`}>
                      <div className="landing-faq-answer-inner">{item.answer}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-container">
            <div className="landing-final-card">
              <h2 className="landing-section-title">Clarity for every creative project</h2>
              <p className="landing-section-subtitle">
                Start tracking your projects today. Free to begin, upgrade when you're ready.
              </p>
              <div className="landing-final-buttons">
                <Link to="/auth" className="landing-btn landing-btn-cta">
                  Get started
                </Link>
                <a href="#features" className="landing-btn landing-btn-ghost landing-btn-secondary">
                  See demo
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-container">
            <div className="landing-footer-shell">
              <div className="landing-footer-grid">
                <div className="landing-footer-brand">
                  <a href="#" className="landing-footer-logo">
                    <img src={stageLogo} alt="Stage" />
                  </a>
                  <div className="landing-footer-brand-desc">
                    Project management built for creative professionals. Track work, manage clients,
                    get paid.
                  </div>
                  <div className="landing-footer-brand-meta">Made for designers and freelancers.</div>
                </div>
                <div>
                  <div className="landing-footer-col-title">Product</div>
                  <a href="#features" className="landing-footer-link">
                    Features
                  </a>
                  <a href="#pricing" className="landing-footer-link">
                    Pricing
                  </a>
                  <a href="#" className="landing-footer-link">
                    Changelog
                  </a>
                </div>
                <div>
                  <div className="landing-footer-col-title">Company</div>
                  <a href="#" className="landing-footer-link">
                    About
                  </a>
                  <a href="#" className="landing-footer-link">
                    Blog
                  </a>
                  <a href="#" className="landing-footer-link">
                    Contact
                  </a>
                </div>
                <div>
                  <div className="landing-footer-col-title">Legal</div>
                  <a href="#" className="landing-footer-link">
                    Terms
                  </a>
                  <a href="#" className="landing-footer-link">
                    Privacy
                  </a>
                </div>
              </div>

              <div className="landing-footer-bottom">
                <span>© 2026 Stage</span>
                <div className="landing-footer-bottom-links">
                  <a href="#features" className="landing-footer-bottom-link">
                    Features
                  </a>
                  <a href="#faq" className="landing-footer-bottom-link">
                    FAQ
                  </a>
                  <a href="#pricing" className="landing-footer-bottom-link">
                    Pricing
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function FeatureCard({
  title,
  description,
  points,
  mockup,
  gray,
  featured,
  mockupType,
}: {
  title: string;
  description: string;
  points: string[];
  mockup: React.ReactNode;
  gray?: boolean;
  featured?: boolean;
  mockupType?: "image" | "ui";
}) {
  return (
    <div className={`landing-feature-card ${featured ? "featured" : ""}`}>
      <div className={`landing-feature-mockup ${gray ? "gray" : ""} ${mockupType === "image" ? "image" : ""}`}>
        {mockup}
      </div>
      <div className="landing-feature-body">
        <div className="landing-feature-title">{title}</div>
        <div className="landing-feature-desc">{description}</div>
        <div className="landing-feature-checks">
          {points.map((point) => (
            <div key={point} className="landing-feature-check">
              <CheckIcon />
              {point}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SmallFeatureCard({
  title,
  description,
  mockup,
}: {
  title: string;
  description: string;
  mockup?: React.ReactNode;
}) {
  return (
    <div className={`landing-feature-card small ${mockup ? "" : "no-mock"}`}>
      {mockup ? <div className="landing-feature-mockup gray small-mock">{mockup}</div> : null}
      <div className="landing-feature-body">
        <div className="landing-feature-title">{title}</div>
        <div className="landing-feature-desc">{description}</div>
      </div>
    </div>
  );
}

function FeatureImage({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="landing-feature-image" loading="lazy" />;
}

function PortalMockup() {
  return (
    <div className="landing-fm-portal">
      <div className="landing-fm-portal-header">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
        <span className="landing-fm-portal-url">stage.app/share/acme-studio</span>
      </div>
      <div className="landing-fm-portal-body simple">
        <div className="landing-fm-line w60" />
        <div className="landing-fm-progress">
          <div className="landing-fm-progress-fill" />
        </div>
        <div className="landing-fm-portal-copy">65% complete</div>
        <div className="landing-fm-lines">
          <div className="landing-fm-line w90" />
          <div className="landing-fm-line w70" />
          <div className="landing-fm-line w80" />
        </div>
      </div>
    </div>
  );
}


function PaymentMockup() {
  const payments = [
    { client: "Northline", amount: "$3,200", status: "paid" },
    { client: "Aster Labs", amount: "$1,800", status: "pending" },
    { client: "Acme Studio", amount: "$4,500", status: "paid" },
  ] as const;

  return (
    <div className="landing-fm-payments">
      <div className="landing-fm-payment-list">
        {payments.map((payment) => (
          <div key={payment.client} className="landing-fm-payment-row">
            <div className="landing-fm-payment-left">
              <span className={`landing-fm-payment-dot ${payment.status}`} aria-hidden="true" />
              <span className="landing-fm-payment-name">{payment.client}</span>
            </div>
            <div className="landing-fm-payment-right">
              <span className="landing-fm-payment-amount">{payment.amount}</span>
              <span className={`landing-fm-payment-badge ${payment.status}`}>
                {payment.status === "paid" ? "Paid" : "Pending"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const INTEGRATION_ICONS = [
  { src: new URL("../../assets/icons/stripe.svg", import.meta.url).href, name: "Stripe" },
  { src: new URL("../../assets/icons/figma.svg", import.meta.url).href, name: "Figma" },
  { src: new URL("../../assets/icons/notion.svg", import.meta.url).href, name: "Notion" },
  { src: new URL("../../assets/icons/slack.svg", import.meta.url).href, name: "Slack" },
] as const;

function PrivacyMockup() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pulseRef = useRef<HTMLSpanElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const rows = rowRefs.current.filter((row): row is HTMLDivElement => row !== null);
    if (rows.length === 0) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return () => {
        rows.forEach((row) => gsap.killTweensOf(row));
        if (pulseRef.current) {
          gsap.killTweensOf(pulseRef.current);
        }
      };
    }

    const pulseTween = pulseRef.current
      ? gsap.to(pulseRef.current, {
          scale: 1.18,
          opacity: 0.28,
          duration: 1.05,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })
      : null;

    const rowTimeline = gsap.timeline({
      repeat: -1,
      repeatDelay: 0.18,
    });

    rows.forEach((row, index) => {
      const at = index * 0.48;
      rowTimeline
        .to(
          row,
          {
            backgroundColor: "rgba(238, 237, 254, 0.82)",
            borderColor: "rgba(135, 130, 245, 0.28)",
            duration: 0.32,
            ease: "power2.out",
          },
          at,
        )
        .to(
          row,
          {
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderColor: "rgba(232, 232, 232, 1)",
            duration: 0.3,
            ease: "power2.inOut",
          },
          at + 0.33,
        );
    });

    return () => {
      rowTimeline.kill();
      pulseTween?.kill();
      rows.forEach((row) => gsap.killTweensOf(row));
      if (pulseRef.current) {
        gsap.killTweensOf(pulseRef.current);
      }
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const bounds = root.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    gsap.to(root, {
      rotateY: x * 6,
      rotateX: -y * 6,
      duration: 0.22,
      ease: "power2.out",
      transformPerspective: 700,
      transformOrigin: "center",
      overwrite: true,
    });
  };

  const handleMouseLeave = () => {
    if (!rootRef.current) {
      return;
    }

    gsap.to(rootRef.current, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.3,
      ease: "power3.out",
      overwrite: true,
    });
  };

  return (
    <div
      className="landing-privacy-mockup"
      ref={rootRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-hidden="true"
    >
      <div className="landing-privacy-head">
        <div className="landing-privacy-core">
          <span ref={pulseRef} className="landing-privacy-core-pulse" />
          <span className="landing-privacy-core-dot" />
        </div>
        <div className="landing-privacy-head-copy">
          <span className="landing-privacy-head-title">Private mode</span>
          <span className="landing-privacy-head-status">Always on</span>
        </div>
      </div>
      <div className="landing-privacy-rows">
        {[
          "Encrypted project data",
          "No ad tracking scripts",
          "GDPR-compliant sharing",
        ].map((label, index) => (
          <div
            key={label}
            className="landing-privacy-row"
            ref={(element) => {
              rowRefs.current[index] = element;
            }}
          >
            <span className="landing-privacy-row-dot" />
            <span className="landing-privacy-row-label">{label}</span>
            <span className="landing-privacy-row-track">
              <span />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsMockup() {
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const icons = iconRefs.current.filter((icon): icon is HTMLDivElement => icon !== null);
    if (icons.length === 0) {
      return;
    }

    const highlightByIndex = (activeIndex: number, duration: number) => {
      icons.forEach((icon, iconIndex) => {
        const isActive = iconIndex === activeIndex;
        gsap.to(icon, {
          y: isActive ? -7 : 0,
          scale: isActive ? 1.1 : 1,
          borderColor: isActive ? "rgba(135, 130, 245, 0.36)" : "rgba(232, 232, 232, 1)",
          boxShadow: isActive
            ? "0 12px 26px rgba(135, 130, 245, 0.2)"
            : "0 6px 14px rgba(26, 26, 46, 0.08)",
          duration,
          ease: "power2.out",
          overwrite: true,
        });
      });
    };

    highlightByIndex(0, 0);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => {
        icons.forEach((icon) => gsap.killTweensOf(icon));
      };
    }

    let loopTween: gsap.core.Tween | null = null;
    let activeIndex = 0;
    const runCycle = () => {
      activeIndex = (activeIndex + 1) % icons.length;
      highlightByIndex(activeIndex, 0.45);
      loopTween = gsap.delayedCall(1.9, runCycle);
    };

    loopTween = gsap.delayedCall(1.2, runCycle);

    return () => {
      loopTween?.kill();
      icons.forEach((icon) => gsap.killTweensOf(icon));
    };
  }, []);

  return (
    <div className="landing-integrations-orbit" aria-hidden="true">
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

function CheckIcon() {
  return <Check weight="bold" />;
}
