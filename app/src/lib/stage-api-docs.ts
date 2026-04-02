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

export const API_REFERENCE_BASE_URL = "https://getstage.co/api/v1";

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
          'One of: "branding", "web-design", "product-design", "app-design", "packaging", "motion-design", "illustration", "other".',
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
          'One of: "branding", "web-design", "product-design", "app-design", "packaging", "motion-design", "illustration", "other".',
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
    id: "list-design-connections",
    title: "List design connections",
    method: "GET",
    path: "/api/v1/projects/:id/design-connections",
    pathExample: "/api/v1/projects/k17abc123/design-connections",
    summary: "List external design workspaces linked to a project.",
    description:
      "Returns the connected Stitch workspace for the project. In v1 Stage usually stores one Stitch project link per project.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    responseExample: {
      connections: [
        {
          id: "dc_123",
          projectId: "k17abc123",
          provider: "stitch",
          externalProjectId: "6902984668756034217",
          externalProjectUrl: "https://stitch.withgoogle.com/projects/6902984668756034217",
          title: "Brew & Co Stitch workspace",
          status: "active",
          lastSyncedAt: 1717200000000,
          createdAt: 1717200000000,
          updatedAt: 1717200000000,
        },
      ],
    },
  },
  {
    id: "upsert-design-connection",
    title: "Link Stitch project",
    method: "POST",
    path: "/api/v1/projects/:id/design-connections",
    pathExample: "/api/v1/projects/k17abc123/design-connections",
    summary: "Link or update the Stitch workspace connected to a project.",
    description:
      "Stores the project-level Stitch URL so Stage can show a deep link back to the full design workspace.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    bodyFields: [
      { name: "provider", type: "string", required: false, description: 'Currently always "stitch".', defaultValue: "stitch" },
      { name: "externalProjectUrl", type: "string", required: true, description: "Full Stitch project URL." },
      { name: "externalProjectId", type: "string", required: false, description: "Optional Stitch project ID." },
      { name: "title", type: "string", required: false, description: "Optional label shown inside Stage." },
    ],
    bodyExample: {
      provider: "stitch",
      externalProjectUrl: "https://stitch.withgoogle.com/projects/6902984668756034217",
      externalProjectId: "6902984668756034217",
      title: "Brew & Co Stitch workspace",
    },
    responseExample: {
      connection: {
        id: "dc_123",
        projectId: "k17abc123",
        provider: "stitch",
        externalProjectId: "6902984668756034217",
        externalProjectUrl: "https://stitch.withgoogle.com/projects/6902984668756034217",
        title: "Brew & Co Stitch workspace",
        status: "active",
        createdAt: 1717200000000,
        updatedAt: 1717200000000,
      },
    },
    notes: ["Returns 201 on success."],
  },
  {
    id: "create-design-upload-url",
    title: "Create design upload URL",
    method: "POST",
    path: "/api/v1/projects/:id/designs/upload-url",
    pathExample: "/api/v1/projects/k17abc123/designs/upload-url",
    summary: "Create a signed upload URL for a generated Stitch preview image.",
    description:
      "Agents upload selected Stitch preview images to Stage storage before syncing the latest preview set into the project.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    bodyFields: [
      { name: "fileName", type: "string", required: true, description: "Original file name." },
      { name: "fileSize", type: "number", required: true, description: "File size in bytes." },
      { name: "mimeType", type: "string", required: true, description: 'Image MIME type. Use "image/png", "image/jpeg", or "image/webp".' },
    ],
    bodyExample: {
      fileName: "brew-dashboard.png",
      fileSize: 482193,
      mimeType: "image/png",
    },
    responseExample: {
      uploadUrl: "https://r2.getstage.co/upload/...",
      r2ObjectKey: "users/u_123/generated-designs/4ca1b0f9-9f11-4f5f-a4ce-abc123.png",
    },
    notes: ["Returns 201 on success.", "Upload the binary file to the returned URL, then call the sync endpoint."],
  },
  {
    id: "sync-designs",
    title: "Sync latest Stitch previews",
    method: "POST",
    path: "/api/v1/projects/:id/designs/sync",
    pathExample: "/api/v1/projects/k17abc123/designs/sync",
    summary: "Replace the project’s current synced Stitch previews with the latest selected screens.",
    description:
      "Use this after uploading preview images to Stage. The sync request updates the linked Stitch project and replaces the project’s current user-synced preview set so Stage reflects the latest workspace state.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    bodyFields: [
      { name: "externalProjectUrl", type: "string", required: true, description: "Full Stitch project URL." },
      { name: "externalProjectId", type: "string", required: false, description: "Optional Stitch project ID." },
      { name: "title", type: "string", required: false, description: "Optional label shown for the linked Stitch workspace." },
      { name: "screens", type: "array", required: true, description: "The latest preview screens to keep in Stage. Omitted previously-synced screens are removed." },
    ],
    bodyExample: {
      externalProjectUrl: "https://stitch.withgoogle.com/projects/6902984668756034217",
      externalProjectId: "6902984668756034217",
      title: "Brew & Co dashboard concepts",
      screens: [
        {
          stitchScreenId: "screen-overview",
          stitchScreenUrl: "https://stitch.withgoogle.com/projects/6902984668756034217/screens/screen-overview",
          r2ObjectKey: "users/u_123/generated-designs/overview.png",
          title: "Overview dashboard",
          prompt: "Dashboard overview with KPI cards and production logs",
          deviceType: "DESKTOP",
          sortOrder: 0,
        },
        {
          stitchScreenId: "screen-alerts",
          r2ObjectKey: "users/u_123/generated-designs/alerts.png",
          title: "Alerts center",
          deviceType: "DESKTOP",
          sortOrder: 1,
        },
      ],
    },
    responseExample: {
      connection: {
        id: "dc_123",
        provider: "stitch",
        externalProjectId: "6902984668756034217",
        externalProjectUrl: "https://stitch.withgoogle.com/projects/6902984668756034217",
        title: "Brew & Co dashboard concepts",
        status: "active",
        lastSyncedAt: 1717200000000,
      },
      designs: [
        {
          id: "d_sync_1",
          projectId: "k17abc123",
          source: "user_sync",
          title: "Overview dashboard",
          stitchScreenId: "screen-overview",
          imageUrl: "https://r2.getstage.co/generated/overview.png",
          sortOrder: 0,
          lastSyncedAt: 1717200000000,
          createdAt: 1717200000000,
          updatedAt: 1717200000000,
        },
      ],
    },
    notes: [
      "Returns 201 on success.",
      "This is the preferred Stitch flow for agents because it keeps Stage in sync with a user-owned Stitch workspace.",
    ],
  },
  {
    id: "list-designs",
    title: "List synced designs",
    method: "GET",
    path: "/api/v1/projects/:id/designs",
    pathExample: "/api/v1/projects/k17abc123/designs",
    summary: "List the current generated and synced design previews for a project.",
    description:
      "Returns the stored preview screens linked to the project. Use the design connection endpoint for the full Stitch workspace URL.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    responseExample: {
      designs: [
        {
          id: "d_sync_1",
          projectId: "k17abc123",
          source: "user_sync",
          title: "Overview dashboard",
          stitchProjectId: "6902984668756034217",
          stitchScreenId: "screen-overview",
          stitchScreenUrl: "https://stitch.withgoogle.com/projects/6902984668756034217/screens/screen-overview",
          imageUrl: "https://r2.getstage.co/generated/overview.png",
          sortOrder: 0,
          lastSyncedAt: 1717200000000,
          createdAt: 1717200000000,
          updatedAt: 1717200000000,
        },
      ],
    },
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

  // ── Design Generation (Stitch) ──
  {
    id: "generate-design",
    title: "Generate design",
    method: "POST",
    path: "/api/v1/projects/:id/generate-design",
    pathExample: "/api/v1/projects/k17abc123/generate-design",
    summary: "Generate a UI design from a text prompt using Google Stitch.",
    description:
      "Calls Google Stitch to generate a screen design and attaches it to the project. The generated image is stored and linked to the project.",
    pathFields: [
      { name: "id", type: "string", required: true, description: "The project ID." },
    ],
    bodyFields: [
      { name: "prompt", type: "string", required: true, description: "Text description of the design to generate." },
      { name: "phaseId", type: "string", required: false, description: "Optional phase to associate the design with." },
      {
        name: "deviceType",
        type: "string",
        required: false,
        description: '"DESKTOP" (default), "MOBILE", "TABLET", or "AGNOSTIC".',
        defaultValue: "DESKTOP",
      },
      {
        name: "modelId",
        type: "string",
        required: false,
        description: 'Optional Stitch model. "GEMINI_3_PRO" or "GEMINI_3_FLASH".',
      },
    ],
    bodyExample: {
      prompt: "Premium editorial homepage for a specialty coffee brand with dark theme, hero image, and product grid",
      deviceType: "DESKTOP",
    },
    responseExample: {
      design: {
        id: "d_gen123",
        projectId: "k17abc123",
        prompt: "Premium editorial homepage for a specialty coffee brand...",
        imageUrl: "https://r2.getstage.co/generated/d_gen123.png",
        deviceType: "DESKTOP",
        createdAt: 1717200000000,
      },
    },
    notes: [
      "Returns 201 on success.",
      "This route is still supported, but the preferred v1 flow is to link a user-owned Stitch project and sync preview screens with /designs/sync.",
      "Design generation may take 10-30 seconds depending on complexity.",
      "Requires Stitch to be configured on the Stage backend.",
    ],
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
      "All endpoints are under https://getstage.co/api/v1. Authentication uses API keys created in Settings > Developer.",
    ],
    bullets: [
      "Create an API key in Settings > Developer (Pro plan required).",
      "Set your key: Authorization: Bearer stg_...",
      "Make your first call: GET /api/v1/projects",
      "Or use POST /api/v1/projects/import-plan to create a full project from a structured plan.",
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
    id: "design-generation",
    title: "Design Generation",
    summary: "Link a Stitch project and keep the latest preview screens synced into Stage.",
    paragraphs: [
      "The preferred Stitch flow is user-owned: the agent or user works in Stitch, uploads a few selected previews to Stage, then syncs them into the project. Stage stores the latest preview set plus the Stitch project link.",
      "The older server-side generate-design route still exists, but it is secondary to the linked-workspace sync flow.",
    ],
    endpointIds: [
      "list-design-connections",
      "upsert-design-connection",
      "create-design-upload-url",
      "sync-designs",
      "list-designs",
      "generate-design",
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
      "packaging — Physical product packaging",
      "motion-design — Animation, video",
      "illustration — Custom artwork",
      "other — Anything else",
    ],
  },
];
