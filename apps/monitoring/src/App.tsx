import { lazy, Suspense, useSyncExternalStore } from "react";
import { ChartLine as Activity, ArrowRight, ArrowSquareOut, BookOpen, CheckCircle, ClipboardText, Database, GearSix, ListChecks, LockKey, Pulse, Stack, TerminalWindow } from "@phosphor-icons/react";
import { audit, dataValidation, phases, scope, statusLabels, updatedAt } from "./data";
import { Audit } from "./Audit";
import { Badge, Card } from "./ui";

const Plan = lazy(() => import("./Plan").then(module => ({ default: module.Plan })));
const Setup = lazy(() => import("./Plan").then(module => ({ default: module.Setup })));

const hosted = !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
const grafanaUrl = "https://grafana-testing-038e.up.railway.app";

const navigation = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "plan", label: "Build plan", icon: ClipboardText },
  { id: "audit", label: "Implementation audit", icon: ListChecks },
  { id: "setup", label: "Your setup", icon: GearSix },
] as const;
function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
function snapshot() {
  const id = window.location.hash.slice(1);
  return navigation.some(item => item.id === id) ? id : "overview";
}

export function App() {
  const page = useSyncExternalStore(subscribe, snapshot);
  const current = navigation.find(item => item.id === page) ?? navigation[0];
  if (!dataValidation.success) return <main role="alert"><h1>Monitoring configuration is invalid</h1><p>Fix the versioned rollout data and run the validation tests. No status or live data can be shown safely.</p></main>;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Skip to content</a>
    <aside className="sidebar">
      <a href="#overview" className="brand" aria-label="Stage Monitoring home"><img src="/logos/stage.svg" alt="Stage" width="94" height="30" /><span className="brand-sub">Monitoring</span></a>
      <div className="workspace-label"><span className="workspace-icon"><Stack size={19} /></span><div><strong>Stage workspace</strong><small>Internal operations</small></div><LockKey size={15} className="muted" /></div>
      <span className="nav-label">WORKSPACE</span>
      <nav aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-current={page === id ? "page" : undefined}><Icon size={19} weight="fill" /><span>{label}</span>{id === "audit" && <span className="nav-count">{audit.length}</span>}</a>)}</nav>
      <div className="sidebar-note"><span className="nav-label">THE ROLLOUT</span><p>Observe everything.<br />Expose nothing private.</p><div className="mini-line" /><small>STA-31 · Testing first</small></div>
      <div className="sidebar-bottom"><div className="local-avatar"><TerminalWindow size={20} /></div><div><strong>{hosted ? "Testing workspace" : "Local workspace"}</strong><small>{hosted ? "Login protected" : "Local preview"}</small></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{current.label}</strong></div><span className="local-label"><span />{hosted ? "Protected testing" : "Local foundation"}</span></header>
      <main id="main-content" tabIndex={-1}>
        <div className="page-header"><div><div className="eyebrow">Stage Monitoring <span> / STA-31</span></div><h1>{page === "overview" ? "Know before your users do." : current.label}</h1><p>{page === "overview" ? "One place for the health of Stage. A clear path to getting it live." : page === "plan" ? "Seven phases. Explicit acceptance gates. No production shortcuts." : page === "audit" ? "Every gap, the change it needs, and the evidence that closes it." : "The decisions and access needed from you to move this forward."}</p></div><a className="button primary" href={page === "setup" ? "#plan" : "#setup"}>{page === "setup" ? "View build plan" : "Setup checklist"}<ArrowRight size={15} /></a></div>
        <Suspense fallback={<p role="status">Loading the build specification…</p>}>{page === "overview" ? <Overview /> : page === "audit" ? <Audit /> : page === "plan" ? <Plan /> : <Setup />}</Suspense>
        <footer><span>Stage Monitoring · {hosted ? "Protected testing" : "Local preview"}</span><span>Audit updated {updatedAt} · Repo is the source of truth</span></footer>
      </main>
    </div>
  </div>;
}

function Overview() {
  const blocked = audit.filter(item => item.status === "blocked").length;
  const verified = audit.filter(item => item.status === "verified").length;
  const stats = [
    { icon: Stack, label: "Build phases", value: String(phases.length), note: "Stack → alerts" },
    { icon: ListChecks, label: "Audit items", value: String(audit.length), note: `${verified} verified · ${audit.length - verified} remaining` },
    { icon: LockKey, label: "Needs your input", value: String(blocked), note: "Access, policy & decisions" },
    { icon: Pulse, label: "Telemetry", value: "Awaiting run", note: "Sender built · real-run proof pending" },
  ];
  return <>
    <div className="notice"><span className="notice-icon"><Pulse size={23} /></span><div><strong>The Testing stack is online.</strong><p>{scope}</p></div><a href="#plan">See the rollout <ArrowRight size={14} /></a></div>
    <div className="metric-grid">{stats.map(({ icon: Icon, label, value, note }) => <section className="metric" key={label}><div className="metric-label"><Icon size={19} /><span>{label}</span></div><strong className={value.length > 10 ? "metric-text" : ""}>{value}</strong><small>{note}</small></section>)}</div>
    <div className="overview-grid">
      <Card title="Module health" description="Success, duration and failure reason — for every AI workflow." action={<Badge status="disconnected" />}>
        <div className="empty-health"><div className="signal-icon"><Activity size={31} weight="light" /></div><h3>Waiting for the first real run</h3><p>The Testing stack is connected.<br />Research sender built; signed-in run pending.</p><a className="button" href="#plan">Explore the build plan <ArrowRight size={14} /></a></div>
        <div className="module-tags">{["Research", "Strategy", "Moodboard", "Style guide", "Flows", "Wireframes", "Chat + more"].map(name => <span key={name}>{name}</span>)}</div>
      </Card>
      <Card title="Build progress" description="Acceptance gates, not just checked boxes." action={<span className="quiet-label">{phases.filter(phase => phase.status === "verified").length} / {phases.length} accepted</span>}>
        <ol className="phase-mini">{phases.map(phase => <li key={phase.id}><span className={`phase-number ${phase.status === "in_progress" ? "active" : ""}`}>{phase.id}</span><div><strong>{phase.name}</strong><small>{phase.status === "open" ? "Not started" : statusLabels[phase.status]}</small></div>{phase.status !== "open" ? <Badge status={phase.status} /> : <span className="phase-pending" aria-label="Not started">—</span>}</li>)}</ol>
        <a href="#plan" className="text-link">View acceptance criteria <ArrowRight size={14} /></a>
      </Card>
      <Card title="The telemetry path" description="A secure push pipeline. No collector credentials on a user's Mac." className="pipeline-card">
        <div className="pipeline">{[{ icon: TerminalWindow, title: "Engine + desktop", note: "Bounded, opt-out aware" }, { icon: LockKey, title: "Stage Worker", note: "Auth · validate · rate limit" }, { icon: Stack, title: "OTel Collector", note: "Bearer token · Railway EU" }, { icon: Database, title: "Prometheus + Loki", note: "90-day metrics · 30-day logs" }, { icon: Activity, title: "Grafana", note: "Dashboards + alerts" }].map(({ icon: Icon, title, note }) => <div className="pipeline-node" key={title}><Icon size={21} /><strong>{title}</strong><small>{note}</small></div>)}</div>
      </Card>
      <Card title="Unblock the next step" description="The next proof needs a signed-in Testing run." action={<a href="#audit" className="text-link">All findings <ArrowRight size={14} /></a>}>
        <div className="next-items"><a href="#setup"><span className="finding-priority">P0</span><div><strong>Sign in to Stage Testing</strong><small>Werner · one Research run</small></div><ArrowRight size={16} /></a>{audit.filter(item => item.status === "blocked").slice(0, 2).map(item => <a href="#audit" key={item.id}><span className="finding-priority">{item.priority}</span><div><strong>{item.title}</strong><small>{item.owner} · {item.id}</small></div><ArrowRight size={16} /></a>)}</div>
      </Card>
      <Card title="Built with guardrails" description="Operational visibility, never user content.">
        <ul className="guardrails">{["No prompts, briefs, AI output, names or URLs", "Ids in logs only — never metric labels", "Telemetry cannot block or fail a run", "Testing first; production needs sign-off"].map(text => <li key={text}><CheckCircle size={18} />{text}</li>)}</ul>
        <a className="text-link" href="#plan"><BookOpen size={15} /> Read the full specification</a>
      </Card>
    </div>
    <div className="grafana-note"><ArrowSquareOut size={17} /><span>The real dashboards will live in Grafana. This app tracks rollout and readiness; it does not replace Grafana.</span><a href={grafanaUrl} target="_blank" rel="noreferrer">Open Grafana</a></div>
  </>;
}
