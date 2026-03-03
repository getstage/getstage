import { useMemo, useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { useParams } from "@tanstack/react-router";
import { api } from "@/lib/convex";
import portalLogo from "@/assets/logos/client-portal-logo.png";
import type { Phase } from "@/types";

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <h1 className="font-heading text-[26px] font-semibold text-text-primary">
          Portal not found
        </h1>
        <p className="mt-2 text-[15px] text-text-secondary">
          This link may have expired or is no longer active.
        </p>
      </div>
    );
  }

  const { project, config } = data;
  const selectedPhase = useMemo(
    () =>
      project.phases.find((phase) => phase.id === selectedPhaseId) ??
      project.phases.find((phase) => phase.status === "active") ??
      project.phases[0],
    [project.phases, selectedPhaseId],
  );

  if (!selectedPhase) return null;

  const completed = selectedPhase.tasks.filter((task) => task.isCompleted).length;
  const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";

  return (
    <>
      <Helmet>
        <title>{project.name} — Client Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-white">
        {isPreview && (
          <div className="bg-[#141531] py-2 text-center text-[12px] text-white">
            Preview mode <span className="text-white/55">— This is what your client will see</span>
          </div>
        )}

        <header className="flex justify-center border-b border-border-subtle py-7">
          <img
            src={config.logoUrl ?? portalLogo}
            alt={project.clientName}
            className="h-14 w-auto object-contain"
          />
        </header>

        <main className="mx-auto max-w-[1200px] px-6 pb-14 pt-12 sm:px-10 lg:px-14">
          <div className="text-center">
            <h1 className="font-heading text-[42px] font-semibold tracking-tight text-text-primary">
              {project.name}
            </h1>
            <p className="mt-1 text-[16px] text-text-secondary">{project.clientName}</p>
          </div>

          <div className="mt-7 flex items-center justify-center gap-3">
            <div className="h-[6px] w-[220px] overflow-hidden rounded-full bg-border-subtle">
              <div
                className="h-full rounded-full"
                style={{ width: `${project.progress}%`, backgroundColor: config.accentColor }}
              />
            </div>
            <span className="text-[14px] font-medium text-text-secondary">{project.progress}%</span>
          </div>

          <section className="py-16">
            <div className="mx-auto flex max-w-[960px] items-center">
              {project.phases.map((phase, index) => (
                <div key={phase.id} className="flex flex-1 items-center">
                  <PhaseNode
                    phase={phase}
                    active={selectedPhase.id === phase.id}
                    accentColor={config.accentColor}
                    onClick={() => setSelectedPhaseId(phase.id)}
                  />
                  {index < project.phases.length - 1 && (
                    <div
                      className="h-px flex-1"
                      style={{
                        backgroundColor:
                          phase.status === "completed" ? `${config.accentColor}80` : "#E8E8E8",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-[560px]">
            <header className="mb-5">
              <h2 className="font-heading text-[20px] font-semibold text-text-primary">
                {selectedPhase.name}
              </h2>
              <p className="text-[13px] text-text-secondary">
                {completed} of {selectedPhase.tasks.length} complete
              </p>
            </header>

            <div>
              {selectedPhase.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 border-t border-border-subtle px-1 py-2.5 first:border-t-0"
                >
                  <span
                    className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border text-[11px]"
                    style={{
                      borderColor: task.isCompleted ? config.accentColor : "#D9D9D9",
                      backgroundColor: task.isCompleted ? config.accentColor : "transparent",
                      color: "#fff",
                    }}
                  >
                    {task.isCompleted ? "✓" : ""}
                  </span>
                  <span
                    className={`text-[14px] ${
                      task.isCompleted
                        ? "text-text-tertiary line-through"
                        : "text-text-primary"
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="border-t border-border-subtle py-6 text-center">
          <a
            href="/"
            className="text-[12px] text-text-tertiary transition-colors hover:text-text-secondary"
          >
            Powered by <span className="font-medium">Stage</span>
          </a>
        </footer>
      </div>
    </>
  );
}

function PhaseNode({
  phase,
  active,
  accentColor,
  onClick,
}: {
  phase: Phase;
  active: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  const complete = phase.tasks.filter((task) => task.isCompleted).length;

  return (
    <button
      onClick={onClick}
      className={`flex min-w-[110px] cursor-pointer flex-col items-center gap-2 rounded-[8px] px-3 py-2 transition-colors ${
        active ? "bg-black/[0.02]" : "hover:bg-bg-subtle"
      }`}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor:
            phase.status === "completed"
              ? "#BFBFBF"
              : phase.status === "active"
                ? accentColor
                : "transparent",
          border: phase.status === "upcoming" ? "1px solid #D9D9D9" : "none",
        }}
      />
      <span
        className={`text-[12px] ${
          phase.status === "upcoming"
            ? "text-text-tertiary"
            : phase.status === "completed"
              ? "text-text-secondary"
              : "text-text-primary"
        }`}
      >
        {phase.name}
      </span>
      <span className="text-[11px] text-text-tertiary">
        {complete} of {phase.tasks.length}
      </span>
    </button>
  );
}
