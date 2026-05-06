import { DEFAULT_PORTAL_COLOR } from "@/lib/constants";
import type { Phase, Task } from "@/types";

const PORTAL_PREVIEW_STORAGE_KEY = "stage.portalPreviewBranding";

export type PortalPreviewBranding = {
  accentColor: string;
  logoUrl: string | null;
};

export type PortalPreviewData = {
  project: {
    name: string;
    clientName: string;
    progress: number;
    phases: Phase[];
  };
  config: PortalPreviewBranding;
};

export function savePortalPreviewBranding(branding: PortalPreviewBranding) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PORTAL_PREVIEW_STORAGE_KEY, JSON.stringify(branding));
}

export function readPortalPreviewBranding(): PortalPreviewBranding | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PORTAL_PREVIEW_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PortalPreviewBranding>;
    return {
      accentColor:
        typeof parsed.accentColor === "string" ? parsed.accentColor : DEFAULT_PORTAL_COLOR,
      logoUrl: typeof parsed.logoUrl === "string" ? parsed.logoUrl : null,
    };
  } catch {
    return null;
  }
}

export function getPortalPreviewData(fallbackBranding?: Partial<PortalPreviewBranding>): PortalPreviewData {
  const storedBranding = readPortalPreviewBranding();
  const accentColor =
    storedBranding?.accentColor ?? fallbackBranding?.accentColor ?? DEFAULT_PORTAL_COLOR;
  const logoUrl = storedBranding?.logoUrl ?? fallbackBranding?.logoUrl ?? null;
  const now = Date.now();
  const phases = createMockPhases(now);

  return {
    project: {
      name: "Website Redesign",
      clientName: "Acme Studio",
      progress: 52,
      phases,
    },
    config: {
      accentColor,
      logoUrl,
    },
  };
}

function createMockPhases(now: number): Phase[] {
  return [
    {
      id: "preview-phase-strategy",
      projectId: "preview-project",
      name: "Strategy",
      order: 0,
      status: "completed",
      progress: 100,
      tasks: [
        createMockTask({
          id: "preview-task-goals",
          phaseId: "preview-phase-strategy",
          title: "Define project goals",
          isCompleted: true,
          order: 0,
          now,
        }),
      ],
    },
    {
      id: "preview-phase-research",
      projectId: "preview-project",
      name: "Research",
      order: 1,
      status: "completed",
      progress: 100,
      tasks: [
        createMockTask({
          id: "preview-task-audit",
          phaseId: "preview-phase-research",
          title: "Competitive audit",
          isCompleted: true,
          order: 0,
          now,
        }),
      ],
    },
    {
      id: "preview-phase-design",
      projectId: "preview-project",
      name: "Design",
      order: 2,
      status: "active",
      progress: 67,
      tasks: [
        createMockTask({
          id: "preview-task-moodboard",
          phaseId: "preview-phase-design",
          title: "Moodboard approved",
          isCompleted: true,
          order: 0,
          now,
        }),
        createMockTask({
          id: "preview-task-wireframes",
          phaseId: "preview-phase-design",
          title: "Wireframes v2 delivered",
          isCompleted: true,
          order: 1,
          now,
        }),
        createMockTask({
          id: "preview-task-style-guide",
          phaseId: "preview-phase-design",
          title: "Style guide draft",
          isCompleted: true,
          order: 2,
          now,
          content:
            "<p>We aligned on a softer editorial direction with warm neutrals and a cleaner grid. The next step is refining the inner page system and applying responsive behavior across key breakpoints.</p><p>The preview portal uses this mock task so you can review how notes, formatting, and attachments will appear to clients.</p>",
          attachments: [
            {
              id: "preview-attachment-style-guide",
              type: "document",
              url: "#",
              fileName: "Style-Guide-Draft.fig",
              fileSize: 2849152,
              mimeType: "application/figma",
            },
          ],
        }),
        createMockTask({
          id: "preview-task-homepage",
          phaseId: "preview-phase-design",
          title: "Homepage high-fidelity",
          isCompleted: true,
          order: 3,
          now,
        }),
        createMockTask({
          id: "preview-task-inner-pages",
          phaseId: "preview-phase-design",
          title: "Inner page layouts",
          isCompleted: false,
          order: 4,
          now,
          content:
            "<p>Product, pricing, and case study page layouts are in progress. This note gives clients a simple view into what is happening without exposing editing controls.</p>",
        }),
        createMockTask({
          id: "preview-task-mobile",
          phaseId: "preview-phase-design",
          title: "Mobile responsive pass",
          isCompleted: false,
          order: 5,
          now,
          content:
            "<p>Responsive adjustments will follow once the desktop direction is fully approved.</p>",
        }),
      ],
    },
    {
      id: "preview-phase-development",
      projectId: "preview-project",
      name: "Development",
      order: 3,
      status: "upcoming",
      progress: 0,
      tasks: [
        createMockTask({
          id: "preview-task-build",
          phaseId: "preview-phase-development",
          title: "Frontend build",
          isCompleted: false,
          order: 0,
          now,
        }),
      ],
    },
    {
      id: "preview-phase-launch",
      projectId: "preview-project",
      name: "Launch",
      order: 4,
      status: "upcoming",
      progress: 0,
      tasks: [
        createMockTask({
          id: "preview-task-review",
          phaseId: "preview-phase-launch",
          title: "Final client review",
          isCompleted: false,
          order: 0,
          now,
        }),
      ],
    },
  ];
}

function createMockTask({
  id,
  phaseId,
  title,
  isCompleted,
  order,
  now,
  content,
  attachments = [],
}: {
  id: string;
  phaseId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  now: number;
  content?: string;
  attachments?: Task["attachments"];
}): Task {
  return {
    id,
    phaseId,
    title,
    isCompleted,
    content,
    attachments,
    order,
    createdAt: now,
    updatedAt: now,
  };
}
