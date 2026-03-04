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
      "Your projects and data remain accessible on the free tier. You won't lose any work — you'll just lose access to Pro features like AI roadmaps and Stripe integration.",
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
      "Yes! Each project has a Client Portal — a read-only, branded link you can share. Clients see real-time progress without needing to create an account or log in.",
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
  { src: new URL("../../../assets/icons/figma.svg", import.meta.url).href, name: "Figma" },
  { src: new URL("../../../assets/icons/notion.svg", import.meta.url).href, name: "Notion" },
  { src: new URL("../../../assets/icons/slack.svg", import.meta.url).href, name: "Slack" },
] as const;
