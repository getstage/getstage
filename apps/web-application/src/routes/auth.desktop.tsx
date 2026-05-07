import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Helmet } from "react-helmet-async";
import { api } from "@/lib/convex";
import { useAuth } from "@/lib/auth";
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

function getRedirectTarget() {
  if (typeof window === "undefined") {
    return "/auth/desktop";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getValidatedRedirectUri(value?: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "stage:" && url.hostname === "auth" ? url : null;
  } catch {
    return null;
  }
}

function DesktopAuthPage() {
  const { redirect_uri, state } = Route.useSearch();
  const { isAuthenticated, isLoading } = useAuth();
  const generateApiKey = useMutation(api.developer.apiKeys.generate);
  const [status, setStatus] = useState("Preparing desktop sign-in...");
  const [error, setError] = useState<string | null>(null);
  const didStartRef = useRef(false);
  const redirectUri = useMemo(() => getValidatedRedirectUri(redirect_uri), [redirect_uri]);

  useEffect(() => {
    if (!isAuthenticated || !redirectUri || !state || didStartRef.current) {
      return;
    }

    didStartRef.current = true;
    setStatus("Creating a desktop access key...");

    generateApiKey({ name: `Stage Desktop ${new Date().toISOString().slice(0, 10)}` })
      .then((result) => {
        const key = (result as { key?: string }).key;

        if (!key) {
          throw new Error("No desktop access key was returned.");
        }

        redirectUri.searchParams.set("code", key);
        redirectUri.searchParams.set("state", state);
        setStatus("Opening Stage Desktop...");
        window.location.assign(redirectUri.toString());
      })
      .catch((error) => {
        didStartRef.current = false;
        setError(
          error instanceof Error
            ? error.message
            : "Could not create a desktop access key.",
        );
      });
  }, [generateApiKey, isAuthenticated, redirectUri, state]);

  if (isLoading) {
    return <DesktopAuthStatus label="Checking your Stage session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" search={{ redirect: getRedirectTarget() }} replace />;
  }

  if (!redirectUri || !state) {
    return (
      <DesktopAuthStatus
        error="This desktop sign-in link is missing a valid state or stage://auth redirect URI."
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
