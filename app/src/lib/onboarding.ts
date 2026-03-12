/**
 * Deprecated prototype helper.
 * The live onboarding flow now runs through Convex-backed controllers and UI modules.
 */
import type { Phase, Project, ProjectType, Task } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type BuildOnboardingProjectInput = {
  projectName: string;
  clientName: string;
  clientAvatarUrl?: string | null;
  projectType: ProjectType;
};

export function mergeOnboardingProject(projects: Project[], onboardingProject: Project | null) {
  if (!onboardingProject) {
    return projects;
  }
  const withoutDuplicate = projects.filter((project) => project.id !== onboardingProject.id);
  return [onboardingProject, ...withoutDuplicate];
}

export function buildOnboardingProject({
  projectName,
  clientName,
  clientAvatarUrl,
  projectType,
}: BuildOnboardingProjectInput): Project {
  const now = Date.now();
  const projectId = `proj_onb_${now}`;
  const startDate = now;
  const endDate = now + 30 * DAY_MS;
  const phaseNames = ONBOARDING_PHASES[projectType] ?? ONBOARDING_PHASES.other;
  const phases: Phase[] = phaseNames.map((phaseName, index) => {
    const phaseId = `${projectId}_phase_${index + 1}`;
    const isFirstPhase = index === 0;
    return {
      id: phaseId,
      projectId,
      name: phaseName,
      order: index,
      status: isFirstPhase ? "active" : "upcoming",
      progress: isFirstPhase ? 18 : 0,
      tasks: isFirstPhase ? buildStarterTasks(phaseId, now) : [],
    };
  });

  return {
    id: projectId,
    userId: "user_001",
    name: projectName.trim(),
    clientName: clientName.trim(),
    clientAvatarUrl: clientAvatarUrl?.trim() || pickClientAvatar(clientName),
    type: projectType,
    status: "active",
    startDate,
    endDate,
    phases,
    progress: 12,
    createdAt: now,
    shareToken: `share_onb_${now}`,
  };
}

function buildStarterTasks(phaseId: string, now: number): Task[] {
  return [
    {
      id: `${phaseId}_task_1`,
      phaseId,
      title: "Confirm project scope",
      isCompleted: true,
      attachments: [],
      order: 0,
      createdAt: now - 4 * 60 * 60 * 1000,
      updatedAt: now - 2 * 60 * 60 * 1000,
    },
    {
      id: `${phaseId}_task_2`,
      phaseId,
      title: "Collect references and inspiration",
      isCompleted: false,
      attachments: [],
      order: 1,
      createdAt: now - 2 * 60 * 60 * 1000,
      updatedAt: now - 1 * 60 * 60 * 1000,
    },
    {
      id: `${phaseId}_task_3`,
      phaseId,
      title: "Schedule client check-in",
      isCompleted: false,
      attachments: [],
      order: 2,
      createdAt: now - 1 * 60 * 60 * 1000,
      updatedAt: now - 30 * 60 * 1000,
    },
  ];
}

function pickClientAvatar(seed: string) {
  const avatars = [
    "https://randomuser.me/api/portraits/women/44.jpg",
    "https://randomuser.me/api/portraits/men/52.jpg",
    "https://randomuser.me/api/portraits/women/24.jpg",
    "https://randomuser.me/api/portraits/men/31.jpg",
  ];
  let hash = 0;
  for (const char of seed) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return avatars[Math.abs(hash) % avatars.length];
}

const ONBOARDING_PHASES: Record<ProjectType, string[]> = {
  branding: ["Research", "Strategy", "Identity", "Guidelines", "Delivery"],
  "web-design": ["Strategy", "Research", "Design", "Development", "Launch"],
  "product-design": ["Discovery", "Research", "Design", "Prototyping", "Validation"],
  "app-design": ["Research", "Architecture", "Design", "Development", "Testing"],
  packaging: ["Brief", "Research", "Concept", "Refinement", "Production"],
  "motion-design": ["Brief", "Storyboard", "Design", "Animation", "Delivery"],
  illustration: ["Brief", "Sketching", "Refinement", "Final Art", "Delivery"],
  other: ["Planning", "Research", "Execution", "Review", "Delivery"],
};
