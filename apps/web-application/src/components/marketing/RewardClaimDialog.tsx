import { useEffect, useRef, useState } from 'react';
import { Gift, CheckCircle, MagnifyingGlass, WarningCircle, Copy, Check } from '@phosphor-icons/react';

type Result = 'approved' | 'unrelated' | 'unavailable' | 'claimed';
type State = 'entry' | 'checking' | Result;

// Design prototype only: replace the simulated result with server verification before release.
export function RewardClaimDialog({ url, close }: { url: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>('entry');
  const [result, setResult] = useState<Result>('approved');
  const [post, setPost] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  useEffect(() => {
    if (state !== 'checking') return;
    const timer = window.setTimeout(() => setState(result), 2200);
    return () => window.clearTimeout(timer);
  }, [state, result]);
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(`My tools, skills and components, curated on Stage.\n${url}`)}`;
  const titles: Record<State, string> = {
    entry: 'Share your stack. Get a month free.', checking: 'Checking your post…',
    approved: 'Your free month is ready.', unrelated: 'Your profile link is missing.',
    unavailable: 'We couldn’t read your post.', claimed: 'This post has already been used.',
  };
  const descriptions: Record<State, string> = {
    entry: 'Share your profile on X, then add your post link below.',
    checking: 'Checking that your post is public and shares your Stage profile.',
    approved: 'Thanks for sharing your stack. Use your code at checkout for one month free.',
    unrelated: 'We couldn’t find your Stage profile in this post. Share your profile link, then try again.',
    unavailable: 'Make sure the post is public and the link is correct, then try again.',
    claimed: 'A reward has already been claimed for this post. Each post can only be used once.',
  };
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const value = new URL(post.trim());
      if (value.protocol !== 'https:' || !['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(value.hostname) || !/^\/[A-Za-z0-9_]+\/status\/\d+\/?$/.test(value.pathname)) throw new Error();
      setError(''); setState('checking');
    } catch { setError('Enter a valid X post link.'); }
  }
  return <dialog ref={dialog} id="claim-dialog" className="resource-modal profile-dialog reward-claim-dialog" onCancel={close} aria-labelledby="reward-title">
    <button className="resource-modal-close" onClick={close} aria-label="Close">×</button>
    <header className="resource-modal-heading" aria-live="polite">
      <span className={`claim-reward-icon reward-icon-${state}`} aria-hidden="true">{state === 'approved' ? <CheckCircle size={28}/> : state === 'checking' ? <MagnifyingGlass size={28}/> : state === 'entry' ? <Gift size={28} weight="duotone"/> : <WarningCircle size={28}/>}</span>
      <h2 id="reward-title">{titles[state]}</h2><p>{descriptions[state]}</p>
    </header>
    {state === 'entry' ? <form onSubmit={submit} noValidate>
      <div className="resource-modal-body">
        <a className="resource-modal-secondary claim-share" href={shareUrl} target="_blank" rel="noopener noreferrer">Share on X ↗</a>
        <label htmlFor="reward-post">X post URL</label>
        <input id="reward-post" type="url" value={post} placeholder="https://x.com/you/status/…" aria-invalid={!!error} aria-describedby="reward-error" onChange={event => { setPost(event.target.value); setError(''); }}/>
        <p id="reward-error" className="field-error" role="alert">{error}</p>
      </div>
      <div className="resource-modal-actions"><button type="submit" className="resource-modal-primary">Get my reward</button><button type="button" className="resource-modal-secondary" onClick={close}>Cancel</button></div>
    </form> : state === 'checking' ? <div className="resource-modal-body reward-checking" role="status"><span className="reward-progress"/><span>This should only take a moment.</span></div> : state === 'approved' ? <>
      <div className="resource-modal-body reward-code-panel"><label>Your promo code</label><div className="reward-code"><code>STAGE-DEMO-MONTH</code><button type="button" aria-label="Copy demo promo code" onClick={async () => { try { await navigator.clipboard.writeText('STAGE-DEMO-MONTH'); setCopied(true); } catch { setError('Select and copy the code above.'); } }}>{copied ? <Check size={18}/> : <Copy size={18}/>}</button></div><p className="form-note" role="status">{copied ? 'Code copied' : 'Example code · not redeemable'}</p><p className="field-error">{error}</p></div>
      <div className="resource-modal-actions"><button className="resource-modal-primary" onClick={close}>Done</button></div>
    </> : <div className="resource-modal-actions"><button className="resource-modal-primary" onClick={() => { setError(''); setState('entry'); }}> {state === 'unavailable' ? 'Try again' : 'Use another post'}</button><button className="resource-modal-secondary" onClick={close}>Cancel</button></div>}
    {import.meta.env.DEV && <div className="reward-preview-controls"><label htmlFor="reward-result">Design preview</label><select id="reward-result" value={result} disabled={state === 'checking'} onChange={event => { setResult(event.target.value as Result); setState('entry'); setCopied(false); }}><option value="approved">Approved</option><option value="unrelated">Unrelated post</option><option value="unavailable">Post unavailable</option><option value="claimed">Already claimed</option></select><small>Simulated check · no reward issued</small></div>}
  </dialog>;
}
