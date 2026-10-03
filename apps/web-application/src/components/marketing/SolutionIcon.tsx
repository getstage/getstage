import {
  Briefcase,
  Buildings,
  Code,
  Flag,
  MagnifyingGlass,
  Palette,
} from "@phosphor-icons/react";

const icons = {
  "freelance-designers": Briefcase,
  agencies: Buildings,
  "vibe-coders": Code,
  founders: Flag,
  "competitor-research": MagnifyingGlass,
  "moodboards-and-style-guides": Palette,
};

export function SolutionIcon({
  slug,
  size = 18,
}: {
  slug: string;
  size?: number;
}) {
  const Icon = icons[slug as keyof typeof icons] ?? Briefcase;
  return (
    <Icon
      className="solution-icon"
      size={size}
      weight="duotone"
      aria-hidden="true"
    />
  );
}
