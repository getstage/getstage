import { useEffect, useRef, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { Gift, CheckCircle, MagnifyingGlass, WarningCircle, Copy, Check } from '@phosphor-icons/react';

type ClaimResult =
  | { status: 'approved'; code: string }
  | { status: 'invalid' | 'unpublished' | 'unrelated' | 'unavailable' | 'claimed' };
type State = 'entry' | 'checking' | Exclude<ClaimResult['status'], 'invalid'>;

const claimReward = makeFunctionReference<'action', { postUrl: string }, ClaimResult>('rewards:claimXShareReward');
const myRewardClaim = makeFunctionReference<'query', Record<string, never>, { code: string } | null>('rewards:myRewardClaim');

const titles: Record<State, string> = {
  entry: 'Share your stack. Get a month free.', checking: 'Checking your post…',
  approved: 'Your free month is ready.', unrelated: 'Your profile link is missing.',
  unavailable: 'We couldn’t read your post.', claimed: 'This post has already been used.',
  unpublished: 'Publish your profile first.',
};
const descriptions: Record<State, string> = {
  entry: 'Share your profile on X, then add your post link below.',
  checking: 'Checking that your post is public and shares your Stage profile.',
  approved: 'Thanks for sharing your stack. Use this code at checkout for a free month of Solo. It works once and expires in 30 days.',
  unrelated: 'We couldn’t find your Stage profile in this post. Share your profile link, then try again.',
  unavailable: 'Make sure the post is public and the link is correct, then try again.',
  claimed: 'A reward has already been claimed for this post. Each post can only be used once.',
  unpublished: 'Your post needs to link to your public Stage profile. Publish your profile, share it, then try again.',
};

// Server-verified (convex/rewards.ts): the post must link to the user's public profile.
export function RewardClaimDialog({ url, close }: { url: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const claim = useAction(claimReward);
  const existing = useQuery(myRewardClaim, {});
  const [state, setState] = useState<State>('entry');
  const [code, setCode] = useState('');
  const [post, setPost] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  // Someone who already claimed sees their code again instead of the form.
  const shown: State = state === 'entry' && existing?.code ? 'approved' : state;
  const shownCode = code || existing?.code || '';
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(`My tools, skills and components, curated on Stage.\n${url}`)}`;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const value = new URL(post.trim());
      if (value.protocol !== 'https:' || !['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(value.hostname) || !/^\/[A-Za-z0-9_]+\/status\/\d+\/?$/.test(value.pathname)) throw new Error();
    } catch { setError('Enter a valid X post link.'); return; }
    setError(''); setState('checking');
    try {
      const result = await claim({ postUrl: post.trim() });
      if (result.status === 'invalid') { setError('Enter a valid X post link.'); setState('entry'); return; }
      if (result.status === 'approved') setCode(result.code);
      setState(result.status);
    } catch { setState('unavailable'); }
  }
  return <dialog ref={dialog} id="claim-dialog" className="resource-modal profile-dialog reward-claim-dialog" onCancel={close} aria-labelledby="reward-title">
    <button className="resource-modal-close" onClick={close} aria-label="Close">×</button>
    <header className="resource-modal-heading" aria-live="polite">
      <span className={`claim-reward-icon reward-icon-${shown}`} aria-hidden="true">{shown === 'approved' ? <CheckCircle size={28}/> : shown === 'checking' ? <MagnifyingGlass size={28}/> : shown === 'entry' ? <Gift size={28} weight="duotone"/> : <WarningCircle size={28}/>}</span>
      <h2 id="reward-title">{titles[shown]}</h2><p>{descriptions[shown]}</p>
    </header>
    {shown === 'entry' ? <form onSubmit={submit} noValidate>
      <div className="resource-modal-body">
        <a className="resource-modal-secondary claim-share" href={shareUrl} target="_blank" rel="noopener noreferrer">Share on X ↗</a>
        <label htmlFor="reward-post">X post URL</label>
        <input id="reward-post" type="url" value={post} placeholder="https://x.com/you/status/…" aria-invalid={!!error} aria-describedby="reward-error" onChange={event => { setPost(event.target.value); setError(''); }}/>
        <p id="reward-error" className="field-error" role="alert">{error}</p>
      </div>
      <div className="resource-modal-actions"><button type="submit" className="resource-modal-primary">Get my reward</button><button type="button" className="resource-modal-secondary" onClick={close}>Cancel</button></div>
    </form> : shown === 'checking' ? <div className="resource-modal-body reward-checking" role="status"><span className="reward-progress"/><span>This should only take a moment.</span></div> : shown === 'approved' ? <>
      <div className="resource-modal-body reward-code-panel"><label>Your promo code</label><div className="reward-code"><code>{shownCode}</code><button type="button" aria-label="Copy promo code" onClick={async () => { try { await navigator.clipboard.writeText(shownCode); setCopied(true); } catch { setError('Select and copy the code above.'); } }}>{copied ? <Check size={18}/> : <Copy size={18}/>}</button></div><p className="form-note" role="status">{copied ? 'Code copied' : 'Enter it at checkout'}</p><p className="field-error">{error}</p></div>
      <div className="resource-modal-actions"><button className="resource-modal-primary" onClick={close}>Done</button></div>
    </> : <div className="resource-modal-actions"><button className="resource-modal-primary" onClick={() => { setError(''); setState('entry'); }}> {shown === 'unavailable' ? 'Try again' : shown === 'unpublished' ? 'Back' : 'Use another post'}</button><button className="resource-modal-secondary" onClick={close}>Cancel</button></div>}
  </dialog>;
}
