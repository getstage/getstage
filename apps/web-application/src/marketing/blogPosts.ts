export type BlogPost = {
  slug: string;
  category: "Case study" | "Tools";
  title: string;
  metaTitle: string;
  description: string;
  publishedAt: string;
  author: string;
  video: {
    youtubeId: string;
    thumbnail: string;
    // ISO 8601 duration for schema.org; omitted when unknown.
    duration?: string;
  };
  chapters: Array<{ time: string; label: string }>;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  relatedUseCases: string[];
};

const ADRIEN = "Adrien Ninet";

// Newest first. Text is written from the video's own description and chapters;
// keep it in sync when a video is re-cut.
export const blogPosts: BlogPost[] = [
  {
    slug: "8-underrated-websites-every-vibe-coder-needs",
    category: "Tools",
    title: "8 underrated websites every vibe coder needs",
    metaTitle: "8 underrated websites every vibe coder needs (2026) | Stage",
    description:
      "Eight tools built for your AI agent instead of for you: agent-ready components, thinking states for AI apps, 508 accessible primitives, MCP installs and the planning layer that tells your agent what to build.",
    publishedAt: "2026-09-26",
    author: ADRIEN,
    video: {
      youtubeId: "8GfWKFyAaW4",
      thumbnail: "/blog/8GfWKFyAaW4.jpg",
      duration: "PT10M11S",
    },
    chapters: [
      { time: "0:00", label: "Introduction" },
      { time: "0:43", label: "ObsidianUI: components with built-in instructions for agents" },
      { time: "1:29", label: "BeautifulUI: 20+ thinking states for AI apps" },
      { time: "2:18", label: "OriginKit: free animated components for landing pages" },
      { time: "3:08", label: "Stage: the plan your AI agent builds from" },
      { time: "6:40", label: "coss/ui: 508 accessible components on Base UI" },
      { time: "7:37", label: "Bencho: live micro-interactions you can drag" },
      { time: "8:20", label: "AICSS: UI blocks for agents in React, Vue and Svelte" },
      { time: "8:50", label: "Componentry: components installed via MCP" },
      { time: "9:56", label: "Conclusion" },
    ],
    sections: [
      {
        heading: "Anyone can vibe code. Not everyone ships something that looks designed.",
        paragraphs: [
          "Everyone can build an app with an AI agent now. What nobody can copy is a product that looks like a real team designed it. The difference is rarely the model. It is what you give the model to work with.",
          "The eight websites in this video are among the first built for your AI agent rather than for you. Seven of them are written to be read by Claude Code or Cursor, one installs straight into your agent over MCP, and one is not a component library at all.",
        ],
      },
      {
        heading: "Component libraries your agent can read",
        paragraphs: [
          "ObsidianUI ships components with instructions built in, so your agent knows how to use them instead of guessing. BeautifulUI focuses on a problem every AI app has: more than 20 thinking and loading states that make waiting feel designed. OriginKit gives you free animated components for landing pages.",
          "coss/ui offers 508 accessible components built on Base UI. Bencho is a collection of live micro-interactions you can drag and try before you install them. AICSS provides UI blocks for agents in React, Vue and Svelte, and Componentry installs its components directly through MCP.",
          "Unless noted in the video, they are free, and every effect can be installed with copy and paste, npm install or one of the prompts shown.",
        ],
      },
      {
        heading: "The one that is not a component library: Stage",
        paragraphs: [
          "Great components do not help if your agent does not know which ones to use or what the product should feel like. Stage is the thinking layer in front of the build: it researches your market, sets a visual direction and maps the flows, then tells your agent which components to use and why.",
          "Everything is exported as a Markdown brief that Cursor, Claude Code and Codex follow, including the skills and component libraries you selected, so the first build already uses the right building blocks.",
        ],
      },
    ],
    relatedUseCases: ["vibe-coders", "moodboards-and-style-guides"],
  },
  {
    slug: "is-this-the-new-way-to-design",
    category: "Case study",
    title: "Is this the new way to design? A real client project in Stage",
    metaTitle: "Is this the new way to design? A real client project in Stage",
    description:
      "A full, unedited run of a real coffee-brand project in Stage: AI research and strategy, visual direction, user flows, wireframes and a one-click Figma hand-off, including where it still falls short.",
    publishedAt: "2026-07-07",
    author: ADRIEN,
    video: {
      youtubeId: "KM8HA2pc6Rg",
      thumbnail: "/blog/KM8HA2pc6Rg.jpg",
    },
    chapters: [
      { time: "0:00", label: "Stage trailer" },
      { time: "0:34", label: "Why AI design became generic (and the fix)" },
      { time: "0:58", label: "Setting up Stage and connecting your own tools" },
      { time: "1:41", label: "AI research and strategy in 6 minutes" },
      { time: "3:13", label: "Visual direction and moodboards (you keep the taste)" },
      { time: "8:12", label: "Flows, wireframes and a one-click Figma hand-off" },
      { time: "10:09", label: "The honest verdict: what it does well and what it cannot" },
    ],
    sections: [
      {
        heading: "Why AI design became generic",
        paragraphs: [
          "Most AI tools skip the design process. You type \"build me an app\" and get something that looks like every other generated product. The research, strategy and direction that make a design specific never happen.",
          "Stage brings that process back and runs it on your Mac, from research to wireframes, using your own tools such as Claude, Codex and Figma. To test it properly, this video follows a real client project for a coffee brand from start to finish, unedited.",
        ],
      },
      {
        heading: "Research and strategy in minutes",
        paragraphs: [
          "After connecting your own AI tools, the project starts with research. Stage analyses the market and competitors and turns the findings into a strategy in about six minutes.",
        ],
      },
      {
        heading: "Visual direction: you keep the taste",
        paragraphs: [
          "The longest part of the video is the visual direction, and that is deliberate. Stage builds moodboards from references, but the choices stay with the designer. The chosen direction is then carried into the style guide the rest of the project follows.",
        ],
      },
      {
        heading: "Flows, wireframes and the Figma hand-off",
        paragraphs: [
          "With a direction in place, Stage maps the user flows and wireframes for the product and hands them off to Figma in one click, ready for the high-fidelity design.",
        ],
      },
      {
        heading: "The honest verdict",
        paragraphs: [
          "The video ends with what Stage does well and what it cannot do yet. Stage does not produce finished high-fidelity screens. It does the thinking that makes those screens specific instead of generic, and hands it to your design tools and coding agent.",
        ],
      },
    ],
    relatedUseCases: ["freelance-designers", "competitor-research"],
  },
];

export function findBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
