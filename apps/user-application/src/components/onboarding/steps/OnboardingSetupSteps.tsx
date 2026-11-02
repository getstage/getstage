import { useState, type ReactNode } from "react";
import { Plus } from "@phosphor-icons/react";
import {
  FigmaLabel,
  FigmaOnboardingFrame,
  FigmaSection,
  FigmaStepHeader,
  figmaFieldClass,
} from "@/components/onboarding/OnboardingFigmaPrimitives";
import type { OnboardingAnswers } from "@/features/onboarding/model";
import type { UseProjectDraftResult } from "@/features/project-creation/useProjectDraft";
import { cn } from "@/lib/utils";
import type { ProjectCategory } from "@/types";

// STA-64 Mac onboarding screens, Figma "mac - new onboarding" (2254:15902):
// Contact + Work 2254:16231, Workspace and team 2254:16477, Project 2254:16537.

type AnswersProps = { answers: OnboardingAnswers; onChange: (patch: Partial<OnboardingAnswers>) => void };

const SOURCES = [
  { id: "instagram", label: "Instagram", handle: "Instagram Profile" },
  { id: "tiktok", label: "Tiktok", handle: "TikTok Profile" },
  { id: "x", label: "X/Twitter", handle: "X Profile" },
  { id: "youtube", label: "Youtube", handle: "YouTube Channel" },
  { id: "google", label: "Google" },
  { id: "friend", label: "Friend/colleague" },
  { id: "other", label: "Other", handle: "Where exactly?" },
] as const;

const Divider = () => <div className="my-4 h-px bg-[#E5E5E5]" />;

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-full border-[0.5px] px-2.5 py-1 text-[12px] font-medium transition-colors",
        selected ? "border-[#8D87FF] bg-[#F0EFFF] text-[#463FBA]" : "border-[#E5E5E5] bg-[#F5F5F5] text-[#262626] hover:bg-white",
      )}
    >
      {children}
    </button>
  );
}

function Radio<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: ReadonlyArray<{ id: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map((option) => (
        <label key={option.id} className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[#262626]">
          <input type="radio" name={name} checked={value === option.id} onChange={() => onChange(option.id)} className="size-3.5 accent-[#171717]" />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export function QuestionsStep({ answers, onChange }: AnswersProps) {
  const source = SOURCES.find((entry) => entry.id === answers.discoverySource);
  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader step="questions" title="A few quick questions" subtitle="So Stage fits how you work." />
      <div className="mt-6 space-y-3">
        <FigmaSection label="Where did you find Stage?">
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map((entry) => (
              <Pill key={entry.id} selected={answers.discoverySource === entry.id} onClick={() => onChange({ discoverySource: entry.id, discoveryHandle: "" })}>
                {entry.label}
              </Pill>
            ))}
          </div>
          {source && "handle" in source ? (
            <>
              <Divider />
              <FigmaLabel>{source.handle}</FigmaLabel>
              <input
                value={answers.discoveryHandle}
                onChange={(event) => onChange({ discoveryHandle: event.target.value })}
                placeholder={source.id === "other" ? "e.g. a newsletter or podcast" : "@username"}
                className={figmaFieldClass}
              />
            </>
          ) : null}
        </FigmaSection>
        <FigmaSection label="How you work">
          <FigmaLabel>I work</FigmaLabel>
          <Radio name="I work" value={answers.workMode} options={[{ id: "solo", label: "Solo" }, { id: "team", label: "With a team" }]} onChange={(workMode) => onChange({ workMode })} />
          <Divider />
          <FigmaLabel>I build</FigmaLabel>
          <Radio name="I build" value={answers.buildFor} options={[{ id: "client", label: "Client work" }, { id: "own", label: "My own products" }]} onChange={(buildFor) => onChange({ buildFor })} />
        </FigmaSection>
      </div>
    </FigmaOnboardingFrame>
  );
}

export function WorkspaceStep({ answers, onChange }: AnswersProps) {
  const [email, setEmail] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const add = () => {
    if (!valid) return;
    const next = email.trim().toLowerCase();
    if (!answers.inviteEmails.includes(next)) onChange({ inviteEmails: [...answers.inviteEmails, next] });
    setEmail("");
  };
  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader step="workspace" title="Create your workspace" subtitle="Your projects and team live here." />
      <div className="mt-6">
        <FigmaSection>
          <FigmaLabel>Workspace Name</FigmaLabel>
          <input
            autoFocus
            value={answers.workspaceName}
            onChange={(event) => onChange({ workspaceName: event.target.value })}
            placeholder="Baseframe Studio"
            className={figmaFieldClass}
          />
          <Divider />
          <FigmaLabel>Invite Teammates</FigmaLabel>
          <form
            className="flex items-center gap-1 rounded-[6px] bg-[#F5F5F5] pr-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
            onSubmit={(event) => {
              event.preventDefault();
              add();
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@gmail.com"
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[12px] font-medium text-[#525252] outline-none placeholder:text-[#737373]"
            />
            <button type="submit" disabled={!valid} className="flex items-center gap-1 rounded-[6px] bg-[#171717] px-2.5 py-1.5 text-[12px] font-medium text-white disabled:bg-[#A3A3A3]">
              <Plus size={14} aria-hidden="true" /> Add
            </button>
          </form>
          {answers.inviteEmails.length ? (
            <ul className="mt-2 flex flex-wrap gap-1">
              {answers.inviteEmails.map((invite) => (
                <li key={invite} className="flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-2.5 py-1 text-[12px] font-medium text-[#262626]">
                  {invite}
                  <button type="button" aria-label={`Remove ${invite}`} onClick={() => onChange({ inviteEmails: answers.inviteEmails.filter((entry) => entry !== invite) })} className="text-[#737373] hover:text-[#171717]">×</button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-[12px] text-[#525252]">
            {answers.workMode === "solo" ? "You picked solo, you can invite later." : "Invites go out once you've picked a plan."}
          </p>
        </FigmaSection>
      </div>
    </FigmaOnboardingFrame>
  );
}

const BUILD_TYPES: ReadonlyArray<{ id: ProjectCategory; label: string }> = [
  { id: "web-apps", label: "Web app" },
  { id: "websites", label: "Website" },
  { id: "ios-apps", label: "iOS app" },
];
const START_FROM = [
  { id: "idea", label: "A product idea", placeholder: "Describe your idea in a few lines" },
  { id: "brief", label: "A client brief", placeholder: "Paste the client brief" },
  { id: "site", label: "An existing site", placeholder: "https://" },
] as const;

export function FirstProjectStep({ answers, onChange, draftState }: AnswersProps & { draftState: UseProjectDraftResult }) {
  const { draft } = draftState;
  const start = START_FROM.find((entry) => entry.id === answers.startFrom) ?? START_FROM[0];
  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader step="project" title="Create your first Project" subtitle="Stage starts Research from what you give it here." />
      <div className="mt-6">
        <FigmaSection>
          <FigmaLabel>Project Name</FigmaLabel>
          <input
            autoFocus
            value={draft.projectName}
            onChange={(event) => draftState.setProjectName(event.target.value)}
            placeholder="My first project"
            className={figmaFieldClass}
          />
          <Divider />
          <FigmaLabel>What are you building?</FigmaLabel>
          <Radio
            name="What are you building?"
            value={(draft.projectType ?? "") as ProjectCategory}
            options={BUILD_TYPES}
            onChange={(projectType) => draftState.setProjectType(projectType)}
          />
          <Divider />
          <FigmaLabel>Start from</FigmaLabel>
          <Radio name="Start from" value={answers.startFrom} options={START_FROM} onChange={(startFrom) => onChange({ startFrom })} />
          {start.id === "site" ? (
            <input
              type="url"
              value={answers.projectDescription}
              onChange={(event) => onChange({ projectDescription: event.target.value })}
              placeholder={start.placeholder}
              className={cn(figmaFieldClass, "mt-3")}
            />
          ) : (
            <textarea
              value={answers.projectDescription}
              onChange={(event) => onChange({ projectDescription: event.target.value })}
              placeholder={start.placeholder}
              className={cn(figmaFieldClass, "mt-3 h-[68px] resize-none py-2.5")}
            />
          )}
        </FigmaSection>
      </div>
    </FigmaOnboardingFrame>
  );
}

// Figma "Open" (2254:15903): someone who set up their profile on the web.
export function WelcomeBackStep({ userName }: { userName?: string }) {
  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader step="welcome" title={`Welcome back${userName ? `, ${userName.split(" ")[0]}` : ""}!`} subtitle="You've already created your profile on the web and it's set up, so we can skip those questions." showProgress={false} />
    </FigmaOnboardingFrame>
  );
}
