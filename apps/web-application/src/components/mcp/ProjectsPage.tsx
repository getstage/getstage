import { useState } from "react";
import { useQuery } from "convex/react";
import copyDarkIcon from "@/assets/home/copy-dark.svg";
import infoIcon from "@/assets/home/info.svg";
import { api } from "@/lib/convex";
import { formatRelative } from "@/lib/mcp";
import { cn } from "@/lib/utils";
import { AppShell, PageHeader, useActiveSpace } from "./AppShell";

// Projects (Figma 2495-5463, tooltip 2495-5618).
const NEW_PROJECT_PROMPT = "Start a new Stage project for my app. Use the Stage MCP: begin with Research, then follow Stage's steps.";

const TYPE_LABEL: Record<string, string> = {
  branding: "Branding",
  "web-design": "Website Design",
  "product-design": "Product Design",
  "app-design": "App Design",
  "web-app": "Web App",
  packaging: "Packaging",
  "motion-design": "Motion Design",
  illustration: "Illustration",
};

type Step = { label: string; status: "done" | "running" | "open" };

// "Strategy in progress" / "Strategy is next" / "Ready to export", and "Step 2 of 6" / "All 6 steps done".
function progressText(steps: Step[]) {
  const running = steps.findIndex((step) => step.status === "running");
  const next = steps.findIndex((step) => step.status === "open");
  if (running >= 0) return { status: `${steps[running]?.label} in progress`, step: `Step ${running + 1} of ${steps.length}` };
  if (next < 0) return { status: "Ready to export", step: `All ${steps.length} steps done` };
  return { status: `${steps[next]?.label} is next`, step: `Step ${next + 1} of ${steps.length}` };
}

export function ProjectsPage() {
  const { active } = useActiveSpace();
  const projects = useQuery(api.mcpHome.listProjectProgress, active ? { ownerUserId: active.ownerUserId } : "skip");

  return (
    <AppShell page="projects">
      <PageHeader
        title="Projects"
        subtitle="Every project your AI creates through Stage shows up here, step by step."
        action={<CopyPromptButton />}
      />
      {projects === undefined ? null : projects.length === 0 ? (
        <p className="rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-5 text-center text-[13px] font-medium text-[#737373]">
          No projects yet. Ask your AI to start a new Stage project.
        </p>
      ) : (
        <section className="flex flex-col gap-1 rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-1 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
          {projects.map((project) => {
            const text = progressText(project.steps);
            return (
              <article key={project.id} className="flex flex-col gap-3 rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white p-5 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-2.5">
                      <span className="truncate text-[13px] font-medium text-[#171717]">{project.name}</span>
                      <ProgressInfo work={TYPE_LABEL[project.type] ?? project.type} updatedAt={project.updatedAt} />
                    </span>
                    <span className="text-[12px] text-[#525252]">{text.status}</span>
                  </div>
                  <span className="shrink-0 text-[12px] text-[#525252]">{text.step}</span>
                </div>
                <div className="flex gap-1" aria-label={`${text.step}: ${text.status}`}>
                  {project.steps.map((step) => (
                    <span
                      key={step.label}
                      title={step.label}
                      className={cn(
                        "h-2 flex-1 rounded-full border-[0.5px]",
                        step.status === "done" && "border-[#221E6C] bg-[#3B368E]",
                        step.status === "running" && "border-[#9E99F8] bg-[#CFCCFB]",
                        step.status === "open" && "border-[#D4D4D4] bg-[#F5F5F5]",
                      )}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}

// Info icon with "Progress Information" on hover or focus. The AI tool per project isn't stored yet, so that row waits.
function ProgressInfo({ work, updatedAt }: { work: string; updatedAt: number }) {
  return (
    <span className="group relative flex">
      <button type="button" aria-label="Progress information" className="flex rounded-full text-[#A3A3A3] hover:text-[#525252] focus-visible:text-[#525252]">
        <img src={infoIcon} alt="" className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-[calc(100%+6px)] z-10 flex w-[228px] flex-col gap-1.5 rounded-[4px] border-[0.5px] border-[#D4D4D4] bg-white p-2 opacity-0 shadow-[0_1px_4px_-2.5px_rgba(0,0,0,0.7)] transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <span className="text-[12px] font-[550] leading-[1.5] text-[#171717]">Progress Information</span>
        <span className="h-px bg-[#E5E5E5]" />
        <span className="flex justify-between text-[12px] font-medium leading-[1.5]">
          <span className="text-[#525252]">Work</span>
          <span className="text-[#4B4B4B]">{work}</span>
        </span>
        <span className="flex items-center justify-between text-[12px] font-medium leading-[1.5]">
          <span className="text-[#525252]">Last Updated</span>
          <span className="text-[13px] text-[#171717]">{formatRelative(updatedAt)}</span>
        </span>
      </span>
    </span>
  );
}

function CopyPromptButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(NEW_PROJECT_PROMPT).then(() => setCopied(true))}
      className="flex shrink-0 items-center gap-1.5 rounded-[4px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] py-1.5 pl-2 pr-3 text-[12px] font-medium text-[#0A0A0A]"
    >
      <img src={copyDarkIcon} alt="" className="size-3.5" />
      {copied ? "Copied" : "Copy “new project” prompt"}
    </button>
  );
}
