export const FAQ_ITEMS = [
  {
    question: "Can I create an account before paying?",
    answer:
      "Yes. You can create an account and complete setup first. A paid plan is required before creating and managing projects.",
  },
  {
    question: "Do I need a credit card to sign up?",
    answer:
      "No. You can create an account with just your email. A card is required when you start the 14-day trial and unlock the workspace.",
  },
  {
    question: "What happens if I cancel my plan?",
    answer:
      "Your work stays with you, but project creation and paid workspace features are locked until the subscription is active again.",
  },
  {
    question: "Do you have a free trial?",
    answer:
      "Yes. New workspaces start with a 14-day trial that includes 150 AI credits. You add a card at checkout and can cancel in the billing portal before the trial ends.",
  },
  {
    question: "How does Stripe integration work?",
    answer:
      "Connect Stripe in Settings and Stage brings your payment data into the workspace, so you can see received and outstanding amounts without jumping between tools.",
  },
  {
    question: "Can I share progress with my clients?",
    answer:
      "Yes. Every project can be shared as a branded client portal, so clients see phases and progress and can request revisions without logging in.",
  },
  {
    question: "Can I invite my team to a project?",
    answer:
      "Not yet. Stage is optimized for solo designers and small studios today. Team collaboration is planned for a future release.",
  },
  {
    question: "How many projects can I have?",
    answer:
      "Paid workspaces can run unlimited client projects. AI runs such as research, moodboards, and voice notes draw from your monthly credit balance.",
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
] as const;
