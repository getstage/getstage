import { useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery } from "convex/react";
import { PageLoading } from "@/components/shared/PageLoading";
import { ConnectToolStep } from "@/components/setup/ConnectToolStep";
import { Paywall } from "@/components/setup/Paywall";
import { QuestionsStep, WelcomeStep, WorkspaceStep, type SetupAnswers, type SetupStep } from "@/components/setup/SetupScreens";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";

// Web home for MCP users. Onboarding (copy of the Mac flow): welcome → questions → workspace →
// paywall (Studio/Agency) → connect your AI tool. Afterwards the Dashboard (step 16; until then the connect setup).
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

  return (
    <>
      <Helmet>
        <title>Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {state.isCompleted && paid ? (
        <ConnectToolStep />
      ) : (
        <Onboarding
          userName={user.name}
          startAt={paid ? "connect" : state.isCompleted || billing === "cancel" ? "paywall" : "welcome"}
          skipQuestions={state.hasAnswers}
          workspaceName={state.workspaceName ?? ""}
          paid={paid}
        />
      )}
    </>
  );
}

function Onboarding({ userName, startAt, skipQuestions, workspaceName, paid }: {
  userName: string;
  startAt: SetupStep;
  skipQuestions: boolean;
  workspaceName: string;
  paid: boolean;
}) {
  const [step, setStep] = useState(startAt);
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
  const [error, setError] = useState<string | null>(null);
  const onChange = (patch: Partial<SetupAnswers>) => setAnswers((current) => ({ ...current, ...patch }));
  const afterWorkspace = paid ? "connect" : "paywall";
  const finish = () => completeOnboarding({}).catch(() => setError("Could not finish setup. Try again."));

  switch (step) {
    case "welcome":
      return <WelcomeStep userName={userName} onContinue={() => setStep(skipQuestions ? "workspace" : "questions")} />;
    case "questions":
      return (
        <QuestionsStep
          answers={answers}
          onChange={onChange}
          footer={{
            continueEnabled: true,
            error: null,
            onContinue: () => {
              void saveAnswers({
                discoverySource: answers.discoverySource ?? undefined,
                discoveryHandle: answers.discoveryHandle,
                workMode: answers.workMode,
                buildFor: answers.buildFor,
              }).catch(() => undefined);
              setStep("workspace");
            },
          }}
        />
      );
    case "workspace":
      return (
        <WorkspaceStep
          answers={answers}
          onChange={onChange}
          onSkip={() => setStep(afterWorkspace)}
          footer={{
            continueEnabled: true,
            error: null,
            onContinue: () => {
              void saveAnswers({ workspaceName: answers.workspaceName, inviteEmails: answers.inviteEmails }).catch(() => undefined);
              setStep(afterWorkspace);
            },
          }}
        />
      );
    case "paywall":
      return <Paywall />;
    case "connect":
      return <ConnectToolStep footer={{ continueEnabled: true, error, onContinue: () => void finish() }} onSkip={() => void finish()} />;
  }
}
