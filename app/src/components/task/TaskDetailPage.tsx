import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  DownloadSimple,
  File as FileIcon,
  Image as ImageIcon,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmPopover } from "@/components/ui/ConfirmPopover";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { debounce, formatFileSize } from "@/lib/utils";
import type { Attachment, Phase, Task } from "@/types";
import type { Id } from "../../../convex/_generated/dataModel";
import { uploadFileToR2, getNormalizedMimeType } from "@/lib/r2Uploads";

export function TaskDetailPage() {
  const navigate = useNavigate();
  const { id: projectId, taskId } = useParams({
    from: "/_authed/project/$id/task/$taskId",
  });
  const project = useConvexQuery(api.projects.getById, {
    projectId: projectId as Id<"projects">,
  });
  const isLoading = project === undefined;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const task = useMemo(
    () =>
      project?.phases
        .flatMap((phase: Phase) => phase.tasks)
        .find((phaseTask: Task) => phaseTask.id === taskId) ?? null,
    [project, taskId],
  );

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setContent(task.content ?? "");
    setAttachments(task.attachments);
  }, [task]);

  const updateTask = useConvexMutation(api.tasks.update);
  const deleteTask = useConvexMutation(api.tasks.deleteById);
  const toggleTaskComplete = useConvexMutation(api.tasks.toggleComplete);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const saveAttachment = useConvexMutation(api.tasks.saveAttachment);

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

  const phaseName = useMemo(() => {
    if (!project) return "";
    return (
      project.phases.find((phase: Phase) =>
        phase.tasks.some((phaseTask: Task) => phaseTask.id === taskId),
      )?.name ?? ""
    );
  }, [project, taskId]);

  async function handleDeleteTask() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteTask({ taskId: taskId as Id<"tasks"> });
      await navigate({ to: "/project/$id", params: { id: projectId } });
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not delete the task."));
    } finally {
      setIsDeleting(false);
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

  if (!task || !project) {
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

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
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
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{task.title} — Stage</title>
      </Helmet>

      <div className="mx-auto max-w-[1200px] px-6 pb-14 pt-5 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Link
            to="/project/$id"
            params={{ id: projectId }}
            className="inline-flex items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            {project.name} · {phaseName}
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

          <div className="mb-10 flex items-start gap-3">
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
              className={`w-full bg-transparent font-heading text-[28px] font-semibold leading-[1.3] tracking-[-0.5px] outline-none ${
                task.isCompleted
                  ? "text-text-secondary line-through"
                  : "text-text-primary"
              }`}
              placeholder="Task title"
            />
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
              className="min-h-[220px] w-full resize-none border-none bg-transparent text-[15px] leading-8 text-text-primary outline-none placeholder:text-text-tertiary"
            />

            <div className="space-y-4">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 rounded-[10px] bg-bg-subtle px-4 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border bg-white">
                          {attachment.type === "image" ? (
                            <ImageIcon size={17} className="text-text-secondary" />
                          ) : (
                      <FileIcon size={17} className="text-text-secondary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-text-primary">
                      {attachment.fileName}
                    </p>
                    <p className="text-[12px] text-text-secondary">
                      {formatFileSize(attachment.fileSize)}
                    </p>
                  </div>
                  <button className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-text-tertiary transition-colors hover:text-text-secondary">
                    <DownloadSimple size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="mt-4 inline-flex w-full cursor-pointer items-center gap-2 border-t border-border-subtle pt-4 text-[13px] text-text-tertiary transition-colors hover:text-accent">
            <Plus size={13} />
            Attach file
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>

          {uploading && (
            <p className="mt-2 text-[12px] text-text-secondary">Uploading files...</p>
          )}
        </motion.div>
      </div>
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
