import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Helmet } from "react-helmet-async";
import "@/styles/stage-v2-tokens.css";
import "@/styles/stage-v2-landing.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const DEFAULT_SITE_URL = "https://usestage.com";
const LANDING_TITLE = "Stage - The AI workspace for designers";
const LANDING_DESCRIPTION =
  "Stage is the only tool where designers manage clients, run research, and generate designs in one place. Powered by your AI, not ours.";

type HeroKanbanStatus = "backlog" | "todo" | "in-progress" | "done";
type HeroTask = {
  id: string;
  phase: "Research" | "Strategy" | "Identity" | "Guidelines";
  title: string;
  description: string;
  done?: boolean;
  assignee?: boolean;
};
type HeroColumns = Record<HeroKanbanStatus, HeroTask[]>;
type HeroActiveDrag = {
  task: HeroTask;
  sourceColumn: HeroKanbanStatus;
  width: number;
  height: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  x: number;
  y: number;
};

const HERO_COLUMNS: { key: HeroKanbanStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To-do" },
  { key: "in-progress", label: "In-progress" },
  { key: "done", label: "Done" },
];

const HERO_INITIAL_COLUMNS: HeroColumns = {
  backlog: [
    { id: "audit-ia", phase: "Research", title: "Audit current site IA", description: "Map every page, surface dead-ends, and list outdated copy.", assignee: true },
    { id: "positioning", phase: "Strategy", title: "Draft positioning angles", description: "Three POVs: utility, lifestyle, prosumer. Pick one to validate.", assignee: true },
    { id: "wordmark", phase: "Identity", title: "Wordmark exploration", description: "Six directions, low-fi. Mix custom and modified type." },
  ],
  todo: [
    { id: "tokens", phase: "Guidelines", title: "Define color tokens", description: "Pull from product UI, name semantically, document contrast." },
    { id: "findings", phase: "Strategy", title: "Approve research findings", description: "Walk stakeholders through, capture objections, finalize.", assignee: true },
    { id: "grid", phase: "Identity", title: "Mark grid system", description: "Lock construction grid, optical adjustments, clear-space rules." },
    { id: "type-ramp", phase: "Guidelines", title: "Type ramp & spacing", description: "Five sizes, vertical rhythm, hard limits at 13/15/20/32/56." },
  ],
  "in-progress": [
    { id: "hero-v2", phase: "Identity", title: "Hero composition v2", description: "Tighter type, breathing room, one focal product cell." },
    { id: "competitors", phase: "Research", title: "Competitor scan - 8 brands", description: "Tear down hero, CTA, and pricing patterns. Tag the unusual." },
  ],
  done: [
    { id: "interviews", phase: "Research", title: "Stakeholder interviews", description: "Six conversations, themes captured, quotes archived in Notion.", done: true },
    { id: "kickoff", phase: "Strategy", title: "Kickoff alignment", description: "Scope, timeline, comms. Signed off in Slack on Monday.", done: true },
  ],
};

export function StageV2LandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [studioSeats, setStudioSeats] = useState(3);
  const [heroColumns, setHeroColumns] = useState<HeroColumns>(HERO_INITIAL_COLUMNS);
  const [activeHeroDrag, setActiveHeroDrag] = useState<HeroActiveDrag | null>(null);
  const [heroDragOverColumn, setHeroDragOverColumn] = useState<HeroKanbanStatus | null>(null);
  const [heroDropBeforeTaskId, setHeroDropBeforeTaskId] = useState<string | null>(null);
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
    return () => document.documentElement.classList.remove("js");
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

  useEffect(() => {
    if (!activeHeroDrag) return;
    const draggedId = activeHeroDrag.task.id;

    function handlePointerMove(event: globalThis.PointerEvent) {
      setActiveHeroDrag((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);
      const target = getHeroDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      setHeroDragOverColumn(target?.column ?? null);
      setHeroDropBeforeTaskId(target?.beforeTaskId ?? null);
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const target = getHeroDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      if (target) {
        moveHeroTask(draggedId, target.column, target.beforeTaskId);
      }
      setActiveHeroDrag(null);
      setHeroDragOverColumn(null);
      setHeroDropBeforeTaskId(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [activeHeroDrag]);

  function getHeroColumnFromPoint(x: number, y: number) {
    const element = document.elementFromPoint(x, y);
    const columnElement = element?.closest<HTMLElement>("[data-kanban-column]");
    const status = columnElement?.dataset.kanbanColumn;
    return HERO_COLUMNS.find((column) => column.key === status)?.key ?? null;
  }

  function getHeroDropTargetFromPoint(x: number, y: number, draggedId: string) {
    const column = getHeroColumnFromPoint(x, y);
    if (!column) return null;

    const taskElements = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-kanban-column="${column}"] [data-kanban-task-id]`),
    );
    const beforeElement = taskElements.find((element) => {
      if (element.dataset.kanbanTaskId === draggedId) return false;
      const rect = element.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });

    return { column, beforeTaskId: beforeElement?.dataset.kanbanTaskId ?? null };
  }

  function findHeroTask(taskId: string) {
    for (const column of HERO_COLUMNS) {
      const task = heroColumns[column.key].find((item) => item.id === taskId);
      if (task) return { task, sourceColumn: column.key };
    }
    return null;
  }

  function startHeroDragging(event: PointerEvent<HTMLElement>, taskId: string) {
    if (event.button !== 0) return;
    const item = findHeroTask(taskId);
    if (!item) return;

    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();

    setActiveHeroDrag({
      ...item,
      width: rect.width,
      height: rect.height,
      pointerOffsetX: event.clientX - rect.left,
      pointerOffsetY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
    });
    setHeroDropBeforeTaskId(null);
  }

  function moveHeroTask(taskId: string, targetColumn: HeroKanbanStatus, beforeTaskId?: string | null) {
    if (taskId === beforeTaskId) return;

    setHeroColumns((current) => {
      let movingTask: HeroTask | undefined;
      const next = { ...current };

      for (const column of HERO_COLUMNS) {
        next[column.key] = current[column.key].filter((task) => {
          if (task.id === taskId) {
            movingTask = task;
            return false;
          }
          return true;
        });
      }

      if (!movingTask) return current;

      const targetTasks = [...next[targetColumn]];
      const updatedTask = { ...movingTask, done: targetColumn === "done" };
      const insertionIndex = beforeTaskId ? targetTasks.findIndex((task) => task.id === beforeTaskId) : -1;

      if (insertionIndex >= 0) {
        targetTasks.splice(insertionIndex, 0, updatedTask);
      } else {
        targetTasks.push(updatedTask);
      }

      next[targetColumn] = targetTasks;
      return next;
    });
  }

  const studioPrice = billingPeriod === "yearly" ? 41 + (studioSeats - 3) * 12 : 49 + (studioSeats - 3) * 15;
  const pricePeriod = billingPeriod === "yearly" ? "/month, billed yearly" : "/month";

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
                  <h1 className="hero-title">The AI workspace for<br />product &amp; web designers.</h1>
                  <p className="hero-sub">It takes care of the process so you can focus on the pixels.</p>
                </div>
        
                {/* Interactive Stage Dashboard mockup (recreated from the Figma source). */}
                <div className="hero-visual reveal">
                  <img className="happ-mobile" src="/hero/hero-mobile.webp" alt="Stage project workflow on mobile" />
                  <div className="happ">
                    {/* Sidebar (icon rail) */}
                    <aside className="happ-rail">
                      <div className="happ-rail-top">
                        <a className="happ-logo" href="#top" aria-label="Stage"><img src="/stage-v2-lp/assets/hero/stage-logo.svg" alt="Stage" width="19" height="23"/></a>
                        <button className="happ-pill happ-pill-search" tabIndex={-1} aria-label="Search"><img src="/stage-v2-lp/assets/hero/nav-search.svg" alt="" width="15" height="15"/></button>
                        <nav className="happ-nav" aria-label="Sections">
                          <button className="happ-pill" tabIndex={-1} aria-label="Home"><img src="/stage-v2-lp/assets/hero/nav-home.svg" alt="" width="15" height="15"/></button>
                          <button className="happ-pill is-active" tabIndex={-1} aria-label="Projects"><img src="/stage-v2-lp/assets/hero/nav-projects.svg" alt="" width="15" height="15"/></button>
                          <button className="happ-pill" tabIndex={-1} aria-label="Tasks"><img src="/stage-v2-lp/assets/hero/nav-tasks.svg" alt="" width="15" height="15"/></button>
                          <button className="happ-pill" tabIndex={-1} aria-label="Eye"><img src="/stage-v2-lp/assets/hero/nav-eye.svg" alt="" width="15" height="15"/></button>
                          <button className="happ-pill" tabIndex={-1} aria-label="Integrations"><img src="/stage-v2-lp/assets/hero/nav-integrations.svg" alt="" width="15" height="15"/></button>
                          <button className="happ-pill" tabIndex={-1} aria-label="Profile"><img src="/stage-v2-lp/assets/hero/nav-profile.svg" alt="" width="15" height="15"/></button>
                        </nav>
                        <ul className="happ-projects" role="list">
                          <li><img className="happ-pava" src="/stage-v2-lp/assets/hero/proj-baseframe.svg" alt="BaseFrame" width="20" height="20"/></li>
                          <li><img className="happ-pava" src="/stage-v2-lp/assets/hero/proj-test.svg" alt="Test Project" width="20" height="20"/></li>
                        </ul>
                      </div>
                      <div className="happ-rail-bottom">
                        <button className="happ-pill" tabIndex={-1} aria-label="Help"><img src="/stage-v2-lp/assets/hero/nav-help.svg" alt="" width="15" height="15"/></button>
                        <button className="happ-pill happ-pill-user" tabIndex={-1} aria-label="Account"><img className="happ-uava" src="/stage-v2-lp/assets/hero/user-pratik.png" alt="" width="24" height="24"/></button>
                      </div>
                    </aside>
        
                    {/* Main panel */}
                    <section className="happ-main">
                      <header className="happ-head">
                        <div className="happ-title-row">
                          <h2 className="happ-title">Apple Website Redesign</h2>
                          <div className="happ-title-actions">
                            <button className="happ-share" tabIndex={-1}>Share <img src="/stage-v2-lp/assets/hero/ic-share.svg" alt="" width="13" height="13"/></button>
                            <button className="happ-more" tabIndex={-1} aria-label="More"><img src="/stage-v2-lp/assets/hero/ic-more.svg" alt="" width="15" height="15"/></button>
                          </div>
                        </div>
                        <p className="happ-sub">Buy Stage</p>
        
                        <div className="happ-tabs" role="tablist">
                          <button className="htab is-active" role="tab" tabIndex={-1}><img src="/stage-v2-lp/assets/hero/tab-overview.svg" alt="" width="13" height="13"/> Overview</button>
                          <button className="htab" role="tab" tabIndex={-1}><img src="/stage-v2-lp/assets/hero/tab-research.svg" alt="" width="13" height="13"/> Research</button>
                          <button className="htab" role="tab" tabIndex={-1}><img src="/stage-v2-lp/assets/hero/tab-strategy.svg" alt="" width="13" height="13"/> Strategy</button>
                          <button className="htab" role="tab" tabIndex={-1}><img src="/stage-v2-lp/assets/hero/tab-moodboard.svg" alt="" width="13" height="13"/> Moodboard</button>
                          <button className="htab" role="tab" tabIndex={-1}><img src="/stage-v2-lp/assets/hero/tab-flows.svg" alt="" width="13" height="13"/> Flows</button>
                          <button className="htab" role="tab" tabIndex={-1}><img src="/stage-v2-lp/assets/hero/tab-generate.svg" alt="" width="13" height="13"/> Wireframes</button>
                          <button className="htab" role="tab" tabIndex={-1}><img src="/stage-v2-lp/assets/hero/tab-assets.svg" alt="" width="13" height="13"/> Assets</button>
                        </div>
                      </header>
        
                      <div className={`kban ${activeHeroDrag ? "is-interacted" : ""}`}>
                        <div className="kban-grid">
                          {HERO_COLUMNS.map((column) => (
                            <section
                              key={column.key}
                              className={`kcol ${column.key === "done" ? "kcol-done" : ""} ${heroDragOverColumn === column.key && activeHeroDrag ? "is-drop-over" : ""}`}
                              data-kanban-column={column.key}
                            >
                              <div className="kcol-h">
                                <span>{column.label}</span>
                                {column.key !== "done" ? (
                                  <button className="kadd" tabIndex={-1} aria-label="Add">
                                    <img src="/stage-v2-lp/assets/hero/ic-plus.svg" alt="" width="12" height="12"/>
                                  </button>
                                ) : null}
                              </div>
                              <div className="kcol-stack">
                                {heroColumns[column.key].map((task) => {
                                  const isDragging = activeHeroDrag?.task.id === task.id;

                                  if (isDragging) {
                                    return heroDragOverColumn ? null : <HeroTaskSkeleton key={task.id} />;
                                  }

                                  return (
                                    <div key={task.id} className="kitem" data-kanban-task-id={task.id}>
                                      {activeHeroDrag && heroDragOverColumn === column.key && heroDropBeforeTaskId === task.id ? <HeroTaskSkeleton /> : null}
                                      <HeroTaskCard
                                        task={task}
                                        dimmed={column.key === "done"}
                                        onPointerDown={(event) => startHeroDragging(event, task.id)}
                                      />
                                    </div>
                                  );
                                })}
                                {activeHeroDrag && heroDragOverColumn === column.key && heroDropBeforeTaskId === null ? <HeroTaskSkeleton /> : null}
                              </div>
                            </section>
                          ))}
                        </div>
                        {activeHeroDrag ? (
                          <div
                            className="kcard-float"
                            style={{
                              left: activeHeroDrag.x - activeHeroDrag.pointerOffsetX,
                              top: activeHeroDrag.y - activeHeroDrag.pointerOffsetY,
                              width: activeHeroDrag.width,
                              height: activeHeroDrag.height,
                            }}
                          >
                            <HeroTaskCard task={{ ...activeHeroDrag.task, done: activeHeroDrag.sourceColumn === "done" }} dragging />
                          </div>
                        ) : null}
                      </div>
                    </section>
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
                  <li><img src="/stage-v2-lp/assets/icons/stitch.svg" alt="Stitch" /><span>Stitch</span></li>
                </ul>
              </div>
            </section>
        
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
                    <div className="bezel">
                      <ProjectsShowcase />
                    </div>
                  </div>
                </article>
        
                {/* Feature 2 */}
                <article className="feature reveal feature-flip">
                  <header className="feature-head">
                    <h2 className="feature-title">Research, then strategy.</h2>
                    <p className="feature-sub">Drop a URL and Stage analyzes competitors, positioning, and patterns - then turns it into a strategy you can approve.</p>
                  </header>
                  <div className="feature-visual">
                    <div className="bezel">
                      <div className="bezel-core demo-placeholder"></div>
                    </div>
                  </div>
                </article>
        
                {/* Feature 3 */}
                <article className="feature reveal">
                  <header className="feature-head">
                    <h2 className="feature-title">From strategy to screens.</h2>
                    <p className="feature-sub">Turn your approved strategy into brand concepts and wireframes, then push it straight to Figma when you're ready.</p>
                  </header>
                  <div className="feature-visual">
                    <div className="bezel">
                      <div className="bezel-core demo-placeholder"></div>
                    </div>
                  </div>
                </article>
        
                {/* Feature 4 */}
                <article className="feature reveal feature-flip">
                  <header className="feature-head">
                    <h2 className="feature-title">Share work your way.</h2>
                    <p className="feature-sub">Give clients a clean, branded space to see progress, leave feedback, and approve deliverables - no more status emails.</p>
                  </header>
                  <div className="feature-visual">
                    <div className="bezel">
                      <div className="bezel-core demo-placeholder"></div>
                    </div>
                  </div>
                </article>
        
              </div>
            </section>
        
            {/* ─── PRICING ────────────────────────────────────────── */}
            <section id="pricing" className="pricing">
              <div className="container">
                <header className="pricing-head reveal">
                  <h2 className="section-title">Simple pricing.<br />Scales with your studio.</h2>
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
                        <span className="price-num">{billingPeriod === "yearly" ? "$7" : "$9"}</span>
                        <span className="price-per">{pricePeriod}</span>
                      </div>
                      <p className="price-desc">For solo designers getting started.</p>
                    </div>
                    <ul className="price-feats" role="list">
                      <li><img src="/stage-v2-lp/assets/icons/projects.svg" alt="" />3 active projects</li>
                      <li><img src="/stage-v2-lp/assets/icons/connect.svg" alt="" />Connect claude, figma, notion &amp; more</li>
                      <li><img src="/stage-v2-lp/assets/icons/portal.svg" alt="" />Client portal (Stage branding)</li>
                      <li><img src="/stage-v2-lp/assets/icons/storage.svg" alt="" />Unlimited file storage</li>
                      <li><img src="/stage-v2-lp/assets/icons/ai.svg" alt="" />Full AI workflow access</li>
                      <li><img src="/stage-v2-lp/assets/icons/support.svg" alt="" />Standard support</li>
                    </ul>
                    <a className="btn btn-secondary btn-block" href="/auth">Get Started</a>
                  </article>
        
                  {/* Pro */}
                  <article className="price-card price-card-featured">
                    <header className="price-head">
                      <h3 className="price-name price-name-brand">Pro</h3>
                      <span className="price-tag price-tag-brand">Most Popular</span>
                    </header>
                    <div className="price-body">
                      <div className="price-amount">
                        <span className="price-num">{billingPeriod === "yearly" ? "$16" : "$19"}</span>
                        <span className="price-per">{pricePeriod}</span>
                      </div>
                      <p className="price-desc">For freelancers who need full control.</p>
                    </div>
                    <ul className="price-feats" role="list">
                      <li><img src="/stage-v2-lp/assets/icons/projects.svg" alt="" />Unlimited projects</li>
                      <li><img src="/stage-v2-lp/assets/icons/connect.svg" alt="" />Connect claude, figma, notion &amp; more</li>
                      <li><img src="/stage-v2-lp/assets/icons/portal.svg" alt="" />Custom client portal</li>
                      <li><img src="/stage-v2-lp/assets/icons/storage.svg" alt="" />Unlimited file storage</li>
                      <li><img src="/stage-v2-lp/assets/icons/ai.svg" alt="" />Full AI workflow access</li>
                      <li><img src="/stage-v2-lp/assets/icons/support.svg" alt="" />Priority support</li>
                    </ul>
                    <a className="btn btn-primary btn-block" href="/auth">Start 7-Day Trial</a>
                  </article>
        
                  {/* Studio */}
                  <article className="price-card">
                    <header className="price-head">
                      <h3 className="price-name">Studio</h3>
                      <span className="price-tag">Team Plan</span>
                    </header>
                    <div className="price-body">
                      <div className="price-row">
                        <div className="price-amount">
                          <span className="price-num is-studio-price">{`$${studioPrice}`}</span>
                          <span className="price-per">{pricePeriod}</span>
                        </div>
                        <div className="seat-stepper" role="group" aria-label="Seats"
                             data-min="3" data-seats="3"
                             data-base-monthly="49" data-base-yearly="41"
                             data-extra-monthly="15" data-extra-yearly="12">
                          <button type="button" className="seat-btn seat-dec" aria-label="Remove seat" disabled={studioSeats <= 3} onClick={() => setStudioSeats((seats) => Math.max(3, seats - 1))}>-</button>
                          <span className="seat-count">{studioSeats}</span>
                          <button type="button" className="seat-btn seat-inc" aria-label="Add seat" onClick={() => setStudioSeats((seats) => seats + 1)}>+</button>
                        </div>
                      </div>
                      <p className="price-desc">For design teams and studios.</p>
                    </div>
                    <ul className="price-feats" role="list">
                      <li><img src="/stage-v2-lp/assets/icons/seats.svg" alt="" />3 seats included</li>
                      <li><img src="/stage-v2-lp/assets/icons/projects.svg" alt="" />Unlimited projects</li>
                      <li><img src="/stage-v2-lp/assets/icons/portal.svg" alt="" />Custom client portal</li>
                      <li><img src="/stage-v2-lp/assets/icons/connect.svg" alt="" />Shared workspace &amp; integrations</li>
                      <li><img src="/stage-v2-lp/assets/icons/roles.svg" alt="" />Role permissions (owner, designer, viewer)</li>
                      <li><img src="/stage-v2-lp/assets/icons/support.svg" alt="" />Priority support</li>
                    </ul>
                    <a className="btn btn-secondary btn-block" href="/auth">Start 7-Day Trial</a>
                  </article>
                </div>
              </div>
            </section>
        
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

function ProjectsShowcase() {
  const showcaseRef = useRef<HTMLDivElement | null>(null);
  const firstImageRef = useRef<HTMLImageElement | null>(null);
  const secondImageRef = useRef<HTMLImageElement | null>(null);

  useGSAP(
    () => {
      const showcase = showcaseRef.current;
      const firstImage = firstImageRef.current;
      const secondImage = secondImageRef.current;
      if (!showcase || !firstImage || !secondImage) return;

      gsap.set(firstImage, {
        autoAlpha: 1,
        scale: 1,
        xPercent: 0,
        yPercent: 0,
        transformOrigin: "center center",
      });
      gsap.set(secondImage, {
        autoAlpha: 1,
        scale: 1,
        xPercent: 105,
        yPercent: 0,
        transformOrigin: "center center",
      });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(secondImage, { autoAlpha: 0 });
        return;
      }

      const timeline = gsap.timeline({ repeat: -1, paused: true });
      timeline
        .to(firstImage, {
          scale: 1.13,
          yPercent: 6,
          duration: 1.15,
          ease: "power2.inOut",
        })
        .to({}, { duration: 0.55 })
        .to(firstImage, {
          scale: 1.16,
          yPercent: -7,
          duration: 1.35,
          ease: "power2.inOut",
        })
        .to({}, { duration: 0.55 })
        .to(firstImage, {
          xPercent: -105,
          duration: 0.72,
          ease: "power3.inOut",
        })
        .to(
          secondImage,
          {
            xPercent: 0,
            duration: 0.72,
            ease: "power3.inOut",
          },
          "<",
        )
        .to(secondImage, {
          scale: 1.17,
          xPercent: 7,
          yPercent: -9,
          duration: 1.05,
          ease: "power2.inOut",
        })
        .to(secondImage, {
          xPercent: -7,
          duration: 1.55,
          ease: "power2.inOut",
        })
        .to({}, { duration: 0.65 })
        .set(firstImage, { scale: 1, xPercent: 105, yPercent: 0 })
        .to(secondImage, {
          xPercent: -105,
          duration: 0.72,
          ease: "power3.inOut",
        })
        .to(
          firstImage,
          {
            xPercent: 0,
            duration: 0.72,
            ease: "power3.inOut",
          },
          "<",
        )
        .set(secondImage, { scale: 1, xPercent: 105, yPercent: 0 });

      const trigger = ScrollTrigger.create({
        trigger: showcase,
        start: "top 90%",
        end: "bottom 10%",
        onEnter: () => timeline.play(),
        onEnterBack: () => timeline.play(),
        onLeave: () => timeline.pause(),
        onLeaveBack: () => timeline.pause(),
      });

      return () => {
        trigger.kill();
        timeline.kill();
      };
    },
    { scope: showcaseRef },
  );

  return (
    <div ref={showcaseRef} className="projects-showcase" aria-label="Stage projects interface showcase">
      <img
        ref={firstImageRef}
        className="projects-showcase-image"
        src="/stage-v2-lp/graphics/projects-1.webp"
        alt="Stage projects overview"
        loading="lazy"
      />
      <img
        ref={secondImageRef}
        className="projects-showcase-image"
        src="/stage-v2-lp/graphics/projects-2.webp"
        alt="Stage project timeline overview"
        loading="lazy"
      />
    </div>
  );
}

function HeroTaskSkeleton() {
  return <div className="kskeleton" />;
}

function HeroTaskCard({
  task,
  dimmed = false,
  dragging = false,
  onPointerDown,
}: {
  task: HeroTask;
  dimmed?: boolean;
  dragging?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
}) {
  return (
    <article
      className={`kcard ${dragging ? "is-floating" : ""} ${dimmed ? "is-dimmed" : ""}`}
      onPointerDown={onPointerDown}
    >
      <header>
        <span className={`ktag ktag-${task.phase.toLowerCase()}`}>{task.phase}</span>
        {task.assignee ? (
          <button className="kava-btn" type="button" tabIndex={-1} aria-label="Assigned to Pratik Singh">
            <img className="kava" src="/stage-v2-lp/assets/hero/ava-card.png" alt="" width="20" height="20"/>
          </button>
        ) : (
          <button className="kava-btn kava-empty" type="button" tabIndex={-1} aria-label="Assign task">
            <img src="/stage-v2-lp/assets/hero/ic-uncheck.svg" alt="" width="12" height="12"/>
          </button>
        )}
      </header>
      <div className="kbody">
        <div className="krow">
          <button className={`kchk ${task.done ? "kchk-on" : ""}`} type="button" tabIndex={-1} aria-label={task.done ? "Completed" : "Not completed"}>
            {task.done ? (
              <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </button>
          <b>{task.title}</b>
        </div>
        <p className="kdesc">{task.description}</p>
      </div>
    </article>
  );
}
