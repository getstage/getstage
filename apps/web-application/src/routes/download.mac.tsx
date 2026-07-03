import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/lib/auth";
import stageLogo from "@/assets/logos/stage-logo-light.png";

export const MACOS_DOWNLOAD_URL = "https://github.com/getstage/getstage/releases/latest";

export const Route = createFileRoute("/download/mac")({
  component: DownloadMacPage,
});

function DownloadMacPage() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const ctaEmail = user?.email ?? "your email";

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" search={{ redirect: "/download/mac" }} replace />;
  }

  return (
    <>
      <Helmet>
        <title>Stage lives on your Mac — Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="auth-page min-h-dvh bg-white p-2 lg:h-dvh lg:overflow-hidden lg:bg-[#F5F5F5] lg:p-1">
        <div className="min-h-[calc(100dvh-16px)] overflow-hidden rounded-[12px] bg-[#F5F5F5] px-3 pt-3 lg:h-[calc(100dvh-8px)] lg:min-h-0 lg:rounded-[8px] lg:border lg:border-[#F5F5F5] lg:bg-white lg:p-2">
          <div className="grid min-h-[calc(100dvh-40px)] lg:flex lg:h-full lg:min-h-0 lg:overflow-hidden lg:rounded-[12px]">
            <section className="flex min-h-0 flex-col items-center lg:flex-1 lg:flex-row lg:justify-center lg:overflow-hidden lg:px-[74px] lg:py-0">
              <div className="relative -mr-3 flex h-[405px] w-[calc(100%+12px)] shrink-0 items-center justify-start self-end overflow-hidden rounded-l-[8px] lg:hidden">
                <img
                  src="/auth/auth-cta-mobile.webp"
                  alt=""
                  className="absolute right-0 top-0 h-auto min-h-full w-full max-w-none object-cover object-right"
                />
              </div>

              <div className="flex min-h-0 w-full max-w-[508px] flex-1 flex-col items-center justify-center py-[44px] text-center lg:h-full lg:flex-none lg:items-start lg:py-[100px] lg:text-left">
                <img src={stageLogo} alt="Stage" className="mb-5 h-[23px] w-auto" />
                <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0A0A0A]">
                  <span className="lg:hidden">Stage lives on your Mac.</span>
                  <span className="hidden lg:inline">Download Stage for Mac</span>
                </h1>
                <div className="mt-1.5 w-full max-w-[320px] text-[15px] font-medium leading-[1.5] text-[#525252] lg:hidden">
                  <p>We sent the download link to {ctaEmail}</p>
                  <p className="mt-6">Open it on your Mac and you&apos;re in.</p>
                </div>
                <p className="mt-2.5 hidden w-full text-[13px] font-medium leading-[1.5] text-[#525252] lg:block">
                  Your account is ready. Download the app to start your first project - faster
                  performance, native controls, and your entire design workflow in one place.
                </p>
                <a
                  href={MACOS_DOWNLOAD_URL}
                  className="mt-8 hidden h-[38px] w-full cursor-pointer items-center justify-center rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[12px] font-semibold text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 lg:inline-flex"
                >
                  <AppleIcon />
                  <span className="ml-2.5">Download for macOS</span>
                </a>
              </div>
            </section>

            <section className="hidden min-h-0 py-1 pr-1 lg:flex lg:w-[calc((100dvh-32px)*0.76+4px)] lg:flex-none lg:items-center lg:justify-end">
              <div className="relative flex h-full w-full items-center justify-end overflow-hidden rounded-[8px]">
                <img
                  src="/auth/auth-cta.webp"
                  alt=""
                  className="h-full max-h-full w-auto object-contain object-right"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function AppleIcon() {
  return (
    <svg width="11" height="14" viewBox="0 0 11 14" aria-hidden="true" className="shrink-0">
      <path
        d="M9.07 7.22c-.02-1.48 1.21-2.19 1.27-2.23-.69-1.01-1.76-1.15-2.14-1.16-.91-.09-1.78.53-2.24.53-.47 0-1.19-.52-1.95-.5-1 .02-1.92.58-2.44 1.48-1.04 1.8-.27 4.47.75 5.93.5.72 1.09 1.52 1.87 1.49.75-.03 1.03-.48 1.94-.48.9 0 1.16.48 1.95.47.81-.02 1.32-.73 1.81-1.45.57-.83.8-1.64.81-1.68-.02-.01-1.57-.6-1.59-2.39ZM7.6 2.87c.41-.5.69-1.19.61-1.87-.59.02-1.31.39-1.74.89-.38.44-.72 1.15-.63 1.82.66.05 1.34-.34 1.76-.84Z"
        fill="currentColor"
      />
    </svg>
  );
}
