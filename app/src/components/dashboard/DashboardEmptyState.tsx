import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/Button";

type DashboardEmptyStateProps = {
  onCreate?: () => void;
};

export function DashboardEmptyState({ onCreate }: DashboardEmptyStateProps) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[20px] border border-border-subtle bg-white px-8 py-14 sm:min-h-[440px] sm:px-12">
      <h2 className="mb-2 font-heading text-[20px] font-medium text-text-primary">
        No projects yet.
      </h2>
      <p className="mb-8 max-w-[420px] text-center text-[15px] text-text-secondary">
        Create your first project to get started.
      </p>
      {onCreate ? (
        <Button onClick={onCreate}>Create your first project</Button>
      ) : (
        <Link
          to="/new-project"
          className="inline-flex h-11 items-center justify-center rounded-[10px] bg-accent px-6 text-[15px] font-medium text-white transition-all duration-150 hover:bg-accent-hover active:brightness-95"
        >
          Create your first project
        </Link>
      )}
    </div>
  );
}
