import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import {
  assetsArtifactSchema,
  flowsArtifactSchema,
  moodboardArtifactSchema,
  parseResearchArtifactContent,
  strategyArtifactSchema,
  wireframesArtifactSchema,
  type ProjectCategory,
} from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { directionIdFromName } from "@stage/data-ops/domain";
import { ClientPortalButton, ProjectTabBar, ProjectTitle, type ProjectTab } from "@stage/project-ui/project";
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
import { AssetCard } from "@stage/project-ui/assets/AssetCard";
import { AssetCategoryTabs } from "@stage/project-ui/assets/AssetCategoryTabs";
import { DocumentsGrid } from "@stage/project-ui/assets/DocumentsGrid";
import { mapAssetsArtifactToTabData } from "@stage/project-ui/assets/mapAssetsArtifact";
import { buildAssetsTabData } from "@stage/project-ui/assets/tabData";
import type { AssetView } from "@stage/project-ui/assets/types";
import { UploadedGrid } from "@stage/project-ui/assets/UploadedGrid";
import { uploadedRows } from "@stage/project-ui/assets/uploads";
import { FlowsCanvasView } from "@stage/project-ui/flows";
import { FlowRow } from "@stage/project-ui/flows/FlowRow";
import { FlowsDetailsHeader, type FlowPanel } from "@stage/project-ui/flows/FlowsDetailsHeader";
import { mapFlowsArtifactToTabData } from "@stage/project-ui/flows/mapFlowsArtifact";
import { ScreensPanel } from "@stage/project-ui/flows/ScreensPanel";
import { KanbanBoardView, mapPhase } from "@stage/project-ui/kanban";
import { DirectionHub } from "@stage/project-ui/moodboard/DirectionHub";
import { DirectionToggle } from "@stage/project-ui/moodboard/DirectionToggle";
import { Header as MoodboardHeader } from "@stage/project-ui/moodboard/Header";
import { boardDirections, getStyleGuideForDirection, mapMoodboardArtifactToTabData } from "@stage/project-ui/moodboard/mapMoodboardArtifact";
import { MoodboardGrid } from "@stage/project-ui/moodboard/MoodboardGrid";
import { resolveStyleGuideSpec } from "@stage/data-ops/domain/styleGuideSpec";
import type { ThemeMode } from "@stage/project-ui/moodboard/styleGuideSpec";
import { StyleGuideDialog } from "@stage/project-ui/moodboard/styleguide/StyleGuideDialog";
import { StrategyProgress, StrategySectionCard } from "@stage/project-ui/strategy";
import { buildResultCards, mapWireframesArtifactToTabData, ResultsGrid } from "@stage/project-ui/wireframes";
import { api } from "@/lib/convex";
import { useDismiss } from "./useDismiss";
import { BackButton } from "@stage/project-ui/ui/BackButton";

// One project on the web: the Mac app's own step screens (shared from @stage/project-ui), read-only.
// AI runs, editing and exports stay in Stage for Mac; the user's AI tool fills the steps through the MCP.

export function ProjectView({ projectId, tab }: { projectId: Id<"projects">; tab: ProjectTab }) {
  const project = useQuery(api.mcpHome.getProject, { projectId });
  const navigate = useNavigate();

  if (project === null) {
    return <Notice>This project doesn't exist anymore, or it isn't shared with you. <Link to="/app/projects" className="underline">Back to Projects</Link></Notice>;
  }
  if (!project) return null;
  const { portalUrl } = project;
  return (
    <>
      <BackButton label="Back to projects" onClick={() => void navigate({ to: "/app/projects" })} />
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
          {portalUrl ? (
            <div className="project-header-portal flex min-w-0 items-center justify-end gap-2">
              <ClientPortalButton onClick={() => window.open(portalUrl, "_blank", "noopener")} />
            </div>
          ) : null}
        </div>
      </section>
      <TabPanel projectId={projectId} tab={tab} projectName={project.name} category={project.category} />
    </>
  );
}

function TabPanel({ projectId, tab, projectName, category }: { projectId: Id<"projects">; tab: ProjectTab; projectName: string; category: ProjectCategory }) {
  switch (tab) {
    case "research":
      return <ResearchPanel projectId={projectId} projectName={projectName} />;
    case "strategy":
      return <StrategyPanel projectId={projectId} projectName={projectName} />;
    case "flows":
      return <FlowsPanel projectId={projectId} projectName={projectName} category={category} />;
    case "wireframes":
      return <WireframesPanel projectId={projectId} projectName={projectName} />;
    case "overview":
      return <OverviewPanel projectId={projectId} />;
    case "moodboard":
      return <MoodboardPanel projectId={projectId} projectName={projectName} />;
    case "assets":
      return <AssetsPanel projectId={projectId} />;
  }
}

type Saved = { contentJson: string | null } | null | undefined;

// A saved step in its contract shape: undefined while loading, null when nothing valid is saved yet.
function parseSaved<T>(saved: Saved, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }) {
  if (saved === undefined) return undefined;
  const parsed = saved?.contentJson ? schema.safeParse(JSON.parse(saved.contentJson)) : null;
  return saved && parsed?.success ? { data: parsed.data } : null;
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

// Same task board as the Mac Overview, read-only (tasks are moved and edited in Stage for Mac).
function OverviewPanel({ projectId }: { projectId: Id<"projects"> }) {
  const data = useQuery(api.desktop.getProjectData, { projectId });
  if (!data) return null;
  const phases = [...data.phases]
    .sort((a, b) => a.order - b.order)
    .map((phase) => mapPhase(phase, data.tasks.filter((task) => task.phaseId === phase.id)));
  return <KanbanBoardView phases={phases} />;
}

type MoodboardView = { kind: "hub" } | { kind: "board"; direction?: string } | { kind: "style-guide"; direction: string };

// Same Moodboard as Stage for Mac, read-only: the directions, their images and each direction's style guide.
// AI tools add images and style guides through the MCP (add_to_moodboard, save_style_guide).
function MoodboardPanel({ projectId, projectName }: { projectId: Id<"projects">; projectName: string }) {
  const moodboard = parseSaved(useQuery(api.projectAi.getLatestMoodboardArtifact, { projectId }), moodboardArtifactSchema);
  const [view, setView] = useState<MoodboardView>({ kind: "hub" });
  const [mode, setMode] = useState<ThemeMode>("light");
  if (moodboard === undefined) return null;
  if (!moodboard) return <NotYet step="Moodboard" projectName={projectName} />;

  const tabData = mapMoodboardArtifactToTabData(moodboard.data);
  const directions = boardDirections(tabData);
  const images = tabData.references.filter((reference) => reference.isInMoodboard);

  if (view.kind === "style-guide") {
    const guide = getStyleGuideForDirection(tabData, directionIdFromName(view.direction));
    const references = images.filter((reference) => reference.folder === view.direction);
    if (guide) {
      return (
        <StyleGuideDialog
          spec={resolveStyleGuideSpec(guide, view.direction, references)}
          references={references}
          mode={mode}
          onModeChange={setMode}
          onBack={() => setView({ kind: "hub" })}
        />
      );
    }
  }

  return (
    <section className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <MoodboardHeader description="References your AI tool or team collected, grouped in directions." />
      {view.kind === "board" ? (
        <div className="relative flex flex-col gap-2 rounded-[10px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <DirectionToggle activeView="all" onAll={() => setView({ kind: "board" })} onDirectionHub={() => setView({ kind: "hub" })} />
          <MoodboardGrid items={view.direction ? images.filter((reference) => reference.folder === view.direction) : images} />
        </div>
      ) : (
        <DirectionHub
          directions={directions}
          items={images}
          onAll={() => setView({ kind: "board" })}
          onOpenDirection={(direction) => setView({ kind: "board", direction })}
          onGenerateStyleGuide={(direction) => setView({ kind: "style-guide", direction })}
          canGenerateStyleGuide={false}
        />
      )}
    </section>
  );
}

// Same Assets tab as Stage for Mac, without uploading and exporting (those need the Mac app).
function AssetsPanel({ projectId }: { projectId: Id<"projects"> }) {
  const saved = parseSaved(useQuery(api.projectAi.getLatestAssetsArtifact, { projectId }), assetsArtifactSchema);
  const wireframesRecord = useQuery(api.projectAi.getLatestWireframesArtifact, { projectId });
  const wireframes = parseSaved(wireframesRecord, wireframesArtifactSchema);
  const uploads = useQuery(api.r2.listProjectAssets, { projectId });
  const [view, setView] = useState<AssetView>("wireframes");
  if (saved === undefined || wireframes === undefined || uploads === undefined) return null;

  const tabData = buildAssetsTabData({
    saved: saved && mapAssetsArtifactToTabData(saved.data),
    wireframes: wireframes && wireframesRecord ? { id: wireframesRecord.id, artifact: wireframes.data } : null,
    uploadedCount: uploads.length,
  });
  const title = tabData.categories.find((category) => category.id === view)?.label ?? "Documents";
  return (
    <section className="flex w-full flex-col gap-[18px]">
      <div className="overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-end justify-between p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <h2 className="font-heading text-[15px] font-medium leading-[1.25] text-[#171717]">{title}</h2>
              <AssetCategoryTabs categories={tabData.categories} activeView={view} onChange={setView} />
            </div>
          </div>
          {view === "documents" ? <DocumentsGrid documents={tabData.documents} /> : null}
          {view === "uploaded" ? <UploadedGrid uploads={uploadedRows(uploads)} /> : null}
          {view === "wireframes" ? (
            <div className="grid gap-1 lg:grid-cols-3">
              {tabData.wireframeAssets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
            </div>
          ) : null}
        </div>
      </div>
      <Notice>Uploading files and exporting to Figma, Paper or code are in <MacLink />.</Notice>
    </section>
  );
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

// Same as the Mac Flows tab, read-only: the canvas, or the details view with the Flows and Screens lists.
function FlowsPanel({ projectId, projectName, category }: { projectId: Id<"projects">; projectName: string; category: ProjectCategory }) {
  const flows = parseSaved(useQuery(api.projectAi.getLatestFlowsArtifact, { projectId }), flowsArtifactSchema);
  const [showCanvas, setShowCanvas] = useState(true);
  const [panel, setPanel] = useState<FlowPanel>("flows");
  const [expandedFlowId, setExpandedFlowId] = useState<string>();
  if (flows === undefined) return null;
  if (!flows) return <NotYet step="Flows" projectName={projectName} />;

  if (showCanvas && panel === "flows") {
    return (
      <FlowsCanvasView
        artifact={flows.data}
        projectCategory={category}
        actions={<button type="button" className="flows-canvas-action" onClick={() => setShowCanvas(false)}>View details</button>}
      />
    );
  }
  const tabData = mapFlowsArtifactToTabData(flows.data);
  return (
    <StepPage>
      <FlowsDetailsHeader
        category={category}
        flowTotal={tabData.stats.totalFlowCount}
        approvedCount={tabData.stats.approvedFlowCount}
        screenTotal={tabData.screens.length}
        panel={panel}
        onPanelChange={setPanel}
        onViewCanvas={() => setShowCanvas(true)}
      />
      {panel === "flows" ? (
        <div className="flex flex-col gap-1">
          {tabData.flows.map((flow, index) => (
            <FlowRow
              key={flow.id}
              flow={flow}
              index={index + 1}
              expanded={expandedFlowId === flow.id}
              onToggle={() => setExpandedFlowId(expandedFlowId === flow.id ? undefined : flow.id)}
            />
          ))}
        </div>
      ) : (
        <ScreensPanel screens={tabData.screens} />
      )}
    </StepPage>
  );
}

function WireframesPanel({ projectId, projectName }: { projectId: Id<"projects">; projectName: string }) {
  const wireframes = parseSaved(useQuery(api.projectAi.getLatestWireframesArtifact, { projectId }), wireframesArtifactSchema);
  if (wireframes === undefined) return null;
  if (!wireframes) return <NotYet step="Wireframes" projectName={projectName} />;
  const tabData = mapWireframesArtifactToTabData(wireframes.data);
  return <ResultsGrid cards={buildResultCards(tabData.configureScreens, tabData.generatedAtLabel, tabData.generatedScreens, tabData.generatedAt)} />;
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
