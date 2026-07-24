import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { FaqSection } from "./FaqSection";
import { TestimonialsSection } from "./TestimonialsSection";
import "@/styles/stage-v2-tokens.css";
import "@/styles/stage-v2-landing.css";

const DEFAULT_SITE_URL = "https://usestage.com";
const LANDING_TITLE = "Stage - The AI workspace for designers";
const LANDING_DESCRIPTION =
  "Stage is the only tool where designers manage clients, run research, and generate designs in one place. Powered by your AI, not ours.";
const TEAM_MIN_SEATS = 3;
const TEAM_MONTHLY_PRICE = 49;
const TEAM_YEARLY_PRICE = 41;
const TEAM_EXTRA_MONTHLY_SEAT_PRICE = 15;
const TEAM_EXTRA_YEARLY_SEAT_PRICE = 12;


export function StageV2LandingPage() {
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [studioSeats, setStudioSeats] = useState(TEAM_MIN_SEATS);
  const [isHeroVideoMuted, setIsHeroVideoMuted] = useState(true);
  const [hasHeroVideoEnded, setHasHeroVideoEnded] = useState(false);
  const canonicalUrl =
    typeof window === "undefined"
      ? DEFAULT_SITE_URL
      : new URL("/", window.location.origin).toString();
  const ogImageUrl =
    typeof window === "undefined"
      ? `${DEFAULT_SITE_URL}/og-image.png`
      : new URL("/og-image.png", window.location.origin).toString();

  useEffect(() => {
    document.documentElement.classList.add("js");
    document.documentElement.classList.add("stage-v2-page");
    return () => {
      document.documentElement.classList.remove("js");
      document.documentElement.classList.remove("stage-v2-page");
    };
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll(".stage-v2-landing .reveal");
    if (!("IntersectionObserver" in window) || targets.length === 0) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -4% 0px" });
    targets.forEach((el) => observer.observe(el));
    const fallback = window.setTimeout(() => {
      document.querySelectorAll(".stage-v2-landing .reveal:not(.is-in)").forEach((el) => el.classList.add("is-in"));
    }, 4000);
    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);


  const pricePeriod = billingPeriod === "yearly" ? "/month, billed yearly" : "/month";
  const teamPrice =
    (billingPeriod === "yearly" ? TEAM_YEARLY_PRICE : TEAM_MONTHLY_PRICE) +
    Math.max(0, studioSeats - TEAM_MIN_SEATS) *
      (billingPeriod === "yearly" ? TEAM_EXTRA_YEARLY_SEAT_PRICE : TEAM_EXTRA_MONTHLY_SEAT_PRICE);

  function toggleHeroVideoSound() {
    const video = heroVideoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsHeroVideoMuted(nextMuted);
    if (video.paused && !video.ended) {
      void video.play().catch(() => {});
    }
  }

  function replayHeroVideo() {
    const video = heroVideoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setHasHeroVideoEnded(false);
    void video.play().catch(() => {});
  }

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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={LANDING_TITLE} />
        <meta name="twitter:description" content={LANDING_DESCRIPTION} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Helmet>

      <div className="stage-v2-landing">
        {/* ─── NAV ──────────────────────────────────────────────── */}
          <header className="nav-wrap">
            <nav className="nav" aria-label="Primary">
              <a className="nav-brand" href="#top" aria-label="Stage home">
                <img src="/stage-v2-lp/assets/logo-mark.svg" alt="" width="22" height="22" />
                <span className="wordmark">Stage</span>
              </a>
              <ul className="nav-links" role="list">
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/auth">Login</a></li>
              </ul>
              <a className="btn btn-primary btn-sm" href="/auth">Start for free</a>
            </nav>
          </header>
        
          <main id="top">
        
            {/* ─── HERO ───────────────────────────────────────────── */}
            <section className="hero">
              <div className="hero-grad" aria-hidden="true"></div>
              <div className="container hero-inner">
                <div className="hero-copy reveal">
                  <h1 className="hero-title">Stage is your design agent for<br />building products people love.</h1>
                  <div className="hero-ctas">
                    <a className="btn btn-primary btn-hero" href="/auth">
                      Start 14-day free trial
                      <svg className="btn-ico" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3.5 8h9m0 0L8.5 4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </div>
        
                <div className="hero-visual reveal">
                  <div className={`hero-video-wrap ${hasHeroVideoEnded ? "is-ended" : ""}`}>
                    <video
                      ref={heroVideoRef}
                      className="hero-video"
                      src="/stage-v2-lp/assets/videos/hero.mp4"
                      poster="/stage-v2-lp/assets/videos/hero-poster.jpg"
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      onEnded={() => setHasHeroVideoEnded(true)}
                      onPlay={() => setHasHeroVideoEnded(false)}
                    />
                    <button
                      className={`hv-btn hv-sound ${isHeroVideoMuted ? "" : "is-on"}`}
                      type="button"
                      aria-label={isHeroVideoMuted ? "Unmute video" : "Mute video"}
                      aria-pressed={!isHeroVideoMuted}
                      onClick={toggleHeroVideoSound}
                    >
                      <svg className="hv-ico-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" />
                        <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <svg className="hv-ico-sound" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" />
                        <path d="M15 9.3a4 4 0 0 1 0 5.4M17.6 7a7.5 7.5 0 0 1 0 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button className="hv-btn hv-replay" type="button" aria-label="Replay video" onClick={replayHeroVideo}>
                      Replay
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 12a8 8 0 1 0 2.3-5.6M6 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </section>
        
            {/* ─── LOGO BAR ───────────────────────────────────────── */}
            <section className="logobar">
              <div className="container">
                <p className="logobar-label">Trusted by designers using</p>
                <ul className="logobar-list" role="list">
                  <li><img src="https://unpkg.com/simple-icons@v13/icons/anthropic.svg" alt="Claude" /><span>Claude</span></li>
                  <li><img src="https://unpkg.com/simple-icons@v13/icons/openai.svg" alt="Codex" /><span>Codex</span></li>
                  <li><img src="https://unpkg.com/simple-icons@v13/icons/figma.svg" alt="Figma" /><span>Figma</span></li>
                  <li><img src="https://unpkg.com/simple-icons@v13/icons/notion.svg" alt="Notion" /><span>Notion</span></li>
                  <li><img className="is-paper" src="/stage-v2-lp/assets/icons/paper.svg" alt="Paper" /><span>Paper</span></li>
                </ul>
              </div>
            </section>

            <div className="container">
              <span className="sect-rule" aria-hidden="true" />
            </div>

            <TestimonialsSection />
        
            {/* ─── FEATURES ───────────────────────────────────────── */}
            <section id="features" className="features">
              <div className="container features-stack">
        
                {/* Feature 1 */}
                <article className="feature reveal">
                  <header className="feature-head">
                    <h2 className="feature-title">Every project, one place.</h2>
                    <p className="feature-sub">Track phases, tasks, and timelines the way designers actually work. See every project at a glance and know what's next.</p>
                  </header>
                  <div className="feature-visual">
                    <video className="feature-video" src="/stage-v2-lp/assets/videos/stage-1.mp4" autoPlay muted loop playsInline preload="metadata" />
                  </div>
                </article>
        
                {/* Feature 2 */}
                <article className="feature reveal feature-flip">
                  <header className="feature-head">
                    <h2 className="feature-title">Research, then strategy.</h2>
                    <p className="feature-sub">Drop a URL and Stage analyzes competitors, positioning, and patterns - then turns it into a strategy you can approve.</p>
                  </header>
                  <div className="feature-visual">
                    <video className="feature-video" src="/stage-v2-lp/assets/videos/stage-2.mp4" autoPlay muted loop playsInline preload="metadata" />
                  </div>
                </article>
        
                {/* Feature 3 */}
                <article className="feature reveal">
                  <header className="feature-head">
                    <h2 className="feature-title">Direction before design.</h2>
                    <p className="feature-sub">Explore moodboards, lock a visual direction, then turn it into flows and wireframes you can actually build from.</p>
                  </header>
                  <div className="feature-visual">
                    <video className="feature-video" src="/stage-v2-lp/assets/videos/stage-3.mp4" autoPlay muted loop playsInline preload="metadata" />
                  </div>
                </article>
        
                {/* Feature 4 */}
                <article className="feature reveal feature-flip">
                  <header className="feature-head">
                    <h2 className="feature-title">Hand off your way.</h2>
                    <p className="feature-sub">Push your work to Figma, code, or Paper, connect your own AI and tools, then hand the whole project off in one click.</p>
                  </header>
                  <div className="feature-visual">
                    <video className="feature-video" src="/stage-v2-lp/assets/videos/stage-4.mp4" autoPlay muted loop playsInline preload="metadata" />
                  </div>
                </article>
        
              </div>
            </section>
        
            {/* ─── PRICING ────────────────────────────────────────── */}
            <section id="pricing" className="pricing">
              <div className="container">
                <header className="pricing-head reveal">
                  <h2 className="section-title">Pricing that fits how you build.</h2>
                  <div className="billing-toggle" role="tablist" aria-label="Billing period">
                    <button
                      className={`bt-opt ${billingPeriod === "monthly" ? "is-active" : ""}`}
                      role="tab"
                      aria-selected={billingPeriod === "monthly"}
                      type="button"
                      onClick={() => setBillingPeriod("monthly")}
                    >
                      Monthly
                    </button>
                    <button
                      className={`bt-opt ${billingPeriod === "yearly" ? "is-active" : ""}`}
                      role="tab"
                      aria-selected={billingPeriod === "yearly"}
                      type="button"
                      onClick={() => setBillingPeriod("yearly")}
                    >
                      Yearly <span className="bt-save">Save 17%</span>
                    </button>
                  </div>
                </header>
        
                <div className="price-grid reveal">
                  {/* Start */}
                  <article className="price-card">
                    <header className="price-head">
                      <h3 className="price-name">Start</h3>
                    </header>
                    <div className="price-body">
                      <div className="price-amount">
                        <span className="price-num">{billingPeriod === "yearly" ? "$16" : "$19"}</span>
                        <span className="price-per">{pricePeriod}</span>
                      </div>
                      <p className="price-desc">For builders shipping their first real products.</p>
                    </div>
                    <ul className="price-feats" role="list">
                      <li><img src="/stage-v2-lp/assets/icons/seats.svg" alt="" />1 seat</li>
                      <li><img src="/stage-v2-lp/assets/icons/ai.svg" alt="" />Full design workflow</li>
                      <li><img src="/stage-v2-lp/assets/icons/projects.svg" alt="" />5,000 credits/mo (~20 projects)</li>
                      <li><img src="/stage-v2-lp/assets/icons/connect.svg" alt="" />Bring your own Claude or Codex</li>
                      <li><img src="/stage-v2-lp/assets/icons/storage.svg" alt="" />No second AI bill</li>
                      <li><img src="/stage-v2-lp/assets/icons/portal.svg" alt="" />Standard client portal</li>
                    </ul>
                    <a className="btn btn-secondary btn-block" href="/auth">Start 14-Day Trial</a>
                  </article>
        
                  {/* Pro */}
                  <article className="price-card price-card-featured">
                    <header className="price-head">
                      <h3 className="price-name price-name-brand">Pro</h3>
                      <span className="price-tag price-tag-brand">Most Popular</span>
                    </header>
                    <div className="price-body">
                      <div className="price-amount">
                        <span className="price-num">{billingPeriod === "yearly" ? "$24" : "$29"}</span>
                        <span className="price-per">{pricePeriod}</span>
                      </div>
                      <p className="price-desc">For freelancers who need full control.</p>
                    </div>
                    <ul className="price-feats" role="list">
                      <li><img src="/stage-v2-lp/assets/icons/ai.svg" alt="" />Everything in Start</li>
                      <li><img src="/stage-v2-lp/assets/icons/projects.svg" alt="" />10,000 credits/mo (~40 projects)</li>
                      <li><img src="/stage-v2-lp/assets/icons/connect.svg" alt="" />Unlimited projects</li>
                      <li><img src="/stage-v2-lp/assets/icons/portal.svg" alt="" />Custom portal, your brand &amp; domain</li>
                      <li><img src="/stage-v2-lp/assets/icons/storage.svg" alt="" />Top up credits anytime</li>
                      <li><img src="/stage-v2-lp/assets/icons/support.svg" alt="" />Priority support</li>
                    </ul>
                    <a className="btn btn-primary btn-block" href="/auth">Start 14-Day Trial</a>
                  </article>
        
                  {/* Team */}
                  <article className="price-card">
                    <header className="price-head">
                      <h3 className="price-name">Team</h3>
                      <span className="price-tag">Team</span>
                    </header>
                    <div className="price-body">
                      <div className="price-row">
                        <div className="price-amount">
                          <span className="price-num is-studio-price">${teamPrice}</span>
                          <span className="price-per">{pricePeriod}</span>
                        </div>
                        <div className="seat-stepper" role="group" aria-label="Seats"
                             data-min={TEAM_MIN_SEATS} data-seats={studioSeats}
                             data-base-monthly={TEAM_MONTHLY_PRICE} data-base-yearly={TEAM_YEARLY_PRICE}
                             data-extra-monthly={TEAM_EXTRA_MONTHLY_SEAT_PRICE} data-extra-yearly={TEAM_EXTRA_YEARLY_SEAT_PRICE}>
                          <button type="button" className="seat-btn seat-dec" aria-label="Remove seat" disabled={studioSeats <= TEAM_MIN_SEATS} onClick={() => setStudioSeats((seats) => Math.max(TEAM_MIN_SEATS, seats - 1))}>-</button>
                          <span className="seat-count">{studioSeats}</span>
                          <button type="button" className="seat-btn seat-inc" aria-label="Add seat" onClick={() => setStudioSeats((seats) => seats + 1)}>+</button>
                        </div>
                      </div>
                      <p className="price-desc">For small teams building together.</p>
                    </div>
                    <ul className="price-feats" role="list">
                      <li><img src="/stage-v2-lp/assets/icons/ai.svg" alt="" />Everything in Pro</li>
                      <li><img src="/stage-v2-lp/assets/icons/seats.svg" alt="" />3 seats, $15/mo per extra</li>
                      <li><img src="/stage-v2-lp/assets/icons/projects.svg" alt="" />18,000 pooled credits/mo (~70 projects)</li>
                      <li><img src="/stage-v2-lp/assets/icons/connect.svg" alt="" />Shared project workspace</li>
                      <li><img src="/stage-v2-lp/assets/icons/storage.svg" alt="" />Top up credits anytime</li>
                      <li><img src="/stage-v2-lp/assets/icons/support.svg" alt="" />Priority support</li>
                    </ul>
                    <a className="btn btn-secondary btn-block" href="/auth">Start 14-Day Trial</a>
                  </article>
                </div>
              </div>
            </section>

            <div className="container">
              <span className="sect-rule" aria-hidden="true" />
            </div>

            <FaqSection />
        
          </main>
        
          {/* ─── FOOTER ───────────────────────────────────────────── */}
          <footer className="footer">
            <div className="container">
              <div className="footer-cta reveal">
                <h2 className="footer-headline">Your workflow.<br />Your AI. Your rules.</h2>
                <a className="btn btn-primary" href="/auth">Start for free</a>
              </div>
        
              <div className="footer-cols">
                <a className="footer-brand" href="#top" aria-label="Stage home">
                  <img src="/stage-v2-lp/assets/logo-mark.svg" alt="" width="22" height="22" />
                </a>
                <div className="footer-col">
                  <h4>Product</h4>
                  <ul role="list">
                    <li><a href="#features">Features</a></li>
                    <li><a href="#pricing">Pricing</a></li>
                    <li><a href="/auth">Login</a></li>
                    <li><a href="/auth">Sign up</a></li>
                  </ul>
                </div>
                <div className="footer-col">
                  <h4>Workflow</h4>
                  <ul role="list">
                    <li><a href="#features">Projects</a></li>
                    <li><a href="#features">Research</a></li>
                    <li><a href="#features">Strategy</a></li>
                    <li><a href="#features">Client portal</a></li>
                  </ul>
                </div>
                <div className="footer-col">
                  <h4>Resources</h4>
                  <ul role="list">
                    <li><a href="#examples">Examples</a></li>
                    <li><a href="#templates">Templates</a></li>
                    <li><a href="#changelog">Changelog</a></li>
                    <li><a href="#faq">FAQ</a></li>
                  </ul>
                </div>
                <div className="footer-col">
                  <h4>Company</h4>
                  <ul role="list">
                    <li><a href="#contact">Contact</a></li>
                    <li><a href="#privacy">Privacy</a></li>
                    <li><a href="#terms">Terms</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </footer>
      </div>
    </>
  );
}
