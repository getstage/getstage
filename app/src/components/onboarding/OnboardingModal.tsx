import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { OnboardingStepRenderer } from "@/components/onboarding/OnboardingStepRenderer";
import { StepDots } from "@/components/onboarding/OnboardingPrimitives";
import type { OnboardingSubmission } from "@/features/onboarding/model";
import { useOnboardingController } from "@/features/onboarding/useOnboardingController";

export type { OnboardingSubmission } from "@/features/onboarding/model";

type OnboardingModalProps = {
  open: boolean;
  userName?: string;
  onComplete: (submission: OnboardingSubmission) => void;
  googleSheetsGuideHref?: string | null;
};

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
            className="project-creation-page onboarding-modal timeline-scrollbar-hidden fixed inset-x-0 bottom-0 z-50 max-h-[92svh] w-full overflow-y-auto overscroll-contain rounded-t-[22px] bg-white px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[0_28px_90px_rgba(10,12,22,0.26)] outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100svh-40px)] sm:w-[calc(100%-32px)] sm:max-w-[760px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[22px] sm:p-6 md:p-7"
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

            {controller.step === "welcome" ? (
              <div className="mb-5 flex justify-end">
                <StepDots total={controller.flowSteps.length} current={controller.currentIndex} />
              </div>
            ) : null}

            {controller.step !== "creating" && controller.step !== "welcome" ? (
              <div className="mb-8 flex items-center justify-between">
                <Dialog.Title className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
                  Get started
                </Dialog.Title>
                <StepDots total={controller.flowSteps.length} current={controller.currentIndex} />
              </div>
            ) : null}

            <AnimatePresence mode="wait" initial={false}>
              <OnboardingStepRenderer
                step={controller.step}
                userName={userName}
                googleSheetsGuideHref={googleSheetsGuideHref}
                fieldOfWork={controller.fieldOfWork}
                onSelectField={controller.handleSelectField}
                draftState={controller.draftState}
                previewRoadmap={controller.draftState.roadmap}
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
                onSheetUrlChange={controller.setSheetUrl}
                onToggleCsvConnection={controller.handleToggleCsvConnection}
                onLinkSheetUrl={controller.handleLinkSheetUrl}
                onCreationDone={() => controller.setStep("paywall")}
                onContinueFree={controller.handleContinueFree}
                onUpgrade={(billingCycle) => {
                  void controller.handlePaywallUpgrade(billingCycle);
                }}
              />
            </AnimatePresence>

            {controller.step !== "creating" &&
            controller.step !== "generating-roadmap" &&
            controller.step !== "paywall" ? (
              <div className="mt-8">
                {controller.stepError ? (
                  <p className="mb-3 text-[13px] leading-normal text-destructive">
                    {controller.stepError}
                  </p>
                ) : null}

                <button
                  type="button"
                  className="h-[50px] w-full cursor-pointer rounded-[12px] bg-text-primary px-5 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45 focus:outline-none"
                  disabled={!controller.continueEnabled}
                  onClick={controller.handleContinue}
                >
                  {controller.step === "welcome"
                    ? "Start setup"
                    : controller.step === "integrations"
                      ? "Create Dashboard"
                      : "Continue"}
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
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
