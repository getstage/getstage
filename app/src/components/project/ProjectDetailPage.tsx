import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { api } from "@/lib/convex";
import type { Phase, Task } from "@/types";
import type { Id } from "../../../convex/_generated/dataModel";

export function ProjectDetailPage() {
  const { id } = useParams({ from: "/_app/project/$id" });
  const navigate = useNavigate();
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskValue, setAddTaskValue] = useState("");
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editClientValue, setEditClientValue] = useState("");
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [showPhasesModal, setShowPhasesModal] = useState(false);
  const [editPhasesValue, setEditPhasesValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const addTaskInputRef = useRef<HTMLInputElement>(null);
  const errorTimerRef = useRef<number | undefined>(undefined);

  const projectId = id as Id<"projects">;
  const project = useConvexQuery(api.projects.getById, { projectId });
  const isLoading = project === undefined;

  const createTask = useConvexMutation(api.tasks.create);
  const toggleTaskComplete = useConvexMutation(api.tasks.toggleComplete);
  const updateProject = useConvexMutation(api.projects.update);
  const syncPhases = useConvexMutation(api.projects.syncPhases);
  const deleteProject = useConvexMutation(api.projects.deleteById);
  const setPortalEnabled = useConvexMutation(api.portal.setEnabled);

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

  const projectData = project;
  const currentPhase = selectedPhase;
  const completedCount = currentPhase.tasks.filter((task) => task.isCompleted).length;

  const shareUrl =
    projectData.shareUrl ?? `https://app.usestage.com/portal/${projectData.shareToken ?? "demo"}`;
  const clientAccess = projectData.portalEnabled ?? true;

  function showError(message: string) {
    setActionError(message);
    if (errorTimerRef.current !== undefined) {
      window.clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = window.setTimeout(() => setActionError(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (errorTimerRef.current !== undefined) {
        window.clearTimeout(errorTimerRef.current);
      }
    };
  }, []);

  async function handleAddTaskSubmit() {
    const normalizedTitle = addTaskValue.trim();
    if (!normalizedTitle) {
      return;
    }

    try {
      await createTask({
        phaseId: currentPhase.id as Id<"phases">,
        title: normalizedTitle,
      });
      setAddTaskValue("");
      setShowAddTask(false);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not create task.");
    }
  }

  async function handleSaveProjectName() {
    const name = editNameValue.trim();
    if (!name || name === projectData.name) {
      setShowEditNameModal(false);
      return;
    }

    try {
      await updateProject({ projectId, name });
      setShowEditNameModal(false);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update project name.");
    }
  }

  async function handleSaveClient() {
    const clientName = editClientValue.trim();
    if (!clientName || clientName === projectData.clientName) {
      setShowEditClientModal(false);
      return;
    }

    try {
      await updateProject({ projectId, clientName });
      setShowEditClientModal(false);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update client.");
    }
  }

  async function handleSaveTimeline() {
    try {
      await updateProject({
        projectId,
        startDate: parseDateInput(editStartDate),
        endDate: parseDateInput(editEndDate),
      });
      setShowTimelineModal(false);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update timeline.");
    }
  }

  async function handleSavePhases() {
    const nextNames = editPhasesValue
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (nextNames.length === 0) {
      showError("At least one phase is required.");
      return;
    }

    const usedExistingIds = new Set<string>();
    const phases = nextNames.map((name, index) => {
      const exactMatch = projectData.phases.find(
        (phase) => phase.name === name && !usedExistingIds.has(phase.id),
      );

      if (exactMatch) {
        usedExistingIds.add(exactMatch.id);
        return { id: exactMatch.id as Id<"phases">, name };
      }

      const sameIndexPhase = projectData.phases[index];
      if (sameIndexPhase && !usedExistingIds.has(sameIndexPhase.id)) {
        usedExistingIds.add(sameIndexPhase.id);
        return { id: sameIndexPhase.id as Id<"phases">, name };
      }

      return { name };
    });

    try {
      await syncPhases({
        projectId,
        phases,
      });
      setShowPhasesModal(false);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update phases.");
    }
  }

  async function handlePauseProject() {
    try {
      await updateProject({
        projectId,
        status: projectData.status === "paused" ? "active" : "paused",
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update project status.");
    }
  }

  async function handleConfirmDeleteProject() {
    try {
      await deleteProject({ projectId });
      navigate({ to: "/dashboard" });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not delete project.");
    }
  }

  return (
    <>
      <Helmet>
        <title>{projectData.name} — Stage</title>
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
              {projectData.clientAvatarUrl ? (
                <img
                  src={projectData.clientAvatarUrl}
                  alt={projectData.clientName}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <h1 className="font-heading text-[33px] font-semibold tracking-tight text-text-primary">
              {projectData.name}
            </h1>
            <span className="text-[16px] text-text-secondary">· {projectData.clientName}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-[140px]">
              <ProgressBar value={projectData.progress} showLabel />
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
                  <DropdownMenu.Item
                    onSelect={() => {
                      setEditNameValue(projectData.name);
                      setShowEditNameModal(true);
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
                  >
                    Edit project name
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => {
                      setEditClientValue(projectData.clientName);
                      setShowEditClientModal(true);
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
                  >
                    Edit client
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => {
                      setEditStartDate(formatDateInput(projectData.startDate));
                      setEditEndDate(formatDateInput(projectData.endDate));
                      setShowTimelineModal(true);
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
                  >
                    Adjust timeline
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => {
                      setEditPhasesValue(projectData.phases.map((p) => p.name).join(", "));
                      setShowPhasesModal(true);
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
                  >
                    Add or remove phases
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
                  <DropdownMenu.Item
                    onSelect={() => void handlePauseProject()}
                    className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
                  >
                    Pause project
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
                  <DropdownMenu.Item
                    onSelect={() => setShowDeleteConfirm(true)}
                    className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-destructive outline-none hover:bg-destructive/5"
                  >
                    Delete project
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>

        <section className="py-16">
          <div className="mx-auto flex max-w-[920px] items-center">
            {projectData.phases.map((phase, index) => (
              <div key={phase.id} className="flex flex-1 items-center">
                <PhaseNode
                  phase={phase}
                  selected={currentPhase.id === phase.id}
                  onClick={() => setActivePhaseId(phase.id)}
                />
                {index < projectData.phases.length - 1 && (
                  <div
                    className={`h-px flex-1 ${phase.status === "completed" ? "bg-accent/45" : "bg-border"
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
              {currentPhase.name}
            </h2>
            <p className="text-[13px] text-text-secondary">
              {completedCount} of {currentPhase.tasks.length} complete
            </p>
          </header>

          {actionError && (
            <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {actionError}
            </div>
          )}

          <div>
            {currentPhase.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectId={projectData.id}
                onToggle={() =>
                  void toggleTaskComplete({ taskId: task.id as Id<"tasks"> })
                }
              />
            ))}
          </div>

          {showAddTask ? (
            <div className="mt-4 flex items-center gap-2">
              <input
                ref={addTaskInputRef}
                type="text"
                value={addTaskValue}
                onChange={(e) => setAddTaskValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddTaskSubmit();
                  if (e.key === "Escape") {
                    setShowAddTask(false);
                    setAddTaskValue("");
                  }
                }}
                placeholder="Task title"
                autoFocus
                className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-[14px] text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
              />
              <Button
                size="sm"
                onClick={() => void handleAddTaskSubmit()}
                disabled={addTaskValue.trim().length === 0}
              >
                Add
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowAddTask(false);
                  setAddTaskValue("");
                }}
                className="cursor-pointer text-[13px] text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowAddTask(true);
                setTimeout(() => addTaskInputRef.current?.focus(), 0);
              }}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[13px] text-text-tertiary transition-colors hover:text-accent"
            >
              <span>+</span>
              Add a task...
            </button>
          )}
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
                onClick={() =>
                  void setPortalEnabled({
                    projectId,
                    isEnabled: !clientAccess,
                  })
                }
                className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${clientAccess ? "bg-accent" : "bg-border"
                  }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${clientAccess ? "left-4.5" : "left-0.5"
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

      {/* Edit Project Name Modal */}
      <Dialog.Root open={showEditNameModal} onOpenChange={setShowEditNameModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              Edit project name
            </Dialog.Title>
            <div className="mt-4">
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSaveProjectName(); }}
                autoFocus
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </Dialog.Close>
              <Button size="sm" onClick={() => void handleSaveProjectName()} disabled={editNameValue.trim().length === 0}>Save</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Client Modal */}
      <Dialog.Root open={showEditClientModal} onOpenChange={setShowEditClientModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              Edit client
            </Dialog.Title>
            <div className="mt-4">
              <input
                type="text"
                value={editClientValue}
                onChange={(e) => setEditClientValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSaveClient(); }}
                autoFocus
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </Dialog.Close>
              <Button size="sm" onClick={() => void handleSaveClient()} disabled={editClientValue.trim().length === 0}>Save</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Adjust Timeline Modal */}
      <Dialog.Root open={showTimelineModal} onOpenChange={setShowTimelineModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              Adjust timeline
            </Dialog.Title>
            <div className="mt-4 flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Start date</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-text-primary outline-none transition-colors focus:border-accent"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-[13px] font-medium text-text-primary">End date</label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-text-primary outline-none transition-colors focus:border-accent"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </Dialog.Close>
              <Button size="sm" onClick={() => void handleSaveTimeline()} disabled={!editStartDate || !editEndDate}>Save</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add or Remove Phases Modal */}
      <Dialog.Root open={showPhasesModal} onOpenChange={setShowPhasesModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              Add or remove phases
            </Dialog.Title>
            <p className="mt-1 text-[13px] text-text-secondary">
              Enter phase names separated by commas.
            </p>
            <div className="mt-4">
              <input
                type="text"
                value={editPhasesValue}
                onChange={(e) => setEditPhasesValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSavePhases(); }}
                autoFocus
                placeholder="Strategy, Design, Development, Launch"
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </Dialog.Close>
              <Button size="sm" onClick={() => void handleSavePhases()} disabled={editPhasesValue.trim().length === 0}>Save</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Project Confirmation */}
      <Dialog.Root open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              Delete project
            </Dialog.Title>
            <p className="mt-2 text-[14px] text-text-secondary">
              Delete &ldquo;{projectData.name}&rdquo;? This removes the project and its tasks permanently.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </Dialog.Close>
              <Button
                size="sm"
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => void handleConfirmDeleteProject()}
              >
                Delete
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function formatDateInput(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseDateInput(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error("Please use a valid date in YYYY-MM-DD format.");
  }
  return parsed;
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
      className={`relative flex min-w-[112px] cursor-pointer flex-col items-center gap-2 rounded-[8px] px-3 py-2 transition-colors ${selected && phase.status === "active" ? "bg-accent text-white" : "hover:bg-bg-subtle"
        }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${selected && phase.status === "active" ? "bg-white" : dotClass
          }`}
      />
      <span
        className={`text-[12px] ${selected && phase.status === "active" ? "text-white" : textClass
          }`}
      >
        {phase.name}
      </span>
      <span
        className={`text-[11px] ${selected && phase.status === "active" ? "text-white/80" : "text-text-tertiary"
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
        className={`flex-1 text-[14px] transition-colors ${task.isCompleted
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
