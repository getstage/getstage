import { useState, type ReactNode } from "react";
import { ArrowRight, Plus } from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import friendsIcon from "@/assets/onboarding/icons/friends.svg";
import googleIcon from "@/assets/onboarding/icons/google.svg";
import instagramIcon from "@/assets/onboarding/icons/instagram.svg";
import tiktokIcon from "@/assets/onboarding/icons/tiktok.svg";
import xIcon from "@/assets/onboarding/icons/x.svg";
import youtubeIcon from "@/assets/onboarding/icons/youtube.svg";
import welcomePanel from "@/assets/onboarding/welcome-panel.png";
import { cn } from "@/lib/utils";

// Copy of the Mac onboarding screens (apps/user-application/src/components/onboarding/steps/OnboardingSetupSteps.tsx,
// Figma "mac - new onboarding" 2254:15902) for the web MCP flow. Keep both in step until they share a package.

export type SetupStep = "welcome" | "questions" | "workspace" | "paywall" | "connect";

export type SetupAnswers = {
  discoverySource: string | null;
  discoveryHandle: string;
  workMode: "solo" | "team";
  buildFor: "client" | "own";
  workspaceName: string;
  inviteEmails: string[];
};

type AnswersProps = { answers: SetupAnswers; onChange: (patch: Partial<SetupAnswers>) => void };

export type SetupFooterProps = {
  continueEnabled: boolean;
  onContinue: () => void;
  error: string | null;
};

const PROGRESS_STEPS: SetupStep[] = ["questions", "workspace", "connect"];

const fieldClass =
  "w-full rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] px-3 py-2.5 text-[12px] font-medium text-[#525252] shadow-[0_1px_4px_-2.5px_rgba(10,10,10,0.5)] outline-none transition-colors placeholder:text-[#737373] focus:bg-white";
const labelClass = "text-[13px] font-medium text-[#171717]";
export const secondaryButtonClass =
  "shrink-0 rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] px-3 py-1.5 text-[12px] font-medium text-[#525252] shadow-[0_1px_4px_-2.5px_rgba(10,10,10,0.5)] transition-colors enabled:hover:bg-white disabled:cursor-default";

function SetupProgress({ step }: { step: SetupStep }) {
  const current = PROGRESS_STEPS.indexOf(step);
  return (
    <div className="flex shrink-0 items-center gap-1" aria-label={`Step ${current + 1} of ${PROGRESS_STEPS.length}`}>
      {PROGRESS_STEPS.map((item, index) => (
        <span
          key={item}
          className={cn(
            "h-1.5 w-8 rounded-[2px]",
            index <= current ? "bg-gradient-to-r from-[#8D87FF] via-[rgba(141,135,255,0.75)] to-[#8D87FF]" : "bg-[#E7E6FD]",
          )}
        />
      ))}
    </div>
  );
}

function ContinueButton({ label = "Continue", enabled, onClick }: { label?: string; enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-2.5 pl-2.5 pr-3 text-[13px] font-medium text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)] transition-opacity hover:opacity-95 disabled:cursor-default disabled:opacity-45"
    >
      {label}
      <ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}

// The page frame shared by the setup screens: grey edge, white card, centered column.
export function SetupScreen({
  step,
  title,
  footer,
  secondaryAction,
  wide = false,
  children,
}: {
  step?: SetupStep;
  title?: string;
  footer?: SetupFooterProps;
  secondaryAction?: { label: string; onClick: () => void };
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full bg-[#F5F5F5] p-1">
      <div className="flex flex-1 rounded-[8px] border border-[#F5F5F5] bg-white p-2">
        <div className={cn("mx-auto flex flex-col justify-center py-[100px]", wide ? "w-[min(960px,100%)]" : "w-[min(516px,100%)]")}>
          <div className="flex flex-col gap-8 py-[22px]">
            <img src={stageLogo} alt="Stage" className="h-[23px] w-fit" />
            <div className="flex flex-col gap-6">
              {title ? (
                <div className="flex items-end gap-2.5">
                  <h3 className="flex-1 text-balance text-[21px] font-semibold leading-[1.2] text-[#0A0A0A]">{title}</h3>
                  {step && PROGRESS_STEPS.includes(step) ? <SetupProgress step={step} /> : null}
                </div>
              ) : null}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">{children}</div>
                {footer?.error ? <p role="alert" className="text-[13px] text-destructive">{footer.error}</p> : null}
                {footer ? <ContinueButton enabled={footer.continueEnabled} onClick={footer.onContinue} /> : null}
                {secondaryAction ? (
                  <button type="button" onClick={secondaryAction.onClick} className="w-full py-2.5 text-[13px] text-[#737373] hover:text-[#525252]">
                    {secondaryAction.label}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SetupSection({ label, className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1 rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-1 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
      {label ? <h4 className="px-3 py-2 text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{label}</h4> : null}
      <div className={cn("flex flex-col gap-5 rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white p-3 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]", className)}>
        {children}
      </div>
    </section>
  );
}

const Divider = () => <hr className="h-px border-0 bg-[#E5E5E5]" />;

export function RadioDot({ checked, emptyClassName = "bg-[#E5E5E5]" }: { checked: boolean; emptyClassName?: string }) {
  return checked ? (
    <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A]">
      <span className="size-1.5 rounded-full bg-[#FAFAFA]" />
    </span>
  ) : (
    <span className={cn("size-3.5 shrink-0 rounded-full border-[0.5px] border-[#D4D4D4]", emptyClassName)} />
  );
}

function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className={labelClass}>{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-4">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            onClick={() => onChange(option.id)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#171717]"
          >
            <RadioDot checked={value === option.id} />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Welcome (Figma "Open") ────────────────────────────────────────────────────────────

export function WelcomeStep({ userName, onContinue }: { userName?: string; onContinue: () => void }) {
  const firstName = userName?.split(" ")[0];
  return (
    <div className="flex min-h-dvh w-full bg-[#F5F5F5] p-1">
      <div className="flex flex-1 rounded-[8px] border border-[#F5F5F5] bg-white p-2">
        <div className="flex flex-1 px-6 lg:px-[72px]">
          <div className="flex flex-1 flex-col justify-center">
            <div className="flex flex-col gap-8 py-[22px]">
              <img src={stageLogo} alt="Stage" className="h-[23px] w-fit" />
              <div className="flex flex-col gap-2.5">
                <h3 className="text-[21px] font-semibold leading-[1.2] text-[#0A0A0A]">
                  {firstName ? `Welcome to Stage, ${firstName}!` : "Welcome to Stage!"}
                </h3>
                <p className="text-balance text-[13px] font-medium leading-[1.5] text-[#525252]">
                  Your account is ready. Connect Stage to your AI tool and it reads and saves your Stage projects.
                </p>
              </div>
              <ContinueButton enabled onClick={onContinue} />
            </div>
          </div>
        </div>
        <div className="hidden w-[min(846px,58%)] shrink-0 overflow-hidden rounded-[12px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] lg:block">
          <img src={welcomePanel} alt="" className="size-full object-cover object-left" />
        </div>
      </div>
    </div>
  );
}

// ── Questions (Figma "Contact + Work") ─────────────────────────────────────────────────

const SOURCES = [
  { id: "instagram", label: "Instagram", icon: instagramIcon, handle: "Instagram Profile" },
  { id: "tiktok", label: "Tiktok", icon: tiktokIcon, handle: "TikTok Profile" },
  { id: "x", label: "X/Twitter", icon: xIcon, handle: "X Profile" },
  { id: "youtube", label: "Youtube", icon: youtubeIcon, handle: "YouTube Channel" },
  { id: "google", label: "Google", icon: googleIcon },
  { id: "friend", label: "Friend/colleague", icon: friendsIcon },
  { id: "other", label: "Other", handle: "Where exactly?" },
] as const;

export function QuestionsStep({ answers, onChange, footer }: AnswersProps & { footer: SetupFooterProps }) {
  const source = SOURCES.find((entry) => entry.id === answers.discoverySource);
  return (
    <SetupScreen step="questions" title="A few quick questions" footer={footer}>
      <SetupSection label="Where did you find Stage?">
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((entry) => {
            const selected = answers.discoverySource === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ discoverySource: entry.id, discoveryHandle: "" })}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border-[0.5px] px-2.5 py-1 text-[13px] font-medium shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)] transition-colors",
                  selected ? "border-[#463FBA] bg-[rgba(123,118,223,0.15)] text-[#463FBA]" : "border-[#D4D4D4] bg-[#F5F5F5] text-[#171717] hover:bg-white",
                )}
              >
                {"icon" in entry ? <img src={entry.icon} alt="" /> : null}
                {entry.label}
              </button>
            );
          })}
        </div>
        {source && "handle" in source ? (
          <>
            <Divider />
            <label className="flex flex-col gap-2">
              <span className={labelClass}>{source.handle}</span>
              <input
                value={answers.discoveryHandle}
                onChange={(event) => onChange({ discoveryHandle: event.target.value })}
                placeholder={source.id === "other" ? "e.g. a newsletter or podcast" : "@username"}
                className={fieldClass}
              />
            </label>
          </>
        ) : null}
      </SetupSection>
      <SetupSection label="How you work">
        <RadioGroup label="I work" value={answers.workMode} options={[{ id: "solo", label: "Solo" }, { id: "team", label: "With a team" }]} onChange={(workMode) => onChange({ workMode })} />
        <Divider />
        <RadioGroup label="I Build" value={answers.buildFor} options={[{ id: "client", label: "Client work" }, { id: "own", label: "My own products" }]} onChange={(buildFor) => onChange({ buildFor })} />
      </SetupSection>
    </SetupScreen>
  );
}

// ── Workspace (Figma "Workspace and team") ─────────────────────────────────────────────

export function WorkspaceStep({ answers, onChange, footer, onSkip }: AnswersProps & { footer: SetupFooterProps; onSkip: () => void }) {
  const [email, setEmail] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const add = () => {
    if (!valid) return;
    const next = email.trim().toLowerCase();
    if (!answers.inviteEmails.includes(next)) onChange({ inviteEmails: [...answers.inviteEmails, next] });
    setEmail("");
  };
  return (
    <SetupScreen step="workspace" title="Create your workspace" footer={footer} secondaryAction={{ label: "Skip for now", onClick: onSkip }}>
      <SetupSection>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Workspace Name</span>
          <input
            autoFocus
            value={answers.workspaceName}
            onChange={(event) => onChange({ workspaceName: event.target.value })}
            placeholder="Baseframe Studio"
            className={fieldClass}
          />
        </label>
        <Divider />
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Invite Teammates</span>
          <form
            className="flex items-center justify-between rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] py-1 pl-3 pr-1 shadow-[0_1px_4px_-2.5px_rgba(10,10,10,0.5)]"
            onSubmit={(event) => {
              event.preventDefault();
              add();
            }}
          >
            <input
              type="email"
              aria-label="Teammate email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@gmail.com"
              className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#525252] outline-none placeholder:text-[#737373]"
            />
            <button
              type="submit"
              disabled={!valid}
              className="flex items-center gap-1.5 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] py-1.5 pl-2 pr-3 text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] disabled:opacity-50"
            >
              <Plus size={16} aria-hidden="true" /> Add
            </button>
          </form>
          {answers.inviteEmails.length ? (
            <ul className="flex flex-wrap gap-1">
              {answers.inviteEmails.map((invite) => (
                <li key={invite} className="flex items-center gap-1.5 rounded-full border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] px-2.5 py-1 text-[12px] font-medium text-[#171717]">
                  {invite}
                  <button type="button" aria-label={`Remove ${invite}`} onClick={() => onChange({ inviteEmails: answers.inviteEmails.filter((entry) => entry !== invite) })} className="text-[#737373] hover:text-[#171717]">×</button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[12px] text-[#525252]">
            {answers.workMode === "solo" ? "You picked solo, you can invite later." : "Invites go out once you've picked a plan."}
          </p>
        </div>
      </SetupSection>
    </SetupScreen>
  );
}
