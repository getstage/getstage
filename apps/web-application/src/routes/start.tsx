import { useEffect } from "react";
import { ArrowRight, DownloadSimple } from "@phosphor-icons/react";
import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery } from "convex/react";
import { PageLoading } from "@/components/shared/PageLoading";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import stageLogo from "@/assets/logos/stage-logo-light.png";

export const Route = createFileRoute("/start")({
  component: StartPage,
});

// STA-63 path 1, screen 2 (Figma 2478:4533): asked once after the first web login.
// The Mac route goes to the download page; the AI tool route to the web platform,
// which holds the MCP setup once that ships.
const AI_TOOL_PATH = "/dashboard";
const MAC_PATH = "/download/mac?started=1";

function StartPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const state = useQuery(api.onboarding.getState, isAuthenticated ? {} : "skip");
  const saveChoice = useMutation(api.onboarding.saveUsageChoice);
  const navigate = useNavigate();

  // Returning users skip the choice.
  useEffect(() => {
    if (state?.usageChoice === "mac") window.location.replace("/download/mac");
    if (state?.usageChoice === "ai-tool") void navigate({ to: AI_TOOL_PATH, replace: true });
  }, [navigate, state?.usageChoice]);

  if (isLoading || (isAuthenticated && (state === undefined || state.usageChoice))) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/auth" search={{ redirect: "/start" }} replace />;

  const choose = (choice: "mac" | "ai-tool") => {
    void saveChoice({ choice }).catch(() => undefined);
    if (choice === "mac") window.location.assign(MAC_PATH);
    else void navigate({ to: AI_TOOL_PATH });
  };

  return (
    <>
      <Helmet>
        <title>Choose how to use Stage — Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="auth-page min-h-dvh bg-white p-2 lg:h-dvh lg:overflow-hidden lg:bg-[#F5F5F5] lg:p-1">
        <div className="min-h-[calc(100dvh-16px)] overflow-hidden rounded-[12px] bg-[#F5F5F5] px-3 pt-3 lg:h-[calc(100dvh-8px)] lg:min-h-0 lg:rounded-[8px] lg:border lg:border-[#F5F5F5] lg:bg-white lg:p-2">
          <div className="grid min-h-[calc(100dvh-40px)] lg:flex lg:h-full lg:min-h-0 lg:overflow-hidden lg:rounded-[12px]">
            <section className="flex min-h-0 flex-col items-center lg:flex-1 lg:flex-row lg:justify-center lg:overflow-hidden lg:px-[74px]">
              <div className="flex w-full max-w-[356px] flex-1 flex-col items-start justify-center py-[44px]">
                <img src={stageLogo} alt="Stage" className="mb-5 h-[23px] w-auto" />
                <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0A0A0A]">Choose how to use Stage</h1>
                <p className="mt-2.5 text-[13px] font-medium leading-[1.5] text-[#525252]">
                  Your account is ready. Use Stage on your Mac for the full canvas, project memory and one-click exports.
                </p>
                <div className="mt-8 flex w-full flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => choose("mac")}
                    className="inline-flex h-[38px] w-full items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] text-[13px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] hover:opacity-95"
                  >
                    <DownloadSimple size={16} aria-hidden="true" />
                    Download Stage for Mac
                  </button>
                  <p className="px-1 text-[12px] text-[#737373]">The full experience: canvas, project memory and exports.</p>
                  <button
                    type="button"
                    onClick={() => choose("ai-tool")}
                    className="mt-2 inline-flex h-[38px] w-full items-center justify-center gap-2 rounded-[6px] border border-[#D4D4D4] bg-gradient-to-b from-[#FAFAFA] to-[#E5E5E5] text-[13px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] hover:opacity-95"
                  >
                    Connect Stage to your AI tool
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                  <p className="px-1 text-[12px] text-[#737373]">Use Stage inside Claude, Codex, ChatGPT or Cursor.</p>
                </div>
              </div>
            </section>
            <section className="hidden min-h-0 py-1 pr-1 lg:flex lg:w-[calc((100dvh-32px)*0.76+4px)] lg:flex-none lg:items-center lg:justify-end">
              <div className="relative flex h-full w-full items-center justify-end overflow-hidden rounded-[8px]">
                <img src="/auth/auth-cta.webp" alt="" className="h-full max-h-full w-auto object-contain object-right" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
