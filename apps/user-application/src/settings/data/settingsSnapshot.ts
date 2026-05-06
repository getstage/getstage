import { settingsSnapshotSchema } from "../models/settings";

export const settingsSnapshot = settingsSnapshotSchema.parse({
  profile: {
    fullName: "Wessel Dieben",
    avatarInitials: "WD",
    selectedRole: "in-house",
    roles: [
      { id: "freelancer", label: "Freelancer", icon: "freelancer" },
      { id: "studio", label: "Studio", icon: "studio" },
      { id: "in-house", label: "In-house", icon: "in-house" },
      { id: "agency", label: "Agency", icon: "agency" },
    ],
  },
  billing: {
    planName: "Stage Pro",
    billingCycle: "Monthly",
    renewsOn: "24/05/2026",
    paymentMethod: "Visa Mastercard",
  },
  clients: [
    {
      id: "baseframe",
      name: "BaseFrame",
      email: "heypratik@baseframe.design",
      projectCount: 1,
    },
    {
      id: "baseframe-2",
      name: "BaseFrame",
      email: "heypratik@baseframe.design",
      projectCount: 2,
    },
  ],
  developer: {
    apiKey: "sk_live_x7f3k92hdk28s9dk3h",
    generatedPrompt:
      "# Codex Configuration\n\nAPI_KEY=sk_live_x7f3k92hdk28s9dk3h\n\nYou are an expert product engineer working on a modern SaaS application.\n\n- Write clean, production-ready code\n- Maintain consistent structure and naming\n- Optimize for readability and scalability\n- Avoid breaking existing functionality\n\nUI Guidelines:\n- Use modern, minimal design patterns\n- Ensure spacing, hierarchy, and responsiveness\n\nAlways return complete, usable code.",
  },
  integrations: {
    connected: [
      {
        id: "claude",
        name: "Claude",
        description: "Research, strategy, and generation",
        icon: "claude",
        connected: true,
        accentColor: "#DD7B5F",
      },
    ],
    available: [
      {
        id: "codex",
        name: "Codex",
        description: "Research, strategy, and generation",
        icon: "code",
        connected: false,
      },
      {
        id: "figma",
        name: "Figma",
        description: "Native design export and handoff",
        icon: "figma",
        connected: false,
      },
      {
        id: "notion",
        name: "Notion",
        description: "Native document export and review",
        icon: "document",
        connected: false,
      },
      {
        id: "google-sheets",
        name: "Google Sheets",
        description: "Import transactions",
        icon: "sheet",
        connected: false,
        accentColor: "#2CAA67",
      },
    ],
  },
});
