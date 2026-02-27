import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ClockCountdown,
  Lightning,
  Plus,
  SealCheck,
} from "@phosphor-icons/react";
import { Helmet } from "react-helmet-async";
import stageLogo from "@/assets/logos/stage-logo-light.png";
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

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number>(0);
  const [isYearly, setIsYearly] = useState(false);

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
            <span className="landing-hero-badge">Built for creative professionals</span>
            <h1 className="landing-hero-title">Project clarity for designers and freelancers</h1>
            <p className="landing-hero-subtitle">
              Track projects, manage phases, monitor payments. Everything you need to run your
              creative work — without the chaos.
            </p>
            <div className="landing-hero-buttons">
              <Link to="/auth" className="landing-btn landing-btn-cta">
                Get started
              </Link>
              <a href="#features" className="landing-btn landing-btn-ghost">
                See demo
              </a>
            </div>
          </div>

          <div className="landing-hero-visual">
            <svg
              className="landing-hero-gradient"
              viewBox="0 0 1440 420"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E8E0FF" />
                  <stop offset="100%" stopColor="#D8E8FF" />
                </linearGradient>
                <linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#C8BFFD" />
                  <stop offset="100%" stopColor="#A8CBF0" />
                </linearGradient>
                <linearGradient id="lg3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9B8AF7" />
                  <stop offset="50%" stopColor="#8B83F5" />
                  <stop offset="100%" stopColor="#6DB4E8" />
                </linearGradient>
                <linearGradient id="lg4" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7B72E8" />
                  <stop offset="100%" stopColor="#4A9EDE" />
                </linearGradient>
              </defs>
              <path
                d="M0,140 C120,60 280,200 480,100 C680,0 800,180 1000,100 C1160,40 1340,160 1440,120 L1440,420 L0,420 Z"
                fill="url(#lg1)"
              />
              <path
                d="M0,220 C140,160 320,300 520,200 C720,100 880,260 1080,180 C1240,120 1380,240 1440,200 L1440,420 L0,420 Z"
                fill="url(#lg2)"
              />
              <path
                d="M0,290 C160,230 340,360 540,270 C740,180 900,320 1100,250 C1260,200 1380,300 1440,270 L1440,420 L0,420 Z"
                fill="url(#lg3)"
              />
              <path
                d="M0,350 C140,310 320,400 520,340 C720,280 900,380 1100,320 C1280,270 1400,360 1440,340 L1440,420 L0,420 Z"
                fill="url(#lg4)"
              />
            </svg>

            <div className="landing-hero-mockup">
              <div className="landing-mockup-nav">
                <span className="landing-mockup-logo">Stage</span>
                <div className="landing-mockup-avatar">
                  <img src="https://randomuser.me/api/portraits/men/46.jpg" alt="" />
                </div>
              </div>
              <div className="landing-mockup-body">
                <div className="landing-mockup-greeting">Good morning, Sam</div>
                <div className="landing-mockup-stats">
                  <div>
                    <div className="landing-mockup-stat-label">Active</div>
                    <div className="landing-mockup-stat-value">9</div>
                  </div>
                  <div>
                    <div className="landing-mockup-stat-label">Tasks Due</div>
                    <div className="landing-mockup-stat-value">14</div>
                  </div>
                  <div>
                    <div className="landing-mockup-stat-label">Completed</div>
                    <div className="landing-mockup-stat-value">12</div>
                  </div>
                </div>

                <div className="landing-mockup-timeline">
                  <svg viewBox="0 0 892 140" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="curveGradLanding" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8782F5" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#8782F5" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,120 C80,120 120,120 180,100 C240,80 280,40 360,35 C440,30 500,50 560,55 C620,60 680,90 740,95 C800,100 840,110 892,115 L892,140 L0,140 Z"
                      fill="url(#curveGradLanding)"
                    />
                    <path
                      d="M0,120 C80,120 120,120 180,100 C240,80 280,40 360,35 C440,30 500,50 560,55 C620,60 680,90 740,95 C800,100 840,110 892,115"
                      fill="none"
                      stroke="#8782F5"
                      strokeWidth="2"
                      opacity="0.5"
                    />
                  </svg>
                </div>

                <div className="landing-mockup-grid">
                  {[60, 45, 72, 35].map((fill, index) => (
                    <div key={index} className="landing-mockup-card">
                      <div className="landing-mockup-card-label">Metric</div>
                      <div className="landing-mockup-card-value">{index === 2 ? "$8.2k" : 3 + index}</div>
                      <div className="landing-mockup-card-bar">
                        <div className="landing-mockup-card-bar-fill" style={{ width: `${fill}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                  kicker="Command Center"
                  title="Timeline Overview"
                  description="See all your projects mapped across time. The elevation curve shows workload density at a glance."
                  points={[
                    "Real-time workload visualization",
                    "Hover to inspect any date",
                    "Filter by week, month, quarter, or year",
                  ]}
                  mockup={<TimelineMockup />}
                  featured
                />
                <FeatureCard
                  kicker="Client Visibility"
                  title="Client Portal"
                  description="Share a live, read-only view with your clients. They see progress without the noise."
                  points={["Branded sharing links", "Real-time sync", "No client login required"]}
                  mockup={<PortalMockup />}
                  gray
                />
              </div>

              <div className="landing-features-row r2">
                <FeatureCard
                  kicker="Workflow"
                  title="Phase Management"
                  description="Break projects into clear phases with tasks. Drag, reorder, check off."
                  points={[
                    "Drag-to-reorder phases",
                    "AI-generated roadmaps",
                    "Progress tracking per phase",
                  ]}
                  mockup={<PhaseMockup />}
                />
                <FeatureCard
                  kicker="Revenue"
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
                  kicker="Security"
                  title="Privacy-first"
                  description="Your data stays yours. No selling, no tracking, no ads. GDPR-compliant by default."
                  mockup={<SecurityMockup />}
                />
                <SmallFeatureCard
                  kicker="Connections"
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
            <h2 className="landing-section-title">Get started in minutes</h2>
            <p className="landing-section-subtitle">
              Setting up Stage is faster than making coffee. No credit card, no contracts, no onboarding calls.
            </p>
            <div className="landing-steps-grid">
              <div className="landing-step-card">
                <div className="landing-step-number">1</div>
                <div className="landing-step-title">Create a project</div>
                <div className="landing-step-desc">
                  Name your client, pick a project type, and you're in.
                </div>
              </div>
              <div className="landing-step-card">
                <div className="landing-step-number">2</div>
                <div className="landing-step-title">Track progress</div>
                <div className="landing-step-desc">
                  Add phases, check off tasks, connect Stripe for payments.
                </div>
              </div>
              <div className="landing-step-card">
                <div className="landing-step-number">3</div>
                <div className="landing-step-title">Stay informed</div>
                <div className="landing-step-desc">
                  See your timeline, workload curve, and revenue at a glance.
                </div>
              </div>
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
              <div className="landing-pricing-left">
                <div className="landing-pricing-visual">
                  <div className="landing-pv-inner">
                    <div className="landing-pv-big-number">{"∞"}</div>
                    <div className="landing-pv-label">Unlimited projects on Pro</div>
                    <div className="landing-pv-projects">
                      {[
                        "https://randomuser.me/api/portraits/men/32.jpg",
                        "https://randomuser.me/api/portraits/women/68.jpg",
                        "https://randomuser.me/api/portraits/men/75.jpg",
                        "https://randomuser.me/api/portraits/women/22.jpg",
                      ].map((avatar, index) => (
                        <div key={index} className="landing-pv-project">
                          <div className="landing-pv-project-inner">
                            <img src={avatar} alt="" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="landing-pricing-right">
                <div className="landing-pricing-card">
                  <div className="landing-pricing-toggle-wrap">
                    <div className="landing-pricing-toggle">
                      <button
                        type="button"
                        className={`landing-pricing-toggle-btn ${isYearly ? "" : "active"}`}
                        onClick={() => setIsYearly(false)}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        className={`landing-pricing-toggle-btn ${isYearly ? "active" : ""}`}
                        onClick={() => setIsYearly(true)}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>
                  <div className="landing-pricing-plan-name">Pro</div>
                  <div className="landing-pricing-price">
                    <span className="landing-pricing-amount">{isYearly ? "$9" : "$12"}</span>
                    <span className="landing-pricing-period">/month</span>
                  </div>
                  <div className="landing-pricing-billing">
                    {isYearly ? "Billed annually ($108/year)" : "Billed monthly"}
                  </div>

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
                <a href="#features" className="landing-btn landing-btn-ghost">
                  See demo
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-container">
            <div className="landing-footer-grid">
              <div>
                <div className="landing-footer-brand-name">Stage</div>
                <div className="landing-footer-brand-desc">
                  Project management built for creative professionals. Track work, manage clients,
                  get paid.
                </div>
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
            <div className="landing-footer-bottom">© 2026 Stage</div>
          </div>
        </footer>
      </div>
    </>
  );
}

function FeatureCard({
  kicker,
  title,
  description,
  points,
  mockup,
  gray,
  featured,
}: {
  kicker: string;
  title: string;
  description: string;
  points: string[];
  mockup: React.ReactNode;
  gray?: boolean;
  featured?: boolean;
}) {
  return (
    <div className={`landing-feature-card ${featured ? "featured" : ""}`}>
      <div className={`landing-feature-mockup ${gray ? "gray" : ""}`}>{mockup}</div>
      <div className="landing-feature-body">
        <div className="landing-feature-meta">{kicker}</div>
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
  kicker,
  title,
  description,
  mockup,
}: {
  kicker: string;
  title: string;
  description: string;
  mockup: React.ReactNode;
}) {
  return (
    <div className="landing-feature-card small">
      <div className="landing-feature-mockup gray small-mock">{mockup}</div>
      <div className="landing-feature-body">
        <div className="landing-feature-meta">{kicker}</div>
        <div className="landing-feature-title">{title}</div>
        <div className="landing-feature-desc">{description}</div>
      </div>
    </div>
  );
}

function TimelineMockup() {
  const metrics = [
    { label: "People", value: "3,806", delta: "-19%", trend: "down" },
    { label: "Views", value: "16,239", delta: "-26%", trend: "down" },
    { label: "Bounced", value: "1,548", delta: "-18%", trend: "down" },
    { label: "Duration", value: "3m 36s", delta: "+6%", trend: "up" },
  ] as const;

  return (
    <div className="landing-fm-timeline">
      <div className="landing-fm-timeline-brand">
        <span className="landing-fm-timeline-greeting">Good morning, Sam</span>
        <span className="landing-fm-chip subtle">All</span>
      </div>

      <div className="landing-fm-timeline-head">
        <span className="landing-fm-chip">Today</span>
        <span className="landing-fm-chip">Realtime</span>
      </div>

      <div className="landing-fm-metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className="landing-fm-metric">
            <div className="landing-fm-metric-label">{metric.label}</div>
            <div className="landing-fm-metric-value">{metric.value}</div>
            <div className={`landing-fm-metric-delta ${metric.trend}`}>{metric.delta}</div>
          </div>
        ))}
      </div>

      <div className="landing-fm-chart">
        <svg viewBox="0 0 400 88" preserveAspectRatio="none">
          <defs>
            <linearGradient id="fmCurveLandingFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8782F5" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#8782F5" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path
            d="M0,60 C25,42 45,66 72,56 C98,46 122,60 150,46 C182,30 206,52 232,34 C258,16 290,40 318,36 C344,32 372,60 400,50 L400,88 L0,88 Z"
            fill="url(#fmCurveLandingFill)"
          />
          <path
            d="M0,48 C24,34 50,55 76,46 C104,36 132,50 160,40 C188,30 214,44 242,38 C268,32 298,42 328,38 C354,34 378,48 400,42"
            fill="none"
            stroke="#CFD2DD"
            strokeWidth="1.5"
            opacity="0.85"
          />
          <path
            d="M0,64 C22,50 45,68 74,62 C104,56 126,62 156,56 C184,50 208,58 236,54 C262,50 290,58 322,54 C352,50 378,66 400,60"
            fill="none"
            stroke="#8782F5"
            strokeWidth="2"
            opacity="0.78"
          />
        </svg>
        <span className="landing-fm-chart-time left">00:00</span>
        <span className="landing-fm-chart-time right">19:00</span>
      </div>

      <div className="landing-fm-summary">
        <div className="landing-fm-summary-card">
          <div className="landing-fm-summary-title">152 people in the last 30m</div>
          <div className="landing-fm-bars">
            {[32, 38, 35, 40, 44, 36, 41, 39, 46, 34, 42, 58].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="landing-fm-summary-card score">
          <div className="landing-fm-summary-title">Experience score</div>
          <div className="landing-fm-score-row">
            <span className="landing-fm-score-ring">97</span>
            <span className="landing-fm-score-copy">Excellent</span>
          </div>
        </div>
      </div>
    </div>
  );
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
      <div className="landing-fm-portal-body">
        <div className="landing-fm-portal-title">Acme Studio Website</div>
        <div className="landing-fm-progress">
          <div className="landing-fm-progress-fill" />
        </div>
        <div className="landing-fm-portal-copy">65% complete</div>
        <div className="landing-fm-portal-tags">
          <span className="landing-fm-portal-tag active">Design</span>
          <span className="landing-fm-portal-tag">Content</span>
          <span className="landing-fm-portal-tag">Handoff</span>
        </div>
        <div className="landing-fm-lines">
          <div className="landing-fm-line w90" />
          <div className="landing-fm-line w70" />
          <div className="landing-fm-line w80" />
        </div>
      </div>
    </div>
  );
}

function PhaseMockup() {
  const phases = [
    { name: "Discovery", progress: 100, done: true },
    { name: "Design", progress: 88, done: true },
    { name: "Build", progress: 56, done: false },
    { name: "Launch", progress: 20, done: false },
  ] as const;

  return (
    <div className="landing-fm-phases">
      {phases.map((phase) => (
        <div key={phase.name} className="landing-fm-phase-row">
          <div className="landing-fm-phase-item">
            <span className={`landing-fm-phase-check ${phase.done ? "done" : ""}`} />
            <span className="landing-fm-phase-name">{phase.name}</span>
            <span className="landing-fm-phase-percent">{phase.progress}%</span>
          </div>
          <div className="landing-fm-phase-track">
            <span style={{ width: `${phase.progress}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentMockup() {
  const payments = [
    { client: "Northline", amount: "$3,200", status: "Paid" },
    { client: "Aster Labs", amount: "$1,800", status: "Pending" },
    { client: "Acme Studio", amount: "$4,500", status: "Paid" },
    { client: "Brightside", amount: "$2,400", status: "Pending" },
  ] as const;

  return (
    <div className="landing-fm-payments">
      {payments.map((payment) => (
        <div key={payment.client} className="landing-fm-payment-row">
          <div className="landing-fm-payment-left">
            <span className="landing-fm-payment-avatar">{payment.client.slice(0, 1)}</span>
            <span className="landing-fm-payment-name">{payment.client}</span>
          </div>
          <div className="landing-fm-payment-right">
            <span className="landing-fm-payment-amount">{payment.amount}</span>
            <span className={`landing-fm-payment-badge ${payment.status === "Paid" ? "paid" : "pending"}`}>
              {payment.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SecurityMockup() {
  return (
    <div className="landing-fm-mini">
      <div className="landing-fm-mini-row">
        <span className="landing-fm-mini-dot" />
        <span className="landing-fm-mini-line w70" />
        <span className="landing-fm-mini-pill">Encrypted</span>
      </div>
      <div className="landing-fm-mini-row">
        <span className="landing-fm-mini-dot" />
        <span className="landing-fm-mini-line w60" />
        <span className="landing-fm-mini-pill">GDPR</span>
      </div>
      <div className="landing-fm-mini-row">
        <span className="landing-fm-mini-dot" />
        <span className="landing-fm-mini-line w80" />
        <span className="landing-fm-mini-pill">No Ads</span>
      </div>
    </div>
  );
}

function IntegrationsMockup() {
  return (
    <div className="landing-fm-mini integrations">
      <div className="landing-fm-mini-chips">
        <span>Stripe</span>
        <span>Figma</span>
        <span>Notion</span>
      </div>
      <div className="landing-fm-mini-track">
        <span />
      </div>
      <div className="landing-fm-mini-line w90" />
      <div className="landing-fm-mini-line w70" />
    </div>
  );
}

function CheckIcon() {
  return <Check weight="bold" />;
}
