import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useAuthToken } from "@convex-dev/auth/react";
import { Helmet } from "react-helmet-async";
import { useAuth, useSignOut } from "@/lib/auth";
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
  prompt?: string;
};

export const Route = createFileRoute("/auth/desktop")({
  component: DesktopAuthPage,
  validateSearch: (search: Record<string, unknown>): DesktopAuthSearch => ({
    redirect_uri:
      typeof search.redirect_uri === "string" ? search.redirect_uri : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
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

function buildStageCallbackUrl(args: { redirectUri: URL; state: string; token: string }) {
  const handoff = desktopAuthWebHandoffSchema.parse(args);
  const callbackUrl = new URL(handoff.redirectUri);
  callbackUrl.searchParams.set("code", handoff.token);
  callbackUrl.searchParams.set("state", handoff.state);
  return callbackUrl.toString();
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

function submitLocalDesktopAuthHandoff(args: {
  redirectUri: URL;
  state: string;
  token: string;
}) {
  const handoff = desktopAuthWebHandoffSchema.parse(args);

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
}

type DesktopAuthHandoffPhase =
  | "preparing"
  | "connecting"
  | "awaiting-open"
  | "complete";

function DesktopAuthPage() {
  const { redirect_uri, state, prompt } = Route.useSearch();
  const { isAuthenticated, isLoading } = useAuth();
  const signOut = useSignOut();
  const authToken = useAuthToken();
  const [phase, setPhase] = useState<DesktopAuthHandoffPhase>("preparing");
  const [error, setError] = useState<string | null>(null);
  const [stageCallbackUrl, setStageCallbackUrl] = useState<string | null>(null);
  const [webSessionCleared, setWebSessionCleared] = useState(prompt !== "login");
  const didStartRef = useRef(false);
  const didSignOutRef = useRef(false);
  const redirectUri = useMemo(() => getValidatedRedirectUri(redirect_uri), [redirect_uri]);
  const usesStageProtocol = redirectUri?.protocol === "stage:";

  useEffect(() => {
    if (prompt !== "login" || isLoading || didSignOutRef.current) {
      return;
    }

    if (!isAuthenticated) {
      setWebSessionCleared(true);
      return;
    }

    didSignOutRef.current = true;
    console.info("[stage-desktop-auth] clearing stale web session for fresh desktop login");

    void signOut()
      .catch((signOutError) => {
        console.error("[stage-desktop-auth] web sign-out failed", signOutError);
      })
      .finally(() => {
        setWebSessionCleared(true);
      });
  }, [isAuthenticated, isLoading, prompt, signOut]);

  useEffect(() => {
    if (
      !webSessionCleared ||
      !isAuthenticated ||
      !authToken ||
      !redirectUri ||
      !state ||
      didStartRef.current
    ) {
      return;
    }

    didStartRef.current = true;
    clearPendingDesktopAuthRedirect();

    if (usesStageProtocol) {
      try {
        setStageCallbackUrl(
          buildStageCallbackUrl({ redirectUri, state, token: authToken }),
        );
        setPhase("awaiting-open");
        console.info("[stage-desktop-auth] waiting for user to open Stage Desktop");
      } catch (handoffError) {
        didStartRef.current = false;
        setError(
          handoffError instanceof Error
            ? handoffError.message
            : "Could not prepare the Stage Desktop handoff.",
        );
      }
      return;
    }

    setPhase("connecting");
    console.info("[stage-desktop-auth] handing off Convex Auth session");

    try {
      if (isLocalDesktopCallbackUrl(redirectUri)) {
        submitLocalDesktopAuthHandoff({ redirectUri, state, token: authToken });
        return;
      }

      const callback = buildStageCallbackUrl({ redirectUri, state, token: authToken });
      window.location.assign(callback);
    } catch (handoffError) {
      didStartRef.current = false;
      setPhase("preparing");
      setError(
        handoffError instanceof Error
          ? handoffError.message
          : "Could not connect Stage Desktop.",
      );
    }
  }, [authToken, isAuthenticated, redirectUri, state, usesStageProtocol, webSessionCleared]);

  const openStageDesktop = useCallback(() => {
    if (!stageCallbackUrl) {
      return;
    }

    triggerCustomProtocolRedirect(stageCallbackUrl);
    setPhase("complete");
    console.info("[stage-desktop-auth] desktop auth callback triggered by user");
  }, [stageCallbackUrl]);

  if (isLoading || (prompt === "login" && !webSessionCleared)) {
    return (
      <DesktopAuthStatus
        label={
          prompt === "login" && isAuthenticated
            ? "Signing out of previous web session..."
            : "Checking your Stage session..."
        }
      />
    );
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
      : phase === "awaiting-open"
        ? "Open Stage Desktop"
        : phase === "connecting"
          ? "Connecting Stage Desktop..."
          : "Preparing desktop sign-in...";

  return (
    <DesktopAuthStatus
      error={error}
      isComplete={phase === "complete"}
      isAwaitingOpen={phase === "awaiting-open"}
      label={statusLabel}
      onOpenStageDesktop={openStageDesktop}
    />
  );
}

function DesktopAuthStatus({
  error,
  isAwaitingOpen = false,
  isComplete = false,
  label,
  onOpenStageDesktop,
}: {
  error?: string | null;
  isAwaitingOpen?: boolean;
  isComplete?: boolean;
  label: string;
  onOpenStageDesktop?: () => void;
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
          ) : isAwaitingOpen ? (
            <>
              <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
                Click below to return to Stage Desktop. macOS may ask you to confirm
                opening Stage — choose <strong>Open</strong>.
              </p>
              <button
                type="button"
                className="mt-6 rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90"
                onClick={onOpenStageDesktop}
              >
                Open Stage Desktop
              </button>
            </>
          ) : isComplete ? (
            <>
              <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
                Return to Stage Desktop. You can close this browser tab once you are
                signed in.
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
