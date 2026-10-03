import { createFileRoute } from "@tanstack/react-router";
import { UseCasesIndexPage } from "@/components/marketing/UseCasePages";

export const Route = createFileRoute("/use-cases/")({
  component: UseCasesIndexPage,
});
