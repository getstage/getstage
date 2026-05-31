import { companionThreadSchema } from "@/models/companion/thread";

export const critiqueThread = companionThreadSchema.parse({
  id: "design-critique-demo",
  title: "Stage",
  prompt: "Critique this layout based on the brief.",
  messages: [
    {
      id: "user-prompt",
      role: "user",
      label: "You",
      content: "Critique this layout based on the brief.",
    },
    {
      id: "stage-response",
      role: "stage",
      label: "Stage",
      content:
        "The spacing between sections is 16px. Your brand strategy specifies 32px minimum for the airy direction. The CTA color should use the approved primary action color #8782F5.",
      source: "Brief + Brand Strategy",
    },
  ],
});
