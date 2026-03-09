import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { api } from "@/lib/convex";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import type { Phase } from "@/types";

type PortalTask = Phase["tasks"][number];

export function ClientPortalPage() {
  const { token } = useParams({ from: "/portal/$token" });
  const data = useConvexQuery(api.portal.getByShareToken, { shareToken: token });
  const isLoading = data === undefined;
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);

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
  const selectedPhase =
    phases.find((phase) => phase.id === selectedPhaseId) ??
    phases.find((phase) => phase.status === "active") ??
    phases[0] ??
    null;
  const isPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";

  if (!selectedPhase) {
    return null;
  }

  const progress = clampProgress(project.progress);
  const completedCount = selectedPhase.tasks.filter((task) => task.isCompleted).length;

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
          <div className="mx-auto flex max-w-[1440px] justify-center px-6 py-7 sm:px-10 lg:px-14">
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
          className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-5 pb-16 pt-12 sm:px-10 sm:pt-14 lg:px-14"
        >
          <section className="text-center">
            <h1 className="font-heading text-[30px] font-semibold tracking-[-0.5px] text-text-primary sm:text-[42px]">
              {project.name}
            </h1>
            <p className="mt-1 text-[15px] text-text-secondary sm:text-[16px]">
              {project.clientName}
            </p>

            <div className="mt-7 flex items-center justify-center gap-3">
              <div className="h-[6px] w-[180px] overflow-hidden rounded-full bg-border-subtle sm:w-[220px]">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  style={{ backgroundColor: config.accentColor }}
                />
              </div>
              <span className="text-[14px] font-medium text-text-secondary tabular-nums">
                {progress}%
              </span>
            </div>
          </section>

          <section className="timeline-scrollbar-hidden mt-14 overflow-x-auto pb-4 sm:mt-16">
            <div className="mx-auto flex min-w-[760px] max-w-[1080px] items-center px-4 sm:px-0">
              {phases.map((phase, index) => (
                <div key={phase.id} className="flex min-w-0 flex-1 items-center">
                  <PortalPhaseNode
                    phase={phase}
                    selected={selectedPhase.id === phase.id}
                    accentColor={config.accentColor}
                    onSelect={() => setSelectedPhaseId(phase.id)}
                  />
                  {index < phases.length - 1 ? (
                    <div
                      className="h-px min-w-[28px] flex-1"
                      style={{
                        backgroundColor:
                          phase.status === "completed"
                            ? hexToRgba(config.accentColor, 0.45)
                            : "#E8E8E8",
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-6 w-full max-w-[560px] flex-1">
            <header className="mb-5">
              <h2 className="font-heading text-[20px] font-semibold text-text-primary">
                {selectedPhase.name}
              </h2>
              <p className="text-[13px] text-text-secondary">
                {completedCount} of {selectedPhase.tasks.length} complete
              </p>
            </header>

            <div>
              {selectedPhase.tasks.map((task) => (
                <PortalTaskRow
                  key={task.id}
                  task={task}
                  accentColor={config.accentColor}
                />
              ))}
            </div>
          </section>
        </motion.main>

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

function PortalPhaseNode({
  phase,
  selected,
  accentColor,
  onSelect,
}: {
  phase: Phase;
  selected: boolean;
  accentColor: string;
  onSelect: () => void;
}) {
  const completedCount = phase.tasks.filter((task) => task.isCompleted).length;
  const isCompleted = phase.status === "completed";
  const isActive = phase.status === "active";
  const isUpcoming = phase.status === "upcoming";
  const isSelectedActive = selected && isActive;
  const isSelectedOther = selected && !isActive;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-w-[106px] shrink-0 flex-col items-center gap-2 rounded-[18px] border border-transparent px-3 py-4 text-center transition-all duration-200 sm:min-w-[120px] ${
        isSelectedActive ? "" : isSelectedOther ? "" : "hover:bg-bg-subtle"
      }`}
      style={
        isSelectedActive
          ? {
              backgroundColor: accentColor,
            }
          : isSelectedOther
            ? {
                backgroundColor: hexToRgba(accentColor, 0.08),
                borderColor: hexToRgba(accentColor, 0.14),
              }
            : undefined
      }
    >
      <span
        className="h-3 w-3 rounded-full"
        style={{
          backgroundColor: isSelectedActive
            ? "#101117"
            : isCompleted || isActive
              ? accentColor
              : "transparent",
          border: isUpcoming ? "1px solid #D9D9D9" : "none",
        }}
      />

      <span
        className={`text-[13px] ${
          isSelectedActive
            ? "font-medium text-white"
            : isUpcoming
              ? "text-text-tertiary"
              : isCompleted
                ? "text-text-secondary"
                : "font-medium text-text-primary"
        }`}
      >
        {phase.name}
      </span>

      {isCompleted && !selected ? (
        <Check size={12} weight="bold" style={{ color: accentColor }} />
      ) : (
        <span
          className={`text-[11px] ${
            isSelectedActive
              ? "text-white/80"
              : isUpcoming
                ? "text-[#D0D0D0]"
                : isSelectedOther
                  ? "text-text-secondary"
                  : "text-text-tertiary"
          }`}
        >
          {completedCount} of {phase.tasks.length}
        </span>
      )}
    </button>
  );
}

function PortalTaskRow({
  task,
  accentColor,
}: {
  task: PortalTask;
  accentColor: string;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border-subtle px-1 py-2.5 first:border-t-0">
      <span
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border"
        style={{
          borderColor: task.isCompleted ? accentColor : "#D9D9D9",
          backgroundColor: task.isCompleted ? accentColor : "transparent",
        }}
      >
        {task.isCompleted ? <Check size={12} weight="bold" className="text-white" /> : null}
      </span>
      <span
        className={`text-[14px] ${
          task.isCompleted ? "text-text-tertiary line-through" : "text-text-primary"
        }`}
      >
        {task.title}
      </span>
    </div>
  );
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const expandedHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expandedHex)) {
    return `rgba(232, 115, 74, ${alpha})`;
  }

  const red = parseInt(expandedHex.slice(0, 2), 16);
  const green = parseInt(expandedHex.slice(2, 4), 16);
  const blue = parseInt(expandedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
