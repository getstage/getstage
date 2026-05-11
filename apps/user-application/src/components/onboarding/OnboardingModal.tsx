import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { OnboardingStepRenderer } from "@/components/onboarding/OnboardingStepRenderer";
import { StepDots } from "@/components/onboarding/OnboardingPrimitives";
import type { OnboardingStepId, OnboardingSubmission } from "@/features/onboarding/model";
import { useOnboardingController } from "@/features/onboarding/useOnboardingController";
import { cn } from "@/lib/utils";

export type { OnboardingSubmission } from "@/features/onboarding/model";

const SETUP_PROGRESS_STEPS: OnboardingStepId[] = [
  "details",
  "client",
  "method",
  "timeline",
];

type OnboardingModalProps = {
  open: boolean;
  userName?: string;
  onComplete: (submission: OnboardingSubmission) => void;
};

function getStepHeader(step: OnboardingStepId): { title: string; subtitle: string } {
  switch (step) {
    case "welcome":
      return {
        title: "",
        subtitle: "",
      };
    case "claude":
      return {
        title: "Set up Claude",
        subtitle: "Connect Claude to power conversations, reasoning, and content generation in your workspace.",
      };
    case "details":
    case "client":
    case "method":
    case "timeline":
      return {
        title: "Create a new project",
        subtitle: "Set up the basics to get started",
      };
    case "integrations":
      return {
        title: "Bring your project to life",
        subtitle: "Connect your tools to sync files, tasks, and updates",
      };
    default:
      return { title: "", subtitle: "" };
  }
}

export function OnboardingModal({
  open,
  userName,
  onComplete,
}: OnboardingModalProps) {
  const controller = useOnboardingController({
    open,
    onComplete,
  });

  const { title: headerTitle, subtitle: headerSubtitle } = getStepHeader(controller.step);
  const showChrome = false;
  const setupProgressIndex = SETUP_PROGRESS_STEPS.indexOf(controller.step);
  const showStepDots = setupProgressIndex >= 0;
  const showContinueBar =
    controller.step !== "creating" &&
    controller.step !== "preview" &&
    controller.step !== "claude" &&
    controller.step !== "paywall";
  const showCreateProjectLater =
    controller.step === "details" ||
    controller.step === "project-type" ||
    controller.step === "method" ||
    controller.step === "timeline";
  const isFullscreenStep = true;

  return (
    <Dialog.Root open={open} onOpenChange={() => undefined}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-50 bg-[rgba(25,24,42,0.54)] backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={controller.isClosing ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: controller.isClosing ? 0.52 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          />
        </Dialog.Overlay>

        <Dialog.Content
          asChild
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <motion.div
            className={cn(
              "project-creation-page onboarding-modal timeline-scrollbar-hidden fixed z-50 overscroll-contain bg-white outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0",
              controller.step === "preview" ? "overflow-hidden" : "overflow-y-auto",
              isFullscreenStep
                ? "inset-0 h-dvh max-h-none w-screen shadow-none"
                : "inset-x-0 bottom-0 max-h-[92svh] w-full rounded-t-[22px] px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[0_28px_90px_rgba(10,12,22,0.26)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100svh-40px)] sm:w-[calc(100%-32px)] sm:max-w-[844px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[22px] sm:px-9 sm:pt-9 sm:pb-8",
            )}
            initial={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" }}
            animate={
              controller.isClosing
                ? { opacity: 0, y: 28, scale: 0.94, filter: "blur(12px)" }
                : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            }
            transition={{ duration: controller.isClosing ? 0.58 : 0.44, ease: [0.16, 1, 0.3, 1] }}
          >
            <Dialog.Title className="sr-only">Stage onboarding</Dialog.Title>
            <Dialog.Description className="sr-only">
              Set up your workspace, project, and integrations.
            </Dialog.Description>

            {showChrome ? (
              <div className="mb-7">
                <img src={stageLogo} alt="Stage" className="mb-7 h-[22px] w-auto" />
                {headerTitle || headerSubtitle || showStepDots ? (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {headerTitle ? (
                        <h2 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.3px] text-text-primary">
                          {headerTitle}
                        </h2>
                      ) : null}
                      {headerSubtitle ? (
                        <p className="mt-1.5 text-[14px] leading-normal text-text-secondary">
                          {headerSubtitle}
                        </p>
                      ) : null}
                    </div>
                    {showStepDots ? (
                      <div className="shrink-0 pt-3">
                        <StepDots total={SETUP_PROGRESS_STEPS.length} current={setupProgressIndex} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                isFullscreenStep &&
                  cn(
                    "mx-auto flex w-full flex-col items-center justify-center overflow-visible",
                    controller.step !== "preview"
                      ? "min-h-[calc(100dvh-16px)] px-4 py-10 sm:py-[72px]"
                      : "h-full",
                  ),
              )}
            >
              <div className={cn("relative z-10 w-full", controller.step === "preview" ? "h-full" : "flex flex-col items-center justify-center")}>
                <AnimatePresence mode="wait" initial={false}>
                  <OnboardingStepRenderer
                    step={controller.step}
                    userName={userName}
                    fieldOfWork={controller.fieldOfWork}
                    onSelectField={controller.handleSelectField}
                    draftState={controller.draftState}
                    stepError={controller.stepError}
                    creationReady={controller.creationReady}
                    isCheckoutLoading={controller.isCheckoutLoading}
                    checkoutError={controller.checkoutError}
                    claudeConnection={controller.claudeConnection}
                    claudeSetupHref={controller.claudeSetupHref}
                    claudeInstallCommand={controller.claudeInstallCommand}
                    claudeConnectionId={controller.claudeConnectionId}
                    onClaudeActivated={controller.handleContinue}
                    onContinue={controller.handleContinue}
                    onCreationDone={() => controller.setStep("paywall")}
                    onContinueFree={() => controller.setStep("celebrating")}
                  />
                </AnimatePresence>
              </div>

              {showContinueBar ? (
                <div className="relative z-0 mt-3 w-[min(516px,calc(100vw-40px))]">
                  {controller.stepError ? (
                    <p className="mb-3 text-[13px] leading-normal text-destructive">
                      {controller.stepError}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    className={cn(
                      "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-5 text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-default disabled:opacity-45 focus:outline-none",
                      "h-9",
                    )}
                    disabled={!controller.continueEnabled}
                    onClick={controller.handleContinue}
                  >
                    <span>
                      {controller.step === "welcome"
                        ? "Start Setup"
                        : controller.step === "celebrating"
                          ? "Continue"
                          : controller.step === "integrations"
                            ? "Get Started"
                            : "Continue"}
                    </span>
                    <ArrowRight size={16} weight="bold" />
                  </button>

                  {showCreateProjectLater ? (
                    <button
                      type="button"
                      className="mt-2 inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-[6px] border border-[#E5E5E5] bg-white px-5 text-[13px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F5F5] focus:outline-none"
                      onClick={controller.handleDoLater}
                    >
                      Create project later
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
