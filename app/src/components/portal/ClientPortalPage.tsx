import { useState } from "react";
import { Check, CaretRight, Plus, SignIn } from "@phosphor-icons/react";
import { useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { api } from "@/lib/convex";
import { usePortalEdit } from "@/hooks/usePortalEdit";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { buildPortalTaskPath } from "@/lib/portal";
import { getPortalPreviewData } from "@/lib/portalPreview";
import type { Phase } from "@/types";

type PortalTask = Phase["tasks"][number];

function formatDateShort(ms: number): string {
  const d = new Date(ms);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function ClientPortalPage() {
  const { token } = useParams({ from: "/portal/$token" });
  const isPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";
  const liveData = useConvexQuery(api.portal.getByShareToken, isPreview ? "skip" : { shareToken: token });
  const previewData = isPreview ? getPortalPreviewData() : null;
  const data = previewData ?? liveData;
  const isLoading = !isPreview && liveData === undefined;
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const { canEdit, user: editUser, toggleTask, addTask } = usePortalEdit(token, isPreview);
  const [addTaskValue, setAddTaskValue] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

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
  const previewSuffix = isPreview ? "?preview=1" : "";

  if (!selectedPhase) {
    return null;
  }

  const progress = clampProgress(project.progress);
  const completedCount = selectedPhase.tasks.filter((task) => task.isCompleted).length;
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

          {/* Phase timeline bar */}
          <section className="mt-10 px-0 sm:mt-14">
            <div className="mx-auto max-w-[1200px] px-2 sm:px-4">
              <div className="flex h-12 w-full overflow-hidden rounded-[12px] bg-border-subtle">
                {phases.map((phase, index) => {
                  const done = phase.tasks.filter((t) => t.isCompleted).length;
                  const total = phase.tasks.length;
                  const isCompleted = phase.status === "completed";
                  const isActive = phase.status === "active";
                  const isSelected = selectedPhase.id === phase.id;
                  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isFirst = index === 0;
                  const isLast = index === phases.length - 1;

                  return (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => setSelectedPhaseId(phase.id)}
                      aria-pressed={isSelected}
                      className={`relative flex flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden transition-all duration-150 hover:brightness-[0.94] ${isFirst ? "rounded-l-[12px]" : ""} ${isLast ? "rounded-r-[12px]" : ""} ${isSelected ? "z-[2]" : ""}`}
                      style={{
                        backgroundColor: isCompleted
                          ? config.accentColor
                          : isActive
                            ? undefined
                            : undefined,
                        background: isActive
                          ? `linear-gradient(90deg, ${config.accentColor} 0%, ${config.accentColor} ${progressPct}%, ${hexToRgba(config.accentColor, 0.12)} ${progressPct}%, ${hexToRgba(config.accentColor, 0.12)} 100%)`
                          : isCompleted
                            ? config.accentColor
                            : undefined,
                      }}
                    >
                      <span
                        className={`whitespace-nowrap text-[13px] font-medium ${
                          isCompleted || isActive ? "text-white/90" : "text-text-tertiary"
                        }`}
                      >
                        {phase.name}
                      </span>
                      <span
                        className={`text-[11px] ${
                          isCompleted || isActive ? "text-white/60" : "text-text-tertiary"
                        }`}
                      >
                        {done}/{total}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Task checklist */}
          <section className="mx-auto mt-8 w-full max-w-[640px] flex-1 sm:mt-10">
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
                  href={`${buildPortalTaskPath(token, task.id)}${previewSuffix}`}
                  canEdit={canEdit}
                  onToggle={() => void toggleTask(task.id)}
                />
              ))}

              {canEdit ? (
                <form
                  className="flex items-center gap-3 border-t border-border-subtle px-1 py-2.5"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const title = addTaskValue.trim();
                    if (!title || isAddingTask) return;
                    setIsAddingTask(true);
                    try {
                      await addTask(selectedPhase.id, title);
                      setAddTaskValue("");
                    } finally {
                      setIsAddingTask(false);
                    }
                  }}
                >
                  <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                    <Plus size={14} className="text-text-tertiary" />
                  </span>
                  <input
                    type="text"
                    placeholder="Add a task…"
                    value={addTaskValue}
                    onChange={(e) => setAddTaskValue(e.target.value)}
                    disabled={isAddingTask}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
                  />
                </form>
              ) : null}
            </div>
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

function PortalTaskRow({
  task,
  accentColor,
  href,
  canEdit,
  onToggle,
}: {
  task: PortalTask;
  accentColor: string;
  href: string;
  canEdit: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 border-t border-border-subtle px-1 py-3 text-left transition-colors first:border-t-0 hover:bg-bg-subtle/70">
      <button
        type="button"
        onClick={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          onToggle();
        }}
        disabled={!canEdit}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border ${canEdit ? "cursor-pointer" : "cursor-default"}`}
        style={{
          borderColor: task.isCompleted ? accentColor : "#D9D9D9",
          backgroundColor: task.isCompleted ? accentColor : "transparent",
        }}
      >
        {task.isCompleted ? <Check size={12} weight="bold" className="text-white" /> : null}
      </button>
      <a
        href={href}
        className={`min-w-0 flex-1 text-[14px] ${
          task.isCompleted ? "text-text-tertiary line-through" : "text-text-primary"
        }`}
      >
        {task.title}
      </a>
      {task.dueDate && !task.isCompleted ? (
        <span className="shrink-0 text-[12px] text-text-tertiary">
          {formatDateShort(task.dueDate)}
        </span>
      ) : null}
      <a href={href}>
        <CaretRight
          size={14}
          className="ml-auto shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
        />
      </a>
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
