import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { ProjectAiSetupPanel } from "@/components/project/ProjectAiSetupPanel";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type FlowsTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

export function FlowsTab({ projectId, projectName }: FlowsTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "flows" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "flows" });
  const createRun = useMutation(api.projectAi.createRun);

  const [isLaunching, setIsLaunching] = useState(false);

  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const runList: ProjectAiRun[] = runs ?? [];
  const hasArtifact = artifactList.length > 0;
  const latestArtifact = artifactList[0] ?? null;

  async function launchFlowsRun() {
    setIsLaunching(true);
    try {
      const result = await createRun({
        projectId,
        module: "flows",
        title: `${projectName} flows run`,
        inputSummary: "Started from the project flows setup panel.",
      });
      window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&module=flows&runId=${result.runId}`);
    } catch {
      // Error handling
    } finally {
      setIsLaunching(false);
    }
  }

  if (!hasArtifact) {
    return (
      <div className="pb-20">
        <ProjectAiSetupPanel isLaunching={isLaunching} onRun={() => void launchFlowsRun()} />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="mx-auto max-w-[940px] py-6">
        <div className="rounded-[16px] border border-border-subtle bg-white p-5">
          <div className="font-heading text-[18px] font-semibold text-text-primary">Latest flows</div>
          <div className="mt-1 text-[13px] text-text-secondary">
            Updated {latestArtifact ? new Date(latestArtifact.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
          </div>
          <div className="mt-5 whitespace-pre-wrap text-[14px] leading-[1.75] text-text-secondary">
            {latestArtifact?.contentMarkdown || latestArtifact?.summary || "No content yet."}
          </div>
        </div>

        {runList.length > 0 ? (
          <div className="mt-6 rounded-[16px] border border-border-subtle bg-white p-5">
            <div className="font-heading text-[18px] font-semibold text-text-primary">Run history</div>
            <div className="mt-4 space-y-3">
              {runList.map((run) => (
                <div key={run.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-border-subtle px-4 py-3">
                  <div>
                    <div className="text-[14px] font-medium text-text-primary">{run.title}</div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {run.startedAt ? new Date(run.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Pending"}
                    </div>
                  </div>
                  <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-[12px] font-medium text-text-secondary">{run.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
