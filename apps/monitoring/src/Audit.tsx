import { useState } from "react";
import { ArrowDown, CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import { audit, exportAudit, phases, statusLabels } from "./data";
import { Badge } from "./ui";

export function Audit() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [phase, setPhase] = useState("all");
  const [owner, setOwner] = useState("all");
  const [expanded, setExpanded] = useState<string>();
  const owners = [...new Set(audit.map(item => item.owner))];
  const filtered = audit.filter(item => (status === "all" || item.status === status)
    && (phase === "all" || String(item.phase) === phase)
    && (owner === "all" || item.owner === owner)
    && [item.id, item.title, item.change, item.owner, item.verification, item.evidence].join(" ").toLowerCase().includes(query.toLowerCase().trim()));
  return <>
    <div className="audit-summary">{Object.entries(statusLabels).map(([key, label]) => <button className={status === key ? "selected" : ""} key={key} onClick={() => setStatus(status === key ? "all" : key)} aria-pressed={status === key}><span className={`status-dot ${key}`} /><span>{label}</span><strong>{audit.filter(item => item.status === key).length}</strong></button>)}</div>
    <section className="card audit-card" aria-label="Implementation audit">
      <div className="audit-toolbar"><label className="search"><MagnifyingGlass size={18} /><input aria-label="Search audit" placeholder="Search changes, owners or evidence…" value={query} onChange={event => setQuery(event.target.value)} /></label><div className="filters"><select aria-label="Filter by phase" value={phase} onChange={event => setPhase(event.target.value)}><option value="all">All phases</option>{phases.map(item => <option value={item.id} key={item.id}>{item.id}. {item.name}</option>)}</select><select aria-label="Filter by owner" value={owner} onChange={event => setOwner(event.target.value)}><option value="all">All owners</option>{owners.map(item => <option key={item}>{item}</option>)}</select><button className="button" onClick={() => exportAudit(filtered)}><ArrowDown size={15} />Export CSV</button></div></div>
      <div className="audit-count" role="status">{filtered.length} of {audit.length} findings <span>Expand a row for the required change, acceptance check and evidence.</span></div>
      <div className="table-scroll"><table><caption className="sr-only">Versioned audit findings and required implementation changes</caption><thead><tr><th>Finding / required change</th><th>Phase</th><th>Priority</th><th>Owner</th><th>Status</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><button className="finding-toggle" aria-expanded={expanded === item.id} aria-controls={`details-${item.id}`} onClick={() => setExpanded(expanded === item.id ? undefined : item.id)}><span><small>{item.id}</small><strong>{item.title}</strong></span><CaretDown size={16} className={expanded === item.id ? "rotated" : ""} /></button><div id={`details-${item.id}`} hidden={expanded !== item.id} className="finding-details"><dl><dt>Change needed</dt><dd>{item.change}</dd><dt>Done when</dt><dd>{item.verification}</dd><dt>Evidence / current state</dt><dd>{item.evidence}</dd></dl></div></td><td><span className="table-phase">{String(item.phase).padStart(2, "0")}</span></td><td><span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span></td><td className="owner-cell">{item.owner}</td><td><Badge status={item.status} /></td></tr>)}</tbody></table></div>
      {filtered.length === 0 && <div className="no-results"><h2>No matching findings</h2><p>Try another search or clear the filters.</p><button className="button" onClick={() => { setQuery(""); setStatus("all"); setPhase("all"); setOwner("all"); }}>Clear filters</button></div>}
    </section>
    <p className="source-note">Shared audit state lives in <code>apps/monitoring/src/data/rollout.json</code>. Changes are reviewed and committed in git; this view does not create browser-only completion claims.</p>
  </>;
}
