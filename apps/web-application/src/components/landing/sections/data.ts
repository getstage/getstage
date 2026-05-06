export const FAQ_ITEMS = [
  {
    question: "Is it really free to get started?",
    answer:
      "Yes. The free plan lets you manage up to 3 projects and use the core workflow before you pay anything. No credit card and no trial countdown.",
  },
  {
    question: "Do I need a credit card to sign up?",
    answer:
      "No. You can create an account with just your email. Payment details only matter if you choose to upgrade to Pro.",
  },
  {
    question: "What happens if I cancel my plan?",
    answer:
      "Your work stays with you. If you cancel, you drop back to the free plan and keep access to your projects. You only lose Pro features like unlimited projects, custom portal branding, and advanced integrations.",
  },
  {
    question: "Do you have a free trial?",
    answer:
      "We skip the trial because the free plan already lets you use Stage on real client work. Upgrade only when you outgrow the free limit.",
  },
  {
    question: "How does Stripe integration work?",
    answer:
      "Connect Stripe in Settings and Stage brings your payment data into the workspace, so you can see received and outstanding amounts without jumping between tools.",
  },
  {
    question: "Can I share progress with my clients?",
    answer:
      "Yes. Every project can be shared as a read-only client portal, so clients can see phases and progress without logging in or asking you for screenshots.",
  },
  {
    question: "Can I invite my team to a project?",
    answer:
      "Not yet. Stage is optimized for solo designers and small studios today. Team collaboration is planned for a future release.",
  },
  {
    question: "How many projects can I have?",
    answer:
      "Free includes up to 3 projects. Pro removes the cap so you can run unlimited client work.",
  },
] as const;

export const PRICING_FEATURES = [
  { key: "unlimited-projects", label: "Unlimited projects" },
  { key: "ai-roadmaps", label: "AI-generated roadmaps" },
  { key: "client-portal", label: "Client portal & sharing" },
  { key: "stripe-tracking", label: "Stripe payment tracking" },
  { key: "all-project-types", label: "All project types" },
  { key: "priority-support", label: "Priority support" },
] as const;

export const INTEGRATION_ICONS = [
  { src: new URL("../../../assets/icons/stripe.svg", import.meta.url).href, name: "Stripe" },
  {
    src: new URL("../../../assets/icons/google-sheets.svg", import.meta.url).href,
    name: "Google Sheets",
  },
  { src: new URL("../../../assets/icons/figma.svg", import.meta.url).href, name: "Figma" },
  { src: new URL("../../../assets/icons/notion.svg", import.meta.url).href, name: "Notion" },
  { src: new URL("../../../assets/icons/slack.svg", import.meta.url).href, name: "Slack" },
] as const;
