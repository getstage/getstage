import { Helmet } from "react-helmet-async";
import { PageLoading } from "@/components/shared/PageLoading";
import "./desktop-auth.css";

export function DesktopAuthStatus({
  error, isAwaitingOpen = false, isComplete = false, label, onOpenStageDesktop,
}: {
  error?: string | null;
  isAwaitingOpen?: boolean;
  isComplete?: boolean;
  label: string;
  onOpenStageDesktop?: () => void;
}) {
  if (!error && !isAwaitingOpen && !isComplete) return <PageLoading />;
  return (
    <>
      <Helmet>
        <title>Connect Stage Desktop - Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="auth-page desktop-connect">
        <div className="desktop-connect-surface">
          <img src="/auth/signup-logo.svg" alt="Stage" className="desktop-connect-logo" />
          <section className="desktop-connect-content" aria-labelledby="desktop-connect-title">
            <div className="desktop-connect-symbol" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {error ? <><path d="M12 8v5M12 16h.01"/><circle cx="12" cy="12" r="9"/></> : isComplete ? <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></> : <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4m-2-14 3 3-3 3"/></>}
              </svg>
            </div>
            <h1 id="desktop-connect-title">{label}</h1>
            <p className="desktop-connect-description" role={error ? "alert" : undefined}>
              {error ? "We couldn’t connect your account. Return to the Stage app and start sign-in again." : isComplete ? "Your account is connected. Return to the Stage app to pick up where you left off." : "Your account is ready. Open the Stage app to continue where you left off."}
            </p>
            {error ? <details className="desktop-connect-details"><summary>Connection details</summary><p>{error}</p></details> : (
              <button type="button" className="desktop-connect-button" onClick={isComplete ? () => window.close() : onOpenStageDesktop}>
                {isComplete ? "Close this tab" : "Open Stage Desktop"}
                {!isComplete && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>}
              </button>
            )}
            {!error && <p className="desktop-connect-hint">{isComplete ? "You can also close this browser tab manually." : <>If your browser asks for permission, choose <strong>Open</strong>.</>}</p>}
          </section>
          <p className="desktop-connect-footer">Your next idea starts in Stage.</p>
        </div>
      </main>
    </>
  );
}
