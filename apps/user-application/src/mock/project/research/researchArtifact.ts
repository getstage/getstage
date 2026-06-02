import { researchArtifactSchema, type ResearchArtifact } from "@stage/data-ops/contracts";
import { uiPatternExampleImages } from "./assets";

const COMPETITOR_IDS = {
  zapier: "competitor-zapier",
  spotify: "competitor-spotify",
  stripe: "competitor-stripe",
  x: "competitor-x",
} as const;

const MATRIX_ROW_IDS = {
  navigation: "matrix-navigation",
  onboarding: "matrix-onboarding",
  visualStyle: "matrix-visual-style",
  contentHierarchy: "matrix-content-hierarchy",
  mobileExperience: "matrix-mobile-experience",
  dashboardLayout: "matrix-dashboard-layout",
  dataVisualization: "matrix-data-visualization",
} as const;

function buildResearchArtifact(projectId: string, generatedAt: number): ResearchArtifact {
  return {
    apiVersion: "v1",
    artifactKind: "researchArtifact",
    projectId,
    title: "Project Research",
    summary: [
      "Client operates in B2B fintech. 8 direct competitors identified.",
      "85% of competitors use bottom navigation on mobile. Card-based dashboards dominate.",
      "Biggest gap: onboarding. 0 of 6 competitors handle it well - most use static form flows.",
      "Market skews toward light, minimal interfaces. Dark mode is underserved.",
      "Differentiation opportunity in data visualization and empty states.",
    ],
    companySnapshot: [
      { label: "Company", value: "Acme Inc." },
      { label: "Industry", value: "Fintech / Payments" },
      { label: "Product", value: "B2B SaaS Dashboard" },
      { label: "Target User", value: "SMB finance teams" },
      { label: "Platform", value: "Web + iOS" },
      { label: "Stage", value: "Series A, 50K users" },
      { label: "Website", value: "acme.com" },
    ],
    competitiveAnalysis: {
      competitors: [
        {
          id: COMPETITOR_IDS.zapier,
          name: "Zapier",
          url: "zapier.com",
          mark: "zapier",
          color: "#FF4A00",
          positioning: "Easy automation for busy people",
          summary: "The dominant horizontal player",
          strengths: [
            "Sticky header with Primary CTA",
            "Dropdown menu with secondary options",
            "Search bar with filter capabilities",
          ],
          weaknesses: [
            "Sticky header with Primary CTA",
            "Contextual help tooltip for user guidance",
            "User avatar with dropdown profile settings",
          ],
          sourceReferenceIds: ["source-zapier"],
        },
        {
          id: COMPETITOR_IDS.spotify,
          name: "Spotify",
          url: "spotify.com",
          mark: "S",
          color: "#1ED760",
          positioning: "Easy automation for busy people",
          summary: "The dominant horizontal player",
          strengths: [
            "Sticky header with Primary CTA",
            "Dropdown menu with secondary options",
            "Search bar with filter capabilities",
          ],
          weaknesses: [
            "Sticky header with Primary CTA",
            "Contextual help tooltip for user guidance",
            "User avatar with dropdown profile settings",
          ],
          sourceReferenceIds: ["source-spotify"],
        },
        {
          id: COMPETITOR_IDS.stripe,
          name: "Stripe",
          url: "stripe.com",
          color: "#635BFF",
          positioning: "Easy automation for busy people",
          summary: "The dominant horizontal player",
          strengths: [
            "Sticky header with Primary CTA",
            "Dropdown menu with secondary options",
            "Search bar with filter capabilities",
          ],
          weaknesses: [
            "Sticky header with Primary CTA",
            "Contextual help tooltip for user guidance",
            "User avatar with dropdown profile settings",
          ],
          sourceReferenceIds: ["source-stripe"],
        },
        {
          id: COMPETITOR_IDS.x,
          name: "X",
          url: "x.com",
          mark: "X",
          color: "#050505",
          positioning: "Easy automation for busy people",
          summary: "The dominant horizontal player",
          strengths: [
            "Sticky header with Primary CTA",
            "Dropdown menu with secondary options",
            "Search bar with filter capabilities",
          ],
          weaknesses: [
            "Sticky header with Primary CTA",
            "Contextual help tooltip for user guidance",
            "User avatar with dropdown profile settings",
          ],
          sourceReferenceIds: ["source-x"],
        },
      ],
      matrixRows: [
        {
          id: MATRIX_ROW_IDS.navigation,
          label: "Navigation",
          cells: [
            { competitorId: COMPETITOR_IDS.zapier, score: "Strong" },
            { competitorId: COMPETITOR_IDS.spotify, score: "Strong" },
            { competitorId: COMPETITOR_IDS.stripe, score: "Strong" },
            { competitorId: COMPETITOR_IDS.x, score: "Strong" },
          ],
        },
        {
          id: MATRIX_ROW_IDS.onboarding,
          label: "Onboarding",
          cells: [
            { competitorId: COMPETITOR_IDS.zapier, score: "OK" },
            { competitorId: COMPETITOR_IDS.spotify, score: "Strong" },
            { competitorId: COMPETITOR_IDS.stripe, score: "Strong" },
            { competitorId: COMPETITOR_IDS.x, score: "Strong" },
          ],
        },
        {
          id: MATRIX_ROW_IDS.visualStyle,
          label: "Visual Style",
          cells: [
            { competitorId: COMPETITOR_IDS.zapier, score: "Weak" },
            { competitorId: COMPETITOR_IDS.spotify, score: "OK" },
            { competitorId: COMPETITOR_IDS.stripe, score: "Strong" },
            { competitorId: COMPETITOR_IDS.x, score: "Weak" },
          ],
        },
        {
          id: MATRIX_ROW_IDS.contentHierarchy,
          label: "Content Hierarchy",
          cells: [
            { competitorId: COMPETITOR_IDS.zapier, score: "Strong" },
            { competitorId: COMPETITOR_IDS.spotify, score: "Weak" },
            { competitorId: COMPETITOR_IDS.stripe, score: "Strong" },
            { competitorId: COMPETITOR_IDS.x, score: "Strong" },
          ],
        },
        {
          id: MATRIX_ROW_IDS.mobileExperience,
          label: "Mobile Experience",
          cells: [
            { competitorId: COMPETITOR_IDS.zapier, score: "Strong" },
            { competitorId: COMPETITOR_IDS.spotify, score: "Strong" },
            { competitorId: COMPETITOR_IDS.stripe, score: "Weak" },
            { competitorId: COMPETITOR_IDS.x, score: "Strong" },
          ],
        },
        {
          id: MATRIX_ROW_IDS.dashboardLayout,
          label: "Dashboard Layout",
          cells: [
            { competitorId: COMPETITOR_IDS.zapier, score: "Strong" },
            { competitorId: COMPETITOR_IDS.spotify, score: "OK" },
            { competitorId: COMPETITOR_IDS.stripe, score: "OK" },
            { competitorId: COMPETITOR_IDS.x, score: "OK" },
          ],
        },
        {
          id: MATRIX_ROW_IDS.dataVisualization,
          label: "Data Visualization",
          cells: [
            { competitorId: COMPETITOR_IDS.zapier, score: "Strong" },
            { competitorId: COMPETITOR_IDS.spotify, score: "Weak" },
            { competitorId: COMPETITOR_IDS.stripe, score: "OK" },
            { competitorId: COMPETITOR_IDS.x, score: "OK" },
          ],
        },
      ],
    },
    uiPatterns: [
      {
        id: "ui-patterns-onboarding",
        title: "Onboarding",
        summary: "Strong onboarding flows explain the next step and reduce setup friction.",
        patternCountLabel: "3 patterns",
        recognizedPatterns: [
          "Outcome-led headlines, not features list",
          "Inline guidance beats help centers",
          "Empty states teach the workflow",
        ],
        examples: [
          {
            id: "ui-example-onboarding-1",
            title: "Guided setup checklist",
            imageUrl: uiPatternExampleImages[0],
            sourceProduct: "Linear",
          },
          {
            id: "ui-example-onboarding-2",
            title: "Contextual onboarding prompt",
            imageUrl: uiPatternExampleImages[1],
            sourceProduct: "Notion",
          },
          {
            id: "ui-example-onboarding-3",
            title: "Educational empty state",
            imageUrl: uiPatternExampleImages[2],
            sourceProduct: "Stripe",
          },
        ],
      },
      {
        id: "ui-patterns-dashboard",
        title: "Dashboard",
        summary: "Dashboards prioritize scanability with cards, clear hierarchy, and one primary action.",
        patternCountLabel: "3 patterns",
        recognizedPatterns: [
          "Persistent primary action",
          "Card-first dashboards",
          "Progressive disclosure",
        ],
        examples: [
          {
            id: "ui-example-dashboard-1",
            title: "Card summary grid",
            imageUrl: uiPatternExampleImages[1],
            sourceProduct: "Ramp",
          },
          {
            id: "ui-example-dashboard-2",
            title: "Primary action header",
            imageUrl: uiPatternExampleImages[0],
            sourceProduct: "Mercury",
          },
          {
            id: "ui-example-dashboard-3",
            title: "Advanced filters drawer",
            imageUrl: uiPatternExampleImages[2],
            sourceProduct: "Brex",
          },
        ],
      },
      {
        id: "ui-patterns-pricing",
        title: "Pricing",
        summary: "Pricing and decision screens pair plain language with trust cues near high-intent actions.",
        patternCountLabel: "2 patterns",
        recognizedPatterns: ["Status language is plain", "Trust cues near decisions"],
        examples: [
          {
            id: "ui-example-pricing-1",
            title: "Plan comparison cards",
            imageUrl: uiPatternExampleImages[0],
            sourceProduct: "Stripe",
          },
          {
            id: "ui-example-pricing-2",
            title: "Security reassurance block",
            imageUrl: uiPatternExampleImages[2],
            sourceProduct: "Plaid",
          },
          {
            id: "ui-example-pricing-3",
            title: "Human-readable billing status",
            imageUrl: uiPatternExampleImages[1],
            sourceProduct: "Ramp",
          },
        ],
      },
    ],
    targetUsers: [
      {
        id: "target-user-sarah",
        name: "Sarah, 32",
        role: "Finance Manager",
        goals: ["Track team expenses without switching between 4 tools"],
        frustrations: ["Current tool requires training for every new hire"],
        assumptions: [],
        context: "Desktop-first, uses 3x per day, always multitasking",
      },
      {
        id: "target-user-marcus",
        name: "Marcus, 41",
        role: "Operations Lead",
        goals: ["Approve spend, reconcile exceptions, and keep audit trails clean"],
        frustrations: ["Approvals get buried across email, chat, and disconnected dashboards"],
        assumptions: [],
        context: "Works across finance and leadership, needs fast confidence checks",
      },
    ],
    opportunities: [
      {
        id: "opportunity-onboarding",
        title: "Conversational onboarding",
        description:
          "Onboarding is broken across the space. 0 of 6 competitors handle it well. Most use static form-based flows. Opportunity for conversational onboarding.",
        sourceSection: "competitiveAnalysis",
      },
      {
        id: "opportunity-mobile",
        title: "First-class mobile",
        description:
          "Mobile is an afterthought. 4 of 6 competitors have poor mobile UX. First-class mobile would differentiate.",
        sourceSection: "uiPatterns",
      },
      {
        id: "opportunity-empty-states",
        title: "Educational empty states",
        description:
          "No one leverages empty states. Every competitor shows blank pages. Educational empty states would improve activation.",
        sourceSection: "uiPatterns",
      },
      {
        id: "opportunity-dark-mode",
        title: "Dark mode gap",
        description:
          "Dark mode is underserved. Only 1 of 6 offers it. Growing demand in developer/finance audiences.",
        sourceSection: "competitiveAnalysis",
      },
    ],
    customSections: [],
    openQuestions: [
      "Which competitor onboarding flows should we benchmark in detail?",
      "Does the client need mobile parity at launch or in a later phase?",
    ],
    sourceReferences: [
      {
        id: "source-zapier",
        provider: "website",
        label: "Zapier",
        url: "https://zapier.com",
      },
      {
        id: "source-spotify",
        provider: "website",
        label: "Spotify",
        url: "https://spotify.com",
      },
      {
        id: "source-stripe",
        provider: "website",
        label: "Stripe",
        url: "https://stripe.com",
      },
      {
        id: "source-x",
        provider: "website",
        label: "X",
        url: "https://x.com",
      },
      {
        id: "source-refero",
        provider: "refero",
        label: "Refero UI pattern library",
      },
    ],
    generatedAt,
  };
}

export const MOCK_RESEARCH_PROJECT_ID = "mock-stellar-site";

const generatedAt = Date.parse("2025-04-06T12:00:00.000Z");

export const mockResearchArtifact = researchArtifactSchema.parse(
  buildResearchArtifact(MOCK_RESEARCH_PROJECT_ID, generatedAt),
);

export function createMockResearchArtifact(projectId: string): ResearchArtifact {
  return researchArtifactSchema.parse(buildResearchArtifact(projectId, generatedAt));
}
