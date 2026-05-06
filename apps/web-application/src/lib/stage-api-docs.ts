export type ApiCodeLanguage = "curl" | "typescript" | "python";
export type ApiMethod = "GET" | "POST" | "DELETE" | "PATCH";

export interface ApiFieldDoc {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  defaultValue?: string;
}

export interface ApiEndpointDoc {
  id: string;
  title: string;
  method: ApiMethod;
  path: string;
  pathExample?: string;
  summary: string;
  description: string;
  pathFields?: ApiFieldDoc[];
  bodyFields?: ApiFieldDoc[];
  bodyExample?: Record<string, unknown>;
  responseExample: unknown;
  notes?: string[];
}

export interface ApiSectionDoc {
  id: string;
  title: string;
  summary: string;
  paragraphs?: string[];
  bullets?: string[];
  endpointIds?: string[];
}

function resolveApiReferenceBaseUrl() {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "testing.getstage.co") {
      return "https://testing.getstage.co/api/v1";
    }
    if (hostname === "stage.getstage.co") {
      return "https://stage.getstage.co/api/v1";
    }
  }

  return "https://getstage.co/api/v1";
}

export const API_REFERENCE_BASE_URL = resolveApiReferenceBaseUrl();

export const quickstartPrompt = `"I just signed a new client — Brew & Co, a specialty coffee shop.
They need full branding. Budget is €3,000, deadline is 6 weeks from now.
Set it up in Stage for me."`;

/* ─── Endpoints ─── */

export const stageApiEndpoints: ApiEndpointDoc[] = [
  // ── Projects ──
  {
    id: "list-projects",
    title: "List projects",
    method: "GET",
    path: "/api/v1/projects",
    summary: "List all projects for the authenticated user.",
    description:
      "Returns lean project summaries. Use GET /projects/:id for full detail.",
    responseExample: {
      projects: [
        {
          id: "k17abc123",
          name: "Brew & Co Brand Identity",
          clientName: "Brew & Co",
          type: "branding",
          status: "active",
          startDate: 1717200000000,
          endDate: 1720828800000,
          progress: 14,
        },
      ],
    },
  },
  {
    id: "get-project",
    title: "Get project",
    method: "GET",
    path: "/api/v1/projects/:id",
    pathExample: "/api/v1/projects/k17abc123",
    summary: "Get full project detail including phase/task counts.",
    description:
      "Returns project metadata with counts. Does not include nested phases or tasks — use the phases and tasks endpoints for those.",
    pathFields: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "The project ID.",
      },
    ],
    responseExample: {
      project: {
        id: "k17abc123",
        name: "Brew & Co Brand Identity",
        clientName: "Brew & Co",
        clientEmail: "hello@brewandco.com",
        type: "branding",
        status: "active",
        startDate: 1717200000000,
        endDate: 1720828800000,
        progress: 14,
        accessRole: "owner",
        phaseCount: 5,
        taskCount: 18,
        completedTaskCount: 3,
        createdAt: 1717200000000,
        updatedAt: 1717200000000,
      },
    },
  },
  {
    id: "create-project",
    title: "Create project",
    method: "POST",
    path: "/api/v1/projects",
    summary: "Create a single project with optional phases and tasks.",
    description:
      "Creates a project. You can include phases with task names inline. For bulk creation from a full plan, use import-plan instead.",
    bodyFields: [
      { name: "name", type: "string", required: true, description: "Project name." },
      { name: "clientName", type: "string", required: true, description: "Client or company name." },
      { name: "clientEmail", type: "string", required: false, description: "Client email address." },
      {
        name: "type",
        type: "string",
        required: true,
        description:
          'One of: "branding", "web-design", "product-design", "app-design", "web-app", "packaging", "motion-design", "illustration", "other".',
      },
      { name: "startDate", type: "number", required: true, description: "Start date as Unix timestamp in milliseconds." },
      { name: "endDate", type: "number", required: true, description: "End date as Unix timestamp in milliseconds." },
      {
        name: "phases",
        type: "array",
        required: false,
        description: 'Optional array of phases. Each phase has a "name" and optional "tasks" array of task name strings.',
      },
    ],
    bodyExample: {
      name: "Brew & Co Brand Identity",
      clientName: "Brew & Co",
      clientEmail: "hello@brewandco.com",
      type: "branding",
      startDate: 1717200000000,
      endDate: 1720828800000,
      phases: [
        { name: "Discovery", tasks: ["Research competitors", "Client interview"] },
        { name: "Strategy", tasks: ["Define brand positioning", "Create moodboard"] },
      ],
    },
    responseExample: {
      project: {
        id: "k17abc123",
        name: "Brew & Co Brand Identity",
        clientName: "Brew & Co",
        type: "branding",
        status: "active",
        startDate: 1717200000000,
        endDate: 1720828800000,
        progress: 0,
      },
    },
    notes: [
      "Returns 201 on success.",
    ],
  },
  {
    id: "import-plan",
    title: "Import plan",
    method: "POST",
    path: "/api/v1/projects/import-plan",
    summary: "Create a full project with phases and tasks in one request.",
    description:
      "The preferred endpoint for AI agents. Send a complete project plan — name, client, type, dates, and phases with tasks — and Stage creates everything at once. At least one phase is required.",
    bodyFields: [
      { name: "name", type: "string", required: true, description: "Project name." },
      { name: "clientName", type: "string", required: true, description: "Client or company name." },
      { name: "clientEmail", type: "string", required: false, description: "Client email address." },
      {
        name: "type",
        type: "string",
        required: true,
        description:
          'One of: "branding", "web-design", "product-design", "app-design", "web-app", "packaging", "motion-design", "illustration", "other".',
      },
      { name: "startDate", type: "number", required: true, description: "Start date as Unix timestamp in milliseconds." },
      { name: "endDate", type: "number", required: true, description: "End date as Unix timestamp in milliseconds." },
      {
        name: "phases",
        type: "array",
        required: true,
        description: 'At least one phase. Each has a "name" and optional "tasks" array of task name strings.',
      },
    ],
    bodyExample: {
      name: "Brew & Co Brand Identity",
      clientName: "Brew & Co",
      type: "branding",
      startDate: 1717200000000,
      endDate: 1720828800000,
      phases: [
        { name: "Discovery", tasks: ["Research competitors", "Client interview", "Define brand values"] },
        { name: "Strategy", tasks: ["Brand positioning", "Moodboard", "Typography selection"] },
        { name: "Design", tasks: ["Logo concepts", "Color palette", "Brand guidelines draft", "Business cards", "Social templates"] },
        { name: "Delivery", tasks: ["Final brand guidelines", "Asset export", "Client handoff"] },
      ],
    },
    responseExample: {
      project: {
        id: "k17abc123",
        name: "Brew & Co Brand Identity",
        clientName: "Brew & Co",
        type: "branding",
        status: "active",
        startDate: 1717200000000,
        endDate: 1720828800000,
        progress: 0,
      },
    },
    notes: [
      "Returns 201 on success.",
      "This is the recommended endpoint for AI agents creating full projects.",
      "At least one phase is required. Tasks within phases are optional.",
    ],
  },
  {
    id: "get-ai-context",
    title: "Get AI context",
    method: "GET",
    path: "/api/v1/projects/:id/ai/context",
    pathExample: "/api/v1/projects/k17abc123/ai/context",
    summary: "Get the saved AI workflow context for a project.",
    description:
      "Returns the structured inputs Stage stores for research, strategy, and generation. Use this before starting a run so the agent works from the latest project context.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    responseExample: {
      context: {
        id: "ctx_123",
        projectId: "k17abc123",
        clientWebsite: "https://brewandco.com",
        competitorUrls: ["https://bluebottlecoffee.com", "https://www.stumptowncoffee.com"],
        referenceUrls: ["https://www.pinterest.com/search/pins/?q=coffee%20branding"],
        brief: "Premium brand refresh focused on packaging and social rollout.",
        briefAttachmentName: null,
        briefAttachmentUrl: null,
        notes: "Start with tone of voice and competitor positioning.",
        updatedAt: 1717200000000,
      },
    },
  },
  {
    id: "upsert-ai-context",
    title: "Save AI context",
    method: "POST",
    path: "/api/v1/projects/:id/ai/context",
    pathExample: "/api/v1/projects/k17abc123/ai/context",
    summary: "Create or update the project context used by AI workflows.",
    description:
      "Stores the working context for Stage's AI workflow. This is the main setup step before research, strategy, or generate runs.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    bodyFields: [
      { name: "clientWebsite", type: "string", required: false, description: "Client or company website." },
      { name: "competitorUrls", type: "string[]", required: false, description: "Optional competitor URLs to include in research." },
      { name: "referenceUrls", type: "string[]", required: false, description: "Optional reference or inspiration URLs." },
      { name: "brief", type: "string", required: false, description: "Short brief or research context." },
      { name: "notes", type: "string", required: false, description: "Extra notes for the agent." },
    ],
    bodyExample: {
      clientWebsite: "https://brewandco.com",
      competitorUrls: ["https://bluebottlecoffee.com", "https://www.stumptowncoffee.com"],
      referenceUrls: ["https://www.pinterest.com/search/pins/?q=coffee%20branding"],
      brief: "Premium brand refresh focused on packaging and social rollout.",
      notes: "Start with positioning, audience, and visual direction.",
    },
    responseExample: {
      contextId: "ctx_123",
    },
    notes: ["Returns 201 on success."],
  },
  {
    id: "list-ai-runs",
    title: "List AI runs",
    method: "GET",
    path: "/api/v1/projects/:id/ai/runs",
    pathExample: "/api/v1/projects/k17abc123/ai/runs?module=research",
    summary: "List AI runs for a project.",
    description:
      'Returns research, strategy, generate, or delivery runs. Pass the optional query param "module" to scope the list.',
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    responseExample: {
      runs: [
        {
          id: "run_123",
          projectId: "k17abc123",
          connectionId: null,
          module: "research",
          title: "Brew & Co research run",
          status: "running",
          trigger: "user",
          externalRunId: null,
          inputSummary: "Website: https://brewandco.com · Competitors: 2 · References: 1 · Brief file: no",
          errorMessage: null,
          startedAt: 1717200000000,
          completedAt: null,
          updatedAt: 1717200000000,
        },
      ],
    },
  },
  {
    id: "create-ai-run",
    title: "Create AI run",
    method: "POST",
    path: "/api/v1/projects/:id/ai/runs",
    pathExample: "/api/v1/projects/k17abc123/ai/runs",
    summary: "Create a research, strategy, generate, or delivery run.",
    description:
      "Use this when the agent starts work for a project module. Stage records the run first, then the agent can write artifacts back against it.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    bodyFields: [
      { name: "module", type: "string", required: true, description: 'One of: "research", "strategy", "generate", or "delivery".' },
      { name: "title", type: "string", required: true, description: "Human-readable run title." },
      { name: "status", type: "string", required: false, description: 'Optional initial status. Defaults to "running".', defaultValue: "running" },
      { name: "trigger", type: "string", required: false, description: 'Optional trigger source. Defaults to "user".', defaultValue: "user" },
      { name: "inputSummary", type: "string", required: false, description: "Short summary of the run input." },
      { name: "externalRunId", type: "string", required: false, description: "Optional external run ID from the agent runtime." },
    ],
    bodyExample: {
      module: "research",
      title: "Brew & Co research run",
      inputSummary: "Initial competitor and positioning research",
    },
    responseExample: {
      runId: "run_123",
    },
    notes: ["Returns 201 on success."],
  },
  {
    id: "list-ai-artifacts",
    title: "List AI artifacts",
    method: "GET",
    path: "/api/v1/projects/:id/ai/artifacts",
    pathExample: "/api/v1/projects/k17abc123/ai/artifacts?module=research",
    summary: "List saved AI artifacts for a project.",
    description:
      'Returns research, strategy, generate, or delivery artifacts. Pass the optional query param "module" to scope the list.',
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    responseExample: {
      artifacts: [
        {
          id: "art_123",
          projectId: "k17abc123",
          runId: "run_123",
          module: "research",
          kind: "market_scan",
          title: "Brew & Co market scan",
          summary: "Competitor overview and visual patterns.",
          status: "ready",
          contentFormat: "markdown",
          contentMarkdown: "## Competitor themes\n\n- Warm editorial photography\n- Premium minimal packaging",
          contentJson: null,
          externalUrl: null,
          createdAt: 1717200000000,
          updatedAt: 1717200000000,
          approvedAt: null,
        },
      ],
    },
  },
  {
    id: "create-ai-artifact",
    title: "Create AI artifact",
    method: "POST",
    path: "/api/v1/projects/:id/ai/artifacts",
    pathExample: "/api/v1/projects/k17abc123/ai/artifacts",
    summary: "Write an AI artifact back into Stage.",
    description:
      "Use this after the agent finishes a step in research, strategy, generate, or delivery. Stage stores the artifact as the source of truth.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    bodyFields: [
      { name: "runId", type: "string", required: false, description: "Optional run ID this artifact belongs to." },
      { name: "module", type: "string", required: true, description: 'One of: "research", "strategy", "generate", or "delivery".' },
      { name: "kind", type: "string", required: true, description: "Artifact type label." },
      { name: "title", type: "string", required: true, description: "Artifact title." },
      { name: "summary", type: "string", required: false, description: "Short artifact summary." },
      { name: "status", type: "string", required: false, description: 'Optional artifact status. Defaults to "ready".', defaultValue: "ready" },
      { name: "contentFormat", type: "string", required: true, description: 'One of: "markdown", "json", or "link_set".' },
      { name: "contentMarkdown", type: "string", required: false, description: "Markdown body for the artifact." },
      { name: "contentJson", type: "string", required: false, description: "JSON string body for structured artifacts." },
      { name: "externalUrl", type: "string", required: false, description: "Optional external URL." },
    ],
    bodyExample: {
      runId: "run_123",
      module: "research",
      kind: "market_scan",
      title: "Brew & Co market scan",
      summary: "Competitor overview and visual patterns.",
      contentFormat: "markdown",
      contentMarkdown: "## Competitor themes\n\n- Warm editorial photography\n- Premium minimal packaging",
    },
    responseExample: {
      artifactId: "art_123",
    },
    notes: ["Returns 201 on success."],
  },
  {
    id: "create-ai-export",
    title: "Record artifact export",
    method: "POST",
    path: "/api/v1/ai/artifacts/:id/exports",
    pathExample: "/api/v1/ai/artifacts/art_123/exports",
    summary: "Record a Figma or Notion export result for an artifact.",
    description:
      "This is the current test flow for Figma and Notion. Stage records export status and destination metadata, but native OAuth connections are not part of this setup.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The artifact ID." },
    ],
    bodyFields: [
      { name: "provider", type: "string", required: true, description: 'One of: "figma" or "notion".' },
      { name: "action", type: "string", required: true, description: "Export action label such as open_in_figma or export_to_notion." },
      { name: "status", type: "string", required: false, description: 'Optional export status. Defaults to "completed".', defaultValue: "completed" },
      { name: "destinationLabel", type: "string", required: false, description: "Human-readable destination name." },
      { name: "destinationUrl", type: "string", required: false, description: "Direct URL to the exported destination." },
      { name: "errorMessage", type: "string", required: false, description: "Optional error text if the export failed." },
      { name: "lastSyncedAt", type: "number", required: false, description: "Optional sync timestamp in milliseconds." },
    ],
    bodyExample: {
      provider: "notion",
      action: "export_to_notion",
      status: "completed",
      destinationLabel: "Brew & Co strategy page",
      destinationUrl: "https://www.notion.so/workspace/brew-co-strategy",
      lastSyncedAt: 1717200000000,
    },
    responseExample: {
      destinationId: "dest_123",
    },
    notes: [
      "Returns 201 on success.",
      "Figma and Notion are tracked as export destinations in this test flow, not as native OAuth integrations.",
    ],
  },

  // ── Phases ──
  {
    id: "list-phases",
    title: "List phases",
    method: "GET",
    path: "/api/v1/projects/:id/phases",
    pathExample: "/api/v1/projects/k17abc123/phases",
    summary: "List phases for a project with task counts.",
    description:
      "Returns phase summaries including task/completion counts. Does not include nested task payloads.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    responseExample: {
      phases: [
        {
          id: "ph_abc123",
          projectId: "k17abc123",
          name: "Discovery",
          order: 0,
          status: "in_progress",
          progress: 33,
          taskCount: 3,
          completedTaskCount: 1,
          createdAt: 1717200000000,
          updatedAt: 1717200000000,
        },
      ],
    },
  },
  {
    id: "create-phase",
    title: "Create phase",
    method: "POST",
    path: "/api/v1/projects/:id/phases",
    pathExample: "/api/v1/projects/k17abc123/phases",
    summary: "Add a phase to a project, optionally with tasks.",
    description:
      "Creates a new phase at the end of the project. You can include task names inline.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    bodyFields: [
      { name: "name", type: "string", required: true, description: "Phase name." },
      { name: "tasks", type: "string[]", required: false, description: "Optional array of task name strings to create in this phase." },
    ],
    bodyExample: {
      name: "Animation",
      tasks: ["Storyboard", "Motion design", "Final render"],
    },
    responseExample: {
      phase: {
        id: "ph_def456",
        projectId: "k17abc123",
        name: "Animation",
        order: 5,
      },
    },
    notes: ["Returns 201 on success."],
  },

  // ── Tasks ──
  {
    id: "list-tasks",
    title: "List tasks",
    method: "GET",
    path: "/api/v1/phases/:id/tasks",
    pathExample: "/api/v1/phases/ph_abc123/tasks",
    summary: "List tasks for a phase.",
    description:
      "Returns task summaries. Use GET /tasks/:id for full detail including content and attachments.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The phase ID." },
    ],
    responseExample: {
      tasks: [
        {
          id: "t_xyz789",
          phaseId: "ph_abc123",
          title: "Research competitors",
          isCompleted: false,
          dueDate: null,
          attachmentCount: 0,
          hasContent: false,
          order: 0,
          createdAt: 1717200000000,
          updatedAt: 1717200000000,
        },
      ],
    },
  },
  {
    id: "get-task",
    title: "Get task",
    method: "GET",
    path: "/api/v1/tasks/:id",
    pathExample: "/api/v1/tasks/t_xyz789",
    summary: "Get full task detail including content and attachments.",
    description:
      "Returns the complete task with content body and attachment list. This is the only endpoint that returns full task data.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The task ID." },
    ],
    responseExample: {
      task: {
        id: "t_xyz789",
        phaseId: "ph_abc123",
        title: "Research competitors",
        isCompleted: false,
        content: "Look at 5 direct competitors in the specialty coffee space...",
        dueDate: 1717804800000,
        assignees: [{ userId: "u_123", name: "Wessel Dieben" }],
        attachments: [],
        order: 0,
        createdAt: 1717200000000,
        updatedAt: 1717200000000,
      },
    },
  },
  {
    id: "create-task",
    title: "Create task",
    method: "POST",
    path: "/api/v1/phases/:id/tasks",
    pathExample: "/api/v1/phases/ph_abc123/tasks",
    summary: "Add a task to a phase.",
    description: "Creates a new task at the end of the phase.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The phase ID." },
    ],
    bodyFields: [
      { name: "title", type: "string", required: true, description: "Task title." },
    ],
    bodyExample: { title: "Create brand guidelines" },
    responseExample: {
      task: {
        id: "t_new123",
        phaseId: "ph_abc123",
        title: "Create brand guidelines",
        isCompleted: false,
      },
    },
    notes: ["Returns 201 on success."],
  },
  {
    id: "toggle-task",
    title: "Toggle task",
    method: "POST",
    path: "/api/v1/tasks/:id/toggle",
    pathExample: "/api/v1/tasks/t_xyz789/toggle",
    summary: "Toggle a task's completion status.",
    description: "Flips the task between completed and not completed. Returns the updated task.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The task ID." },
    ],
    responseExample: {
      task: {
        id: "t_xyz789",
        phaseId: "ph_abc123",
        title: "Research competitors",
        isCompleted: true,
      },
    },
  },

];

/* ─── Sections ─── */

export const stageApiSections: ApiSectionDoc[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    summary: "Set up your API key and make your first call.",
    paragraphs: [
      "The Stage API lets AI agents and external tools create and manage creative projects. It is a REST API authenticated with Bearer tokens.",
      `All endpoints are under ${API_REFERENCE_BASE_URL}. Authentication uses API keys created in Settings > Developer.`,
    ],
    bullets: [
      "Create an API key in Settings > Developer (Pro plan required).",
      "Set your key: Authorization: Bearer stg_...",
      "Create a project first with POST /api/v1/projects/import-plan.",
      "Save the workflow inputs with POST /api/v1/projects/:id/ai/context.",
      "Start research, strategy, or generate with POST /api/v1/projects/:id/ai/runs.",
      "Record Figma or Notion results with POST /api/v1/ai/artifacts/:id/exports.",
      "Current limits: 120 requests per minute per API key, 1000 requests per minute globally.",
    ],
  },
  {
    id: "authentication",
    title: "Authentication",
    summary: "How API key auth works.",
    paragraphs: [
      "Every request must include a Bearer token in the Authorization header. Keys are created in the Stage app at Settings > Developer.",
      "Keys start with stg_ and are shown once at creation. Stage hashes them with SHA-256 before storage — the plaintext is never stored.",
    ],
    bullets: [
      "Header format: Authorization: Bearer stg_...",
      "Keys are owner-scoped. They can access all projects owned by the user.",
      "Maximum 5 active keys per user.",
      "Revoke keys in Settings > Developer. Revoked keys return 401 immediately.",
      "Rate-limit responses return HTTP 429 with retry guidance.",
    ],
  },
  {
    id: "projects",
    title: "Projects",
    summary: "Create, list, and retrieve projects.",
    endpointIds: ["list-projects", "get-project", "create-project", "import-plan"],
  },
  {
    id: "phases",
    title: "Phases",
    summary: "List and create phases within a project.",
    endpointIds: ["list-phases", "create-phase"],
  },
  {
    id: "tasks",
    title: "Tasks",
    summary: "List, create, and manage tasks within phases.",
    endpointIds: ["list-tasks", "get-task", "create-task", "toggle-task"],
  },
  {
    id: "ai-workflows",
    title: "AI Workflows",
    summary: "Store AI context, create runs, write artifacts back, and record exports.",
    paragraphs: [
      "This is the current test API surface for research, strategy, generate, and delivery.",
      "Figma and Notion are recorded as export destinations in this flow. Native OAuth connections are not part of the current test setup.",
    ],
    endpointIds: [
      "get-ai-context",
      "upsert-ai-context",
      "list-ai-runs",
      "create-ai-run",
      "list-ai-artifacts",
      "create-ai-artifact",
      "create-ai-export",
    ],
  },
  {
    id: "action-policy",
    title: "Action Policy",
    summary: "How AI agents should classify and handle user requests.",
    paragraphs: [
      "External AI agents should classify the user request before calling Stage. This ensures safe, predictable behavior.",
    ],
    bullets: [
      "Read: Execute immediately. Example: \"What is the status of this project?\"",
      "Create: Execute only at high confidence. If the AI can resolve project name, client, type, and a reasonable phase/task structure, proceed. Otherwise ask a follow-up.",
      "Update: Execute only if the target and change are unambiguous. Example: \"Mark the moodboard as done.\"",
      "Destructive: Never execute without explicit user confirmation. Preview what will be affected, then require a confirm step.",
    ],
  },
  {
    id: "project-types",
    title: "Project Types",
    summary: "Valid project type values.",
    bullets: [
      "branding — Logo, brand identity, guidelines",
      "web-design — Websites, landing pages",
      "product-design — Digital product interfaces",
      "app-design — Mobile applications",
      "web-app — Web applications and SaaS products",
      "packaging — Physical product packaging",
      "motion-design — Animation, video",
      "illustration — Custom artwork",
      "other — Anything else",
    ],
  },
];
