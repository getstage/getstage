import { useEffect, useRef, useState } from "react";
import { RewardClaimDialog } from "./RewardClaimDialog";

function ShareDialog({ url, local, published, close, edit }: {
  reward?: boolean; url: string; local: boolean; published: boolean; close: () => void; edit: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [copy, setCopy] = useState<"idle" | "busy" | "done">("idle");
  const [status, setStatus] = useState("");
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  const canShare = local || published;
  const x = `https://x.com/intent/post?text=${encodeURIComponent(`Here’s what I build with — my tools, skills and components, curated on Stage.\n${url}`)}`;
  async function copyLink() {
    setCopy("busy"); setStatus("");
    try { await navigator.clipboard.writeText(url); setCopy("done"); }
    catch { setCopy("idle"); input.current?.focus(); input.current?.select(); setStatus("Copy the selected link manually."); }
  }
  return <dialog ref={dialog} id="share-dialog" className="resource-modal profile-dialog" onCancel={close} aria-labelledby="profile-dialog-title">
    <button className="resource-modal-close" onClick={close} aria-label="Close">×</button>
    <header className="resource-modal-heading">
      <span className="modal-glyph"><img src="/marketplace-assets/resources/share.svg" width="14" height="14" alt="" /></span>
      <h2 id="profile-dialog-title">Share profile</h2>
      <p>Share your tools, skills and components<br />with friends and fellow builders.</p>
    </header>
    <>
      <div className="resource-modal-body">{canShare ? <><label htmlFor="share-url">URL Link</label><input ref={input} id="share-url" type="url" value={url} readOnly onClick={event => event.currentTarget.select()} /><p className="form-note">{local ? "Prototype link · uses this browser’s saved profile." : "Anyone with this link can see your published profile."}</p></> : <p className="form-note">Publish your profile in Edit profile before sharing it.</p>}</div>
      <div className="resource-modal-actions">{canShare ? <>
        <button className={`resource-modal-primary ${copy === "done" ? "is-copied" : ""}`} type="button" disabled={copy === "busy"} aria-busy={copy === "busy"} onClick={() => void copyLink()}>
          <img src="/landing-preview/assets/icons/documents.svg" width="15" height="15" alt="" /><span className="copy-check" aria-hidden="true" hidden={copy !== "done"}><svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="white" /><path d="m6 10 2.5 2.5L14 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>{copy === "done" ? "Copied" : copy === "busy" ? "Copying…" : "Copy Link"}</span>
        </button><a className="resource-modal-secondary" href={x} target="_blank" rel="noopener noreferrer">Share on X ↗</a>
      </> : <button className="resource-modal-primary" onClick={edit}>Edit profile</button>}<button className="resource-modal-secondary" type="button" onClick={close}>Cancel</button></div>
    </>
    <p className="modal-status" role="status">{status}</p>
  </dialog>;
}

export function ProfileShareDialog(props: Parameters<typeof ShareDialog>[0]) {
  return props.reward ? <RewardClaimDialog url={props.url} close={props.close} /> : <ShareDialog {...props} />;
}
