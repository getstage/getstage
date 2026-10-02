import { v } from "convex/values";

export const profileFields = {
  customAvatar: v.optional(v.string()),
  customBanner: v.optional(v.string()),
  name: v.string(),
  handle: v.string(),
  bio: v.string(),
  location: v.string(),
  roles: v.array(v.string()),
  technologies: v.array(v.string()),
  banner: v.string(),
  github: v.string(),
  x: v.string(),
  instagram: v.string(),
  linkedin: v.string(),
  website: v.string(),
  email: v.string(),
  published: v.boolean(),
};
export type ProfileFields = {
  customAvatar?: string;
  customBanner?: string;
  name: string;
  handle: string;
  bio: string;
  location: string;
  roles: string[];
  technologies: string[];
  banner: string;
  github: string;
  x: string;
  instagram: string;
  linkedin: string;
  website: string;
  email: string;
  published: boolean;
};

export function validateProfile(input: ProfileFields): ProfileFields {
  const result = {
    ...input,
    name: input.name.trim(),
    handle: input.handle.trim().toLowerCase(),
    bio: input.bio.trim(),
    location: input.location.trim(),
  };
  if (!result.name || result.name.length > 60)
    throw new Error("Enter a name of 1–60 characters.");
  if (!/^[a-z0-9_]{2,24}$/.test(result.handle))
    throw new Error(
      "Use 2–24 letters, numbers or underscores for your username.",
    );
  if (result.bio.length > 220 || result.location.length > 60)
    throw new Error("Your bio or location is too long.");
  if (result.roles.length > 12 || result.roles.some((x) => x.length > 40))
    throw new Error("Too many or invalid roles.");
  if (
    result.technologies.length > 100 ||
    result.technologies.some((x) => x.length > 50)
  )
    throw new Error("Invalid technology selection.");
  if (!/^banner-[1-5]$/.test(result.banner))
    throw new Error("Choose a profile banner.");
  for (const field of [
    "github",
    "x",
    "instagram",
    "linkedin",
    "website",
  ] as const) {
    if (!result[field]) continue;
    try {
      const url = new URL(result[field]);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        result[field].length > 500
      )
        throw new Error();
    } catch {
      throw new Error(`Enter a valid HTTPS link for ${field}.`);
    }
  }
  if (
    result.email &&
    (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.email) ||
      result.email.length > 254)
  )
    throw new Error("Enter a valid public contact email.");
  if (
    result.customBanner &&
    (result.customBanner.length > 700000 ||
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(
        result.customBanner,
      ))
  )
    throw new Error("Choose a smaller PNG, JPG or WebP banner.");
  if (result.customAvatar && (result.customAvatar.length > 200000 || !/^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*|https:\/\/[^\s]+)$/.test(result.customAvatar)))
    throw new Error("Choose a smaller PNG, JPG or WebP profile photo.");
  return result;
}
