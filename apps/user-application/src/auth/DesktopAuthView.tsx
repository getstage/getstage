import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { DesktopSession } from "@shared/models/desktop";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { getSafeAuthRedirect } from "@/lib/authRedirect";

type AuthStatus = "checking" | "idle" | "opening" | "opened" | "connected" | "error";

function getAuthStatusCopy(status: AuthStatus) {
  switch (status) {
    case "checking":
      return "Checking desktop session...";
    case "idle":
      return "Open Stage in your browser to sign in, complete signup, or manage payment.";
    case "opening":
      return "Opening browser...";
    case "opened":
      return "Finish signing in in your browser. Stage Desktop will continue automatically.";
    case "connected":
      return "You are signed in on this desktop.";
    case "error":
      return "Could not open the browser. Please try again.";
  }
}

export function DesktopAuthView() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const desktop = useDesktopBridge();
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const redirectTarget = getSafeAuthRedirect(search.redirect);

  useEffect(() => {
    desktop.auth.getSession()
      .then((storedSession) => {
        setSession(storedSession);
        setAuthStatus(storedSession?.hasAccessToken ? "connected" : "idle");
      })
      .catch(() => setAuthStatus("idle"));

    return desktop.auth.onSessionChanged((nextSession) => {
      setSession(nextSession);
      setAuthStatus(nextSession?.hasAccessToken ? "connected" : "idle");
      if (nextSession?.hasAccessToken) {
        void navigate(redirectTarget ? { href: redirectTarget } : { to: "/" });
      }
    });
  }, [desktop.auth, navigate, redirectTarget]);

  async function openLogin() {
    setAuthStatus("opening");
    try {
      await desktop.auth.openLogin();
      setAuthStatus("opened");
    } catch {
      setAuthStatus("error");
    }
  }

  const accountLabel = session?.name ?? session?.email ?? "Stage account";
  const isBusy = authStatus === "checking" || authStatus === "opening";
  const isConnected = authStatus === "connected" && session?.hasAccessToken;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f5] px-6">
      <div className="w-full max-w-[420px] rounded-[8px] border border-[#e7e7e7] bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <div className="mb-8">
          <p className="text-[13px] font-medium text-[#737373]">Stage Desktop</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight text-[#111]">
            Sign in to Stage
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[#666]">
            Use the web login flow for sign-in, signup, onboarding, and billing.
            Stage Desktop will reconnect when the browser returns.
          </p>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="rounded-[6px] border border-[#e7e7e7] bg-[#fafafa] px-3 py-2">
              <p className="text-[12px] font-medium text-[#737373]">Connected as</p>
              <p className="mt-1 truncate text-[14px] font-medium text-[#222]">{accountLabel}</p>
            </div>
            <button
              type="button"
              className="h-11 w-full rounded-[6px] bg-[#111] text-[14px] font-medium text-white"
              onClick={() =>
                void navigate(redirectTarget ? { href: redirectTarget } : { to: "/" })
              }
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="min-h-[40px] text-[14px] leading-5 text-[#555]">
              {getAuthStatusCopy(authStatus)}
            </p>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void openLogin()}
              className="h-11 w-full rounded-[6px] bg-[#111] text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authStatus === "opening" ? "Opening..." : "Log in with Stage web"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
