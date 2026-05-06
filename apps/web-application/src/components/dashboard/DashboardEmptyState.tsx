import { Link } from "@tanstack/react-router";

type DashboardEmptyStateProps = {
  onCreate?: () => void;
};

export function DashboardEmptyState({ onCreate }: DashboardEmptyStateProps) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[10px] bg-gradient-to-b from-white to-[#fafafa] px-8 py-14 shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] sm:min-h-[440px] sm:px-12">
      <h2 className="mb-2 text-[20px] font-medium text-[#0a0a0a]">
        No projects yet.
      </h2>
      <p className="mb-8 max-w-[420px] text-center text-[15px] text-[#737373]">
        Create your first project to get started.
      </p>
      {onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] px-6 text-[15px] font-medium text-white shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
        >
          Create your first project
        </button>
      ) : (
        <Link
          to="/new-project"
          className="inline-flex h-11 items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] px-6 text-[15px] font-medium text-white shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
        >
          Create your first project
        </Link>
      )}
    </div>
  );
}
