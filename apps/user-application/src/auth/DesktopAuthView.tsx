import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { DesktopSession } from "@shared/models/desktop";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";

type AuthStatus = "checking" | "idle" | "opening" | "opened" | "connected" | "error";

function getAuthStatusCopy(status: AuthStatus) {
  switch (status) {
    case "checking":
      return "Checking desktop session...";
    case "idle":
      return "Open Stage in your browser to sign in. The desktop app will continue automatically.";
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
  const desktop = useDesktopBridge();
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");

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
        void navigate({ to: "/" });
      }
    });
  }, [desktop.auth, navigate]);

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
    <div className="relative min-h-dvh bg-white p-2 md:h-dvh md:overflow-hidden md:bg-[#F5F5F5] md:p-1">
      <div className="stage-auth-drag-region absolute inset-x-0 top-0 z-50 hidden h-11 md:block" />
      <div className="min-h-[calc(100dvh-16px)] overflow-hidden rounded-[12px] bg-[#F5F5F5] px-3 pt-3 md:h-[calc(100dvh-8px)] md:min-h-0 md:rounded-[8px] md:border md:border-[#F5F5F5] md:bg-white md:p-2">
        <div className="grid min-h-[calc(100dvh-40px)] md:flex md:h-full md:min-h-0 md:overflow-hidden md:rounded-[12px]">
          <section className="flex min-h-0 flex-col items-center md:flex-1 md:flex-row md:justify-center md:overflow-hidden md:px-[74px] md:py-0">
            <div className="relative -mr-3 flex h-[320px] w-[calc(100%+12px)] shrink-0 items-center justify-start self-end overflow-hidden rounded-l-[8px] md:hidden">
              <img
                src="/onboarding/onboarding-setup.webp"
                alt=""
                className="absolute right-0 top-0 h-auto min-h-full w-full max-w-none object-cover object-right"
              />
            </div>

            <div className="flex min-h-0 w-full max-w-[508px] flex-1 flex-col items-center justify-center py-[44px] text-center md:h-full md:flex-none md:items-start md:py-[100px] md:text-left">
              <img src={stageLogo} alt="Stage" className="mb-5 h-[23px] w-auto" />
              <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0A0A0A]">
                Sign in to Stage
              </h1>
              <p className="mt-2.5 w-full text-[13px] font-medium leading-[1.5] text-[#525252]">
                Use your Stage account to connect this Mac. We&apos;ll bring you back here once
                you&apos;re signed in.
              </p>

              {isConnected ? (
                <>
                  <div className="mt-8 w-full rounded-[6px] border border-[#E5E5E5] bg-white px-3 py-2 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.06)]">
                    <p className="text-[12px] font-medium leading-[1.4] text-[#737373]">
                      Connected as
                    </p>
                    <p className="mt-1 truncate text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">
                      {accountLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-4 flex h-[38px] w-full cursor-pointer items-center justify-center rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[12px] font-semibold text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8782f5]"
                    onClick={() => void navigate({ to: "/" })}
                  >
                    Continue
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-6 min-h-5 w-full text-[13px] font-medium leading-[1.5] text-[#737373]">
                    {getAuthStatusCopy(authStatus)}
                  </p>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void openLogin()}
                    className="mt-4 flex h-[38px] w-full cursor-pointer items-center justify-center rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[12px] font-semibold text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8782f5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {authStatus === "opening" ? "Opening..." : "Sign in with Stage web"}
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="hidden min-h-0 md:flex md:w-[calc((100dvh-16px)*0.76+4px)] md:flex-none md:items-stretch md:justify-end">
            <div className="relative flex h-full w-full items-stretch justify-end overflow-hidden rounded-[8px] bg-white">
              <img
                src="/onboarding/onboarding-setup.webp"
                alt=""
                className="h-full w-full object-cover object-right"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
