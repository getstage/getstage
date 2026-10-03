import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/marketing/ContentPage";

// Content pages at getstage.co/<slug>. Fixed routes (/download, /blog, …) take
// precedence; unknown slugs are redirected to / by the root route policy.
export const Route = createFileRoute("/$slug")({
  component: ContentPageRoute,
});

function ContentPageRoute() {
  const { slug } = Route.useParams();
  return <ContentPage slug={slug} />;
}
