import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { setProjectBackDestination } from "@/lib/projectBackDestination";

const TASK_SECTIONS = [
  {
    title: "Redesign Onboarding Flow for First-Time Users",
    body: "The goal of this task is to rethink and redesign the onboarding experience for new users entering the product for the first time. Currently, the onboarding flow introduces too many steps too quickly, resulting in confusion, friction, and a significant drop-off before users reach their first meaningful interaction. Early user feedback suggests that while the product itself is valuable, the initial experience fails to communicate that value effectively.",
  },
  {
    title: "Typography",
    body: "This task focuses on refining the typography used throughout the onboarding process. Consistent and readable typography ensures a smooth and engaging experience for new users. We will explore different font pairings, sizes, and styles to optimize readability and visual appeal, aligning with the overall design language of BaseFrame.",
    bullets: ["Inter", "Letter Spacing - 0%", "Line Height - 120% or 150%", "Captions/Labels - 12px, medium."],
  },
  {
    title: "User Research",
    body: "To enhance the onboarding experience, we need to conduct thorough user research. This will involve interviews and surveys with new users to understand their expectations and challenges. We aim to identify the specific pain points during the onboarding process and gather insights on how users perceive the product's value.",
    attachment: true,
  },
  {
    title: "Simplified Flow",
    body: "We propose a simplified onboarding flow that reduces the number of steps required to get started. By prioritizing key actions and minimizing unnecessary information, we can create a more intuitive and engaging experience that encourages users to interact with the platform sooner.",
  },
  {
    title: "Visual Cues",
    body: "Incorporating visual cues and interactive elements can guide users through the onboarding process. This may include tooltips, progress indicators, and engaging animations that highlight important features. The goal is to make the experience feel more dynamic and less overwhelming.",
  },
  {
    title: "Feedback Mechanism",
    body: "Integrating a feedback mechanism within the onboarding process will allow users to share their thoughts in real-time. This could be in the form of quick surveys or emotive reactions, helping us gather actionable insights and iterate on the onboarding flow continuously.",
  },
  {
    title: "Personalization",
    body: "Personalizing the onboarding experience based on user demographics or interests can enhance engagement. By tailoring the content and recommendations to fit the user's profile, we can create a more relevant and compelling introduction to the product.",
  },
  {
    title: "Case Studies",
    body: "Highlighting success stories or case studies during onboarding can demonstrate the product's value in a practical context. By showcasing real-world applications and testimonials, new users can better understand how to leverage the product to meet their needs.",
  },
];

export function TaskDetailsView() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authed/tasks/$taskId" });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const backLabel =
    search.from === "project"
      ? "Back to Project"
      : search.from === "client-portal"
        ? "Back to Client Portal"
      : "Back to Tasks";
  const taskBackHref = typeof window === "undefined" ? "/tasks" : `${window.location.pathname}${window.location.search}`;

  function goBack() {
    if (search.from === "project" && search.projectId) {
      void navigate({ to: "/project/$projectId", params: { projectId: search.projectId } });
      return;
    }

    if (search.from === "client-portal" && search.projectId) {
      void navigate({ to: "/client-portal/$projectId/preview", params: { projectId: search.projectId } });
      return;
    }

    void navigate({ to: "/tasks" });
  }

  function openLinkedProject() {
    if (!search.projectId) return;
    setProjectBackDestination({ href: taskBackHref, label: "Back to task" });
    void navigate({ to: "/project/$projectId", params: { projectId: search.projectId } });
  }

  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <>
      <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
        <div className="flex w-full flex-col gap-[44px]">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex w-fit items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#a3a3a3] transition-colors hover:text-[#525252]"
          >
            <ArrowLeftIcon />
            {backLabel}
          </button>

          <header className="flex min-w-0 items-end justify-between gap-[12px]">
            <div className="flex min-w-0 flex-col gap-[12px]">
              <h1 className="truncate text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">
                Complete Kickoff Questionnaire
              </h1>
              <div className="flex min-w-0 flex-wrap items-center gap-[16px]">
                <MetaItem>
                  <img src="/logos/dashboard/task-assignee-pratik.png" alt="" className="h-[20px] w-[20px] shrink-0 rounded-full object-cover" />
                  Pratik Singh
                </MetaItem>
                <Dot />
                <MetaItem>
                  <MaskedIcon src="/logos/dashboard/deadline.svg" className="h-[18px] w-[18px] bg-[#525252]" />
                  28/03/2026
                </MetaItem>
                <Dot />
                <span className="rounded-[4px] bg-[#fee2e2] px-[6px] py-[2px] text-[12px] font-normal leading-none text-[#dc2626]">
                  Overdue
                </span>
              </div>
            </div>

            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                className="flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[6px] bg-[#f5f5f5] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee]"
                aria-label="Task actions"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                <DotsIcon />
              </button>
              {isMenuOpen ? (
                <TaskActionsMenu
                  onComplete={() => setIsMenuOpen(false)}
                  onDelete={() => {
                    setIsMenuOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                />
              ) : null}
            </div>
          </header>

          <article className="rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="rounded-[8px] bg-white px-[clamp(18px,8vw,100px)] py-[clamp(32px,7vw,72px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <div className="flex flex-col gap-[44px]">
                {TASK_SECTIONS.map((section) => (
                  <section key={section.title} className="flex flex-col gap-[8px]">
                    <h2 className="text-[15px] font-medium leading-none text-[#171717]">{section.title}</h2>
                    <p className="text-[13px] font-normal leading-[1.5] text-[#262626]">{section.body}</p>
                    {section.bullets ? (
                      <ul className="mt-[4px] list-disc space-y-[4px] pl-[20px] text-[13px] font-normal leading-[1.5] text-[#262626]">
                        {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                      </ul>
                    ) : null}
                    {section.attachment ? <AttachmentCard /> : null}
                  </section>
                ))}
                <div className="h-px w-full bg-[#e5e5e5]" />
                <button type="button" className="flex h-[32px] w-fit items-center gap-[8px] rounded-[6px] py-[6px] text-[13px] font-medium leading-none text-[#525252]">
                  <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px]" />
                  Attach File
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
      {isDeleteModalOpen ? (
        <DeleteTaskModal
          onCancel={() => setIsDeleteModalOpen(false)}
          onDelete={goBack}
        />
      ) : null}
    </>
  );
}

function TaskActionsMenu({ onComplete, onDelete }: { onComplete: () => void; onDelete: () => void }) {
  return (
    <div
      role="menu"
      aria-label="Task actions"
      className="absolute right-0 top-[40px] z-50 flex w-[212px] flex-col gap-[8px] rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] bg-gradient-to-b from-white to-[#fafafa] p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
    >
      <button type="button" role="menuitem" onClick={onComplete} className="flex w-full items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left text-[12px] font-medium leading-none text-[#262626] transition-colors hover:bg-[#f5f5f5]">
        <CheckIcon />
        Mark as completed
      </button>
      <div className="h-px w-full bg-[#e5e5e5]" />
      <button type="button" role="menuitem" onClick={onDelete} className="flex w-full items-center rounded-[6px] px-[8px] py-[6px] text-left text-[12px] font-medium leading-none text-[#dc2626] transition-colors hover:bg-[#fef2f2]">
        Delete Task
      </button>
    </div>
  );
}

function DeleteTaskModal({ onCancel, onDelete }: { onCancel: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/10 px-[16px] py-[20px] backdrop-blur-[2px]">
      <button type="button" aria-label="Cancel delete task" className="absolute inset-0 cursor-default" onClick={onCancel} />
      <section role="dialog" aria-modal="true" aria-labelledby="delete-task-title" className="relative z-[91] flex w-full max-w-[510px] flex-col gap-[24px] rounded-[8px] bg-white p-[20px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-[24px]">
          <WarningIcon />
          <div className="flex flex-col gap-[4px] text-[#171717]">
            <h2 id="delete-task-title" className="text-[15px] font-semibold leading-none">
              Are you sure you want to delete the task?
            </h2>
            <p className="text-[12px] font-normal leading-[1.5]">
              You are about to delete this task. Once deleted, it cannot be recovered. Please confirm that you have saved all necessary information before proceeding.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <button type="button" onClick={onCancel} className="rounded-[6px] bg-[#f5f5f5] px-[16px] py-[8px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            Cancel
          </button>
          <button type="button" onClick={onDelete} className="rounded-[6px] border border-[#f87171] bg-gradient-to-b from-[#ef4444] to-[#dc2626] py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}>
            Delete Task
          </button>
        </div>
      </section>
    </div>
  );
}

function MetaItem({ children }: { children: ReactNode }) {
  return <span className="flex items-center gap-[8px] text-[13px] font-medium leading-[1.2] text-[#525252]">{children}</span>;
}

function Dot() {
  return <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-[#d4d4d4]" />;
}

function AttachmentCard() {
  return (
    <div className="mt-[8px] w-full max-w-[348px] rounded-[12px] bg-[#f5f5f5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]">
      <div className="flex items-center justify-between rounded-[10px] bg-white px-[16px] py-[8px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-w-0 items-start gap-[8px]">
          <MaskedIcon src="/logos/dashboard/upload-from-device.svg" className="h-[20px] w-[20px] shrink-0 bg-[#525252]" />
          <div className="flex min-w-0 flex-col gap-[4px]">
            <p className="truncate text-[13px] font-medium leading-none text-[#171717]">Example.fig</p>
            <div className="flex items-center gap-[12px] text-[12px] font-medium leading-none text-[#737373]">
              <span>Figma File</span>
              <Dot />
              <span>Shared</span>
              <Dot />
              <span>2.3MB</span>
            </div>
          </div>
        </div>
        <MaskedIcon src="/logos/dashboard/upload-from-device.svg" className="h-[18px] w-[18px] shrink-0 bg-[#737373]" />
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />;
}

function DotsIcon() {
  return <img src="/logos/dashboard/dots.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px]" />;
}

function MaskedIcon({ src, className }: { src: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        mask: `url(${src}) center / contain no-repeat`,
        WebkitMask: `url(${src}) center / contain no-repeat`,
      }}
    />
  );
}

function CheckIcon() {
  return <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0"><path d="M3 7.1 5.7 9.8 11 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function WarningIcon() {
  return <MaskedIcon src="/logos/dashboard/warning.svg" className="h-[32px] w-[32px] bg-[#ef4444]" />;
}
