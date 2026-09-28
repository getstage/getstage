// Landing stylesheets in cascade order. vite.config.ts inlines them for the SPA;
// scripts/prerender-marketing.mjs links them so pre-rendered pages paint styled.
export const LANDING_CSS_DIR = "public/landing-preview";
export const LANDING_CSS_FILES = [
  "isolate.css",
  "styles.css",
  "sections.css",
  "navigation.css",
  "experience.css",
  "mobile.css",
  "content.css",
];
