import { SignIn } from "@phosphor-icons/react";
import { useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { api } from "@/lib/convex";
import { usePortalEdit } from "@/hooks/usePortalEdit";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { getPortalPreviewData } from "@/lib/portalPreview";
import type { Phase } from "@/types";
import { PortalBoard } from "./PortalBoard";

export function ClientPortalPage() {
  const { token } = useParams({ from: "/portal/$token" });
  const isPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";
  const liveData = useConvexQuery(api.portal.getByShareToken, isPreview ? "skip" : { shareToken: token });
  const previewData = isPreview ? getPortalPreviewData() : null;
  const data = previewData ?? liveData;
  const isLoading = !isPreview && liveData === undefined;
  const { user: editUser, requestRevision } = usePortalEdit(token, isPreview);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-portal-accent border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="font-heading text-[26px] font-semibold text-text-primary">
          Portal not found
        </h1>
        <p className="mt-2 max-w-[360px] text-[15px] text-text-secondary">
          This link may have expired or client access has been turned off.
        </p>
      </div>
    );
  }

  const { project, config } = data;
  const phases = project.phases as Phase[];
  const progress = clampProgress(project.progress);
  const circumference = 2 * Math.PI * 30;
  const progressOffset = circumference - (progress / 100) * circumference;

  return (
    <>
      <Helmet>
        <title>{project.name} - Client Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-white text-text-primary">
        {isPreview ? (
          <div className="bg-[#141531] px-6 py-2 text-center text-[12px] text-white sm:text-[13px]">
            Preview mode
            <span className="ml-2 text-white/60">This is what your client will see</span>
          </div>
        ) : null}

        <header className="border-b border-border-subtle">
          <div className="mx-auto flex max-w-[1440px] justify-center px-4 py-5 sm:px-10 sm:py-7 lg:px-14">
            <img
              src={config.logoUrl ?? stageLogo}
              alt={`${project.clientName} portal logo`}
              className="max-h-[42px] w-auto max-w-[180px] object-contain sm:max-h-[56px] sm:max-w-[220px]"
            />
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-5 pb-16 sm:px-10 lg:px-14"
        >
          {/* Hero: progress ring + identity */}
          <section className="flex flex-col items-center gap-5 pt-10 text-center sm:flex-row sm:justify-center sm:gap-6 sm:pt-14 sm:text-left">
            <div className="relative h-[72px] w-[72px] shrink-0">
              <svg viewBox="0 0 72 72" className="h-[72px] w-[72px] -rotate-90">
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  fill="none"
                  stroke="var(--color-border-subtle)"
                  strokeWidth="3.5"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  fill="none"
                  stroke={config.accentColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  className="transition-[stroke-dashoffset] duration-500 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-heading text-[18px] font-semibold tracking-[-0.3px] text-text-primary">
                {progress}
              </span>
            </div>
            <div>
              <h1 className="font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary sm:text-[28px]">
                {project.name}
              </h1>
              <p className="mt-1 text-[14px] text-text-secondary">
                {project.clientName}
              </p>
            </div>
          </section>

          {/* Kanban board: client can drag a task into Revision and leave thoughts */}
          <section className="mt-10 w-full sm:mt-14">
            <PortalBoard
              phases={phases}
              accentColor={config.accentColor}
              canRequestRevision={!isPreview}
              onRequestRevision={requestRevision}
            />
          </section>
        </motion.main>

        {!editUser && !isPreview ? (
          <div className="pb-2 text-center">
            <a
              href={`/auth?redirect=${encodeURIComponent(`/portal/${token}`)}`}
              className="inline-flex items-center gap-1.5 text-[13px] text-text-tertiary transition-colors hover:text-text-secondary"
            >
              <SignIn size={14} />
              Sign in to collaborate
            </a>
          </div>
        ) : null}

        <footer className="border-t border-border-subtle">
          <div className="mx-auto max-w-[1440px] px-6 py-6 text-center text-[12px] text-text-tertiary">
            Powered by{" "}
            <a
              href="/"
              className="font-medium text-text-tertiary transition-colors hover:text-text-secondary"
            >
              Stage
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}
