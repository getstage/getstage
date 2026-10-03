import { closeOnDialogBackdrop } from "./dialogBackdrop";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ShareNetwork, Copy, Check, BookmarkSimple, SquaresFour, SignIn } from "@phosphor-icons/react";
import type { CatalogItem } from "./MarketplaceState";

export function ResourceDialog({ children, onClose, titleId }: { children: ReactNode; onClose: () => void; titleId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="resource-modal" aria-labelledby={titleId} onCancel={onClose} onClick={event => closeOnDialogBackdrop(event, onClose)}>{children}</dialog>;
}

export function ResourceShareDialog({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const url = window.location.origin + (item.url || "/tools");
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setError(""); }
    catch { input.current?.focus(); input.current?.select(); setError("Select and copy the link above."); }
  }
  return <ResourceDialog titleId="share-title" onClose={onClose}>
    <header className="resource-modal-heading"><span className="modal-glyph"><ShareNetwork size={18}/></span><h2 id="share-title">Share {item.type === "Skills" ? "skill" : "component library"}</h2><p>Share {item.name} with your team,<br/>friends and colleagues.</p></header>
    <div className="resource-modal-body"><label htmlFor="resource-share-url">URL Link</label><input ref={input} id="resource-share-url" type="url" value={url} readOnly onFocus={event => event.target.select()} /></div>
    <div className="resource-modal-actions"><button className={`resource-modal-primary ${copied ? "is-copied" : ""}`} onClick={() => void copy()}>{copied ? <Check size={15}/> : <Copy size={15}/>}{copied ? "Copied" : "Copy Link"}</button><button className="resource-modal-secondary" onClick={onClose}>Cancel</button></div><p className="modal-status" role="status">{error}</p>
  </ResourceDialog>;
}
export function ResourceSaveDialog({ item, href, onClose }: { item: CatalogItem; href: string; onClose: () => void }) {
  return <ResourceDialog titleId="save-title" onClose={onClose}><header className="resource-modal-heading"><span className="modal-glyph"><BookmarkSimple size={18}/></span><h2 id="save-title">Save {item.name} to your profile</h2><p>Log in to keep your favorite tools, skills<br/>and component libraries in one place.</p></header><div className="resource-modal-actions"><a className="resource-modal-primary" href={href}>Log in or create an account</a><button className="resource-modal-secondary" onClick={onClose}>Cancel</button></div></ResourceDialog>;
}

export function ResourceUseDialog({ item, authenticated, onClose }: { item: CatalogItem; authenticated: boolean; onClose: () => void }) {
  const returnTo = `${item.url || "/component-libraries"}?use=1`;
  return <ResourceDialog titleId="use-title" onClose={onClose}>
    <button className="resource-modal-close" aria-label="Close" onClick={onClose}>×</button>
    <header className="resource-modal-heading">
      <span className="modal-glyph"><SquaresFour size={18}/></span>
      <h2 id="use-title">Use {item.name} in Stage</h2>
      <p>{authenticated ? "Bring this library into your next project with the Stage desktop app." : "Log in to use this component library inside Stage and start your next project."}</p>
    </header>
    <div className="resource-modal-body resource-modal-actions resource-use-panel">
      {authenticated ? <>
        <a className="resource-modal-primary" href="/download"><img src="/landing-preview/assets/icons/apple.svg" width={12} height={12} alt="" aria-hidden="true"/>Download Stage for free</a>
        <p className="resource-use-hint">Already have Stage?<br/>Use this library in your next Stage project.</p>
      </> : <>
        <a className="resource-modal-primary" href={`/auth?mode=login&redirect=${encodeURIComponent(returnTo)}`}><SignIn size={15}/>Log in to Stage</a>
        <button className="resource-modal-secondary" onClick={onClose}>Cancel</button>
      </>}
    </div>
  </ResourceDialog>;
}
