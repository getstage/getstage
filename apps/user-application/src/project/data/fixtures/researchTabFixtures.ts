export const mobbinMark = "https://www.figma.com/api/mcp/asset/800c9df1-6961-4e6b-829e-b5ba505589c7";

export const uiPatternImages = [
  "https://www.figma.com/api/mcp/asset/04dc8f56-ef85-44f8-a67f-6553931f16d5",
  "https://www.figma.com/api/mcp/asset/0291ffca-503d-4d55-b959-d0057e0af071",
  "https://www.figma.com/api/mcp/asset/0388d063-7f52-4832-aee8-9be741946c54",
];

export const researchSummary = [
  "Client operates in B2B fintech. 8 direct competitors identified.",
  "85% of competitors use bottom navigation on mobile. Card-based dashboards dominate.",
  "Biggest gap: onboarding. 0 of 6 competitors handle it well - most use static form flows.",
  "Market skews toward light, minimal interfaces. Dark mode is underserved.",
  "Differentiation opportunity in data visualization and empty states.",
];

export const companySnapshot = [
  ["Company", "Acme Inc."],
  ["Industry", "Fintech / Payments"],
  ["Product", "B2B SaaS Dashboard"],
  ["Target User", "SMB finance teams"],
  ["Platform", "Web + iOS"],
  ["Stage", "Series A, 50K users"],
  ["Website", "acme.com"],
];

export const competitors = [
  {
    name: "Zapier",
    url: "zapier.com",
    mark: "zapier",
    color: "#FF4A00",
    tagline: "Easy automation for busy people",
    note: "The dominant horizontal player",
    strengths: ["Sticky header with Primary CTA", "Dropdown menu with secondary options", "Search bar with filter capabilities"],
    weaknesses: ["Sticky header with Primary CTA", "Contextual help tooltip for user guidance", "User avatar with dropdown profile settings"],
  },
  {
    name: "Spotify",
    url: "spotify.com",
    mark: "S",
    color: "#1ED760",
    tagline: "Easy automation for busy people",
    note: "The dominant horizontal player",
    strengths: ["Sticky header with Primary CTA", "Dropdown menu with secondary options", "Search bar with filter capabilities"],
    weaknesses: ["Sticky header with Primary CTA", "Contextual help tooltip for user guidance", "User avatar with dropdown profile settings"],
  },
  {
    name: "Stripe",
    url: "stripe.com",
    mark: "",
    color: "#635BFF",
    tagline: "Easy automation for busy people",
    note: "The dominant horizontal player",
    strengths: ["Sticky header with Primary CTA", "Dropdown menu with secondary options", "Search bar with filter capabilities"],
    weaknesses: ["Sticky header with Primary CTA", "Contextual help tooltip for user guidance", "User avatar with dropdown profile settings"],
  },
  {
    name: "X",
    url: "x.com",
    mark: "X",
    color: "#050505",
    tagline: "Easy automation for busy people",
    note: "The dominant horizontal player",
    strengths: ["Sticky header with Primary CTA", "Dropdown menu with secondary options", "Search bar with filter capabilities"],
    weaknesses: ["Sticky header with Primary CTA", "Contextual help tooltip for user guidance", "User avatar with dropdown profile settings"],
  },
];

export const competitiveMatrixRows = [
  { label: "Navigation", values: ["Strong", "Strong", "Strong", "Strong"] },
  { label: "Onboarding", values: ["OK", "Strong", "Strong", "Strong"] },
  { label: "Visual Style", values: ["Weak", "OK", "Strong", "Weak"] },
  { label: "Content Hierarchy", values: ["Strong", "Weak", "Strong", "Strong"] },
  { label: "Mobile Experience", values: ["Strong", "Strong", "Weak", "Strong"] },
  { label: "Dashboard Layout", values: ["Strong", "OK", "OK", "OK"] },
  { label: "Data Visualization", values: ["Strong", "Weak", "OK", "OK"] },
];

export const uiPatterns = [
  ["Outcome-led headlines, not features list", "Heroes describe what the user achieves. \"Stop X, start Y\" pattern common."],
  ["Persistent primary action", "Competitors keep one clear next step available across dashboard and detail views."],
  ["Card-first dashboards", "Summary cards introduce data before tables, keeping scanning fast for busy teams."],
  ["Inline guidance beats help centers", "Short contextual prompts appear beside complex forms and setup workflows."],
  ["Empty states teach the workflow", "The strongest products explain why a blank state matters and what to add next."],
  ["Progressive disclosure", "Advanced filters and settings stay tucked away until the user needs deeper control."],
  ["Status language is plain", "Labels favor human-readable states like Needs review over technical system names."],
  ["Trust cues near decisions", "Security, approvals, and audit details appear close to export or payment actions."],
];

export const uiPatternGroups = [
  { id: "onboarding", title: "Onboarding", images: [uiPatternImages[0], uiPatternImages[1], uiPatternImages[2]] },
  { id: "dashboard", title: "Dashboard", images: [uiPatternImages[1], uiPatternImages[0], uiPatternImages[2]] },
  { id: "pricing", title: "Pricing", images: [uiPatternImages[0], uiPatternImages[2], uiPatternImages[1]] },
];

export const targetUsers = [
  {
    name: "Sarah, 32",
    role: "Finance Manager",
    goals: "Track team expenses without switching between 4 tools",
    frustration: "Current tool requires training for every new hire",
    context: "Desktop-first, uses 3x per day, always multitasking",
  },
  {
    name: "Marcus, 41",
    role: "Operations Lead",
    goals: "Approve spend, reconcile exceptions, and keep audit trails clean",
    frustration: "Approvals get buried across email, chat, and disconnected dashboards",
    context: "Works across finance and leadership, needs fast confidence checks",
  },
];

export const opportunities = [
  "Onboarding is broken across the space. 0 of 6 competitors handle it well. Most use static form-based flows. Opportunity for conversational onboarding.",
  "Mobile is an afterthought. 4 of 6 competitors have poor mobile UX. First-class mobile would differentiate.",
  "No one leverages empty states. Every competitor shows blank pages. Educational empty states would improve activation.",
  "Dark mode is underserved. Only 1 of 6 offers it. Growing demand in developer/finance audiences.",
];
