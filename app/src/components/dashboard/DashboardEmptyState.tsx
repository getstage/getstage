import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/Button";

export function DashboardEmptyState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[16px] border border-border-subtle bg-white">
      <h2 className="mb-2 font-heading text-[20px] font-medium text-text-primary">
        No projects yet.
      </h2>
      <p className="mb-6 text-[15px] text-text-secondary">
        Create your first project to get started.
      </p>
      <Link to="/new-project">
        <Button>Create your first project</Button>
      </Link>
    </div>
  );
}
