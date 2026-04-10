import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type StrategyTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

type StrategySectionStatus = "approved" | "draft" | "needs_revision" | "failed";

export function StrategyTab({ projectId, projectName }: StrategyTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "strategy" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "strategy" });
  const createRun = useMutation(api.projectAi.createRun);
  const setArtifactStatus = useMutation(api.projectAi.setArtifactStatus);
  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const runList: ProjectAiRun[] = runs ?? [];
  const sections = useMemo(
    () =>
      artifactList.map((artifact) => ({
        ...artifact,
        uiStatus: toSectionStatus(artifact.status),
      })),
    [artifactList],
  );

  const approvedCount = sections.filter((section) => section.uiStatus === "approved").length;
  const totalCount = sections.length;
  const progressPercent = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

  async function launchStrategyRun() {
    const result = await createRun({
      projectId,
      module: "strategy",
      title: `${projectName} strategy run`,
      inputSummary: `Existing strategy artifacts: ${sections.length}`,
    });
    window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&module=strategy&runId=${result.runId}`);
  }

  return (
    <div className="pb-20">
      <div className="mx-auto max-w-[920px] py-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[14px] font-medium text-text-primary">
            {approvedCount} of {totalCount} sections approved
          </span>
          <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-bg-subtle">
            <div
              className="h-full rounded-full bg-[#22C55E] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => void launchStrategyRun()}
            className="inline-flex items-center justify-center rounded-[10px] border border-border px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
          >
            Regenerate in Claude
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[920px] space-y-5">
        {sections.length > 0 ? (
          sections.map((section) => (
            <section
              key={section.id}
              className="rounded-[16px] border border-border-subtle bg-white p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <h2 className="font-heading text-[17px] font-semibold text-text-primary">
                  {section.title}
                </h2>
                <StatusBadge status={section.uiStatus} />
              </div>
              <div className="text-[14px] leading-[1.75] text-text-secondary">
                <ArtifactContent artifact={section} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void setArtifactStatus({ artifactId: section.id as Id<"projectAiArtifacts">, status: "approved" })}
                  className="inline-flex cursor-pointer items-center rounded-[8px] border border-[#22C55E] bg-transparent px-3.5 py-2 text-[13px] font-medium text-[#22C55E] transition-all duration-150 hover:bg-[#EDFCF2]"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void setArtifactStatus({ artifactId: section.id as Id<"projectAiArtifacts">, status: "superseded" })}
                  className="inline-flex cursor-pointer items-center rounded-[8px] border border-[#D4890A] bg-transparent px-3.5 py-2 text-[13px] font-medium text-[#D4890A] transition-all duration-150 hover:bg-[#FEF9EC]"
                >
                  Request revision
                </button>
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-[16px] border border-dashed border-border-subtle bg-white p-6 text-[14px] leading-[1.7] text-text-secondary">
            No strategy sections yet. Launch Claude to generate the first strategy artifact set for this project.
          </div>
        )}

        {runList.length > 0 ? (
          <div className="rounded-[16px] border border-border-subtle bg-white p-5">
            <div className="font-heading text-[18px] font-semibold text-text-primary">Recent runs</div>
            <div className="mt-4 space-y-3">
              {runList.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-border-subtle px-4 py-3"
                >
                  <div>
                    <div className="text-[14px] font-medium text-text-primary">{run.title}</div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {formatTimestamp(run.startedAt)}
                    </div>
                  </div>
                  <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-[12px] font-medium text-text-secondary">
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: StrategySectionStatus }) {
  const config: Record<StrategySectionStatus, { label: string; classes: string }> = {
    approved: {
      label: "Approved",
      classes: "bg-[#EDFCF2] text-[#22C55E]",
    },
    draft: {
      label: "Draft",
      classes: "bg-bg-subtle text-text-secondary",
    },
    needs_revision: {
      label: "Needs Revision",
      classes: "bg-[#FEF9EC] text-[#D4890A]",
    },
    failed: {
      label: "Failed",
      classes: "bg-[#FDECEC] text-[#D64545]",
    },
  };

  const { label, classes } = config[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${classes}`}>
      {label}
    </span>
  );
}

function ArtifactContent({
  artifact,
}: {
  artifact: {
    contentMarkdown: string | null;
    contentJson: string | null;
    summary: string | null;
  };
}) {
  if (artifact.contentMarkdown) {
    return <div className="whitespace-pre-wrap">{artifact.contentMarkdown}</div>;
  }

  if (artifact.contentJson) {
    return <JsonStrategyContent contentJson={artifact.contentJson} />;
  }

  return <div>{artifact.summary ?? "No section content available yet."}</div>;
}

function JsonStrategyContent({ contentJson }: { contentJson: string }) {
  try {
    const parsed = JSON.parse(contentJson) as {
      body?: string;
      bullets?: string[];
    };

    return (
      <div className="space-y-3">
        {parsed.body ? <p>{parsed.body}</p> : null}
        {parsed.bullets?.length ? (
          <ul className="space-y-1">
            {parsed.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2">
                <span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-text-tertiary" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  } catch {
    return <pre className="whitespace-pre-wrap">{contentJson}</pre>;
  }
}

function toSectionStatus(status: string): StrategySectionStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "failed":
      return "failed";
    case "draft":
      return "draft";
    default:
      return "needs_revision";
  }
}

function formatTimestamp(value: number | null | undefined) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
