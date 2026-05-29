export type SectionStatus = "approved" | "action";

export type StrategySection = {
  id: string;
  title: string;
  status: SectionStatus;
  kind: "paragraph" | "plain" | "principles" | "table" | "cards" | "boxes";
  body?: string[];
  principles?: Array<{ title: string; body: string; research?: string }>;
  table?: Array<[string, string]>;
  cards?: Array<{ title: string; objective: string; kpi: string; keyElement: string }>;
  boxes?: Array<{ title: string; bullets: string[] }>;
};

export const initialSections: StrategySection[] = [
  {
    id: "direction",
    title: "Design Direction",
    status: "approved",
    kind: "plain",
    body: [
      "Clean, content-first fintech dashboard. Prioritize speed and clarity for power users who make decisions in under 3 seconds. Differentiate through conversational onboarding and actionable data visualization - follow proven patterns everywhere else.",
    ],
  },
  {
    id: "principles",
    title: "Design Principles",
    status: "approved",
    kind: "principles",
    principles: [
      {
        title: "Clarity over decoration",
        body: "Users are finance professionals. They need speed, not aesthetics.",
        research: "Research: competitors with cluttered UIs had lowest app store ratings",
      },
      {
        title: "Data should explain itself",
        body: "If a chart needs a tooltip to be understood, the chart is wrong.",
      },
      {
        title: "Every screen has one primary action",
        body: "Reduce decision fatigue. One clear CTA per view.",
        research: "Research: best-performing competitors use single-CTA layouts",
      },
      {
        title: "Progressive disclosure over information overload",
        body: "Show what's needed now. Let users dig deeper on demand.",
        research: "Research: 4 of 6 competitors overwhelm users on first login",
      },
    ],
  },
  {
    id: "audience",
    title: "Target Audience Strategy",
    status: "action",
    kind: "table",
    table: [
      ["Primary user", "Finance managers, 30-45"],
      ["Tech level", "Intermediate, not developers, not beginners"],
      ["Usage context", "Desktop-first, 3-5x daily, always multitasking"],
      ["Key behavior", "They scan, never read. Decisions in under 3 seconds."],
    ],
  },
  {
    id: "content",
    title: "Content Strategy",
    status: "action",
    kind: "paragraph",
    body: [
      "Voice: Professional but human. No corporate jargon. No buzzwords.",
      "Headline: Outcome-led, not feature-led. Use: 'Track expenses in one place' instead of 'Advanced expense management'.",
      "CTA: Action verbs. Specific, not generic. Use: 'Start free', 'View report', 'Export CSV'. No vague labels like 'Learn more'.",
      "Error messages: Tell users what to do, not what went wrong. Use: 'No expenses this month. Add your first one.'",
      "Empty states: Educate and guide. Never leave users stuck.",
      "Microcopy: Confirm before destructive actions. Celebrate small wins.",
    ],
  },
  {
    id: "positioning",
    title: "Competitive Positioning",
    status: "action",
    kind: "boxes",
    boxes: [
      { title: "FOLLOW", bullets: ["Bottom navigation on mobile", "Card-based dashboard layout", "Grouped settings with section headers"] },
      { title: "BREAK", bullets: ["Conventional onboarding", "Hide empty states that educate and activate", "Dark mode as a cosmetic toggle"] },
      { title: "AVOID", bullets: ["Sidebar navigation on mobile", "Feature-gated dashboards", "Generic wellness look"] },
    ],
  },
  {
    id: "pages",
    title: "Key Pages & Objectives",
    status: "action",
    kind: "cards",
    cards: [
      {
        title: "Dashboard",
        objective: "Daily engagement - the reason users come back",
        kpi: "DAU, session duration",
        keyElement: "Actionable metrics at a glance. No vanity numbers.",
      },
      {
        title: "Dashboard",
        objective: "Daily engagement - the reason users come back",
        kpi: "DAU, session duration",
        keyElement: "Actionable metrics at a glance. No vanity numbers.",
      },
      {
        title: "Dashboard",
        objective: "Daily engagement - the reason users come back",
        kpi: "DAU, session duration",
        keyElement: "Actionable metrics at a glance. No vanity numbers.",
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility & Constraints",
    status: "action",
    kind: "table",
    table: [
      ["WCAG level", "AA minimum"],
      ["Contrast", "4.5:1 for body text, 3:1 for large text"],
      ["Touch targets", "44x44px minimum on mobile"],
      ["Responsive", "Desktop / Tablet / Mobile breakpoints"],
      ["Performance", "First contentful paint under 2 seconds"],
      ["Browser support", "Chrome, Safari, Firefox, Edge (no IE)"],
    ],
  },
];
