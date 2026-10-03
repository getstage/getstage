/** Shared page-transition state, including account/session and profile loading. */
export function PageLoading() {
  return (
    <div className="stage-page-loading" role="status" aria-live="polite" aria-label="Loading Stage" aria-busy="true">
      <div className="stage-page-loading-content">
        <img src="/auth/signup-logo.svg" alt="" width="72" height="24" />
        <span className="stage-page-loading-ring" aria-hidden="true" />
        <span className="stage-page-loading-label">Loading Stage…</span>
      </div>
    </div>
  );
}
