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
  googleSheetsGuideHref?: string | null;
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
  googleSheetsGuideHref,
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
              "project-creation-page onboarding-modal timeline-scrollbar-hidden fixed z-50 overflow-y-auto overscroll-contain bg-white outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0",
              isFullscreenStep
                ? "inset-0 h-dvh max-h-none w-screen border border-[#F5F5F5] p-2 shadow-none"
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
                  "mx-auto flex min-h-[calc(100dvh-16px)] w-full flex-col items-center justify-center overflow-visible px-4 py-10 sm:py-[72px]",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <OnboardingStepRenderer
                  step={controller.step}
                  userName={userName}
                  googleSheetsGuideHref={googleSheetsGuideHref}
                  fieldOfWork={controller.fieldOfWork}
                  onSelectField={controller.handleSelectField}
                  draftState={controller.draftState}
                  stepError={controller.stepError}
                  sheetUrl={controller.sheetUrl}
                  csvConnected={controller.csvConnected}
                  csvImported={controller.csvImported}
                  csvImporting={controller.csvImporting}
                  creationReady={controller.creationReady}
                  isCheckoutLoading={controller.isCheckoutLoading}
                  checkoutError={controller.checkoutError}
                  existingClients={controller.existingClients}
                  claudeConnection={controller.claudeConnection}
                  claudeSetupHref={controller.claudeSetupHref}
                  claudeInstallCommand={controller.claudeInstallCommand}
                  claudeConnectionId={controller.claudeConnectionId}
                  onClaudeActivated={controller.handleContinue}
                  onSheetUrlChange={controller.setSheetUrl}
                  onToggleCsvConnection={controller.handleToggleCsvConnection}
                  onLinkSheetUrl={controller.handleLinkSheetUrl}
                  onContinue={controller.handleContinue}
                  onCreationDone={() => controller.setStep("paywall")}
                  onContinueFree={() => controller.setStep("celebrating")}
                />
              </AnimatePresence>

              {showContinueBar ? (
                <div className="mt-3 w-[min(516px,calc(100vw-40px))]">
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

                  {controller.step !== "welcome" && controller.step !== "personalise" ? (
                    <div className="mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={controller.goBack}
                        className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary focus:outline-none"
                      >
                        Back
                      </button>

                      {controller.step === "details" ? (
                        <button
                          type="button"
                          onClick={controller.handleDoLater}
                          className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary focus:outline-none"
                        >
                          I&apos;ll do this later
                        </button>
                      ) : null}
                    </div>
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
