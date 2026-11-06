import { useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery } from "convex/react";
import { Dashboard } from "@/components/mcp/Dashboard";
import { PageLoading } from "@/components/shared/PageLoading";
import { ConnectToolStep } from "@/components/setup/ConnectToolStep";
import { Paywall } from "@/components/setup/Paywall";
import { QuestionsStep, WelcomeStep, WorkspaceStep, type SetupAnswers, type SetupStep } from "@/components/setup/SetupScreens";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";

// Web home for MCP users. Onboarding (copy of the Mac flow): welcome → connect your AI tool → questions →
// workspace → paywall (Studio/Agency), then the Dashboard.
export const Route = createFileRoute("/app")({
  validateSearch: (search: Record<string, unknown>): { billing?: "success" | "cancel" } => ({
    billing: search.billing === "success" || search.billing === "cancel" ? search.billing : undefined,
  }),
  component: AppPage,
});

const MCP_PLANS = ["pro", "team"];

function AppPage() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const state = useQuery(api.onboarding.getState, isAuthenticated ? {} : "skip");
  const { billing } = Route.useSearch();

  if (isLoading || (isAuthenticated && state === undefined)) return <PageLoading />;
  if (!isAuthenticated || !user || !state) return <Navigate to="/auth" search={{ redirect: "/app" }} replace />;

  const paid = MCP_PLANS.includes(user.plan);
  // Back from Stripe: the plan switches once the webhook has run.
  if (billing === "success" && !paid) return <PageLoading />;

  const afterConnect: SetupStep = state.hasAnswers ? "workspace" : "questions";
  // Paid without finishing: they paid from the AI tool's sign-in page halfway through, so resume after connecting.
  const startAt: SetupStep = paid ? afterConnect : state.isCompleted || billing === "cancel" ? "paywall" : "welcome";

  return (
    <>
      <Helmet>
        <title>Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {state.isCompleted && paid ? (
        <Dashboard />
      ) : (
        <Onboarding userName={user.name} startAt={startAt} afterConnect={afterConnect} workspaceName={state.workspaceName ?? ""} paid={paid} />
      )}
    </>
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
