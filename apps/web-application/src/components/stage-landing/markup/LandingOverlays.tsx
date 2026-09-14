export function LandingOverlays() {
  return (
    <>
      <div className="nav-scrim" id="nav-scrim" hidden />
      <dialog id="destination-dialog">
        <button className="dialog-close" aria-label="Close dialog">
          ×
        </button>
        <p className="eyebrow">Stage preview</p>
        <h2 id="destination-title" />
        <p id="destination-message" />
        <button className="button button-neutral dialog-done">Got it</button>
      </dialog>
    </>
  );
}
