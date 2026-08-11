import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { wireframesArtifactSchema, type WireframesArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { mapWireframesArtifactToTabData } from "@/lib/project/mapWireframesArtifactToTabData";
import { SHOULD_QUERY_PROJECT_AI_ARTIFACTS } from "@/lib/project/shouldQueryProjectAiArtifacts";
import { api } from "@/lib/convexApi";
import type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";

export type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";

function parseWireframesArtifact(contentJson: string | null): WireframesArtifact | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson) as unknown;
    return wireframesArtifactSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function useWireframesArtifact(
  projectId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled =
    enabled && SHOULD_QUERY_PROJECT_AI_ARTIFACTS && isAuthenticated && Boolean(projectId);
  const { data: record, isPending } = useQuery(
    convexQuery(
      api.projectAi.getLatestWireframesArtifact,
      queryEnabled ? { projectId: projectId as Id<"projects"> } : "skip",
    ),
  );

  const artifact = useMemo(
    () => (record ? parseWireframesArtifact(record.contentJson) : null),
    [record],
  );
  const r2Content = useResolvedR2Content(artifact, record?.id);

  const data = useMemo<WireframesArtifactRecord | null>(() => {
    if (!record || !artifact) {
      return null;
    }

    const fragments = r2Content.data?.fragments;
    const resolvedArtifact: WireframesArtifact = fragments
      ? {
          ...artifact,
          generatedScreens: artifact.generatedScreens.map((screen) =>
            screen.html?.trim() || !fragments[screen.id]
              ? screen
              : { ...screen, html: fragments[screen.id] },
          ),
        }
      : artifact;
    const resolvedCss = r2Content.data?.css ?? null;

    return {
      id: record.id,
      projectId: record.projectId,
      runId: record.runId,
      title: record.title,
      summary: record.summary,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      artifact: resolvedArtifact,
      resolvedCss,
      tabData: mapWireframesArtifactToTabData(resolvedArtifact, resolvedCss),
    };
  }, [record, artifact, r2Content.data]);

  return {
    data,
    // Screens with offloaded fragments are not renderable until the text arrives;
    // without this gate the grid would flash Lo-Fi blocks before swapping to Hi-Fi.
    isLoading: isAuthLoading || (queryEnabled && isPending) || r2Content.isLoading,
    hasArtifact: data !== null,
    parseError: record !== undefined && record !== null && data === null,
  };
}

type ResolvedR2Content = {
  css: string | null;
  fragments: Record<string, string>;
};

// React-rendered runs offload each screen's fragment and the shared stylesheet to
// R2 (inline HTML blew Convex's 1 MiB document limit). The query resolves the
// stored keys to public URLs; here the desktop main process fetches the text back
// (sandboxed preview iframes can't — the bucket sends no CORS headers) so every
// downstream consumer keeps working with plain html/CSS text.
function useResolvedR2Content(artifact: WireframesArtifact | null, recordId: string | undefined) {
  const fragmentTargets = useMemo(
    () =>
      (artifact?.generatedScreens ?? [])
        .filter((screen) => !screen.html?.trim() && screen.htmlUrl)
        .map((screen) => ({ id: screen.id, url: screen.htmlUrl as string })),
    [artifact],
  );
  const cssUrl = artifact?.cssUrl ?? null;

  return useQuery<ResolvedR2Content>({
    queryKey: ["wireframes-r2-content", recordId, cssUrl, fragmentTargets],
    enabled:
      (fragmentTargets.length > 0 || cssUrl !== null) &&
      typeof window !== "undefined" &&
      Boolean(window.stageDesktop),
    // An R2 object's content never changes under its key: one fetch per record.
    staleTime: Infinity,
    queryFn: async () => {
      const fetchText = (url: string) => window.stageDesktop.storage.fetchR2Text({ url });
      const [css, fragments] = await Promise.all([
        cssUrl ? fetchText(cssUrl) : Promise.resolve(null),
        Promise.all(
          fragmentTargets.map(async (target) => [target.id, await fetchText(target.url)] as const),
        ),
      ]);
      return { css, fragments: Object.fromEntries(fragments) };
    },
  });
}
