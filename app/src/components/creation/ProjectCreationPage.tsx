import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { StepCard } from "@/components/creation/CreationChrome";
import { GeneratingState, SuccessState } from "@/components/creation/CreationStates";
import { MethodStep } from "@/components/creation/steps/MethodStep";
import { PhasesStep } from "@/components/creation/steps/PhasesStep";
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
        <div className="absolute inset-x-0 top-0 z-10 mx-auto w-full max-w-[1200px] px-6 pt-6 sm:px-10 lg:px-14">
          <Link
            to="/dashboard"
            className="inline-flex w-fit items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>

        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6 py-20 sm:px-10 lg:px-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[420px]"
          >
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
          clientAvatar={creation.clientAvatar}
          existingClients={creation.existingClients}
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          fileInputRef={creation.fileInputRef}
          projectImageInputRef={creation.projectImageInputRef}
          onProjectNameChange={creation.setProjectName}
          onProjectImageChange={creation.setProjectImage}
          onClientAvatarChange={creation.handleClientAvatarChange}
          onProjectImageFileChange={creation.handleProjectImageFileChange}
          onAvatarFileChange={creation.handleAvatarFileChange}
          onClientModeChange={creation.setClientMode}
          onExistingClientSelect={(clientName) => {
            const client = creation.existingClients.find((item) => item.name === clientName);
            if (!client) {
              creation.setClientMode("new");
              return;
            }
            creation.selectExistingClient(client);
          }}
          onClientNameChange={creation.setClientName}
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
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          onMethodChange={creation.setMethod}
          onContinue={creation.handleContinue}
          onBack={creation.goBack}
        />
      );
    case "4a":
      return (
        <TimelineStep
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          startDate={creation.startDate}
          endDate={creation.endDate}
          continueLabel="Generate roadmap"
          onStartDateChange={creation.setStartDate}
          onEndDateChange={creation.setEndDate}
          onContinue={creation.handleContinue}
          onBack={creation.goBack}
        />
      );
    case "4m":
      return (
        <PhasesStep
          phases={creation.phases}
          editingPhaseId={creation.editingPhaseId}
          canContinue={creation.canContinue}
          currentIndex={creation.currentIndex}
          steps={creation.steps}
          onEditingPhaseIdChange={creation.setEditingPhaseId}
          onTogglePhase={creation.togglePhase}
          onAddPhase={creation.addPhase}
          onRenamePhase={creation.renamePhase}
          onRemovePhase={creation.removePhase}
          onDragStart={creation.handleDragStart}
          onDrop={creation.handleDrop}
          onDragEnd={creation.handleDragEnd}
          onContinue={creation.handleContinue}
          onBack={creation.goBack}
        />
      );
    case "4mb":
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
