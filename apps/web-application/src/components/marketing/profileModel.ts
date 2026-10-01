import { GithubLogo, XLogo, InstagramLogo, LinkedinLogo, Globe, Envelope } from "@phosphor-icons/react";
import type { Profile, ProfileInput } from "./MarketplaceState";
export const roleOptions = [
  "Vibe coder",
  "Coder",
  "Web designer",
  "Figma designer",
  "UI designer",
  "UX designer",
  "Product designer",
  "Frontend developer",
  "Backend developer",
  "Full-stack developer",
  "AI builder",
  "Founder",
];
export const contacts = [
  { key: "github", label: "GitHub", Icon: GithubLogo },
  { key: "x", label: "X", Icon: XLogo },
  { key: "instagram", label: "Instagram", Icon: InstagramLogo },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedinLogo },
  { key: "website", label: "Website", Icon: Globe },
  { key: "email", label: "Email", Icon: Envelope },
] as const;
export function blank(name: string): Profile {
  return {
    name,
    handle: "",
    bio: "",
    location: "",
    roles: [],
    technologies: [],
    banner: "banner-4",
    github: "",
    x: "",
    instagram: "",
    linkedin: "",
    website: "",
    email: "",
    published: false,
    items: [],
  };
}
export function fields(profile: Profile): ProfileInput {
  const {
    customAvatar,
    customBanner,
    name,
    handle,
    bio,
    location,
    roles,
    technologies,
    banner,
    github,
    x,
    instagram,
    linkedin,
    website,
    email,
    published,
  } = profile;
  return {
    ...(customAvatar !== undefined ? { customAvatar } : {}),
    ...(customBanner !== undefined ? { customBanner } : {}),
    name,
    handle,
    bio,
    location,
    roles,
    technologies,
    banner,
    github,
    x,
    instagram,
    linkedin,
    website,
    email,
    published,
  };
}

export function techId(name: string) { return name.toLowerCase().replace(/\+/g,"plus").replace(/#/g,"sharp").replace(/[^a-z0-9]+/g,"-"); }
