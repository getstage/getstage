import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useAuthToken } from "@convex-dev/auth/react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/lib/auth";
import { desktopAuthWebHandoffSchema } from "@/lib/desktopAuthHandoff";
import {
  clearPendingDesktopAuthRedirect,
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

function getDesktopAuthTarget() {
  if (typeof window === "undefined") {
    return "/auth/desktop";
  }

  const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  storePendingDesktopAuthRedirect(target);
  console.info("[stage-desktop-auth] stored pending desktop auth redirect");
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
  window.location.assign(callbackUrl.toString());
}

function DesktopAuthPage() {
  const { redirect_uri, state } = Route.useSearch();
  const { isAuthenticated, isLoading } = useAuth();
  const authToken = useAuthToken();
  const [status, setStatus] = useState("Preparing desktop sign-in...");
  const [error, setError] = useState<string | null>(null);
  const didStartRef = useRef(false);
  const redirectUri = useMemo(() => getValidatedRedirectUri(redirect_uri), [redirect_uri]);

  useEffect(() => {
    if (!isAuthenticated || !authToken || !redirectUri || !state || didStartRef.current) {
      return;
    }

    didStartRef.current = true;
    clearPendingDesktopAuthRedirect();
    setStatus("Connecting Stage Desktop...");
    console.info("[stage-desktop-auth] handing off Convex Auth session");

    sendDesktopAuthHandoff({ redirectUri, state, token: authToken })
      .then(() => {
        setStatus("Opening Stage Desktop...");
        console.info("[stage-desktop-auth] desktop auth callback accepted");
      })
      .catch((error) => {
        didStartRef.current = false;
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
    storePendingDesktopAuthRedirect(getDesktopAuthTarget());
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

  return <DesktopAuthStatus error={error} label={error ? "Desktop sign-in failed." : status} />;
}

function DesktopAuthStatus({ error, label }: { error?: string | null; label: string }) {
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
          ) : (
            <span className="mx-auto mt-6 inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          )}
        </section>
      </main>
    </>
  );
}
