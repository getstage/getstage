import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useAuthToken } from "@convex-dev/auth/react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/lib/auth";
import { desktopAuthWebHandoffSchema } from "@/lib/desktopAuthHandoff";
import {
  buildDesktopAuthHandoffUrl,
  clearPendingDesktopAuthRedirect,
  isDesktopAuthRedirect,
  isLocalDesktopCallbackUrl,
  isValidDesktopCallbackUrl,
  storePendingDesktopAuthRedirect,
} from "@/lib/desktopAuthRedirect";
import stageLogo from "@/assets/logos/stage-logo-light.png";

type DesktopAuthSearch = {
  redirect_uri?: string;
  state?: string;
};

export const Route = createFileRoute("/auth/desktop")({
  component: DesktopAuthPage,
  validateSearch: (search: Record<string, unknown>): DesktopAuthSearch => ({
    redirect_uri:
      typeof search.redirect_uri === "string" ? search.redirect_uri : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
  }),
});

function getDesktopAuthTarget(redirectUri?: string, state?: string) {
  if (typeof window === "undefined") {
    return "/auth/desktop";
  }

  if (redirectUri && state) {
    const target = buildDesktopAuthHandoffUrl({ redirectUri, state });
    if (target) {
      storePendingDesktopAuthRedirect(target);
      console.info("[stage-desktop-auth] stored pending desktop auth redirect");
      return target;
    }
  }

  const target = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (isDesktopAuthRedirect(target)) {
    storePendingDesktopAuthRedirect(target);
    console.info("[stage-desktop-auth] stored pending desktop auth redirect");
  }
  return target;
}

function getValidatedRedirectUri(value?: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return isValidDesktopCallbackUrl(value) ? url : null;
  } catch {
    return null;
  }
}

function triggerCustomProtocolRedirect(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function scheduleBrowserTabClose() {
  window.setTimeout(() => {
    window.close();
  }, 600);
}

async function sendDesktopAuthHandoff(args: {
  redirectUri: URL;
  state: string;
  token: string;
}) {
  const handoff = desktopAuthWebHandoffSchema.parse(args);

  if (isLocalDesktopCallbackUrl(handoff.redirectUri)) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = handoff.redirectUri.toString();
    form.style.display = "none";

    for (const [name, value] of [
      ["code", handoff.token],
      ["state", handoff.state],
    ] as const) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    return;
  }

  const callbackUrl = new URL(handoff.redirectUri);
  callbackUrl.searchParams.set("code", handoff.token);
  callbackUrl.searchParams.set("state", handoff.state);
  const callback = callbackUrl.toString();

  if (handoff.redirectUri.protocol === "stage:") {
    triggerCustomProtocolRedirect(callback);
    return;
  }

  window.location.assign(callback);
}

type DesktopAuthHandoffPhase = "preparing" | "connecting" | "opening" | "complete";

function DesktopAuthPage() {
  const { redirect_uri, state } = Route.useSearch();
  const { isAuthenticated, isLoading } = useAuth();
  const authToken = useAuthToken();
  const [phase, setPhase] = useState<DesktopAuthHandoffPhase>("preparing");
  const [error, setError] = useState<string | null>(null);
  const didStartRef = useRef(false);
  const redirectUri = useMemo(() => getValidatedRedirectUri(redirect_uri), [redirect_uri]);

  useEffect(() => {
    if (!isAuthenticated || !authToken || !redirectUri || !state || didStartRef.current) {
      return;
    }

    didStartRef.current = true;
    clearPendingDesktopAuthRedirect();
    setPhase("connecting");
    console.info("[stage-desktop-auth] handing off Convex Auth session");

    sendDesktopAuthHandoff({ redirectUri, state, token: authToken })
      .then(() => {
        setPhase("opening");
        console.info("[stage-desktop-auth] desktop auth callback accepted");

        window.setTimeout(() => {
          setPhase("complete");
          scheduleBrowserTabClose();
        }, 400);
      })
      .catch((error) => {
        didStartRef.current = false;
        setPhase("preparing");
        setError(
          error instanceof Error
            ? error.message
            : "Could not connect Stage Desktop.",
        );
      });
  }, [authToken, isAuthenticated, redirectUri, state]);

  if (isLoading) {
    return <DesktopAuthStatus label="Checking your Stage session..." />;
  }

  if (!isAuthenticated) {
    getDesktopAuthTarget(redirect_uri, state);
    return (
      <Navigate
        to="/auth"
        search={{
          desktop_redirect_uri: redirect_uri,
          desktop_state: state,
        }}
        replace
      />
    );
  }

  if (!redirectUri || !state) {
    return (
      <DesktopAuthStatus
        error="This desktop sign-in link is missing a valid state or desktop redirect URI."
        label="Desktop sign-in cannot continue."
      />
    );
  }

  const statusLabel = error
    ? "Desktop sign-in failed."
    : phase === "complete"
      ? "Stage Desktop connected"
      : phase === "opening"
        ? "Opening Stage Desktop..."
        : phase === "connecting"
          ? "Connecting Stage Desktop..."
          : "Preparing desktop sign-in...";

  return (
    <DesktopAuthStatus
      error={error}
      isComplete={phase === "complete"}
      label={statusLabel}
    />
  );
}

function DesktopAuthStatus({
  error,
  isComplete = false,
  label,
}: {
  error?: string | null;
  isComplete?: boolean;
  label: string;
}) {
  return (
    <>
      <Helmet>
        <title>Connect Stage Desktop - Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="flex min-h-screen items-center justify-center bg-bg px-6">
        <section className="w-full max-w-[420px] text-center">
          <img src={stageLogo} alt="Stage" className="mx-auto h-6 w-auto" />
          <h1 className="mt-8 font-heading text-[28px] font-semibold text-text-primary">
            {label}
          </h1>
          {error ? (
            <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
              {error}
            </p>
          ) : isComplete ? (
            <>
              <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
                Return to Stage Desktop. You can close this browser tab.
              </p>
              <button
                type="button"
                className="mt-6 rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90"
                onClick={() => window.close()}
              >
                Close tab
              </button>
            </>
          ) : (
            <span className="mx-auto mt-6 inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          )}
        </section>
      </main>
    </>
  );
}
