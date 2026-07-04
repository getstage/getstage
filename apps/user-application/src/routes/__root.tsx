import {
  Outlet,
  createRootRouteWithContext,
  type ErrorComponentProps,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { DesktopShell } from "@/components/app/DesktopShell";
import { ProviderRequiredProvider } from "@/components/app/ProviderRequiredDialog";
import { useDesktopSessionInvalidation } from "@/hooks/app/useDesktopSessionInvalidation";
import { useProviderRunInvalidation } from "@/hooks/app/useProviderRunInvalidation";
import { shouldHideCompanion } from "@/lib/app/chromeRules";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  errorComponent: RootErrorBoundary,
});

function RootLayout() {
  useDesktopSessionInvalidation();
  useProviderRunInvalidation();
  const location = useRouterState({ select: (state) => state.location });

  return (
    <ProviderRequiredProvider>
      <DesktopShell hideCompanion={shouldHideCompanion(location.pathname)}>
        <Outlet />
      </DesktopShell>
    </ProviderRequiredProvider>
  );
}

function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  console.error("[RootErrorBoundary]", error);

  async function signInAgain() {
    await window.stageDesktop.auth.logout();
    void router.navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-6">
      <div className="w-full max-w-[480px] rounded-[24px] border border-[#e5e5e5] bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <h1 className="text-[28px] font-semibold text-[#0a0a0a]">
          Stage needs a quick refresh
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-[#525252]">
          We could not load this view. Sign in again to reconnect your account,
          or try reloading.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="rounded-[10px] bg-[#0a0a0a] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#262626]"
            onClick={() => void signInAgain()}
          >
            Sign in again
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#f5f5f5]"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
