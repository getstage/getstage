// Shared by rendered headings, metadata and server-rendered marketing pages.
export const marketplaceIntroductions = {
  "/marketplace": {
    heading: "Tools, skills and components for your next project",
    subheading: "Discover AI tools, agent skills and UI libraries to turn your ideas into better websites and apps.",
    title: "AI Tools, Agent Skills & UI Libraries | Stage Marketplace",
    description: "Explore AI tools, agent skills and UI component libraries for building websites and apps. Compare resources and save your toolkit to a Stage profile.",
  },
  "/component-libraries": {
    heading: "Component libraries for modern websites",
    subheading: "Explore UI components, templates and animations to build your next website faster.",
    title: "UI Component Libraries for Modern Websites | Stage",
    description: "Explore React component libraries, animated UI, website blocks and charts. Find reusable components for your next website and save your favorites on Stage.",
  },
  "/skills": {
    heading: "AI agent skills for design and development",
    subheading: "Discover skills that guide your AI agent through interface design, coding and animation.",
    title: "AI Agent Skills for Design & Development | Stage",
    description: "Discover AI agent skills for interface design, coding and animation. Explore design and development workflows and save your skill collection on Stage.",
  },
  "/tools": {
    heading: "AI tools for building websites and apps",
    subheading: "Find coding assistants, design tools and website builders for your next project.",
    title: "AI Tools for Building Websites & Apps | Stage",
    description: "Compare AI coding assistants, design tools and website builders. Find tools for your next website or app and save your builder toolkit on Stage.",
  },
} as const;
export type MarketplacePath = keyof typeof marketplaceIntroductions;
