import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { StepCard, StepDots } from "@/components/creation/CreationChrome";
import { GeneratingState, SuccessState } from "@/components/creation/CreationStates";
import { ClientStep } from "@/components/creation/steps/ClientStep";
import { MethodStep } from "@/components/creation/steps/MethodStep";
import { ProjectBasicsStep } from "@/components/creation/steps/ProjectBasicsStep";
import { ProjectTypeStep } from "@/components/creation/steps/ProjectTypeStep";
import { TimelineStep } from "@/components/creation/steps/TimelineStep";
import { useProjectCreation } from "@/hooks/useProjectCreation";

export function ProjectCreationPage() {
  const creation = useProjectCreation();

  return (
    <>
      <Helmet>
        <title>New Project — Stage</title>
      </Helmet>

      <div className="relative min-h-[calc(100vh-160px)] overflow-hidden rounded-[8px] bg-white">
        <div className="pointer-events-none absolute inset-y-0 left-1/3 hidden border-l border-dashed border-[#E5E5E5] md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-1/3 hidden border-l border-dashed border-[#E5E5E5] md:block" />

        <div className="flex min-h-[calc(100vh-160px)] items-start justify-center px-4 py-14 sm:px-10 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-[450px]"
          >
            {creation.step !== "success" && !creation.isGenerating ? (
              <div className="mb-5">
                <Link
                  to="/dashboard"
                  className="mb-20 inline-flex w-fit items-center gap-1 text-[13px] text-[#A3A3A3] transition-colors hover:text-text-primary"
                >
                  <ArrowLeft size={14} />
                  Back to dashboard
                </Link>
                <img src={stageLogo} alt="Stage" className="mb-7 h-[22px] w-auto" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.3px] text-text-primary">
                      {getStepTitle(creation.step)}
                    </h2>
                    <p className="mt-1.5 text-[14px] leading-normal text-text-secondary">
                      {getStepSubtitle(creation.step)}
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
type StepValue = ProjectCreationState["step"];

function getStepTitle(step: StepValue): string {
  switch (step) {
    case 1:
      return "Create New Project";
    case 2:
      return "Client Details";
    case 3:
      return "What is the primary project type?";
    case 4:
      return "Project timeline";
    case 5:
      return "Build your roadmap";
    default:
      return "Create a new project";
  }
}

function getStepSubtitle(step: StepValue): string {
  switch (step) {
    case 1:
      return "Let's set it up. This only takes a minute.";
    case 2:
      return "Who is this project for?";
    case 3:
      return "Pick the closest match for the roadmap. You can still work across multiple disciplines.";
    case 4:
      return "When does this project start and end?";
    case 5:
      return "How do you want to structure this project?";
    default:
      return "Set up the basics to get started";
  }
}

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
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          projectImageInputRef={creation.projectImageInputRef}
          onProjectNameChange={creation.setProjectName}
          onProjectImageChange={creation.setProjectImage}
          onProjectImageFileChange={creation.handleProjectImageFileChange}
          onContinue={creation.handleContinue}
        />
      );
    case 2:
      return (
        <ClientStep
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
          onClientModeChange={creation.setClientMode}
          onExistingClientSelect={(name) => {
            const client = creation.existingClients.find((c) => c.name === name);
            if (client) creation.selectExistingClient(client);
          }}
          onClientNameChange={creation.setClientName}
          onClientEmailChange={creation.setClientEmail}
          onClientAvatarChange={creation.setClientAvatar}
          onAvatarFileChange={creation.handleAvatarFileChange}
          onContinue={creation.handleContinue}
          onBack={creation.goBack}
        />
      );
    case 3:
      return (
        <ProjectTypeStep
          projectType={creation.projectType}
          typeOtherLabel={creation.typeOtherLabel}
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          onProjectTypeChange={creation.setProjectType}
          onTypeOtherLabelChange={creation.setTypeOtherLabel}
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
    case 5:
      return (
        <MethodStep
          method={creation.method}
          phases={creation.phases}
          roadmap={creation.roadmap}
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          onMethodChange={creation.setMethod}
          onTogglePhase={creation.togglePhase}
          onDragStart={creation.handleDragStart}
          onDrop={creation.handleDrop}
          onDragEnd={creation.handleDragEnd}
          continueLabel={creation.isCreating ? "Creating..." : "Create Project"}
          onContinue={creation.handleContinue}
          onBack={creation.goBack}
        />
      );
    default:
      return null;
  }
}
