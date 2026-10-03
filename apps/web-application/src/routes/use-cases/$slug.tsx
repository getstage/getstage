import { createFileRoute } from "@tanstack/react-router";
import { UseCasePage } from "@/components/marketing/UseCasePages";

export const Route = createFileRoute("/use-cases/$slug")({
  component: UseCaseRoute,
});

function UseCaseRoute() {
  const { slug } = Route.useParams();
  return <UseCasePage slug={slug} />;
}
