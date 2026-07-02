import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useConvexAuth } from "convex/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";

export const MACOS_DOWNLOAD_URL = "https://github.com/getstage/getstage/releases/latest";

export const Route = createFileRoute("/download/mac")({
  component: DownloadMacPage,
});

function DownloadMacPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();

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
        <title>Download Stage for Mac — Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="flex min-h-dvh flex-col bg-white lg:grid lg:min-h-dvh lg:grid-cols-2 lg:bg-[#F5F5F5] lg:p-1">
        <section className="flex flex-1 flex-col justify-center px-6 py-12 lg:rounded-[8px] lg:border lg:border-[#F5F5F5] lg:bg-white lg:px-16 lg:py-20">
          <img src={stageLogo} alt="Stage" className="h-[23px] w-auto" />

          <h1 className="mt-10 max-w-[420px] text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#0A0A0A] lg:text-[40px]">
            Download Stage for Mac
          </h1>

          <p className="mt-4 max-w-[420px] text-[15px] leading-[1.6] font-medium text-[#525252]">
            Your account is ready. Download the app to start your first project — faster
            performance, native controls, and your entire design workflow in one place.
          </p>

          <a
            href={MACOS_DOWNLOAD_URL}
            className="mt-8 inline-flex h-11 w-fit items-center justify-center gap-2 rounded-[8px] bg-[#0A0A0A] px-5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <AppleGlyph />
            Download for macOS
          </a>

          <p className="mt-6 max-w-[420px] text-[13px] leading-[1.5] text-[#737373]">
            After installing, open Stage and sign in with the same email. Your workspace will
            continue in the desktop app.
          </p>

          <Link
            to="/"
            className="mt-8 text-[13px] font-medium text-[#525252] underline underline-offset-2"
          >
            Back to homepage
          </Link>
        </section>

        <section className="relative hidden min-h-[420px] overflow-hidden bg-[#ECE9FF] lg:block lg:min-h-0 lg:rounded-[8px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#9E99F8_0%,transparent_55%),radial-gradient(circle_at_80%_70%,#463FBA_0%,transparent_50%)] opacity-70" />
          <div className="relative flex h-full items-center justify-center p-12">
            <div className="w-full max-w-[520px] overflow-hidden rounded-[16px] border border-white/40 bg-white/90 shadow-[0_24px_80px_rgba(70,63,186,0.18)] backdrop-blur-sm">
              <div className="border-b border-[#F0F0F0] px-5 py-4">
                <p className="text-[13px] font-medium text-[#737373]">Stage for macOS</p>
                <p className="mt-1 text-[18px] font-semibold text-[#0A0A0A]">Your design workspace</p>
              </div>
              <div className="space-y-3 px-5 py-5">
                <PreviewRow label="Research" value="Ready" />
                <PreviewRow label="Strategy" value="Ready" />
                <PreviewRow label="Wireframes" value="Ready" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[8px] bg-[#FAFAFA] px-4 py-3">
      <span className="text-[14px] font-medium text-[#171717]">{label}</span>
      <span className="text-[13px] font-medium text-[#463FBA]">{value}</span>
    </div>
  );
}

function AppleGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
      <path d="M12.34 8.32c.02 2.12 1.86 2.83 1.88 2.84-.02.06-.3 1.01-.98 2.01-.59.86-1.2 1.72-2.16 1.74-.94.02-1.24-.55-2.32-.55-1.08 0-1.42.53-2.31.57-.93.04-1.64-.92-2.23-1.78-1.21-1.74-2.14-4.93-.9-7.08.62-1.08 1.73-1.76 2.94-1.78 1.02-.02 1.98.68 2.32.68.34 0 1.38-.84 2.33-.72.4.02 1.52.16 2.24 1.22-.06.04-1.33.78-1.32 2.32ZM10.9 2.55c.5-.6.84-1.44.75-2.27-.72.03-1.6.48-2.12 1.08-.46.53-.87 1.38-.76 2.18.8.06 1.62-.41 2.13-.99Z" />
    </svg>
  );
}
