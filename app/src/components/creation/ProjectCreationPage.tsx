import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { StepCard, StepDots } from "@/components/creation/CreationChrome";
import { GeneratingState, SuccessState } from "@/components/creation/CreationStates";
import { MethodStep } from "@/components/creation/steps/MethodStep";
import { ProjectBasicsStep } from "@/components/creation/steps/ProjectBasicsStep";
import { ProjectTypeStep } from "@/components/creation/steps/ProjectTypeStep";
import { RoadmapStep } from "@/components/creation/steps/RoadmapStep";
import { TimelineStep } from "@/components/creation/steps/TimelineStep";
import { useProjectCreation } from "@/hooks/useProjectCreation";

export function ProjectCreationPage() {
  const creation = useProjectCreation();

  return (
    <>
      <Helmet>
        <title>New Project — Stage</title>
      </Helmet>

      <div className="relative min-h-[calc(100vh-64px)] bg-bg">
        <div className="absolute inset-x-0 top-0 z-10 mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-10 sm:pt-6 lg:px-14">
          <Link
            to="/dashboard"
            className="inline-flex w-fit items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>

        <div className="flex min-h-[calc(100vh-64px)] items-start justify-center px-4 py-14 sm:px-10 sm:py-20 lg:px-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[520px]"
          >
            {creation.step !== "success" && !creation.isGenerating ? (
              <div className="mb-7">
                <img src={stageLogo} alt="Stage" className="mb-7 h-[22px] w-auto" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.3px] text-text-primary">
                      Create a new project
                    </h2>
                    <p className="mt-1.5 text-[14px] leading-normal text-text-secondary">
                      Set up the basics to get started
                    </p>
                  </div>
                  <div className="pt-3 shrink-0">
                    <StepDots steps={creation.steps} currentIndex={creation.currentIndex} />
                  </div>
                </div>
              </div>
            ) : null}

            {creation.errorMessage ? (
              <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                {creation.errorMessage}
              </div>
            ) : null}

            <StepCard>{renderStepContent(creation)}</StepCard>
          </motion.div>
        </div>
      </div>
    </>
  );
}

type ProjectCreationState = ReturnType<typeof useProjectCreation>;

function renderStepContent(creation: ProjectCreationState) {
  if (creation.isGenerating) {
    return <GeneratingState />;
  }

  if (creation.step === "success") {
    return <SuccessState onViewProject={creation.handleViewProject} />;
  }

  switch (creation.step) {
    case 1:
      return (
        <ProjectBasicsStep
          projectName={creation.projectName}
          projectImage={creation.projectImage}
          clientMode={creation.clientMode}
          selectedExistingClientName={creation.selectedExistingClientName}
          clientName={creation.clientName}
          clientEmail={creation.clientEmail}
          clientAvatar={creation.clientAvatar}
          existingClients={creation.existingClients}
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          fileInputRef={creation.fileInputRef}
          projectImageInputRef={creation.projectImageInputRef}
          onProjectNameChange={creation.setProjectName}
          onProjectImageChange={creation.setProjectImage}
          onProjectImageFileChange={creation.handleProjectImageFileChange}
          onClientModeChange={creation.setClientMode}
          onExistingClientSelect={creation.selectExistingClient}
          onClientNameChange={creation.setClientName}
          onClientEmailChange={creation.setClientEmail}
          onClientAvatarChange={creation.setClientAvatar}
          onAvatarFileChange={creation.handleAvatarFileChange}
          onContinue={creation.handleContinue}
        />
      );
    case 2:
      return (
        <ProjectTypeStep
          projectType={creation.projectType}
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          onProjectTypeChange={creation.setProjectType}
          onContinue={creation.handleContinue}
          onBack={creation.goBack}
        />
      );
    case 3:
      return (
        <MethodStep
          method={creation.method}
          phases={creation.phases}
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          onMethodChange={creation.setMethod}
          onTogglePhase={creation.togglePhase}
          onDragStart={creation.handleDragStart}
          onDrop={creation.handleDrop}
          onDragEnd={creation.handleDragEnd}
          onContinue={creation.handleContinue}
          onBack={creation.goBack}
        />
      );
    case 4:
      return (
        <TimelineStep
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          startDate={creation.startDate}
          endDate={creation.endDate}
          continueLabel="Continue"
          onStartDateChange={creation.setStartDate}
          onEndDateChange={creation.setEndDate}
          onContinue={creation.handleContinue}
          onBack={creation.goBack}
        />
      );
    case "overview":
      return (
        <RoadmapStep
          roadmap={creation.roadmap}
          canContinue={creation.canContinue}
          isCreating={creation.isCreating}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          onContinue={creation.handleContinue}
          onBack={creation.goBack}
        />
      );
    default:
      return null;
  }
}
