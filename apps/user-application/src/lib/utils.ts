import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGreeting(name: string, options?: { nowTimestamp?: number }) {
  const hour = new Date(options?.nowTimestamp ?? Date.now()).getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export { formatRelativeTime, getInitials, readFileAsDataUrl } from "@stage/project-ui";

