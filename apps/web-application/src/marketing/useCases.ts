export type UseCaseGroup = "Who it's for" | "What you do";

export type UseCase = {
  slug: string;
  group: UseCaseGroup;
  label: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  title: string;
  intro: string;
  problem: { heading: string; body: string };
  steps: Array<{ title: string; body: string }>;
  outcomes: string[];
  faq: Array<{ question: string; answer: string }>;
};

// Copy only claims what Stage ships today (see the landing FAQ): Stage does the
// research, direction and structure; it does not produce high-fidelity screens.
export const useCases: UseCase[] = [
  {
    slug: "freelance-designers",
    group: "Who it's for",
    label: "Freelance designers",
    summary: "Go from client brief to research, direction and wireframes in one place.",
    metaTitle: "Stage for freelance designers | From brief to wireframes",
    metaDescription:
      "Run research, strategy, moodboards, user flows and wireframes for every client project in Stage for Mac, then hand off to Figma or your coding agent.",
    title: "From client brief to a clear direction, without the busywork.",
    intro:
      "Stage gives freelance designers one workspace for the thinking behind a project: research, strategy, visual direction, flows and wireframes. You keep the taste. Stage does the legwork.",
    problem: {
      heading: "The hours before the design are the ones nobody pays for",
      body: "Competitor research, collecting references, writing a strategy and mapping flows eat days of every project. They are also the parts clients rarely see, so they get rushed, and the design suffers for it.",
    },
    steps: [
      {
        title: "Start from the brief",
        body: "Create a project for a website, web app or iOS app and upload the client brief as PDF or Markdown. Stage uses it as context for everything that follows.",
      },
      {
        title: "Research the market",
        body: "Add competitor links and let Stage analyse positioning, patterns and the best designs in the industry, then turn it into a strategy you can approve.",
      },
      {
        title: "Lock the visual direction",
        body: "Explore moodboards from pulled references, Figma imports or your own uploads, and carry the chosen direction into a generated style guide.",
      },
      {
        title: "Structure the product",
        body: "Work out how every screen connects in user flows and Lo-Fi wireframes, then export to Figma and FigJam or share progress in the client portal.",
      },
    ],
    outcomes: [
      "A research-backed strategy you can show the client",
      "A visual direction and style guide the whole project follows",
      "User flows and wireframes ready for Figma",
      "A Markdown brief your coding agent can build from",
    ],
    faq: [
      {
        question: "Does Stage replace Figma?",
        answer:
          "No. Stage covers the thinking before high-fidelity design: research, direction, flows and wireframes. You export to Figma and FigJam to continue there.",
      },
      {
        question: "Can my client follow along?",
        answer:
          "Yes. Share the project through the client portal so clients see progress without needing a Stage account.",
      },
    ],
  },
  {
    slug: "agencies",
    group: "Who it's for",
    label: "Agencies",
    summary: "One shared process for research, direction and hand-off across your team.",
    metaTitle: "Stage for agencies | A shared product process for your team",
    metaDescription:
      "Give your agency one repeatable process for client research, visual direction, flows and hand-off. Studio includes 5 seats, Agency includes 15.",
    title: "One repeatable process for every client, across your whole team.",
    intro:
      "Stage gives your team a shared workspace for client research, strategy, visual direction and structure, so every project starts from the same standard instead of whoever had time that week.",
    problem: {
      heading: "Every designer runs discovery differently",
      body: "When research and direction live in personal files and chat threads, quality depends on who picked up the project. Hand-offs lose context and clients see inconsistent work.",
    },
    steps: [
      {
        title: "Bring the team into one workspace",
        body: "Invite your team to a shared workspace. Studio includes up to 5 seats and Agency up to 15, with pooled AI credits for everyone.",
      },
      {
        title: "Run the same research on every project",
        body: "Competitor analysis, positioning and strategy follow the same structure for every client, so reviews are faster and nothing gets skipped.",
      },
      {
        title: "Agree on direction before production",
        body: "Moodboards and a generated style guide make the visual direction explicit, so the whole team designs and builds toward the same target.",
      },
      {
        title: "Present and hand off",
        body: "Share progress in a branded client portal, export flows and wireframes to Figma, and hand developers a Markdown brief their coding agent can follow.",
      },
    ],
    outcomes: [
      "A consistent discovery standard across the team",
      "Branded client portals for every project",
      "Pooled AI credits instead of separate tool bills",
      "Clean hand-offs to design and development",
    ],
    faq: [
      {
        question: "How many people can join?",
        answer:
          "Studio includes up to five seats and Agency up to 15, including the owner. You can upgrade from the app when the team grows.",
      },
      {
        question: "Do team members need their own subscription?",
        answer:
          "No. Members work in the owner's workspace and use the workspace's pooled credits.",
      },
    ],
  },
  {
    slug: "vibe-coders",
    group: "Who it's for",
    label: "Vibe coders & AI builders",
    summary: "Give Cursor, Claude Code and Codex a plan instead of a vague prompt.",
    metaTitle: "Stage for vibe coders | The plan your AI agent builds from",
    metaDescription:
      "Stop getting generic output from your AI. Stage does the research, strategy and direction, then exports a Markdown brief Cursor, Claude Code and Codex follow.",
    title: "Stage does the thinking. Your AI does the building.",
    intro:
      "Your coding agent builds exactly what you ask for, which is why vague prompts produce generic products. Stage works out the research, direction and structure first, then exports it as a brief your agent actually follows.",
    problem: {
      heading: "Another prompt will not fix a missing direction",
      body: "When the result feels generic, the problem is rarely the model. What is missing is a clear answer to what the product should do, how it should feel and which references to learn from.",
    },
    steps: [
      {
        title: "Research before you build",
        body: "Stage analyses competitors and the best designs in your category and turns them into a strategy for your product.",
      },
      {
        title: "Choose a real visual direction",
        body: "Pick references, build a moodboard and generate a style guide, so your agent has a specific look to aim for instead of defaults.",
      },
      {
        title: "Pick the tools your agent uses",
        body: "Install skills and component libraries from the Stage marketplace, or import your own from GitHub, and add them to the brief for the first build.",
      },
      {
        title: "Export the brief",
        body: "Choose the pages to export as Markdown, with an AGENTS.md that explains the reading order. Open them in your AI workspace and ask your agent to build.",
      },
    ],
    outcomes: [
      "A product that looks designed, not generated",
      "Fewer prompt-and-retry loops",
      "Component libraries chosen up front",
      "One brief that works in Cursor, Claude Code and Codex",
    ],
    faq: [
      {
        question: "Which AI tools does the export work with?",
        answer:
          "Stage exports plain Markdown for Cursor, Claude Code, Codex or any coding agent that can read it. AGENTS.md explains the folder and the reading order.",
      },
      {
        question: "Can I use my own component library?",
        answer:
          "Yes. Import your own library from GitHub or install skills and libraries from the Stage marketplace, then add your selections to the brief.",
      },
    ],
  },
  {
    slug: "founders",
    group: "Who it's for",
    label: "Founders & startups",
    summary: "Think your MVP through before you spend weeks building it.",
    metaTitle: "Stage for founders | Plan your MVP before you build it",
    metaDescription:
      "Research your market, choose a direction and map every screen of your MVP in Stage for Mac, then export a brief your developers or AI agent can build from.",
    title: "Think your product through before you build it.",
    intro:
      "Building is fast now. Building the wrong thing is still expensive. Stage helps founders work through the market, positioning, direction and structure of an MVP before a single screen is coded.",
    problem: {
      heading: "Speed without direction just ships the wrong product faster",
      body: "AI tools make it easy to start building on day one. Without research and a clear structure, you end up rebuilding flows and redesigning screens once real users arrive.",
    },
    steps: [
      {
        title: "Understand the market",
        body: "Drop in competitor links and get an analysis of positioning, patterns and gaps you can use to sharpen your own product.",
      },
      {
        title: "Decide how it should feel",
        body: "Turn references into a moodboard and style guide so your product has a deliberate identity from the first version.",
      },
      {
        title: "Map the MVP",
        body: "Lay out user flows and Lo-Fi wireframes for websites, web apps or iOS apps, so scope is clear before development starts.",
      },
      {
        title: "Hand it to whoever builds",
        body: "Export a Markdown brief for your coding agent, or flows and wireframes to Figma for a designer or developer.",
      },
    ],
    outcomes: [
      "A clear view of competitors and positioning",
      "A defined MVP scope with every screen mapped",
      "A visual identity from day one",
      "A brief any developer or AI agent can pick up",
    ],
    faq: [
      {
        question: "I am not a designer. Is Stage for me?",
        answer:
          "Yes. You can read and use the research, strategy and specifications yourself. A coding agent or designer is where you continue when you want to build.",
      },
      {
        question: "Can I try it first?",
        answer: "Yes. Every plan starts with a 14-day free trial.",
      },
    ],
  },
  {
    slug: "competitor-research",
    group: "What you do",
    label: "Competitor research",
    summary: "Turn competitor links into a strategy you can approve.",
    metaTitle: "AI competitor research for designers | Stage",
    metaDescription:
      "Add competitor links and let Stage analyse positioning, patterns and the best designs in your industry, then turn the findings into a product strategy.",
    title: "Turn competitive analysis into a clear strategy.",
    intro:
      "Stage researches your market for you. Add the competitors that matter and get an analysis of their positioning and design patterns, turned into a strategy for your own product.",
    problem: {
      heading: "Manual competitor research does not scale",
      body: "Opening dozens of tabs, taking screenshots and summarising what you see takes hours per project, and the findings rarely make it into the actual design decisions.",
    },
    steps: [
      {
        title: "Add your competitors",
        body: "Add the competitor links you want to compare. Stage analyses up to four competitors per run.",
      },
      {
        title: "Add your own context",
        body: "Upload briefs as PDF or Markdown so the research is grounded in what you are actually building.",
      },
      {
        title: "Review the analysis",
        body: "Read how competitors position themselves, which patterns repeat and what the best designs in the industry do well.",
      },
      {
        title: "Approve a strategy",
        body: "Stage turns the research into a strategy you can edit and approve. It then feeds the visual direction, flows and the exported brief.",
      },
    ],
    outcomes: [
      "Hours of tab-hopping replaced by one research run",
      "Positioning and patterns in one readable page",
      "A strategy connected to your design decisions",
    ],
    faq: [
      {
        question: "How many competitors can I analyse?",
        answer: "Up to four per research run today.",
      },
      {
        question: "Which files can I upload as context?",
        answer: "PDF and Markdown briefs. You can add several files and remove any of them.",
      },
    ],
  },
  {
    slug: "moodboards-and-style-guides",
    group: "What you do",
    label: "Moodboards & style guides",
    summary: "Set a visual direction and carry it into a generated style guide.",
    metaTitle: "Moodboards and style guides for AI builds | Stage",
    metaDescription:
      "Build a moodboard from references, Figma imports or uploads, and carry the direction into a generated style guide your coding agent can follow.",
    title: "Set a direction your whole build follows.",
    intro:
      "Stage turns references into a visual direction and a generated style guide with atmosphere, colour palette, typography and components, so every screen and every AI build aims at the same look.",
    problem: {
      heading: "Without a direction, AI defaults win",
      body: "When the only input is a prompt, you get the same fonts, colours and layouts as everyone else. A moodboard is only useful if its decisions survive into the build.",
    },
    steps: [
      {
        title: "Collect references",
        body: "Pull references into Stage, import frames from Figma or upload images from your device.",
      },
      {
        title: "Choose the direction",
        body: "Compare options on the moodboard and lock the direction that fits the product and the strategy.",
      },
      {
        title: "Generate the style guide",
        body: "Stage carries the direction into a style guide covering atmosphere, colour palette, typography and components.",
      },
      {
        title: "Build from it",
        body: "Export the style guide with the brief, so your coding agent has a specific direction to follow from the first build.",
      },
    ],
    outcomes: [
      "A deliberate look instead of AI defaults",
      "One style guide shared by designers and agents",
      "Direction that survives from moodboard to code",
    ],
    faq: [
      {
        question: "Can I bring references from Figma?",
        answer: "Yes. Import from Figma, pull references into Stage or upload images from your device.",
      },
      {
        question: "Does Stage generate final screens?",
        answer:
          "No. Stage produces the direction and style guide. Your designer or coding agent turns them into finished screens.",
      },
    ],
  },
];

export function findUseCase(slug: string) {
  return useCases.find((useCase) => useCase.slug === slug);
}
