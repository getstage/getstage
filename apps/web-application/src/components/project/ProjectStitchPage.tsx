import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "@tanstack/react-router";
import { useAction as useConvexAction, useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowsClockwise,
  Images,
  LinkSimple,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/convex";
import type { Id } from "../../../convex/_generated/dataModel";

/* ─── types for the stitch data we expect from the backend ─── */

type DesignConnection = {
  _id: string;
  provider: string;
  externalProjectUrl: string;
  externalProjectId?: string;
  title?: string;
  lastSyncedAt?: number;
};

type SyncedPreview = {
  _id: string;
  imageUrl: string;
  title?: string;
  phaseName?: string;
  syncedAt: number;
};

/* ─── hook that frontend expects the backend to provide ─── */

function useProjectStitchData(projectId: Id<"projects">) {
  const project = useConvexQuery(api.projects.getById, { projectId });
  const connection = useConvexQuery(api.app.projectStitch.getForProject, { projectId });
  const previews = useConvexQuery(api.app.projectStitch.listPreviews, { projectId });

  return {
    project: project ?? null,
    isLoading: project === undefined,
    connection: (connection ?? null) as DesignConnection | null,
    previews: (previews ?? []) as SyncedPreview[],
    connectionLoading: connection === undefined || previews === undefined,
  };
}

/* ─── empty state: no stitch connection ─── */

function NoConnectionState({
  isLinking,
  onLink,
}: {
  isLinking: boolean;
  onLink: (url: string) => Promise<void>;
}) {
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLink = async () => {
    setError(null);
    try {
      await onLink(url);
      setShowInput(false);
      setUrl("");
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Failed to link Stitch project.");
    }
  };

  return (
    <div className="mx-auto max-w-[520px] rounded-[24px] border border-border-subtle bg-white p-8 text-center shadow-[0_12px_40px_rgba(17,24,39,0.04)]">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-[rgba(59,175,218,0.10)] text-[#0891b2]">
        <LinkSimple size={24} weight="bold" />
      </span>

      <h2 className="mt-5 font-heading text-[20px] font-semibold text-text-primary">
        Link a Stitch project
      </h2>
      <p className="mt-2 text-[14px] leading-[1.7] text-text-secondary">
        Connect your Google Stitch workspace to this project. Stage will show the
        latest synced preview screens here.
      </p>

      {!showInput ? (
        <Button
          variant="primary"
          size="sm"
          className="mx-auto mt-6 bg-[#0891b2] hover:bg-[#0e7490]"
          onClick={() => setShowInput(true)}
        >
          <LinkSimple size={14} weight="bold" />
          Link Stitch project
        </Button>
      ) : (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://stitch.withgoogle.com/projects/..."
              className="h-10 flex-1 rounded-[10px] border border-border bg-bg px-3 text-[14px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20 transition-colors"
              autoFocus
            />
            <Button
              variant="primary"
              size="sm"
              className="h-10 bg-[#0891b2] hover:bg-[#0e7490]"
              onClick={handleLink}
              disabled={!url.trim()}
              isLoading={isLinking}
            >
              Link
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowInput(false);
                setUrl("");
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-text-tertiary transition-colors hover:bg-bg-subtle hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-2 text-left text-[12px] text-text-tertiary">
            Paste the full Stitch project URL from your browser.
          </p>
          {error ? (
            <p className="mt-2 text-left text-[12px] text-destructive">{error}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ─── linked state: connection info + previews ─── */

function LinkedState({
  connection,
  previews,
  isSyncing,
  onSync,
}: {
  connection: DesignConnection;
  previews: SyncedPreview[];
  isSyncing: boolean;
  onSync: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Connection header */}
      <div className="flex flex-col gap-4 rounded-[18px] border border-[rgba(59,175,218,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(17,24,39,0.03)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(59,175,218,0.10)] text-[#0891b2]">
            <img
              src="/stitch.png"
              alt=""
              className="h-5 w-5 rounded-[4px]"
            />
          </span>
          <div>
            <p className="text-[14px] font-medium text-text-primary">
              {connection.title || "Stitch project"}
            </p>
            <p className="text-[12px] text-text-tertiary">
              {connection.lastSyncedAt
                ? `Last synced ${formatRelativeTime(connection.lastSyncedAt)}`
                : "Not synced yet"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 rounded-[9px] text-[13px]"
            onClick={onSync}
            isLoading={isSyncing}
          >
            <ArrowsClockwise size={14} weight="bold" />
            Sync latest
          </Button>
          <a
            href={connection.externalProjectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-[#0891b2] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0e7490]"
          >
            Open in Stitch
            <ArrowSquareOut size={13} weight="bold" />
          </a>
        </div>
      </div>

      {/* Preview grid */}
      {previews.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images size={16} weight="bold" className="text-text-tertiary" />
              <span className="text-[13px] font-medium text-text-secondary">
                Latest previews
              </span>
              <span className="rounded-full bg-border-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                {previews.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {previews.map((preview) => (
              <PreviewCard key={preview._id} preview={preview} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-[18px] border border-dashed border-border-subtle bg-bg-subtle/50 px-8 py-14 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-white shadow-[0_2px_8px_rgba(17,24,39,0.06)]">
            <Images
              size={22}
              weight="light"
              className="text-text-tertiary"
            />
          </span>
          <p className="mt-4 text-[15px] font-medium text-text-primary">
            No previews synced yet
          </p>
          <p className="mt-1.5 max-w-[320px] text-[13px] leading-[1.6] text-text-secondary">
            Work in Stitch, then hit "Sync latest" to pull in the newest screens.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── preview card ─── */

function PreviewCard({ preview }: { preview: SyncedPreview }) {
  return (
    <div className="group overflow-hidden rounded-[12px] border border-border bg-white transition-[border-color,box-shadow] duration-150 hover:border-border-subtle hover:shadow-[0_8px_20px_rgba(17,24,39,0.06)]">
      <div className="aspect-[4/3] overflow-hidden bg-border-subtle">
        <img
          src={preview.imageUrl}
          alt={preview.title || "Design preview"}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          loading="lazy"
        />
      </div>
      <div className="px-4 py-3">
        {preview.title ? (
          <p className="mb-1 truncate text-[14px] font-medium text-text-primary">
            {preview.title}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          {preview.phaseName ? (
            <span className="rounded-full bg-[rgba(59,175,218,0.10)] px-2 py-0.5 text-[10px] font-semibold text-[#0891b2]">
              {preview.phaseName}
            </span>
          ) : null}
          <span className="text-[12px] text-text-tertiary">
            {formatRelativeTime(preview.syncedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── time formatter ─── */

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/* ─── main page ─── */

export function ProjectStitchPage() {
  const { id: projectId } = useParams({
    from: "/_authed/project/$id/stitch",
  });
  const linkStitchProject = useConvexAction(api.app.projectStitch.linkProject);
  const syncLatest = useConvexMutation(api.app.projectStitch.syncLatest);
  const { project, isLoading, connection, previews, connectionLoading } =
    useProjectStitchData(projectId as Id<"projects">);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleLink = async (url: string) => {
    setIsLinking(true);
    setActionError(null);
    try {
      await linkStitchProject({
        projectId: projectId as Id<"projects">,
        externalProjectUrl: url,
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setActionError(null);
    try {
      await syncLatest({ projectId: projectId as Id<"projects"> });
    } catch (syncError) {
      setActionError(
        syncError instanceof Error
          ? syncError.message
          : "Sync latest is not available right now.",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading || connectionLoading) {
    return <StitchLoadingState />;
  }

  const projectName = project?.name ?? "Project";

  return (
    <>
      <Helmet>
        <title>Stitch — {projectName} — Stage</title>
      </Helmet>

      <div className="min-h-[calc(100vh-64px)]">
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto flex w-full max-w-[1200px] flex-col px-4 pb-[120px] pt-4 sm:px-10 sm:pt-6 lg:px-14"
        >
          {/* Back link */}
          <Link
            to="/project/$id"
            params={{ id: projectId }}
            className="mb-5 inline-flex w-fit items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            {projectName}
          </Link>

          {/* Page header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(59,175,218,0.10)]">
                <img
                  src="/stitch.png"
                  alt=""
                  className="h-5 w-5 rounded-[4px]"
                />
              </span>
              <div>
                <h1 className="font-heading text-[22px] font-semibold tracking-[-0.3px] text-text-primary">
                  Stitch
                </h1>
                <p className="text-[13px] text-text-secondary">
                  Design previews for {projectName}
                </p>
              </div>
            </div>
          </div>

          {actionError ? (
            <div className="mb-6 rounded-[14px] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-[13px] text-destructive">
              {actionError}
            </div>
          ) : null}

          {/* Content based on state */}
          {connection ? (
            <LinkedState
              connection={connection}
              previews={previews}
              isSyncing={isSyncing}
              onSync={() => void handleSync()}
            />
          ) : (
            <NoConnectionState
              isLinking={isLinking}
              onLink={handleLink}
            />
          )}
        </motion.main>
      </div>

    </>
  );
}

/* ─── loading state ─── */

function StitchLoadingState() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-10 lg:px-14">
      <div className="skeleton mb-5 h-4 w-28" />
      <div className="skeleton mb-2 h-8 w-48" />
      <div className="skeleton mb-8 h-4 w-64" />
      <div className="skeleton h-48 w-full rounded-[18px]" />
    </div>
  );
}
