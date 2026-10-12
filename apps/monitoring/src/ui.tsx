import type { ReactNode } from "react";
import { statusLabels } from "./data";

export function Badge({ status }: { status: string }) {
  return <span className={`badge ${status}`}><span aria-hidden="true" />{statusLabels[status] ?? (status === "disconnected" ? "Not connected" : status)}</span>;
}

export function Card({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}><div className="card-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div><div className="card-body">{children}</div></section>;
}
