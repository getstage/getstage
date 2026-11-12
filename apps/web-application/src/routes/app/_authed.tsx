import { useRef, useState } from "react";
import { Navigate, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery } from "convex/react";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider";
import { AppShell } from "@/components/mcp/AppShell";
import { PageLoading } from "@/components/shared/PageLoading";
import { ConnectToolStep } from "@/components/setup/ConnectToolStep";
import { Paywall } from "@/components/setup/Paywall";
import { QuestionsStep, WelcomeStep, WorkspaceStep, type SetupAnswers, type SetupStep } from "@/components/setup/SetupScreens";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { hasMcpPlan } from "@/lib/mcp";
import { WebPlatformProvider } from "@/lib/platform";

// Layout for every signed-in web page (/app and everything under it), like steppsai-total's app/_authed.
// It checks sign-in, onboarding and plan once; the shell then stays mounted while the pages under it change.
// Onboarding (copy of the Mac flow): welcome → connect your AI tool → questions → workspace → paywall.
export const Route = createFileRoute("/app/_authed")({
  validateSearch: (search: Record<string, unknown>): { billing?: "success" | "cancel" } => ({
    billing: search.billing === "success" || search.billing === "cancel" ? search.billing : undefined,
  }),
  component: AppLayout,
});

function AppLayout() {
  const { isLoading, isAuthenticated, user: viewer } = useAuth();
  const onboarding = useQuery(api.onboarding.getState, isAuthenticated ? {} : "skip");
  const { billing } = Route.useSearch();
  const { pathname } = useLocation();
  // Convex Auth briefly reports "loading" while it refreshes the session. Keep the app mounted with the
  // last known account then; swapping every page for a spinner looked like a reload and lost page state.
  const known = useRef<{ user: NonNullable<typeof viewer>; state: NonNullable<typeof onboarding> } | null>(null);
  const loading = isLoading || (isAuthenticated && onboarding === undefined);
  if (!loading) known.current = isAuthenticated && viewer && onboarding ? { user: viewer, state: onboarding } : null;

  if (!known.current) return loading ? <PageLoading /> : <Navigate to="/auth" search={{ redirect: pathname }} replace />;
  const { user, state } = known.current;

  const paid = hasMcpPlan(user.plan);
  // Back from Stripe: the plan switches once the webhook has run.
  if (billing === "success" && !paid) return <PageLoading />;

  if (!state.isCompleted || !paid) {
    const afterConnect: SetupStep = state.hasAnswers ? "workspace" : "questions";
    // Paid without finishing: they paid from the AI tool's sign-in page halfway through, so resume after connecting.
    const startAt: SetupStep = paid ? afterConnect : state.isCompleted || billing === "cancel" ? "paywall" : "welcome";
    return (
      <>
        <Helmet><title>Stage</title><meta name="robots" content="noindex, nofollow" /></Helmet>
        <Onboarding userName={user.name} startAt={startAt} afterConnect={afterConnect} workspaceName={state.workspaceName ?? ""} paid={paid} />
      </>
    );
  }

  // The cache keeps each page's queries alive for a few minutes after leaving it, so going back is instant.
  return (
    <ConvexQueryCacheProvider>
      <WebPlatformProvider>
        <AppShell>
          <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
          <Outlet />
        </AppShell>
      </WebPlatformProvider>
    </ConvexQueryCacheProvider>
  );
}

function Onboarding({ userName, startAt, afterConnect, workspaceName, paid }: {
  userName: string;
  startAt: SetupStep;
  afterConnect: SetupStep;
  workspaceName: string;
  paid: boolean;
}) {
  const [step, setStep] = useState(startAt);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<SetupAnswers>({
    discoverySource: null,
    discoveryHandle: "",
    workMode: "solo",
    buildFor: "client",
    workspaceName,
    inviteEmails: [],
  });
  const saveAnswers = useMutation(api.onboarding.saveAnswers);
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);
  const onChange = (patch: Partial<SetupAnswers>) => setAnswers((current) => ({ ...current, ...patch }));
  const footer = (onContinue: () => void) => ({ continueEnabled: true, error, onContinue });
  // Onboarding counts as done before Stripe opens, as on the Mac; paid users are done after the workspace.
  const finishWorkspace = () => {
    if (!paid) return setStep("paywall");
    completeOnboarding({}).catch(() => setError("Could not finish setup. Try again."));
  };

  switch (step) {
    case "welcome":
      return <WelcomeStep userName={userName} onContinue={() => setStep("connect")} />;
    case "connect":
      return <ConnectToolStep footer={footer(() => setStep(afterConnect))} />;
    case "questions":
      return (
        <QuestionsStep
          answers={answers}
          onChange={onChange}
          footer={footer(() => {
            void saveAnswers({
              discoverySource: answers.discoverySource ?? undefined,
              discoveryHandle: answers.discoveryHandle,
              workMode: answers.workMode,
              buildFor: answers.buildFor,
            }).catch(() => undefined);
            setStep("workspace");
          })}
        />
      );
    case "workspace":
      return (
        <WorkspaceStep
          answers={answers}
          onChange={onChange}
          onSkip={finishWorkspace}
          footer={footer(() => {
            void saveAnswers({ workspaceName: answers.workspaceName, inviteEmails: answers.inviteEmails }).catch(() => undefined);
            finishWorkspace();
          })}
        />
      );
    case "paywall":
      return <Paywall beforeCheckout={() => completeOnboarding({})} />;
  }
}
