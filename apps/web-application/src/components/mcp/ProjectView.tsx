import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import type { z } from "zod";
import {
  flowsArtifactSchema,
  researchArtifactSchema,
  strategyArtifactSchema,
  wireframesArtifactSchema,
  type FlowsArtifact,
  type ResearchArtifact,
  type StrategyArtifact,
  type StrategySection,
  type WireframesArtifact,
} from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convex";
import { formatRelative } from "@/lib/mcp";
import { cn } from "@/lib/utils";
import { AppShell, Card } from "./AppShell";

// One project on the web (read-only): the saved result of each Stage step, the same data the Mac app shows.
// The AI tool fills Research, Strategy, Flows and Wireframes through the MCP; Moodboard and Delivery come from Stage for Mac.
type StepId = "research" | "strategy" | "moodboard" | "flows" | "wireframes" | "delivery";

const STEPS: { id: StepId; label: string }[] = [
  { id: "research", label: "Research" },
  { id: "strategy", label: "Strategy" },
  { id: "moodboard", label: "Moodboard" },
  { id: "flows", label: "Flows" },
  { id: "wireframes", label: "Wireframes" },
  { id: "delivery", label: "Delivery" },
];

type Saved = { contentJson: string | null; updatedAt: number } | null | undefined;

export function ProjectView({ projectId, step, onStep }: { projectId: Id<"projects">; step: StepId; onStep: (step: StepId) => void }) {
  const project = useQuery(api.projects.getById, { projectId });

  return (
    <AppShell page="projects">
      <a href="/app/projects" className="self-start text-[12px] font-medium text-[#737373] hover:text-[#171717]">← Projects</a>
      {project ? <ProjectHeader projectId={projectId} name={project.name} /> : null}
      <nav className="flex flex-wrap gap-1 self-start rounded-[8px] bg-[#F5F5F5] p-[2px]" aria-label="Steps">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={item.id === step ? "page" : undefined}
            onClick={() => onStep(item.id)}
            className={cn(
              "rounded-[6px] px-3 py-1.5 text-[13px] font-medium",
              item.id === step ? "bg-white text-[#171717] shadow-[0_1px_3px_rgba(10,10,10,0.15)]" : "text-[#737373] hover:text-[#171717]",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <StepPanel projectId={projectId} step={step} projectName={project?.name ?? ""} />
    </AppShell>
  );
}

export const PROJECT_STEP_IDS = STEPS.map((item) => item.id);

function ProjectHeader({ projectId, name }: { projectId: Id<"projects">; name: string }) {
  const update = useMutation(api.projects.update);
  const remove = useMutation(api.projects.deleteById);
  const [mode, setMode] = useState<"view" | "rename" | "confirm-delete">("view");
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string>();

  const act = async (action: () => Promise<unknown>) => {
    setError(undefined);
    try {
      await action();
    } catch {
      setError("That didn't work. Try again.");
    }
  };

  return (
    <header className="flex flex-col gap-2">
      {mode === "rename" ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void act(async () => {
              await update({ projectId, name: draft.trim() });
              setMode("view");
            });
          }}
        >
          <input
            id="project-name"
            aria-label="Project name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 rounded-[6px] border-[0.5px] border-[#D4D4D4] px-2 py-1 text-[20px] font-semibold text-[#0A0A0A]"
          />
          <HeaderButton type="submit" disabled={!draft.trim()}>Save</HeaderButton>
          <HeaderButton onClick={() => setMode("view")}>Cancel</HeaderButton>
        </form>
      ) : (
        <div className="flex items-end justify-between gap-3">
          <h1 className="min-w-0 truncate text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">{name}</h1>
          <div className="flex shrink-0 gap-2">
            {mode === "confirm-delete" ? (
              <>
                <HeaderButton onClick={() => setMode("view")}>Keep</HeaderButton>
                <HeaderButton danger onClick={() => void act(async () => {
                  await remove({ projectId });
                  window.location.assign("/app/projects");
                })}>Delete for good</HeaderButton>
              </>
            ) : (
              <>
                <HeaderButton onClick={() => { setDraft(name); setMode("rename"); }}>Rename</HeaderButton>
                <HeaderButton onClick={() => setMode("confirm-delete")}>Delete</HeaderButton>
              </>
            )}
          </div>
        </div>
      )}
      {mode === "confirm-delete" ? <p className="text-[12px] text-[#525252]">Deletes the project and every step's results, on the web and on Mac.</p> : null}
      {error ? <p role="alert" className="text-[12px] font-medium text-[#DC2626]">{error}</p> : null}
    </header>
  );
}

function HeaderButton({ children, danger, type = "button", disabled, onClick }: {
  children: ReactNode;
  danger?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-[6px] border-[0.5px] px-2.5 py-1 text-[12px] font-medium disabled:opacity-50",
        danger ? "border-[#DC2626] bg-[#DC2626] text-white" : "border-[#D4D4D4] bg-[#F5F5F5] text-[#171717]",
      )}
    >
      {children}
    </button>
  );
}

function StepPanel({ projectId, step, projectName }: { projectId: Id<"projects">; step: StepId; projectName: string }) {
  switch (step) {
    case "research":
      return <AiStep saved={useQuery(api.projectAi.getLatestResearchArtifact, { projectId })} schema={researchArtifactSchema} label="Research" projectName={projectName} render={(data) => <ResearchView data={data} />} />;
    case "strategy":
      return <AiStep saved={useQuery(api.projectAi.getLatestStrategyArtifact, { projectId })} schema={strategyArtifactSchema} label="Strategy" projectName={projectName} render={(data) => <StrategyView data={data} />} />;
    case "flows":
      return <AiStep saved={useQuery(api.projectAi.getLatestFlowsArtifact, { projectId })} schema={flowsArtifactSchema} label="Flows" projectName={projectName} render={(data) => <FlowsView data={data} />} />;
    case "wireframes":
      return <AiStep saved={useQuery(api.projectAi.getLatestWireframesArtifact, { projectId })} schema={wireframesArtifactSchema} label="Wireframes" projectName={projectName} render={(data) => <WireframesView data={data} />} />;
    case "moodboard":
      return <MacStep saved={useQuery(api.projectAi.getLatestMoodboardArtifact, { projectId })} label="Moodboard and Style guide" />;
    case "delivery":
      return <MacStep saved={useQuery(api.projectAi.getLatestAssetsArtifact, { projectId })} label="Delivery" />;
  }
}

function AiStep<T>({ saved, schema, label, projectName, render }: {
  saved: Saved;
  schema: z.ZodType<T>;
  label: string;
  projectName: string;
  render: (data: T) => ReactNode;
}) {
  if (saved === undefined) return null;
  if (!saved?.contentJson) {
    return <Empty>No {label} yet. Ask your AI tool: “Run the Stage {label} step for {projectName}.”</Empty>;
  }
  const parsed = schema.safeParse(JSON.parse(saved.contentJson));
  if (!parsed.success) return <Empty>This {label} can't be shown on the web. Open it in Stage for Mac.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-[#737373]">Updated {formatRelative(saved.updatedAt)}</p>
      {render(parsed.data)}
    </div>
  );
}

function MacStep({ saved, label }: { saved: Saved; label: string }) {
  if (saved === undefined) return null;
  return (
    <Empty>
      {saved ? `${label} was updated ${formatRelative(saved.updatedAt)}. ` : `No ${label} yet. `}
      {label} is made and viewed in <a href="/download/mac" className="underline">Stage for Mac</a>.
    </Empty>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-5 text-center text-[13px] font-medium text-[#737373]">{children}</p>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-4 text-[13px] text-[#404040]">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function ResearchView({ data }: { data: ResearchArtifact }) {
  const { competitors, matrixRows } = data.competitiveAnalysis;
  return (
    <>
      <Card title="Summary"><Bullets items={data.summary} /></Card>
      <Card title="Company snapshot">
        <dl className="flex flex-col gap-1.5 text-[13px]">
          {data.companySnapshot.map((row) => (
            <div key={row.label} className="flex justify-between gap-4"><dt className="text-[#737373]">{row.label}</dt><dd className="text-right text-[#171717]">{row.value}</dd></div>
          ))}
        </dl>
      </Card>
      {competitors.length > 0 ? (
        <Card title="Competitive analysis" bodyClassName="overflow-x-auto p-3">
          <table className="w-full text-left text-[12px]">
            <thead><tr className="text-[#737373]"><th className="py-1 pr-3 font-medium" />{competitors.map((c) => <th key={c.id} className="py-1 pr-3 font-medium">{c.name}</th>)}</tr></thead>
            <tbody>
              {matrixRows.map((row) => (
                <tr key={row.id} className="border-t-[0.5px] border-[#E5E5E5]">
                  <td className="py-1.5 pr-3 text-[#171717]">{row.label}</td>
                  {competitors.map((c) => <td key={c.id} className="py-1.5 pr-3 text-[#404040]">{row.cells.find((cell) => cell.competitorId === c.id)?.score ?? "–"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
      <Card title="Target users">
        {data.targetUsers.map((user) => (
          <div key={user.id} className="flex flex-col gap-1">
            <p className="text-[13px] font-medium text-[#171717]">{user.name} · <span className="font-normal text-[#525252]">{user.role}</span></p>
            <Bullets items={[...user.goals.map((goal) => `Goal: ${goal}`), ...user.frustrations.map((pain) => `Frustration: ${pain}`)]} />
          </div>
        ))}
      </Card>
      <Card title="Opportunities">
        {data.opportunities.map((item) => (
          <div key={item.id} className="flex flex-col gap-0.5">
            {item.title ? <p className="text-[13px] font-medium text-[#171717]">{item.title}</p> : null}
            <p className="text-[13px] text-[#404040]">{item.description}</p>
          </div>
        ))}
      </Card>
      {data.openQuestions.length > 0 ? <Card title="Open questions"><Bullets items={data.openQuestions} /></Card> : null}
    </>
  );
}

function StrategyView({ data }: { data: StrategyArtifact }) {
  return <>{data.sections.map((section) => <Card key={section.id} title={`${section.emoji ? `${section.emoji} ` : ""}${section.title}`}><StrategyBody section={section} /></Card>)}</>;
}

function StrategyBody({ section }: { section: StrategySection }) {
  return (
    <div className="flex flex-col gap-2 text-[13px] text-[#404040]">
      {section.body?.map((line) => <p key={line}>{line}</p>)}
      {section.principles?.map((principle) => <p key={principle.title}><span className="font-medium text-[#171717]">{principle.title}.</span> {principle.body}</p>)}
      {section.table?.map(([label, value]) => <p key={label}><span className="text-[#737373]">{label}:</span> {value}</p>)}
      {section.cards?.map((card) => (
        <div key={card.title} className="flex flex-col gap-0.5">
          <p className="font-medium text-[#171717]">{card.title}</p>
          <p>{card.objective}</p>
          <p className="text-[12px] text-[#737373]">KPI: {card.kpi} · Key element: {card.keyElement}</p>
        </div>
      ))}
      {section.boxes?.map((box) => (
        <div key={box.title} className="flex flex-col gap-1">
          <p className="text-[12px] font-semibold tracking-wide text-[#171717]">{box.title}</p>
          <Bullets items={box.bullets} />
        </div>
      ))}
    </div>
  );
}

function FlowsView({ data }: { data: FlowsArtifact }) {
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

function WireframesView({ data }: { data: WireframesArtifact }) {
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
