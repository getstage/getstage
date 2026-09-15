import { createFileRoute, redirect } from "@tanstack/react-router";
import { ApiDocsPage } from "@/components/api-docs/ApiDocsPage";

export const Route = createFileRoute("/docs")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: ApiDocsPage,
});
