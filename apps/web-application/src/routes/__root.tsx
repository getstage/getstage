import {
  createRootRouteWithContext,
  Outlet,
  redirect,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { getWebRouteLockRedirect } from "@/lib/webRoutePolicy";

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ location }) => {
    const lockRedirect = getWebRouteLockRedirect(location.pathname);

    if (lockRedirect) {
      throw redirect({ to: lockRedirect, replace: true });
    }
  },
  component: RootLayout,
  errorComponent: RootErrorBoundary,
});

function RootLayout() {
  return <Outlet />;
}

function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-[480px] rounded-[24px] border border-border-subtle bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <h1 className="font-heading text-[28px] font-semibold text-text-primary">
          Something went wrong
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
          {toUserFacingErrorMessage(
            error,
            "We could not load this page right now. Please try again in a moment.",
          )}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="rounded-[10px] bg-text-primary px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-text-primary/90"
            onClick={() => reset()}
          >
            Try again
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-border px-4 py-2 text-[14px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
            onClick={() => window.location.assign("/auth")}
          >
            Go to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
