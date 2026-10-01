import { useEffect, useRef, useState } from "react";
import { useAuth, useSignOut } from "@/lib/auth";
import { UserCircle } from "@phosphor-icons/react";

export function AccountMenu({ mobile = false }: { mobile?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Marketing prerenders do not mount the authentication providers.
  return mounted ? (
    <ConnectedAccount mobile={mobile} />
  ) : (
    <a className="nav-link login-link" href="/auth?redirect=%2Fprofile">
      Log in
    </a>
  );
}
function ConnectedAccount({ mobile }: { mobile: boolean }) {
  const { user, isLoading } = useAuth();
  const signOut = useSignOut();
  const ref = useRef<HTMLDetailsElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const close = (event: Event) => {
      if (!ref.current?.contains(event.target as Node))
        ref.current?.removeAttribute("open");
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        ref.current?.removeAttribute("open");
        ref.current?.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  if (isLoading)
    return (
      <span className="nav-link" aria-label="Loading account">
        …
      </span>
    );
  if (!user)
    return (
      <a className="nav-link login-link" href="/auth?redirect=%2Fprofile">
        Log in
      </a>
    );
  return (
    <details
      className={`account-menu${mobile ? " account-menu-mobile" : ""}`}
      ref={ref}
    >
      <summary aria-label="Your account">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" />
        ) : (
          <UserCircle size={24} weight="duotone" />
        )}
        <span>{mobile ? "My account" : ""}</span>
      </summary>
      <div className="account-panel">
        <strong>{user.name || "Your account"}</strong>
        <a href="/profile">My profile</a>
        <a href="/profile?edit=1">Profile settings</a>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();
              window.location.assign("/");
            } catch {
              setError("Couldn't sign out. Try again.");
              setBusy(false);
            }
          }}
        >
          Sign out
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
