import { ArrowDown, ArrowRight, Check, FileText, LockKey } from "@phosphor-icons/react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import specification from "../../../docs/STA-31_MONITORING_BUILD_SPEC.md?raw";
import { audit, download, phases, setup } from "./data";
import { Badge, Card } from "./ui";

const markdownComponents: Components = {
  img: ({ alt }) => <span>{alt || "Image"} (repo image; external loading disabled)</span>,
  h2: ({ children }) => <h2 id={`spec-${String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}>{children}</h2>,
  a: ({ href, children }) => {
    // Spec anchors scroll within the document, not the app's hash navigation.
    if (href?.startsWith("#")) return <a href={href} onClick={event => {
      event.preventDefault();
      document.getElementById(`spec-${href.slice(1)}`)?.scrollIntoView({ block: "start" });
    }}>{children}</a>;
    if (href?.startsWith("https://")) return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    return <span title={`Repository reference: ${href ?? ""}`}>{children} <small>(repo document)</small></span>;
  },
};

export function Plan() {
  return <>
    <div className="plan-policy"><LockKey size={21} /><div><strong>Testing first. Stop at every acceptance gate.</strong><p>Phase 1 is prepared, not accepted. No deployment to production and no production secrets.</p></div></div>
    <div className="plan-list">{phases.map(phase => <Card key={phase.id} title={phase.name} description={phase.area} action={<Badge status={phase.status} />}><div className="phase-body"><span className={`large-phase ${phase.status === "in_progress" ? "active" : ""}`}>{String(phase.id).padStart(2, "0")}</span><div><p>{phase.description}</p><div className="acceptance"><Check size={16} /><div><strong>Done when</strong><p>{phase.acceptance}</p></div></div><details className="file-details"><summary>Files to create or change · {phase.files.length} locations</summary><ul>{phase.files.map(file => <li key={file}><code>{file}</code></li>)}</ul></details><a href="#audit" className="text-link">{audit.filter(item => item.phase === phase.id).length} audit findings <ArrowRight size={14} /></a></div></div></Card>)}</div>
    <Card title="Full build specification" description="Read directly from the living repo document. Nothing copied or forked." action={<button className="button" onClick={() => download("STA-31_MONITORING_BUILD_SPEC.md", specification, "text/markdown;charset=utf-8")}><ArrowDown size={15} />Download spec</button>}>
      <details className="spec-details"><summary><FileText size={18} />Open the complete STA-31 specification</summary><article className="markdown"><Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{specification}</Markdown></article></details>
    </Card>
  </>;
}

export function Setup() {
  return <>
    <div className="notice"><span className="notice-icon"><LockKey size={23} /></span><div><strong>No need to send passwords or tokens in chat.</strong><p>Provide account access; credentials belong in Railway variables or Cloudflare secrets.</p></div></div>
    <div className="setup-grid">{setup.map((item, index) => <Card key={item.title} title={item.title} action={<span className="setup-owner">{item.owner}</span>}><div className="setup-step"><span>{String(index + 1).padStart(2, "0")}</span><p>{item.detail}</p></div><div className="unlocks"><LockKey size={14} />{item.unlocks}</div></Card>)}</div>
    <Card title="What engineering will handle" description="Once access and decisions are in place, you do not need to wire the pipeline yourself."><div className="engineering-list">{["Create and validate the stack in the approved Stage workspace", "Add authenticated Worker ingestion and privacy-safe shared contracts", "Instrument the engine, desktop and cloud without changing billing", "Provision dashboards and prove every alert works on testing"].map(text => <p key={text}><Check size={17} />{text}</p>)}</div><a className="text-link" href="#plan">See all phases and acceptance gates <ArrowRight size={14} /></a></Card>
  </>;
}
