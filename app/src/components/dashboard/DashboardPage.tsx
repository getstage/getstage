import { useState } from "react";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardPreview } from "@/components/dashboard/DashboardPreview";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardTimelineSelector } from "@/components/dashboard/DashboardTimelineSelector";
import { PaymentsCard } from "@/components/dashboard/PaymentsCard";
import { ProjectDock } from "@/components/dashboard/ProjectDock";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Timeline, type TimelineHorizon } from "@/components/dashboard/Timeline";
import { UpcomingTasksCard } from "@/components/dashboard/UpcomingTasksCard";
import {
  OnboardingModal,
  type OnboardingSubmission,
} from "@/components/onboarding/OnboardingModal";
import { UpgradePaywallModal } from "@/components/onboarding/UpgradePaywallModal";
import { Button } from "@/components/ui/Button";
import {
  buildDashboardMetrics,
  getPreviewFlags,
} from "@/features/dashboard/selectors";
import { useBillingSuccessEvent } from "@/features/dashboard/useBillingSuccessEvent";
import { useDashboardPreviewState } from "@/features/dashboard/useDashboardPreviewState";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { getGreeting } from "@/lib/utils";

const GOOGLE_SHEETS_GUIDE_HREF = "/help/import-transactions-via-google-sheets";

export function DashboardPage() {
  const navigate = useNavigate();
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon>("thisMonth");
  const [projectLimitPaywallOpen, setProjectLimitPaywallOpen] = useState(false);
  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
  const [paywallError, setPaywallError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();
  const dashboardData = useConvexQuery(api.dashboard.getOverview, {});
  const onboardingState = useConvexQuery(api.onboarding.getState, !user ? "skip" : {});
  const completeOnboarding = useConvexMutation(api.onboarding.completeOnboarding);
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const handleSuccessfulPaymentEvent = useConvexAction(api.billing.handleSuccessfulPaymentEvent);
  const isLoading = authLoading || dashboardData === undefined || onboardingState === undefined;
  const projects = dashboardData?.projects ?? [];
  const greetingName = user?.name?.split(" ")[0] ?? "there";
  const greeting = getGreeting(greetingName);
  const previewBaseFlags = getPreviewFlags({
    isLoading,
    userPlan: user?.plan,
    onboardingCompleted: onboardingState?.isCompleted,
    projectsLength: projects.length,
    previewStage: "onboarding",
  });
  const { previewStage, setPreviewStage } = useDashboardPreviewState({
    userId: user?.id,
    previewEligible: previewBaseFlags.previewEligible,
    onboardingCompleted: onboardingState?.isCompleted,
  });
  const previewFlags = getPreviewFlags({
    isLoading,
    userPlan: user?.plan,
    onboardingCompleted: onboardingState?.isCompleted,
    projectsLength: projects.length,
    previewStage,
  });
  const {
    activeProjects,
    tasksDue,
    completed,
    avgProgress,
    upcomingTasks,
    recentActivity,
    dockProjects,
  } = buildDashboardMetrics(projects);

  useBillingSuccessEvent({
    enabled: Boolean(user),
    onSuccess: handleSuccessfulPaymentEvent,
  });

  const handlePreviewPrimaryAction = () => {
    setPaywallError(null);
    setPreviewStage("paywall");
  };

  const handleOnboardingComplete = async (submission: OnboardingSubmission) => {
    try {
      await completeOnboarding({
        workCategory: submission.fieldOfWork,
      });
    } catch (error) {
      console.error("Could not persist onboarding state", error);
    } finally {
      setPreviewStage("preview");
    }
  };

  const handlePaywallClose = () => {
    setPaywallError(null);
    setPreviewStage("preview");
  };

  const handleProjectLimitPaywallClose = () => {
    setProjectLimitPaywallOpen(false);
    setPaywallError(null);
  };

  const handleUpgrade = async () => {
    setIsUpgradeLoading(true);
    setPaywallError(null);

    try {
      const result = await createCheckoutSession({});
      if (!result.url) {
        throw new Error("Stripe checkout URL is missing.");
      }
      window.location.assign(result.url);
    } catch (error) {
      setPaywallError(
        toUserFacingErrorMessage(error, "Could not start checkout right now. Please try again."),
      );
    } finally {
      setIsUpgradeLoading(false);
    }
  };

  const handleNewProjectClick = () => {
    if (previewFlags.hasReachedFreeProjectLimit) {
      setPaywallError(null);
      setProjectLimitPaywallOpen(true);
      return;
    }

    void navigate({ to: "/new-project" });
  };

  return (
    <>
      <Helmet>
        <title>Dashboard — Stage</title>
      </Helmet>

      {previewFlags.shouldShowPreviewExperience ? (
        <>
          <DashboardPreview
            greetingName={greetingName}
            onPrimaryAction={handlePreviewPrimaryAction}
          />

          <OnboardingModal
            open={previewStage === "onboarding"}
            userName={greetingName}
            onComplete={(submission) => {
              void handleOnboardingComplete(submission);
            }}
            googleSheetsGuideHref={GOOGLE_SHEETS_GUIDE_HREF}
          />

          <UpgradePaywallModal
            open={previewStage === "paywall"}
            onClose={handlePaywallClose}
            onUpgrade={() => {
              void handleUpgrade();
            }}
            isLoading={isUpgradeLoading}
            errorMessage={paywallError}
          />
        </>
      ) : (
        <div className="min-h-[calc(100vh-64px)]">
          <div className="mx-auto max-w-[1200px] px-6 pt-3 sm:px-10 lg:px-14">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="min-w-[320px]"
            >
              <h1 className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
                {greeting}
              </h1>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <DashboardTimelineSelector
                  value={timelineHorizon}
                  onChange={setTimelineHorizon}
                />

                <Button
                  className="h-[34px] shrink-0 rounded-[7px] px-3 text-[13px]"
                  onClick={handleNewProjectClick}
                >
                  <Plus size={11} weight="bold" aria-hidden="true" />
                  New Project
                </Button>
              </div>

              <DashboardStats
                activeProjects={activeProjects}
                tasksDue={tasksDue}
                completed={completed}
                avgProgress={avgProgress}
              />
            </motion.div>
          </div>

          {isLoading ? (
            <div className="relative left-1/2 mt-0 w-screen -translate-x-1/2">
              <div className="mx-auto h-[360px] max-w-[1400px] animate-pulse rounded-[28px] border border-border-subtle bg-white/70" />
            </div>
          ) : projects.length > 0 ? (
            <div className="relative left-1/2 mt-0 w-screen -translate-x-1/2">
              <Timeline projects={projects} horizon={timelineHorizon} />
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-[1200px] px-6 sm:mt-14 sm:px-10 lg:px-14">
              <DashboardEmptyState />
            </div>
          )}

          <div className="mx-auto max-w-[1200px] px-6 pb-[120px] sm:px-10 lg:px-14">
            <div className="mt-8 space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <UpcomingTasksCard tasks={upcomingTasks} />
                <RecentActivityCard entries={recentActivity} />
              </div>

              <PaymentsCard paymentSummary={dashboardData?.paymentSummary ?? null} />
            </div>
          </div>

          <ProjectDock projects={dockProjects} />
        </div>
      )}

      <UpgradePaywallModal
        open={projectLimitPaywallOpen}
        onClose={handleProjectLimitPaywallClose}
        onUpgrade={() => {
          void handleUpgrade();
        }}
        isLoading={isUpgradeLoading}
        errorMessage={paywallError}
      />
    </>
  );
}
