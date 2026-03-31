import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowsClockwise,
  Check,
  DownloadSimple,
  File as FileIcon,
  Plus,
  Trash,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { ProjectDock } from "@/components/dashboard/ProjectDock";
import { useDockProjects } from "@/hooks/useDockProjects";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmPopover } from "@/components/ui/ConfirmPopover";
import { DatePicker } from "@/components/ui/DatePicker";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { debounce, formatFileSize } from "@/lib/utils";
import type { Attachment } from "@/types";
import type { Id } from "../../../convex/_generated/dataModel";
import { uploadFileToR2, getNormalizedMimeType } from "@/lib/r2Uploads";

export function TaskDetailPage() {
  const navigate = useNavigate();
  const { id: projectId, taskId } = useParams({
    from: "/_authed/project/$id/task/$taskId",
  });
  const dockProjects = useDockProjects();
  const detail = useConvexQuery(api.tasks.getDetail, {
    taskId: taskId as Id<"tasks">,
  });
  const task = detail?.task ?? null;
  const project = detail?.project ?? null;
  const phase = detail?.phase ?? null;
  const isLoading = detail === undefined;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmingAttachmentId, setConfirmingAttachmentId] = useState<string | null>(null);
  const [replacingAttachmentId, setReplacingAttachmentId] = useState<string | null>(null);
  const replaceInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setContent(task.content ?? "");
    setAttachments(task.attachments);
  }, [task]);

  const projectMembers = useConvexQuery(
    api.tasks.getProjectMembers,
    project ? { projectId: project.id as Id<"projects"> } : "skip",
  );
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  const updateTask = useConvexMutation(api.tasks.update);
  const deleteTask = useConvexMutation(api.tasks.deleteById);
  const toggleTaskComplete = useConvexMutation(api.tasks.toggleComplete);
  const setDueDate = useConvexMutation(api.tasks.setDueDate);
  const setAssignees = useConvexMutation(api.tasks.setAssignees);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const saveAttachment = useConvexMutation(api.tasks.saveAttachment);
  const deleteAttachment = useConvexMutation(api.tasks.deleteAttachment);

  async function persistTaskUpdate(payload: { title?: string; content?: string }) {
    await updateTask({
      taskId: taskId as Id<"tasks">,
      ...payload,
    });
    setErrorMessage(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  // keep auto-save quiet while typing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedContentSave = useCallback(
    debounce((nextContent: string) => {
      void persistTaskUpdate({ content: nextContent });
    }, 900),
    [],
  );

  async function handleDeleteTask() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteTask({ taskId: taskId as Id<"tasks"> });
      await navigate({
        to: "/project/$id",
        params: { id: project?.id ?? projectId },
      });
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not delete the task."));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteAttachment(attachment: Attachment) {
    setDeletingAttachmentId(attachment.id);
    setConfirmingAttachmentId(null);
    setErrorMessage(null);

    try {
      await deleteAttachment({
        attachmentId: attachment.id as Id<"attachments">,
      });
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not delete that attachment."));
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function handleReplaceAttachment(oldAttachment: Attachment, file: File) {
    setReplacingAttachmentId(oldAttachment.id);
    setErrorMessage(null);

    try {
      const key = await uploadFileToR2({
        generateUploadUrl: r2GenerateUploadUrl,
        syncMetadata: r2SyncMetadata,
        purpose: "task-attachment",
        file,
      });

      await saveAttachment({
        taskId: taskId as Id<"tasks">,
        r2ObjectKey: key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: getNormalizedMimeType(file),
      });

      await deleteAttachment({
        attachmentId: oldAttachment.id as Id<"attachments">,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not replace the image."));
    } finally {
      setReplacingAttachmentId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-10 lg:px-14">
        <div className="skeleton mb-6 h-4 w-60" />
        <div className="mx-auto max-w-[680px]">
          <div className="skeleton mb-8 h-10 w-full" />
          <div className="skeleton mb-3 h-6 w-[80%]" />
          <div className="skeleton mb-3 h-6 w-[74%]" />
          <div className="skeleton mb-3 h-6 w-[68%]" />
        </div>
      </div>
    );
  }

  if (!task || !project || !phase) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center">
        <h2 className="font-heading text-[22px] font-semibold text-text-primary">
          Task not found
        </h2>
        <Link
          to="/project/$id"
          params={{ id: projectId }}
          className="mt-2 text-[14px] text-accent hover:underline"
        >
          Back to project
        </Link>
      </div>
    );
  }

  async function handleFiles(files: File[] | FileList | null) {
    const nextFiles = files ? Array.from(files) : [];
    if (!nextFiles.length) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      for (const file of nextFiles) {
        const key = await uploadFileToR2({
          generateUploadUrl: r2GenerateUploadUrl,
          syncMetadata: r2SyncMetadata,
          purpose: "task-attachment",
          file,
        });

        await saveAttachment({
          taskId: taskId as Id<"tasks">,
          r2ObjectKey: key,
          fileName: file.name,
          fileSize: file.size,
          mimeType: getNormalizedMimeType(file),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not upload that file."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{task.title} — Stage</title>
      </Helmet>

      <div className="mx-auto max-w-[1200px] px-6 pb-[120px] pt-5 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Link
            to="/project/$id"
            params={{ id: project.id }}
            className="inline-flex items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            {project.name} · {phase.name}
          </Link>
          <span
            className={`text-[12px] text-text-tertiary transition-opacity ${
              saved ? "opacity-100" : "opacity-0"
            }`}
          >
            Saved
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-[680px] pt-10"
        >
          <div className="relative mb-6 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              isLoading={isDeleting}
            >
              <Trash size={14} />
              Delete task
            </Button>
            <ConfirmPopover
              open={showDeleteConfirm}
              message={`Delete "${task.title}"?`}
              onCancel={() => setShowDeleteConfirm(false)}
              onConfirm={() => {
                setShowDeleteConfirm(false);
                void handleDeleteTask();
              }}
              className="right-0 top-full mt-2"
            />
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="mb-6 flex items-start gap-3">
            <div className="pt-1">
              <Checkbox
                checked={task.isCompleted}
                onCheckedChange={() =>
                  void toggleTaskComplete({ taskId: task.id as Id<"tasks"> })
                }
                className="h-[22px] w-[22px] rounded-[4px] border-[1.5px]"
              />
            </div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                if (title.trim() && title !== task.title) {
                  void persistTaskUpdate({ title: title.trim() });
                }
              }}
              className={`task-detail-field w-full appearance-none bg-transparent font-heading text-[28px] font-semibold leading-[1.3] tracking-[-0.5px] ${
                task.isCompleted
                  ? "text-text-secondary line-through"
                  : "text-text-primary"
              }`}
              placeholder="Task title"
            />
          </div>

          {/* Due date & Assignees */}
          <div className="mb-8 flex flex-wrap items-center gap-3">
            {/* Due date */}
            <DatePicker
              value={task.dueDate ? new Date(task.dueDate) : null}
              onChange={(date) => {
                void setDueDate({
                  taskId: task.id as Id<"tasks">,
                  dueDate: date ? date.getTime() : null,
                });
              }}
            />

            <div className="h-4 w-px bg-border-subtle" />

            {/* Assignees */}
            <div className="relative flex items-center gap-2">
              <UserCircle size={15} className="text-text-tertiary" />
              {(task.assignees ?? []).map((assignee: {
                userId: string;
                name?: string | null;
                email?: string | null;
              }) => (
                <div
                  key={assignee.userId}
                  className="flex items-center gap-1 rounded-full bg-accent/10 py-0.5 pl-1.5 pr-1 text-[12px] font-medium text-accent"
                >
                  <span>{assignee.name ?? assignee.email ?? "Member"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentIds = task.assigneeIds ?? [];
                      void setAssignees({
                        taskId: task.id as Id<"tasks">,
                        assigneeIds: currentIds.filter((id: string) => id !== assignee.userId),
                      });
                    }}
                    className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent/20"
                    aria-label={`Remove ${assignee.name ?? assignee.email}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-dashed border-border px-2 text-[12px] text-text-tertiary transition-colors hover:border-accent hover:text-accent"
              >
                <Plus size={11} />
                Assign
              </button>

              {showAssigneeDropdown && projectMembers ? (
                <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-white py-1 shadow-lg">
                  {projectMembers.length === 0 ? (
                    <p className="px-3 py-2 text-[12px] text-text-tertiary">
                      No team members yet
                    </p>
                  ) : (
                    projectMembers.map((member: {
                      userId: string;
                      name?: string | null;
                      email?: string | null;
                      role: "owner" | "editor";
                    }) => {
                      const isAssigned = (task.assigneeIds ?? []).includes(
                        member.userId,
                      );
                      return (
                        <button
                          key={member.userId}
                          type="button"
                          onClick={() => {
                            const currentIds = task.assigneeIds ?? [];
                            const nextIds = isAssigned
                              ? currentIds.filter((id: string) => id !== member.userId)
                              : [...currentIds, member.userId];
                            void setAssignees({
                              taskId: task.id as Id<"tasks">,
                              assigneeIds: nextIds,
                            });
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-bg-subtle"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                            {(
                              member.name ??
                              member.email ??
                              "?"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-text-primary">
                              {member.name ?? "Unnamed"}
                            </p>
                            <p className="truncate text-[11px] text-text-secondary">
                              {member.email ?? ""}
                              {member.role === "owner" ? " (owner)" : ""}
                            </p>
                          </div>
                          {isAssigned ? (
                            <Check
                              size={14}
                              className="text-accent"
                              weight="bold"
                            />
                          ) : null}
                        </button>
                      );
                    })
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAssigneeDropdown(false)}
                    className="mt-1 w-full cursor-pointer border-t border-border-subtle px-3 py-1.5 text-left text-[11px] text-text-tertiary transition-colors hover:text-text-secondary"
                  >
                    Close
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="min-h-[220px]"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFiles(event.dataTransfer.files);
            }}
          >
            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                debouncedContentSave(event.target.value);
              }}
              placeholder="Add notes, upload files, or drop images here..."
              className="task-detail-field min-h-[220px] w-full resize-none bg-transparent text-[15px] leading-8 text-text-primary placeholder:text-text-tertiary"
            />

            <div className="space-y-4">
              {attachments.map((attachment) =>
                attachment.type === "image" ? (
                  <div
                    key={attachment.id}
                    className="relative rounded-[10px] border border-border-subtle bg-bg-subtle"
                  >
                    <div className="px-4 pt-4">
                      <a href={attachment.url} target="_blank" rel="noreferrer" className="block w-fit max-w-full">
                        <img
                          src={attachment.url}
                          alt={attachment.fileName}
                          className="block max-h-[260px] max-w-full rounded-[10px] border border-border-subtle bg-white object-contain shadow-sm"
                        />
                      </a>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-text-primary">
                          {attachment.fileName}
                        </p>
                        <p className="text-[11px] text-text-secondary">
                          {formatFileSize(attachment.fileSize)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <label
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-text-tertiary transition-colors hover:text-text-secondary"
                          aria-label={`Replace ${attachment.fileName}`}
                        >
                          <ArrowsClockwise
                            size={16}
                            className={replacingAttachmentId === attachment.id ? "animate-spin" : ""}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => {
                              if (el) replaceInputRefs.current.set(attachment.id, el);
                              else replaceInputRefs.current.delete(attachment.id);
                            }}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void handleReplaceAttachment(attachment, file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          download={attachment.fileName}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-text-tertiary transition-colors hover:text-text-secondary"
                          aria-label={`Download ${attachment.fileName}`}
                        >
                          <DownloadSimple size={16} />
                        </a>
                        <button
                          type="button"
                          onClick={() => setConfirmingAttachmentId(attachment.id)}
                          disabled={deletingAttachmentId === attachment.id}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-text-tertiary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Delete ${attachment.fileName}`}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                    <ConfirmPopover
                      open={confirmingAttachmentId === attachment.id}
                      message={`Delete "${attachment.fileName}"?`}
                      onCancel={() => setConfirmingAttachmentId(null)}
                      onConfirm={() => {
                        void handleDeleteAttachment(attachment);
                      }}
                      className="right-4 top-full mt-2"
                    />
                  </div>
                ) : (
                  <div
                    key={attachment.id}
                    className="relative flex items-center gap-3 rounded-[10px] bg-bg-subtle px-4 py-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border bg-white">
                      <FileIcon size={17} className="text-text-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-text-primary">
                        {attachment.fileName}
                      </p>
                      <p className="text-[12px] text-text-secondary">
                        {formatFileSize(attachment.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        download={attachment.fileName}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-text-tertiary transition-colors hover:text-text-secondary"
                        aria-label={`Download ${attachment.fileName}`}
                      >
                        <DownloadSimple size={16} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setConfirmingAttachmentId(attachment.id)}
                        disabled={deletingAttachmentId === attachment.id}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-text-tertiary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Delete ${attachment.fileName}`}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                    <ConfirmPopover
                      open={confirmingAttachmentId === attachment.id}
                      message={`Delete "${attachment.fileName}"?`}
                      onCancel={() => setConfirmingAttachmentId(null)}
                      onConfirm={() => {
                        void handleDeleteAttachment(attachment);
                      }}
                      className="right-4 top-full mt-2"
                    />
                  </div>
                ),
              )}
            </div>
          </div>

          <label className="mt-4 inline-flex w-full cursor-pointer items-center gap-2 border-t border-border-subtle pt-4 text-[13px] text-text-tertiary transition-colors hover:text-accent">
            <Plus size={13} />
            Attach file
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : [];
                event.target.value = "";
                void handleFiles(files);
              }}
            />
          </label>

          {uploading && (
            <p className="mt-2 text-[12px] text-text-secondary">Uploading files...</p>
          )}
        </motion.div>
      </div>

      <ProjectDock projects={dockProjects} />
    </>
  );
}

type TaskDetailChecklistPreviewProps = {
  firstChecked: boolean;
  secondChecked: boolean;
};

export function TaskDetailChecklistPreview({
  firstChecked,
  secondChecked,
}: TaskDetailChecklistPreviewProps) {
  return (
    <div
      className="mx-auto w-full max-w-[280px] rounded-[10px] border border-border-subtle bg-white px-3 py-2.5"
      aria-hidden
    >
      <div className="space-y-1.5">
        <div className="group flex items-center gap-2.5 py-1.5 text-[13px]">
          <Checkbox checked={firstChecked} onCheckedChange={() => undefined} disabled />
          <span
            className={`block truncate transition-colors ${
              firstChecked ? "text-text-tertiary line-through" : "text-text-primary"
            }`}
          >
            Homepage wireframes
          </span>
        </div>

        <div className="group flex items-center gap-2.5 border-t border-border-subtle py-1.5 text-[13px]">
          <Checkbox checked={secondChecked} onCheckedChange={() => undefined} disabled />
          <span
            className={`block truncate transition-colors ${
              secondChecked ? "text-text-tertiary line-through" : "text-text-primary"
            }`}
          >
            Payment flow revision
          </span>
        </div>
      </div>
    </div>
  );
}
