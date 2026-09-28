import { createFileRoute } from "@tanstack/react-router";
import { BlogIndexPage } from "@/components/marketing/BlogPages";

export const Route = createFileRoute("/blog/")({
  component: BlogIndexPage,
});
