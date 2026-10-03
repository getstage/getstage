import { createFileRoute } from "@tanstack/react-router";
import { BlogPostPage } from "@/components/marketing/BlogPages";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostRoute,
});

function BlogPostRoute() {
  const { slug } = Route.useParams();
  return <BlogPostPage slug={slug} />;
}
