/**
 * Mock Data — matches the HTML prototypes
 *
 * Deprecated prototype-only fixture set.
 * Runtime code no longer reads this data; it remains as historical reference.
 */

import type {
  Client,
  ConnectedAccount,
  Invoice,
  Project,
  RevenueSummary,
  Subscription,
} from "@/types";

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// --- Projects ---

export const mockProjects: Project[] = [
  {
    id: "proj_001",
    userId: "user_001",
    name: "Website Redesign",
    clientName: "Acme Studio",
    clientAvatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    type: "web-design",
    status: "active",
    startDate: now - 35 * DAY,
    endDate: now + 21 * DAY,
    progress: 59,
    createdAt: now - 36 * DAY,
    shareToken: "share_acme_2026",
    phases: [
      {
        id: "phase_001",
        projectId: "proj_001",
        name: "Strategy",
        order: 0,
        status: "completed",
        progress: 100,
        tasks: [
          { id: "task_001", phaseId: "phase_001", title: "Define project goals", isCompleted: true, content: "<p>Core objective: redesign the Acme Studio website to improve conversion rates and reflect the brand's evolution toward a more premium market position.</p>", attachments: [], order: 0, createdAt: now - 34 * DAY, updatedAt: now - 30 * DAY },
          { id: "task_002", phaseId: "phase_001", title: "Stakeholder interviews", isCompleted: true, attachments: [], order: 1, createdAt: now - 34 * DAY, updatedAt: now - 28 * DAY },
          { id: "task_003", phaseId: "phase_001", title: "Success metrics document", isCompleted: true, attachments: [{ id: "att_001", type: "pdf", url: "#", fileName: "Acme-Success-Metrics-v2.pdf", fileSize: 860160, mimeType: "application/pdf" }], order: 2, createdAt: now - 33 * DAY, updatedAt: now - 26 * DAY },
        ],
      },
      {
        id: "phase_002",
        projectId: "proj_001",
        name: "Research",
        order: 1,
        status: "completed",
        progress: 100,
        tasks: [
          { id: "task_004", phaseId: "phase_002", title: "Competitive audit", isCompleted: true, attachments: [], order: 0, createdAt: now - 28 * DAY, updatedAt: now - 22 * DAY },
          { id: "task_005", phaseId: "phase_002", title: "User survey analysis", isCompleted: true, attachments: [], order: 1, createdAt: now - 27 * DAY, updatedAt: now - 21 * DAY },
          { id: "task_006", phaseId: "phase_002", title: "Analytics deep-dive", isCompleted: true, attachments: [], order: 2, createdAt: now - 26 * DAY, updatedAt: now - 20 * DAY },
          { id: "task_007", phaseId: "phase_002", title: "Research synthesis deck", isCompleted: true, attachments: [{ id: "att_002", type: "pdf", url: "#", fileName: "Acme-Research-Synthesis.pdf", fileSize: 4300000, mimeType: "application/pdf" }], order: 3, createdAt: now - 25 * DAY, updatedAt: now - 18 * DAY },
        ],
      },
      {
        id: "phase_003",
        projectId: "proj_001",
        name: "Design",
        order: 2,
        status: "active",
        progress: 67,
        tasks: [
          { id: "task_008", phaseId: "phase_003", title: "Moodboard approved", isCompleted: true, attachments: [], order: 0, createdAt: now - 18 * DAY, updatedAt: now - 14 * DAY },
          { id: "task_009", phaseId: "phase_003", title: "Wireframes v2 delivered", isCompleted: true, attachments: [], order: 1, createdAt: now - 16 * DAY, updatedAt: now - 10 * DAY },
          { id: "task_010", phaseId: "phase_003", title: "Style guide draft", isCompleted: true, attachments: [{ id: "att_003", type: "document", url: "#", fileName: "Acme-Style-Guide-Draft.fig", fileSize: 0, mimeType: "application/figma" }], order: 2, createdAt: now - 14 * DAY, updatedAt: now - 8 * DAY },
          { id: "task_011", phaseId: "phase_003", title: "Homepage high-fidelity", isCompleted: true, attachments: [], order: 3, createdAt: now - 12 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_012", phaseId: "phase_003", title: "Inner pages design", isCompleted: false, attachments: [], order: 4, createdAt: now - 10 * DAY, updatedAt: now - 2 * DAY },
          { id: "task_013", phaseId: "phase_003", title: "Responsive adaptations", isCompleted: false, attachments: [], order: 5, createdAt: now - 8 * DAY, updatedAt: now - 1 * DAY },
        ],
      },
      {
        id: "phase_004",
        projectId: "proj_001",
        name: "Development",
        order: 3,
        status: "upcoming",
        progress: 0,
        tasks: [
          { id: "task_014", phaseId: "phase_004", title: "Frontend build", isCompleted: false, attachments: [], order: 0, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_015", phaseId: "phase_004", title: "CMS integration", isCompleted: false, attachments: [], order: 1, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_016", phaseId: "phase_004", title: "QA & browser testing", isCompleted: false, attachments: [], order: 2, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
        ],
      },
      {
        id: "phase_005",
        projectId: "proj_001",
        name: "Launch",
        order: 4,
        status: "upcoming",
        progress: 0,
        tasks: [
          { id: "task_017", phaseId: "phase_005", title: "Final client review", isCompleted: false, attachments: [], order: 0, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_018", phaseId: "phase_005", title: "Go live", isCompleted: false, attachments: [], order: 1, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
        ],
      },
    ],
  },
  {
    id: "proj_002",
    userId: "user_001",
    name: "Brand Identity",
    clientName: "Meridian Labs",
    clientAvatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    type: "branding",
    status: "active",
    startDate: now - 20 * DAY,
    endDate: now + 40 * DAY,
    progress: 30,
    createdAt: now - 21 * DAY,
    phases: [
      {
        id: "phase_010", projectId: "proj_002", name: "Discovery", order: 0, status: "completed", progress: 100,
        tasks: [
          { id: "task_020", phaseId: "phase_010", title: "Brand audit", isCompleted: true, attachments: [], order: 0, createdAt: now - 19 * DAY, updatedAt: now - 15 * DAY },
          { id: "task_021", phaseId: "phase_010", title: "Competitor analysis", isCompleted: true, attachments: [], order: 1, createdAt: now - 18 * DAY, updatedAt: now - 14 * DAY },
        ],
      },
      {
        id: "phase_011", projectId: "proj_002", name: "Strategy", order: 1, status: "active", progress: 50,
        tasks: [
          { id: "task_022", phaseId: "phase_011", title: "Brand positioning", isCompleted: true, attachments: [], order: 0, createdAt: now - 14 * DAY, updatedAt: now - 10 * DAY },
          { id: "task_023", phaseId: "phase_011", title: "Tone of voice guide", isCompleted: false, attachments: [], order: 1, createdAt: now - 12 * DAY, updatedAt: now - 5 * DAY },
        ],
      },
      {
        id: "phase_012", projectId: "proj_002", name: "Visual Identity", order: 2, status: "upcoming", progress: 0,
        tasks: [
          { id: "task_024", phaseId: "phase_012", title: "Logo concepts", isCompleted: false, attachments: [], order: 0, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_025", phaseId: "phase_012", title: "Color palette", isCompleted: false, attachments: [], order: 1, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_026", phaseId: "phase_012", title: "Typography selection", isCompleted: false, attachments: [], order: 2, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
        ],
      },
      {
        id: "phase_013", projectId: "proj_002", name: "Deliverables", order: 3, status: "upcoming", progress: 0,
        tasks: [
          { id: "task_027", phaseId: "phase_013", title: "Brand guidelines PDF", isCompleted: false, attachments: [], order: 0, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_028", phaseId: "phase_013", title: "Asset pack handoff", isCompleted: false, attachments: [], order: 1, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
        ],
      },
    ],
  },
  {
    id: "proj_003",
    userId: "user_001",
    name: "Mobile App UI",
    clientName: "Flowstate",
    clientAvatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
    type: "app-design",
    status: "active",
    startDate: now - 10 * DAY,
    endDate: now + 50 * DAY,
    progress: 12,
    createdAt: now - 11 * DAY,
    phases: [
      {
        id: "phase_020", projectId: "proj_003", name: "Research", order: 0, status: "active", progress: 50,
        tasks: [
          { id: "task_030", phaseId: "phase_020", title: "User flow mapping", isCompleted: true, attachments: [], order: 0, createdAt: now - 9 * DAY, updatedAt: now - 6 * DAY },
          { id: "task_031", phaseId: "phase_020", title: "Competitive app audit", isCompleted: false, attachments: [], order: 1, createdAt: now - 8 * DAY, updatedAt: now - 3 * DAY },
        ],
      },
      {
        id: "phase_021", projectId: "proj_003", name: "Wireframes", order: 1, status: "upcoming", progress: 0,
        tasks: [
          { id: "task_032", phaseId: "phase_021", title: "Core screens wireframe", isCompleted: false, attachments: [], order: 0, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_033", phaseId: "phase_021", title: "Navigation prototype", isCompleted: false, attachments: [], order: 1, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
        ],
      },
      {
        id: "phase_022", projectId: "proj_003", name: "UI Design", order: 2, status: "upcoming", progress: 0,
        tasks: [
          { id: "task_034", phaseId: "phase_022", title: "Design system", isCompleted: false, attachments: [], order: 0, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_035", phaseId: "phase_022", title: "High-fidelity screens", isCompleted: false, attachments: [], order: 1, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
          { id: "task_036", phaseId: "phase_022", title: "Interaction specs", isCompleted: false, attachments: [], order: 2, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
        ],
      },
      {
        id: "phase_023", projectId: "proj_003", name: "Handoff", order: 3, status: "upcoming", progress: 0,
        tasks: [
          { id: "task_037", phaseId: "phase_023", title: "Developer handoff", isCompleted: false, attachments: [], order: 0, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY },
        ],
      },
    ],
  },
  {
    id: "proj_004",
    userId: "user_001",
    name: "Packaging Design",
    clientName: "Noma Skincare",
    clientAvatarUrl: "https://randomuser.me/api/portraits/women/22.jpg",
    type: "packaging",
    status: "completed",
    startDate: now - 80 * DAY,
    endDate: now - 10 * DAY,
    progress: 100,
    createdAt: now - 81 * DAY,
    phases: [
      {
        id: "phase_030", projectId: "proj_004", name: "Research", order: 0, status: "completed", progress: 100,
        tasks: [
          { id: "task_040", phaseId: "phase_030", title: "Material research", isCompleted: true, attachments: [], order: 0, createdAt: now - 78 * DAY, updatedAt: now - 70 * DAY },
          { id: "task_041", phaseId: "phase_030", title: "Shelf analysis", isCompleted: true, attachments: [], order: 1, createdAt: now - 77 * DAY, updatedAt: now - 68 * DAY },
        ],
      },
      {
        id: "phase_031", projectId: "proj_004", name: "Concepts", order: 1, status: "completed", progress: 100,
        tasks: [
          { id: "task_042", phaseId: "phase_031", title: "3 design directions", isCompleted: true, attachments: [], order: 0, createdAt: now - 65 * DAY, updatedAt: now - 50 * DAY },
          { id: "task_043", phaseId: "phase_031", title: "Client review & selection", isCompleted: true, attachments: [], order: 1, createdAt: now - 50 * DAY, updatedAt: now - 42 * DAY },
        ],
      },
      {
        id: "phase_032", projectId: "proj_004", name: "Production", order: 2, status: "completed", progress: 100,
        tasks: [
          { id: "task_044", phaseId: "phase_032", title: "Print-ready files", isCompleted: true, attachments: [], order: 0, createdAt: now - 40 * DAY, updatedAt: now - 20 * DAY },
          { id: "task_045", phaseId: "phase_032", title: "Printer coordination", isCompleted: true, attachments: [], order: 1, createdAt: now - 25 * DAY, updatedAt: now - 12 * DAY },
        ],
      },
    ],
  },
  {
    id: "proj_005",
    userId: "user_001",
    name: "Motion Reel",
    clientName: "Volta Creative",
    clientAvatarUrl: "https://randomuser.me/api/portraits/men/75.jpg",
    type: "motion-design",
    status: "active",
    startDate: now - 5 * DAY,
    endDate: now + 55 * DAY,
    progress: 5,
    createdAt: now - 6 * DAY,
    phases: [
      {
        id: "phase_040", projectId: "proj_005", name: "Concept", order: 0, status: "active", progress: 33,
        tasks: [
          { id: "task_050", phaseId: "phase_040", title: "Storyboard draft", isCompleted: true, attachments: [], order: 0, createdAt: now - 4 * DAY, updatedAt: now - 2 * DAY },
          { id: "task_051", phaseId: "phase_040", title: "Style frames", isCompleted: false, attachments: [], order: 1, createdAt: now - 3 * DAY, updatedAt: now - 1 * DAY },
          { id: "task_052", phaseId: "phase_040", title: "Audio direction", isCompleted: false, attachments: [], order: 2, createdAt: now - 2 * DAY, updatedAt: now - 1 * DAY },
        ],
      },
      {
        id: "phase_041", projectId: "proj_005", name: "Production", order: 1, status: "upcoming", progress: 0,
        tasks: [
          { id: "task_053", phaseId: "phase_041", title: "Animation pass 1", isCompleted: false, attachments: [], order: 0, createdAt: now - 1 * DAY, updatedAt: now - 1 * DAY },
          { id: "task_054", phaseId: "phase_041", title: "Sound design", isCompleted: false, attachments: [], order: 1, createdAt: now - 1 * DAY, updatedAt: now - 1 * DAY },
        ],
      },
      {
        id: "phase_042", projectId: "proj_005", name: "Delivery", order: 2, status: "upcoming", progress: 0,
        tasks: [
          { id: "task_055", phaseId: "phase_042", title: "Final render", isCompleted: false, attachments: [], order: 0, createdAt: now - 1 * DAY, updatedAt: now - 1 * DAY },
          { id: "task_056", phaseId: "phase_042", title: "Format exports", isCompleted: false, attachments: [], order: 1, createdAt: now - 1 * DAY, updatedAt: now - 1 * DAY },
        ],
      },
    ],
  },
];

// --- Clients (derived from projects) ---

export const mockClients: Client[] = [
  { id: "client_001", userId: "user_001", name: "Acme Studio", avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg", projectCount: 1 },
  { id: "client_002", userId: "user_001", name: "Meridian Labs", avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg", projectCount: 1 },
  { id: "client_003", userId: "user_001", name: "Flowstate", avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg", projectCount: 1 },
  { id: "client_004", userId: "user_001", name: "Noma Skincare", avatarUrl: "https://randomuser.me/api/portraits/women/22.jpg", projectCount: 1 },
  { id: "client_005", userId: "user_001", name: "Volta Creative", avatarUrl: "https://randomuser.me/api/portraits/men/75.jpg", projectCount: 1 },
];

export const mockSubscription: Subscription = {
  plan: "pro",
  provider: "unknown",
  status: "active",
  billingCycle: "yearly",
  currentPeriodEnd: now + 300 * DAY,
  paymentMethod: { brand: "Visa", last4: "4242" },
};

export const mockConnectedAccount: ConnectedAccount = {
  id: "conn_001",
  userId: "user_001",
  provider: "stripe",
  status: "connected",
  externalAccountId: "acct_stage_connected_demo",
  connectedAt: now - 45 * DAY,
  lastSyncedAt: now - 2 * 60 * 60 * 1000,
};

export const mockRevenueSummary: RevenueSummary = {
  userId: "user_001",
  provider: "stripe",
  currency: "USD",
  grossVolume: 18750,
  paidInvoicesCount: 12,
  openInvoicesCount: 2,
  overdueInvoicesCount: 1,
  lastUpdatedAt: now - 2 * 60 * 60 * 1000,
};

export const mockInvoices: Invoice[] = [
  {
    id: "inv_001",
    userId: "user_001",
    provider: "stripe",
    status: "paid",
    number: "INV-2026-014",
    clientName: "Acme Studio",
    currency: "USD",
    totalAmount: 4800,
    amountDue: 0,
    issuedAt: now - 14 * DAY,
    dueAt: now - 7 * DAY,
    paidAt: now - 6 * DAY,
    externalInvoiceId: "in_demo_001",
  },
  {
    id: "inv_002",
    userId: "user_001",
    provider: "stripe",
    status: "open",
    number: "INV-2026-015",
    clientName: "Meridian Labs",
    currency: "USD",
    totalAmount: 3250,
    amountDue: 3250,
    issuedAt: now - 10 * DAY,
    dueAt: now + 4 * DAY,
    externalInvoiceId: "in_demo_002",
  },
  {
    id: "inv_003",
    userId: "user_001",
    provider: "stripe",
    status: "overdue",
    number: "INV-2026-016",
    clientName: "Flowstate",
    currency: "USD",
    totalAmount: 2100,
    amountDue: 2100,
    issuedAt: now - 20 * DAY,
    dueAt: now - 5 * DAY,
    externalInvoiceId: "in_demo_003",
  },
];
