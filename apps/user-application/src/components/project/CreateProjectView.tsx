import { useNavigate } from "@tanstack/react-router";
import stageLogoLight from "@/assets/logos/stage-logo-light.png";
import { BasicDetailsStep } from "./create/BasicDetailsStep";
import { ClientDetailsStep } from "./create/ClientDetailsStep";
import { ArrowLeftIcon } from "./create/CreateProjectPrimitives";
import { ProjectCreatedStep } from "./create/ProjectCreatedStep";
import { ProjectTypeStep } from "./create/ProjectTypeStep";
import { RoadmapStep } from "./create/RoadmapStep";
import { TimelineStep } from "./create/TimelineStep";
import { useCreateProjectFlow } from "@/hooks/project/useCreateProjectFlow";
import { setProjectBackDestination } from "@/lib/projectBackDestination";

export function CreateProjectView() {
  const navigate = useNavigate();
  const flow = useCreateProjectFlow();
  const { draftState, draft } = flow;
  const creationSteps = ["basic", "client", "type", "timeline", "roadmap"] as const;

  function goBackToStep(stepIndex: number) {
    const targetStep = creationSteps[stepIndex];
    if (targetStep) flow.setStep(targetStep);
  }

  if (flow.step === "success") {
    return (
      <ProjectCreatedStep
        onViewProject={() => {
          setProjectBackDestination({ href: "/projects/create", label: "Back to create project" });
          void navigate({
            to: "/project/$projectId",
            params: { projectId: flow.createdProjectId ?? "" },
          });
        }}
      />
    );
  }

  async function onCreateProject() {
    const result = await flow.handleCreateProject();
    if (result?.upgradeRequired) {
      void navigate({ to: "/" });
    }
  }

  return (
    <main className="flex h-screen items-start overflow-hidden bg-white p-[8px]">
      <section className="flex h-full flex-1 flex-col items-center overflow-y-auto rounded-[12px] bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
        <div className="flex min-h-full w-full max-w-[460px] flex-col items-start justify-between py-[100px]">
          <div className="flex w-full shrink-0 items-start">
            <button
              type="button"
              onClick={() => void navigate({ to: "/" })}
              className="flex cursor-pointer items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#a3a3a3] transition-colors hover:text-[#525252]"
            >
              <ArrowLeftIcon />
              <span>Back to dashboard</span>
            </button>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-[32px] py-[44px]">
            <img
              src={stageLogoLight}
              alt="Stage"
              className="h-[23px] w-auto object-contain"
            />

            {flow.step === "basic" ? (
              <BasicDetailsStep
                projectName={draft.projectName}
                projectImageLabel={flow.projectImageLabel}
                error={flow.basicDetailsError}
                onProjectNameChange={(value) => {
                  draftState.setProjectName(value);
                  flow.setBasicDetailsError(null);
                }}
                onProjectImageFileChange={(event) => void draftState.handleProjectImageFileChange(event)}
                onPickProjectImage={() => draftState.projectImageInputRef.current?.click()}
                onContinue={flow.continueFromBasicDetails}
                inputRef={draftState.projectImageInputRef}
              />
            ) : flow.step === "client" ? (
              <ClientDetailsStep
                clientMode={draft.clientMode}
                selectedExistingClientId={flow.selectedExistingClientId}
                existingClients={flow.existingClients}
                clientName={draft.clientName}
                clientEmail={draft.clientEmail}
                clientAvatar={draft.clientAvatar}
                hasPendingAvatarFile={Boolean(draft.pendingAvatarFile)}
                error={flow.clientDetailsError}
                onClientModeChange={flow.selectClientMode}
                onExistingClientSelect={flow.selectExistingClient}
                onClientNameChange={(value) => {
                  draftState.setClientName(value);
                  flow.setClientDetailsError(null);
                }}
                onClientEmailChange={(value) => {
                  draftState.setClientEmail(value);
                  flow.setClientDetailsError(null);
                }}
                onAvatarFileChange={(event) => void draftState.handleAvatarFileChange(event)}
                onClearAvatar={() => draftState.setClientAvatar(null)}
                onPickClientPhoto={() => draftState.fileInputRef.current?.click()}
                onContinue={flow.continueFromClientDetails}
                onStepSelect={goBackToStep}
                inputRef={draftState.fileInputRef}
              />
            ) : flow.step === "type" ? (
              <ProjectTypeStep
                selectedProjectType={draft.projectType}
                typeOtherLabel={draft.typeOtherLabel}
                onProjectTypeChange={draftState.setProjectType}
                onTypeOtherLabelChange={draftState.setTypeOtherLabel}
                onContinue={() => {
                  if (
                    draft.projectType === "other" &&
                    draft.typeOtherLabel.trim().length === 0
                  ) {
                    return;
                  }
                  flow.setStep("timeline");
                }}
                onStepSelect={goBackToStep}
              />
            ) : flow.step === "timeline" ? (
              <TimelineStep
                startDate={draft.startDate}
                endDate={draft.endDate}
                error={flow.timelineError}
                onStartDateChange={(value) => {
                  draftState.setStartDate(value);
                  flow.setTimelineError(null);
                }}
                onEndDateChange={(value) => {
                  draftState.setEndDate(value);
                  flow.setTimelineError(null);
                }}
                onContinue={flow.continueFromTimeline}
                onStepSelect={goBackToStep}
              />
            ) : (
              <RoadmapStep
                mode={flow.roadmapMode}
                manualPhases={flow.manualPhases}
                enabledPhases={flow.enabledPhases}
                addingPhase={flow.addingPhase}
                newPhaseName={flow.newPhaseName}
                onModeChange={flow.setRoadmapMode}
                onPhaseToggle={flow.togglePhaseByName}
                onAddPhaseStart={() => flow.setAddingPhase(true)}
                onNewPhaseNameChange={flow.setNewPhaseName}
                onAddPhase={flow.addManualPhase}
                onCreateProject={() => void onCreateProject()}
                onStepSelect={goBackToStep}
                isCreating={flow.isCreatingProject}
                error={flow.createError}
              />
            )}
          </div>

          <div className="flex w-full shrink-0 items-center justify-center opacity-0">
            <p className="w-[261px] text-[13px] font-medium leading-[1.5] text-[#525252]">
              A better way to organize your creative work starts here.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
