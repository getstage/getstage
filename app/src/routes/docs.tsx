import { createFileRoute } from "@tanstack/react-router";
import { ApiDocsPage } from "@/components/api-docs/ApiDocsPage";

export const Route = createFileRoute("/docs")({
  component: ApiDocsPage,
});
