import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import {
  flowsArtifactSchema,
  parseResearchArtifactContent,
  strategyArtifactSchema,
  wireframesArtifactSchema,
  type FlowsArtifact,
  type WireframesArtifact,
} from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { ProjectTabBar, ProjectTitle, type ProjectTab } from "@stage/project-ui/project";
import {
  CompanySnapshot,
  CompetitiveAnalysis,
  CustomSections,
  Divider,
  mapResearchArtifactToTabData,
  Opportunities,
  ResearchSummary,
  TargetUsers,
  UiPatterns,
  type CompetitiveView,
} from "@stage/project-ui/research";
import { StrategyProgress, StrategySectionCard } from "@stage/project-ui/strategy";
import { api } from "@/lib/convex";
import { formatRelative } from "@/lib/mcp";
import { Card } from "./AppShell";
import { useDismiss } from "./useDismiss";

// One project on the web: the Mac app's own step screens (shared from @stage/project-ui), read-only.
// AI runs, editing and exports stay in Stage for Mac; the user's AI tool fills the steps through the MCP.

export function ProjectView({ projectId, tab }: { projectId: Id<"projects">; tab: ProjectTab }) {
  const project = useQuery(api.mcpHome.getProject, { projectId });
  const navigate = useNavigate();

  if (project === null) {
    return <Notice>This project doesn't exist anymore, or it isn't shared with you. <Link to="/app/projects" className="underline">Back to Projects</Link></Notice>;
  }
  if (!project) return null;
  return (
    <>
      <section className="project-detail-header">
        <div className="project-header-primary">
          <ProjectTitle name={project.name} clientName={project.clientName} />
          <div className="project-header-actions relative flex min-w-0 items-center justify-end gap-[6px]">
            <ProjectMenu projectId={projectId} name={project.name} />
          </div>
        </div>
        <div className="project-header-secondary">
          <div className="project-header-tabs min-w-0 max-w-full overflow-hidden">
            <ProjectTabBar
              enabledSteps={project.enabledSteps}
              category={project.category}
              activeTab={tab}
              onTabChange={(next) => void navigate({ to: "/app/projects/$projectId", params: { projectId }, search: { tab: next }, replace: true })}
            />
          </div>
        </div>
      </section>
      <TabPanel projectId={projectId} tab={tab} projectName={project.name} />
    </>
  );
}

function TabPanel({ projectId, tab, projectName }: { projectId: Id<"projects">; tab: ProjectTab; projectName: string }) {
  switch (tab) {
    case "research":
      return <ResearchPanel projectId={projectId} projectName={projectName} />;
    case "strategy":
      return <StrategyPanel projectId={projectId} projectName={projectName} />;
    case "flows":
      return <FlowsPanel projectId={projectId} projectName={projectName} />;
    case "wireframes":
      return <WireframesPanel projectId={projectId} projectName={projectName} />;
    case "overview":
      return <Notice>The task board is in <MacLink />.</Notice>;
    case "moodboard":
      return <Notice>The Moodboard and Style guide are made and viewed in <MacLink />.</Notice>;
    case "assets":
      return <Notice>Exports to Figma, Paper and code are in <MacLink />.</Notice>;
  }
}

type Saved = { contentJson: string | null; updatedAt: number } | null | undefined;

// A saved step in its contract shape: undefined while loading, null when nothing valid is saved yet.
function parseSaved<T>(saved: Saved, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }) {
  if (saved === undefined) return undefined;
  const parsed = saved?.contentJson ? schema.safeParse(JSON.parse(saved.contentJson)) : null;
  return saved && parsed?.success ? { data: parsed.data, updatedAt: saved.updatedAt } : null;
}

// Same white page card as the Mac step tabs.
function StepPage({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-[44px]">{children}</div>
      </div>
    </section>
  );
}

function NotYet({ step, projectName }: { step: string; projectName: string }) {
  return <Notice>No {step} yet. Ask your AI tool: “Run the Stage {step} step for {projectName}.”</Notice>;
}

function ResearchPanel({ projectId, projectName }: { projectId: Id<"projects">; projectName: string }) {
  const saved = useQuery(api.projectAi.getLatestResearchArtifact, { projectId });
  const [view, setView] = useState<CompetitiveView>("card");
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  if (saved === undefined) return null;
  const artifact = saved?.contentJson ? parseResearchArtifactContent(saved.contentJson) : null;
  if (!artifact) return <NotYet step="Research" projectName={projectName} />;
  const data = mapResearchArtifactToTabData(artifact);
  return (
    <StepPage>
      <ResearchSummary summary={data.summary} isEditing={false} />
      <Divider />
      <CompanySnapshot rows={data.companySnapshot} isEditing={false} />
      <Divider />
      <CompetitiveAnalysis isEditing={false} view={view} competitors={data.competitors} matrixRows={data.competitiveMatrixRows} onViewChange={setView} />
      {data.uiPatternGroups.length > 0 ? (
        <>
          <Divider />
          <UiPatterns
            groups={data.uiPatternGroups}
            provider={data.uiPatternProvider}
            isEditing={false}
            openGroupId={openGroup}
            onToggleGroup={(id) => setOpenGroup((current) => (current === id ? null : id))}
            onOpenPhoto={(src) => window.open(src, "_blank", "noopener")}
          />
        </>
      ) : null}
      <Divider />
      <TargetUsers users={data.targetUsers} isEditing={false} />
      <Divider />
      <Opportunities opportunities={data.opportunities} isEditing={false} />
      {data.customSections.length > 0 ? (
        <>
          <Divider />
          <CustomSections sections={data.customSections} isEditing={false} />
        </>
      ) : null}
    </StepPage>
  );
}

function StrategyPanel({ projectId, projectName }: { projectId: Id<"projects">; projectName: string }) {
  const strategy = parseSaved(useQuery(api.projectAi.getLatestStrategyArtifact, { projectId }), strategyArtifactSchema);
  if (strategy === undefined) return null;
  if (!strategy) return <NotYet step="Strategy" projectName={projectName} />;
  const { sections } = strategy.data;
  return (
    <StepPage>
      <div className="flex flex-col gap-6">
        <StrategyProgress approvedCount={sections.filter((section) => section.status === "approved").length} total={sections.length} />
        {sections.map((section, index) => (
          <StrategySectionCard key={section.id} section={section} showDivider={index > 0} isEditing={false} />
        ))}
      </div>
    </StepPage>
  );
}

// Flows and Wireframes: interim web views until their Mac screens (canvas, screen previews) move to @stage/project-ui.
function FlowsPanel({ projectId, projectName }: { projectId: Id<"projects">; projectName: string }) {
  const step = parseSaved(useQuery(api.projectAi.getLatestFlowsArtifact, { projectId }), flowsArtifactSchema);
  if (step === undefined) return null;
  if (!step) return <NotYet step="Flows" projectName={projectName} />;
  return <><Updated at={step.updatedAt} /><FlowsList data={step.data} /></>;
}

function WireframesPanel({ projectId, projectName }: { projectId: Id<"projects">; projectName: string }) {
  const step = parseSaved(useQuery(api.projectAi.getLatestWireframesArtifact, { projectId }), wireframesArtifactSchema);
  if (step === undefined) return null;
  if (!step) return <NotYet step="Wireframes" projectName={projectName} />;
  return <><Updated at={step.updatedAt} /><WireframesList data={step.data} /></>;
}

function Updated({ at }: { at: number }) {
  return <p className="text-[12px] text-[#737373]">Updated {formatRelative(at)}</p>;
}

function FlowsList({ data }: { data: FlowsArtifact }) {
  const screens = new Map(data.screens.map((screen) => [screen.id, screen]));
  return (
    <>
      {data.flows.map((flow) => (
        <Card key={flow.id} title={flow.title} subtitle={`${flow.category} · ${flow.status}`}>
          <p className="text-[13px] text-[#404040]">{flow.description}</p>
          <ol className="flex flex-col gap-1.5">
            {[...flow.steps].sort((a, b) => a.order - b.order).map((step) => {
              const screen = step.screenId ? screens.get(step.screenId) : undefined;
              return (
                <li key={step.id} className="flex flex-col gap-0.5 text-[13px]">
                  <span className="font-medium text-[#171717]">{step.label}</span>
                  {screen ? <span className="text-[12px] text-[#737373]">{screen.keyElements.join(" · ")}</span> : null}
                </li>
              );
            })}
          </ol>
        </Card>
      ))}
    </>
  );
}

function WireframesList({ data }: { data: WireframesArtifact }) {
  return (
    <>
      {data.generatedScreens.map((screen) => (
        <Card key={screen.id} title={screen.title} subtitle={screen.goal}>
          {screen.html ? (
            // Sandboxed without scripts: the AI's HTML can't run code or reach the page.
            <iframe title={screen.title} sandbox="" srcDoc={screen.html} className="h-[480px] w-full rounded-[6px] border-[0.5px] border-[#E5E5E5] bg-white" />
          ) : (
            <ol className="flex flex-col gap-1.5 text-[13px]">
              {screen.sections.map((section) => (
                <li key={section.id}>
                  <span className="font-medium text-[#171717]">{section.title}</span>
                  <span className="text-[#737373]"> · {section.blocks.map((block) => block.intent).join(", ")}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      ))}
    </>
  );
}

function MacLink() {
  return <a href="/download/mac" className="underline">Stage for Mac</a>;
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-5 text-center text-[13px] font-medium text-[#737373]">{children}</p>;
}

// The Mac header's "…" menu, with what the web can do: rename and delete.
function ProjectMenu({ projectId, name }: { projectId: Id<"projects">; name: string }) {
  const update = useMutation(api.projects.update);
  const remove = useMutation(api.projects.deleteById);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"closed" | "menu" | "rename" | "confirm-delete">("closed");
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string>();

  useDismiss(ref, mode !== "closed", () => setMode("closed"));

  const act = async (action: () => Promise<unknown>) => {
    setError(undefined);
    try {
      await action();
    } catch {
      setError("That didn't work. Try again.");
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setMode(mode === "menu" ? "closed" : "menu")}
        className="flex h-[27px] w-[27px] cursor-pointer items-center justify-center rounded-[6px] text-[#525252] transition-colors hover:bg-[#F5F5F5]"
        aria-label="Project actions"
        aria-haspopup="menu"
        aria-expanded={mode === "menu"}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-[15px] w-[15px]" aria-hidden="true">
          <circle cx="8" cy="3.5" r="1.15" />
          <circle cx="8" cy="8" r="1.15" />
          <circle cx="8" cy="12.5" r="1.15" />
        </svg>
      </button>
      {mode === "closed" ? null : (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-20 flex w-[240px] flex-col gap-2 rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white p-1 shadow-[0_4px_16px_-4px_rgba(10,10,10,0.25)]">
          {mode === "menu" ? (
            <>
              <button role="menuitem" type="button" onClick={() => { setDraft(name); setMode("rename"); }} className="rounded-[6px] px-2.5 py-2 text-left text-[13px] text-[#171717] hover:bg-[#F5F5F5]">Rename project</button>
              <button role="menuitem" type="button" onClick={() => setMode("confirm-delete")} className="rounded-[6px] px-2.5 py-2 text-left text-[13px] text-[#DC2626] hover:bg-[#FEF2F2]">Delete project</button>
            </>
          ) : null}
          {mode === "rename" ? (
            <form
              className="flex flex-col gap-2 p-2"
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => {
                  await update({ projectId, name: draft.trim() });
                  setMode("closed");
                });
              }}
            >
              <input id="project-name" aria-label="Project name" value={draft} onChange={(event) => setDraft(event.target.value)} className="rounded-[6px] border-[0.5px] border-[#D4D4D4] px-2 py-1.5 text-[13px]" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setMode("closed")} className="rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-[#525252]">Cancel</button>
                <button type="submit" disabled={!draft.trim()} className="rounded-[6px] bg-[#171717] px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-50">Save</button>
              </div>
            </form>
          ) : null}
          {mode === "confirm-delete" ? (
            <div className="flex flex-col gap-2 p-2">
              <p className="text-[12px] text-[#525252]">Deletes the project and every step's results, on the web and on Mac.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setMode("closed")} className="rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-[#525252]">Keep</button>
                <button
                  type="button"
                  onClick={() => void act(async () => {
                    await navigate({ to: "/app/projects" });
                    await remove({ projectId });
                  })}
                  className="rounded-[6px] bg-[#DC2626] px-2.5 py-1 text-[12px] font-medium text-white"
                >
                  Delete for good
                </button>
              </div>
            </div>
          ) : null}
          {error ? <p role="alert" className="px-2 pb-2 text-[12px] font-medium text-[#DC2626]">{error}</p> : null}
        </div>
      )}
    </div>
  );
}
