import { v, type Infer } from "convex/values";

export const detailsSectionValidator = v.union(
  v.literal("CTA"),
  v.literal("Footer"),
  v.literal("Hero"),
  v.literal("Legal"),
  v.literal("Navigation"),
  v.literal("Drawer"),
  v.literal("Dropdown"),
  v.literal("Fullscreen"),
  v.literal("Morphing"),
  v.literal("404"),
  v.literal("Article"),
  v.literal("Blog"),
  v.literal("Case Study"),
  v.literal("Contact"),
  v.literal("Content"),
  v.literal("About"),
  v.literal("FAQ"),
  v.literal("Features"),
  v.literal("Services"),
  v.literal("Steps"),
  v.literal("Newsletter"),
  v.literal("Portfolio"),
  v.literal("Pricing"),
  v.literal("Products"),
  v.literal("Social Proof"),
  v.literal("Logo"),
  v.literal("Testimonial"),
  v.literal("Stats"),
  v.literal("Team"),
  v.literal("Timeline"),
  v.literal("Onboarding"),
  v.literal("Login / Sign up"),
  v.literal("Homepage"),
  v.literal("Checkout"),
  v.literal("Dashboard"),
  v.literal("Analytics / Reports"),
  v.literal("Table / List"),
  v.literal("Search"),
  v.literal("Detail View"),
  v.literal("Forms"),
  v.literal("Settings"),
  v.literal("Profile"),
  v.literal("Team / Permissions"),
  v.literal("Integrations"),
  v.literal("Billing"),
  v.literal("Browse / Discovery"),
  v.literal("Notifications"),
  v.literal("Empty State"),
  v.literal("Success / Confirmation"),
  v.literal("Splash Screen"),
);

export type DetailsSection = Infer<typeof detailsSectionValidator>;
export const defaultDetailsSections: DetailsSection[] = [
  "Hero",
  "Features",
  "Social Proof",
  "Pricing",
  "Contact",
];
export const defaultReferoSections: DetailsSection[] = [
  "Onboarding",
  "Homepage",
  "Pricing",
  "Checkout",
  "Dashboard",
];

export const aiModule = v.union(
  v.literal("research"),
  v.literal("strategy"),
  v.literal("flows"),
  v.literal("moodboard"),
  v.literal("styleguide"),
  v.literal("generate"),
  v.literal("delivery"),
);

export const aiRunStatus = v.union(
  v.literal("draft"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("needs_input"),
);

export const aiArtifactStatus = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("approved"),
  v.literal("superseded"),
  v.literal("failed"),
);

export const aiContentFormat = v.union(
  v.literal("markdown"),
  v.literal("json"),
  v.literal("link_set"),
);

export const exportProvider = v.union(v.literal("notion"), v.literal("figma"));

export const exportStatus = v.union(
  v.literal("requested"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("failed"),
);

export const projectAiProviderId = v.union(v.literal("claude"), v.literal("codex"));

export type AiModule =
  | "research"
  | "strategy"
  | "flows"
  | "moodboard"
  | "styleguide"
  | "generate"
  | "delivery";
