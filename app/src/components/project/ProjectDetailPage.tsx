import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CaretRight,
  Check,
  DotsThree,
  LinkSimple,
  ShareNetwork,
} from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { getProject } from "@/data-ops/queries";
import { toggleTaskComplete } from "@/data-ops/mutations";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Phase, Task } from "@/types";

export function ProjectDetailPage() {
  const { id } = useParams({ from: "/_app/project/$id" });
  const queryClient = useQueryClient();
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clientAccess, setClientAccess] = useState(true);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleTaskComplete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const selectedPhase = useMemo(() => {
    if (!project) return null;
    return (
      project.phases.find((phase) => phase.id === activePhaseId) ??
      project.phases.find((phase) => phase.status === "active") ??
      project.phases[0] ??
      null
    );
  }, [activePhaseId, project]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-10 lg:px-14">
        <div className="skeleton mb-3 h-4 w-28" />
        <div className="skeleton mb-2 h-8 w-60" />
        <div className="skeleton mb-12 h-4 w-40" />
        <div className="skeleton mb-14 h-48 w-full rounded-xl" />
        <div className="mx-auto max-w-[560px] space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!project || !selectedPhase) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center">
        <h2 className="font-heading text-[22px] font-semibold text-text-primary">
          Project not found
        </h2>
        <Link to="/dashboard" className="mt-2 text-[14px] text-accent hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const completedCount = selectedPhase.tasks.filter((task) => task.isCompleted).length;

  const shareUrl = `https://app.usestage.com/portal/${project.shareToken ?? "demo"}`;

  return (
    <>
      <Helmet>
        <title>{project.name} — Stage</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-[1200px] px-6 pb-16 pt-6 sm:px-10 lg:px-14"
      >
        <Link
          to="/dashboard"
          className="mb-2 inline-flex items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-input-bg">
              {project.clientAvatarUrl ? (
                <img
                  src={project.clientAvatarUrl}
                  alt={project.clientName}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <h1 className="font-heading text-[33px] font-semibold tracking-tight text-text-primary">
              {project.name}
            </h1>
            <span className="text-[16px] text-text-secondary">· {project.clientName}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-[140px]">
              <ProgressBar value={project.progress} showLabel />
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="h-8 rounded-[7px] px-3 text-[13px]"
              onClick={() => setShowShareModal(true)}
            >
              <ShareNetwork size={13} />
              Share
            </Button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[7px] border border-border text-text-secondary transition-colors hover:text-text-primary">
                  <DotsThree size={14} weight="bold" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="min-w-[200px] rounded-xl border border-border bg-white p-1.5 shadow-[0_6px_18px_rgba(26,26,46,0.08)]"
                >
                  <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle">
                    Edit project name
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle">
                    Edit client
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle">
                    Adjust timeline
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle">
                    Add or remove phases
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
                  <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle">
                    Pause project
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
                  <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-destructive outline-none hover:bg-destructive/5">
                    Delete project
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>

        <section className="py-16">
          <div className="mx-auto flex max-w-[920px] items-center">
            {project.phases.map((phase, index) => (
              <div key={phase.id} className="flex flex-1 items-center">
                <PhaseNode
                  phase={phase}
                  selected={selectedPhase.id === phase.id}
                  onClick={() => setActivePhaseId(phase.id)}
                />
                {index < project.phases.length - 1 && (
                  <div
                    className={`h-px flex-1 ${
                      phase.status === "completed" ? "bg-accent/45" : "bg-border"
                    }`}
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
              {completedCount} of {selectedPhase.tasks.length} complete
            </p>
          </header>

          <div>
            {selectedPhase.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectId={project.id}
                onToggle={() => toggleMutation.mutate(task.id)}
              />
            ))}
          </div>

          <button className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[13px] text-text-tertiary transition-colors hover:text-accent">
            <span>+</span>
            Add a task...
          </button>
        </section>
      </motion.div>

      <Dialog.Root open={showShareModal} onOpenChange={setShowShareModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[24px] font-semibold text-text-primary">
              Share with client
            </Dialog.Title>
            <p className="mt-1 text-[14px] text-text-secondary">
              Clients can view progress, phases, and tasks. They cannot edit anything.
            </p>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-border-subtle px-4 py-3">
              <span className="text-[14px] text-text-primary">Client access</span>
              <button
                onClick={() => setClientAccess((prev) => !prev)}
                className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${
                  clientAccess ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    clientAccess ? "left-4.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {clientAccess && (
              <div className="mt-4 rounded-xl border border-border-subtle p-3">
                <div className="flex items-center gap-2">
                  <LinkSimple size={16} className="text-text-secondary" />
                  <span className="flex-1 truncate text-[13px] text-text-secondary">
                    {shareUrl}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <>
                        <Check size={12} />
                        Copied
                      </>
                    ) : (
                      "Copy"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <Dialog.Close asChild>
              <Button className="mt-6 w-full" variant="ghost">
                Done
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

type ProjectDetailPhaseRailPreviewProps = {
  phaseAdded: boolean;
};

export function ProjectDetailPhaseRailPreview({ phaseAdded }: ProjectDetailPhaseRailPreviewProps) {
  const phases = useMemo<Phase[]>(() => {
    const baseTasks = (phaseId: string, taskDefs: Array<{ id: string; done: boolean }>): Task[] =>
      taskDefs.map((task, index) => ({
        id: `${phaseId}-${task.id}`,
        phaseId,
        title: task.id,
        isCompleted: task.done,
        attachments: [],
        order: index,
        createdAt: Date.now() - 10_000,
        updatedAt: Date.now() - 5_000,
      }));

    const preview: Phase[] = [
      {
        id: "landing-discovery",
        projectId: "landing-project",
        name: "Discovery",
        order: 0,
        status: "completed",
        progress: 100,
        tasks: baseTasks("landing-discovery", [
          { id: "kickoff", done: true },
          { id: "scope", done: true },
        ]),
      },
      {
        id: "landing-design",
        projectId: "landing-project",
        name: "Design",
        order: 1,
        status: phaseAdded ? "completed" : "active",
        progress: phaseAdded ? 100 : 50,
        tasks: baseTasks("landing-design", [
          { id: "wireframes", done: true },
          { id: "layouts", done: !phaseAdded },
        ]),
      },
    ];

    if (phaseAdded) {
      preview.push({
        id: "landing-qa",
        projectId: "landing-project",
        name: "QA",
        order: 2,
        status: "active",
        progress: 35,
        tasks: baseTasks("landing-qa", [
          { id: "review", done: false },
          { id: "handoff", done: false },
        ]),
      });
    }

    return preview;
  }, [phaseAdded]);

  const selectedId = phaseAdded ? "landing-qa" : "landing-design";

  return (
    <div className="w-full" aria-hidden>
      <div className="mx-auto flex max-w-[360px] items-center">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex flex-1 items-center">
            <PhaseNode phase={phase} selected={selectedId === phase.id} onClick={() => {}} />
            {index < phases.length - 1 && (
              <div
                className={`h-px flex-1 ${
                  phase.status === "completed" ? "bg-accent/45" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-center">
        <button
          type="button"
          tabIndex={-1}
          className={`inline-flex items-center gap-2 text-[13px] transition-colors ${
            phaseAdded ? "text-accent" : "text-text-tertiary"
          }`}
        >
          <span>+</span>
          {phaseAdded ? "QA phase added" : "Add phase"}
        </button>
      </div>
    </div>
  );
}

function PhaseNode({
  phase,
  selected,
  onClick,
}: {
  phase: Phase;
  selected: boolean;
  onClick: () => void;
}) {
  const done = phase.tasks.filter((task) => task.isCompleted).length;
  const total = phase.tasks.length;

  const dotClass =
    phase.status === "completed"
      ? "bg-text-tertiary"
      : phase.status === "active"
        ? "bg-accent"
        : "border border-[#D9D9D9] bg-transparent";

  const textClass =
    phase.status === "upcoming"
      ? "text-text-tertiary"
      : phase.status === "completed"
        ? "text-text-secondary"
        : "text-text-primary";

  return (
    <button
      onClick={onClick}
      className={`relative flex min-w-[112px] cursor-pointer flex-col items-center gap-2 rounded-[8px] px-3 py-2 transition-colors ${
        selected && phase.status === "active" ? "bg-accent text-white" : "hover:bg-bg-subtle"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          selected && phase.status === "active" ? "bg-white" : dotClass
        }`}
      />
      <span
        className={`text-[12px] ${
          selected && phase.status === "active" ? "text-white" : textClass
        }`}
      >
        {phase.name}
      </span>
      <span
        className={`text-[11px] ${
          selected && phase.status === "active" ? "text-white/80" : "text-text-tertiary"
        }`}
      >
        {done} of {total}
      </span>
    </button>
  );
}

function TaskRow({
  task,
  projectId,
  onToggle,
}: {
  task: Task;
  projectId: string;
  onToggle: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 border-t border-border-subtle px-1 py-2.5 first:border-t-0">
      <Checkbox checked={task.isCompleted} onCheckedChange={onToggle} />
      <Link
        to="/project/$id/task/$taskId"
        params={{ id: projectId, taskId: task.id }}
        className={`flex-1 text-[14px] transition-colors ${
          task.isCompleted
            ? "text-text-tertiary line-through"
            : "text-text-primary hover:text-accent"
        }`}
      >
        {task.title}
      </Link>
      <CaretRight
        size={14}
        className="text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
      />
    </div>
  );
}
