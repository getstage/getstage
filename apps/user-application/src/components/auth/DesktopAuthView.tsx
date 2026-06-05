import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { useDesktopSession } from "@/hooks/engine/useDesktopSession";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { getSafeAuthRedirect } from "@/lib/authRedirect";
import { publicAssetUrl } from "@/lib/publicAsset";

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
  const search = useSearch({ from: "/auth" });
  const desktop = useDesktopBridge();
  const session = useDesktopSession();
  const [loginStatus, setLoginStatus] = useState<"idle" | "opening" | "opened" | "error">("idle");
  const redirectTarget = getSafeAuthRedirect(search.redirect);

  const continueAfterAuth = useCallback(() => {
    if (redirectTarget) {
      void navigate({ to: redirectTarget });
      return;
    }

    void navigate({ to: "/" });
  }, [navigate, redirectTarget]);

  useEffect(() => {
    if (session.data?.hasAccessToken) {
      continueAfterAuth();
    }
  }, [session.data?.hasAccessToken, continueAfterAuth]);

  async function openLogin() {
    setLoginStatus("opening");
    try {
      await desktop.auth.openLogin();
      setLoginStatus("opened");
    } catch {
      setLoginStatus("error");
    }
  }

  const sessionData = session.data ?? null;
  const accountLabel = sessionData?.name ?? sessionData?.email ?? "Stage account";
  const isConnected = sessionData?.hasAccessToken === true;

  const authStatus: AuthStatus = session.isLoading
    ? "checking"
    : isConnected
      ? "connected"
      : loginStatus === "opening"
        ? "opening"
        : loginStatus === "opened"
          ? "opened"
          : loginStatus === "error"
            ? "error"
            : "idle";

  const isBusy = authStatus === "checking" || authStatus === "opening";

  return (
    <div className="relative min-h-dvh bg-white p-2 xl:h-dvh xl:overflow-hidden xl:bg-[#F5F5F5] xl:p-1">
      <div className="stage-auth-drag-region absolute inset-x-0 top-0 z-50 h-11" />
      <div className="min-h-[calc(100dvh-16px)] overflow-hidden rounded-[12px] bg-[#F5F5F5] px-3 pt-3 xl:h-[calc(100dvh-8px)] xl:min-h-0 xl:rounded-[8px] xl:border xl:border-[#F5F5F5] xl:bg-white xl:p-2">
        <div className="grid min-h-[calc(100dvh-40px)] xl:flex xl:h-full xl:min-h-0 xl:overflow-hidden xl:rounded-[12px]">
          <section className="flex min-h-0 flex-col items-center justify-center px-5 xl:min-w-[430px] xl:flex-1 xl:flex-row xl:overflow-hidden xl:px-[74px] xl:py-0">
            <div className="flex min-h-0 w-full max-w-[420px] flex-1 flex-col items-center justify-center py-[56px] text-center xl:h-full xl:max-w-[508px] xl:flex-none xl:items-start xl:py-[100px] xl:text-left">
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
                    onClick={continueAfterAuth}
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

          <section className="hidden min-h-0 xl:flex xl:w-[min(58vw,calc((100dvh-16px)*0.76+4px))] xl:flex-none xl:items-stretch xl:justify-end">
            <div className="relative flex h-full w-full items-stretch justify-end overflow-hidden rounded-[8px] bg-white">
              <img
                src={publicAssetUrl("/onboarding/onboarding-setup.webp")}
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
