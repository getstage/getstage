import type { ProjectType } from "@/types";

export type ProjectTypeOption = {
  value: ProjectType;
  label: string;
};

export type RoadmapTemplateItem = {
  name: string;
  tasks: string[];
};

export const FREE_PLAN_PROJECT_LIMIT = 3;

export const PROJECT_TYPES: ProjectTypeOption[] = [
  { value: "web-design", label: "Web Design" },
  { value: "app-design", label: "App Design" },
  { value: "web-app", label: "Web App" },
];

export const PROJECT_TYPE_ICONS: Record<ProjectType, string | null> = {
  "web-design": "/logos/create-project/globe.svg",
  "app-design": "/logos/create-project/mobile.svg",
  "web-app": "/logos/create-project/computer.svg",
};

export const DEFAULT_PHASES = ["Discovery", "Strategy", "Design", "Development", "Launch"];

export const AI_ROADMAPS: Record<ProjectType, RoadmapTemplateItem[]> = {
  "web-design": [
    {
      name: "Strategy",
      tasks: [
        "Define project goals",
        "Outline sitemap",
        "Confirm content requirements",
      ],
    },
    {
      name: "Research",
      tasks: [
        "Run UX audit",
        "Review competitors",
        "Collect design references",
        "List technical constraints",
      ],
    },
    {
      name: "Design",
      tasks: [
        "Create wireframes",
        "Design homepage",
        "Design key pages",
        "Build component system",
        "Prepare responsive layouts",
        "Apply feedback revisions",
      ],
    },
    {
      name: "Development",
      tasks: [
        "Build front-end pages",
        "Set up CMS structure",
        "Run QA pass",
        "Install analytics",
        "Apply SEO basics",
      ],
    },
    {
      name: "Launch",
      tasks: [
        "Upload final content",
        "Review across devices",
        "Run performance check",
      ],
    },
  ],
  "app-design": [
    {
      name: "Research",
      tasks: [
        "Define product goals",
        "Create user personas",
        "List priority features",
      ],
    },
    {
      name: "Architecture",
      tasks: [
        "Plan information architecture",
        "Define navigation model",
        "Review technical constraints",
        "Map core user flows",
      ],
    },
    {
      name: "Design",
      tasks: [
        "Create wireframes",
        "Establish visual direction",
        "Design high-fidelity screens",
        "Build component library",
        "Design empty states",
        "Prepare responsive variants",
      ],
    },
    {
      name: "Development",
      tasks: [
        "Prepare developer handoff",
        "Document interaction specs",
        "Support implementation QA",
        "Review design fixes",
        "Package release assets",
      ],
    },
    {
      name: "Testing",
      tasks: [
        "Test prototype flows",
        "Run accessibility pass",
        "Review edge cases",
        "Apply final polish",
      ],
    },
  ],
  "web-app": [
    {
      name: "Discovery",
      tasks: [
        "Run stakeholder kickoff",
        "Define success metrics",
        "Frame the core problem",
        "Write user stories",
      ],
    },
    {
      name: "Research",
      tasks: [
        "Interview target users",
        "Map user journeys",
        "Analyze competitors",
        "Document requirements",
        "Highlight opportunity areas",
      ],
    },
    {
      name: "Design",
      tasks: [
        "Map user flows",
        "Create low-fidelity wireframes",
        "Design high-fidelity screens",
        "Build design system",
        "Assemble clickable prototype",
        "Review with stakeholders",
      ],
    },
    {
      name: "Development",
      tasks: [
        "Build front-end application",
        "Implement API integration",
        "Set up authentication",
        "Run QA pass",
        "Apply performance optimizations",
      ],
    },
    {
      name: "Launch",
      tasks: [
        "Deploy to production",
        "Review across devices",
        "Run performance check",
        "Monitor post-launch metrics",
      ],
    },
  ],
};

export const FAQ_ITEMS = [
  {
    question: "Is it really free to get started?",
    answer:
      "Yes! Stage offers a generous free tier that lets you manage up to 3 projects with all core features included. No credit card required, no time limits.",
  },
  {
    question: "Do I need a credit card to sign up?",
    answer:
      "No. You can sign up and start using Stage immediately with just your email address. We only ask for payment information if you choose to upgrade to Pro.",
  },
  {
    question: "What happens if I cancel my plan?",
    answer:
      "Your projects and data remain accessible on the free tier. You won't lose any work - you'll just lose access to Pro features like AI roadmaps and Stripe integration.",
  },
  {
    question: "Do you have a free trial?",
    answer:
      "We don't have a traditional trial because our free tier is already generous. You can use Stage for free with up to 3 projects, forever. Upgrade to Pro when you need more.",
  },
  {
    question: "How does Stripe integration work?",
    answer:
      "Connect your Stripe account in Settings. Stage automatically syncs your invoices and payments, showing outstanding and received amounts directly on your dashboard.",
  },
  {
    question: "Can I share progress with my clients?",
    answer:
      "Yes! Each project has a Client Portal - a read-only, branded link you can share. Clients see real-time progress without needing to create an account or log in.",
  },
  {
    question: "Can I invite my team to a project?",
    answer:
      "Team collaboration is on our roadmap for an upcoming release. Currently, Stage is optimized for individual creatives and freelancers.",
  },
  {
    question: "How many projects can I have?",
    answer:
      "Free tier: up to 3 active projects. Pro plan: unlimited projects with no restrictions.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Yes. You can export all project data, timelines, and payment records at any time. Your data is always yours.",
  },
];

export const PRICING_FEATURES = [
  "Unlimited projects",
  "AI-generated roadmaps",
  "Client portal & sharing",
  "Stripe payment tracking",
  "All project types",
  "Priority support",
];

export const FREE_PRICING_FEATURES = [
  "Up to 3 active projects",
  "Phase and task tracking",
  "Timeline overview",
  "Basic project analytics",
  "Project data export",
] as const;

export const DEFAULT_PORTAL_COLOR = "#E8734A";
