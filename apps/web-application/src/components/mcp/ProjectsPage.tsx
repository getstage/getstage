import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import copyDarkIcon from "@/assets/home/copy-dark.svg";
import infoIcon from "@/assets/home/info.svg";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convex";
import { formatRelative } from "@/lib/mcp";
import { cn } from "@/lib/utils";
import { PageHeader, useActiveSpace } from "./AppShell";

// Projects (Figma 2495-5463, tooltip 2495-5618).
const NEW_PROJECT_PROMPT = "Start a new Stage project for my app. Use the Stage MCP: begin with Research, then follow Stage's steps.";

const TYPE_LABEL: Record<string, string> = {
  websites: "Website",
  "web-apps": "Web App",
  "ios-apps": "iOS App",
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
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Every project your AI creates through Stage shows up here, step by step."
        action={
          <span className="flex shrink-0 gap-2">
            <CopyPromptButton />
            <button type="button" onClick={() => setCreating(true)} className="rounded-[4px] border-[0.5px] border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 py-1.5 text-[12px] font-medium text-[#FAFAFA]">
              New project
            </button>
          </span>
        }
      />
      {creating && active ? <NewProjectForm spaceOwnerId={active.ownerUserId} onCancel={() => setCreating(false)} /> : null}
      {projects === undefined ? null : projects.length === 0 ? (
        <p className="rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-5 text-center text-[13px] font-medium text-[#737373]">
          No projects yet. Ask your AI to start a new Stage project.
        </p>
      ) : (
        <section className="flex flex-col gap-1 rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-1 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
          {projects.map((project) => {
            const text = progressText(project.steps);
            return (
              <article key={project.id} className="relative flex flex-col gap-3 rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white p-5 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)] hover:border-[#A3A3A3]">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-2.5">
                      {/* The stretched link makes the whole card open the project; the info button sits above it. */}
                      <Link to="/app/projects/$projectId" params={{ projectId: project.id }} className="truncate text-[13px] font-medium text-[#171717] after:absolute after:inset-0">{project.name}</Link>
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
    </>
  );
}

// Info icon with "Progress Information" on hover or focus. The AI tool per project isn't stored yet, so that row waits.
function ProgressInfo({ work, updatedAt }: { work: string; updatedAt: number }) {
  return (
    <span className="group relative z-10 flex">
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

const FIELD = "w-full rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-white px-2 py-1.5 text-[13px] text-[#171717]";

// Same fields the Mac app asks for (the client email feeds the client portal). Dates come from date inputs (YYYY-MM-DD).
function NewProjectForm({ spaceOwnerId, onCancel }: { spaceOwnerId: string; onCancel: () => void }) {
  const create = useMutation(api.projects.create);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", clientName: "", clientEmail: "", type: "websites" as keyof typeof TYPE_LABEL, startDate: "", endDate: "" });
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string }>({ kind: "idle" });
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });
  const ready = form.name.trim() && form.clientName.trim() && form.clientEmail.includes("@") && form.startDate && form.endDate && form.endDate >= form.startDate;

  const submit = async () => {
    setStatus({ kind: "saving" });
    try {
      const project = await create({
        name: form.name.trim(),
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        type: form.type as "websites" | "web-apps" | "ios-apps",
        method: "manual",
        startDate: Date.parse(form.startDate),
        endDate: Date.parse(form.endDate),
        spaceOwnerId: spaceOwnerId as Id<"users">,
      });
      void navigate({ to: "/app/projects/$projectId", params: { projectId: project.id } });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not create the project." });
    }
  };

  return (
    <form
      className="grid grid-cols-1 gap-3 rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className="flex flex-col gap-1 text-[12px] font-medium text-[#525252]">Project name<input id="new-project-name" className={FIELD} value={form.name} onChange={set("name")} /></label>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-[#525252]">Client<input id="new-project-client" className={FIELD} value={form.clientName} onChange={set("clientName")} /></label>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-[#525252]">Client email<input id="new-project-client-email" type="email" className={FIELD} value={form.clientEmail} onChange={set("clientEmail")} /></label>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-[#525252]">
        Type
        <select id="new-project-type" className={FIELD} value={form.type} onChange={set("type")}>
          {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-[#525252]">Start<input id="new-project-start" type="date" className={FIELD} value={form.startDate} onChange={set("startDate")} /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-[#525252]">End<input id="new-project-end" type="date" min={form.startDate} className={FIELD} value={form.endDate} onChange={set("endDate")} /></label>
      </div>
      {status.kind === "error" ? <p role="alert" className="text-[12px] font-medium text-[#DC2626] sm:col-span-2">{status.message}</p> : null}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} className="rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-white px-3 py-1.5 text-[12px] font-medium text-[#171717]">Cancel</button>
        <button type="submit" disabled={!ready || status.kind === "saving"} className="rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">
          {status.kind === "saving" ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
