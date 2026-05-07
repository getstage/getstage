import { useState } from "react";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { AllProjectsDialog } from "@/components/dashboard/AllProjectsDialog";
import { DashboardPreview } from "@/components/dashboard/DashboardPreview";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardTimelineSelector } from "@/components/dashboard/DashboardTimelineSelector";
import { PaymentsCard } from "@/components/dashboard/PaymentsCard";
import { PipelineCard } from "@/components/dashboard/PipelineCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Timeline, type TimelineHorizon } from "@/components/dashboard/Timeline";
import { UpcomingTasksCard } from "@/components/dashboard/UpcomingTasksCard";
import {
  OnboardingModal,
  type OnboardingSubmission,
} from "@/components/onboarding/OnboardingModal";
import { UpgradePaywallModal } from "@/components/onboarding/UpgradePaywallModal";
import {
  buildDashboardMetrics,
  getPreviewFlags,
} from "@/features/dashboard/selectors";
import { useBillingSuccessEvent } from "@/features/dashboard/useBillingSuccessEvent";
import { useDashboardPreviewState } from "@/features/dashboard/useDashboardPreviewState";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import {
  getDatafastCheckoutMetadata,
  trackDatafastGoal,
  trackDatafastGoalOnce,
} from "@/lib/datafast";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { getGreeting } from "@/lib/utils";

const FEEDBACK_TALLY_URL = "https://tally.so/r/OD0gqM";

export function DashboardPage() {
  const navigate = useNavigate();
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon>("thisMonth");
  const [projectsOverviewOpen, setProjectsOverviewOpen] = useState(false);
  const [projectLimitPaywallOpen, setProjectLimitPaywallOpen] = useState(false);
  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
  const [paywallError, setPaywallError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();
  const shouldLoadDashboardData = Boolean(user);
  const shouldLoadOnboardingState = Boolean(user && user.plan !== "pro");
  const dashboardData = useConvexQuery(
    api.dashboard.getOverview,
    shouldLoadDashboardData ? {} : "skip",
  );
  const onboardingState = useConvexQuery(
    api.onboarding.getState,
    shouldLoadOnboardingState ? {} : "skip",
  );
  const completeOnboarding = useConvexMutation(api.onboarding.completeOnboarding);
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const handleSuccessfulPaymentEvent = useConvexAction(api.billing.handleSuccessfulPaymentEvent);
  const isLoading =
    authLoading ||
    dashboardData === undefined ||
    (shouldLoadOnboardingState && onboardingState === undefined);
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
      trackDatafastGoalOnce("onboarding_completed", "onboarding_completed", {
        source: "onboarding_modal",
        work_category: submission.fieldOfWork,
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
      const result = await createCheckoutSession({
        source: "dashboard_upgrade",
        ...getDatafastCheckoutMetadata(),
      });
      if (!result.url) {
        throw new Error("Stripe checkout URL is missing.");
      }
      trackDatafastGoal("checkout_started", {
        source: "dashboard_upgrade",
        billing_cycle: "yearly",
        plan: "pro",
      });
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
        <div className="flex flex-col gap-[44px]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-[18px]"
          >
            {/* Header section */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-[8px]">
                <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">
                  {greeting}
                </h1>
                <p className="text-[13px] font-medium text-[#737373]">
                  You have {activeProjects} project{activeProjects !== 1 ? "s" : ""} that need{activeProjects === 1 ? "s" : ""} your attention.
                </p>
              </div>

              <div className="flex items-center gap-[12px]">
                <DashboardTimelineSelector
                  value={timelineHorizon}
                  onChange={setTimelineHorizon}
                />

                <button
                  type="button"
                  onClick={handleNewProjectClick}
                  className="inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] pl-[10px] pr-[12px] py-[6px] text-[13px] font-medium text-[#fafafa] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
                  style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}
                >
                  <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5 brightness-0 invert" />
                  Create Project
                </button>
              </div>
            </div>

            {/* Stats cards */}
            <DashboardStats
              activeProjects={activeProjects}
              tasksDue={tasksDue}
              completed={completed}
              avgProgress={avgProgress}
            />
          </motion.div>

          {/* Timeline */}
          {isLoading ? (
            <div className="relative left-1/2 w-screen -translate-x-1/2">
              <div className="mx-auto h-[360px] max-w-[1400px] animate-pulse rounded-[28px] border border-[#f0f0f0] bg-white/70" />
            </div>
          ) : projects.length > 0 ? (
            <div className="relative left-1/2 w-screen -translate-x-1/2">
              <Timeline projects={projects} horizon={timelineHorizon} />
            </div>
          ) : (
            <DashboardEmptyState />
          )}

          {/* Dashboard cards */}
          <div className="flex flex-col gap-[8px]">
            <div className="flex flex-col gap-[8px] sm:flex-row">
              <UpcomingTasksCard tasks={upcomingTasks} />
              <RecentActivityCard entries={recentActivity} />
            </div>
            <div className="flex flex-col gap-[8px] sm:flex-row">
              <PipelineCard
                projects={projects}
                onOpenAllProjects={() => setProjectsOverviewOpen(true)}
              />
              <PaymentsCard paymentSummary={dashboardData?.paymentSummary ?? null} />
            </div>
          </div>

          {/* Feedback link */}
          <a
            href={FEEDBACK_TALLY_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Share feedback"
            title="Share feedback"
            className="group fixed right-4 z-30 hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:right-6 sm:block bottom-[max(96px,calc(env(safe-area-inset-bottom)+24px))] md:bottom-[max(24px,calc(env(safe-area-inset-bottom)+20px))]"
          >
            <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-[rgba(21,21,32,0.08)] bg-white px-3 py-2 text-[12px] font-medium text-[#0a0a0a] opacity-0 shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
              Share feedback
            </span>
            <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[rgba(135,130,245,0.26)] bg-[#151520] p-2.5 shadow-[0_18px_40px_rgba(21,21,32,0.22)] transition-transform duration-150 group-hover:-translate-y-0.5">
              <img
                src="/apple-touch-icon.png"
                alt=""
                aria-hidden="true"
                className="h-full w-full rounded-full object-cover"
              />
            </span>
          </a>

          <AllProjectsDialog
            open={projectsOverviewOpen}
            projects={projects}
            onOpenChange={setProjectsOverviewOpen}
          />
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
