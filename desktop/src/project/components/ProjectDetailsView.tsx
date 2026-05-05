import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";

const mockProjectDetails = {
  name: "BaseFrame Product Design",
  owner: "Pratik Singh",
  dueDate: "28/03/2026",
  status: "Overdue",
  title: "Redesign Onboarding Flow for First-Time Users",
  intro:
    "The goal of this task is to rethink and redesign the onboarding experience for new users entering the product for the first time. Currently, the onboarding flow introduces too many steps too quickly, resulting in confusion, friction, and a significant drop-off before users reach their first meaningful interaction. Early user feedback suggests that while the product itself is valuable, the initial experience fails to communicate that value effectively.",
  sections: [
    {
      title: "Typography",
      body:
        "This task focuses on refining the typography used throughout the onboarding process. Consistent and readable typography ensures a smooth and engaging experience for new users. We will explore different font pairings, sizes, and styles to optimize readability and visual appeal, aligning with the overall design language of BaseFrame.",
      bullets: ["Inter", "Letter Spacing - 0%", "Line Height - 120% or 150%", "Captions/Labels - 12px, medium."],
    },
    {
      title: "User Research",
      body:
        "To enhance the onboarding experience, we need to conduct thorough user research. This will involve interviews and surveys with new users to understand their expectations and challenges. We aim to identify the specific pain points during the onboarding process and gather insights on how users perceive the product's value.",
      attachment: {
        name: "Example.fig",
        type: "Figma File",
        state: "Shared",
        size: "2.3MB",
      },
    },
    {
      title: "Simplified Flow",
      body:
        "We propose a simplified onboarding flow that reduces the number of steps required to get started. By prioritizing key actions and minimizing unnecessary information, we can create a more intuitive and engaging experience that encourages users to interact with the platform sooner.",
    },
    {
      title: "Visual Cues",
      body:
        "Incorporating visual cues and interactive elements can guide users through the onboarding process. This may include tooltips, progress indicators, and engaging animations that highlight important features. The goal is to make the experience feel more dynamic and less overwhelming.",
    },
    {
      title: "Feedback Mechanism",
      body:
        "Integrating a feedback mechanism within the onboarding process will allow users to share their thoughts in real-time. This could be in the form of quick surveys or emotive reactions, helping us gather actionable insights and iterate on the onboarding flow continuously.",
    },
    {
      title: "Personalization",
      body:
        "Personalizing the onboarding experience based on user demographics or interests can enhance engagement. By tailoring the content and recommendations to fit the user's profile, we can create a more relevant and compelling introduction to the product.",
    },
    {
      title: "Case Studies",
      body:
        "Highlighting success stories or case studies during onboarding can demonstrate the product's value in a practical context. By showcasing real-world applications and testimonials, new users can better understand how to leverage the product to meet their needs.",
    },
  ],
};

export function ProjectDetailsView() {
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <WorkspaceFrame>
      <div className="flex-1 px-[clamp(32px,7vw,100px)] py-[44px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex w-full flex-col gap-[44px]"
        >
          <header className="flex flex-col gap-[24px]">
            <button
              type="button"
              onClick={() => void navigate({ to: "/projects" })}
              className="inline-flex w-fit cursor-pointer items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#A3A3A3] transition-colors hover:text-[#525252]"
            >
              <ArrowLeftIcon />
              Back to Projects
            </button>

            <div className="flex flex-col gap-[12px]">
              <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
                {mockProjectDetails.name}
              </h1>

              <div className="flex flex-wrap items-center gap-[16px]">
                <div className="flex items-center gap-[8px]">
                  <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#E5E5E5] text-[8px] font-semibold text-[#525252]">
                    PS
                  </div>
                  <span className="text-[13px] font-medium leading-[1.2] text-[#525252]">
                    {mockProjectDetails.owner}
                  </span>
                </div>
                <MetaDot />
                <div className="flex items-center gap-[8px]">
                  <CalendarIcon />
                  <span className="text-[13px] font-medium leading-[1.2] text-[#525252]">
                    {mockProjectDetails.dueDate}
                  </span>
                </div>
                <MetaDot />
                <span className="rounded-[4px] bg-[#FEE2E2] px-[6px] py-[2px] text-[12px] font-normal leading-none text-[#DC2626]">
                  {mockProjectDetails.status}
                </span>
              </div>
            </div>
          </header>

          <section className="rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="rounded-[8px] bg-white px-[clamp(32px,8vw,100px)] py-[72px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <div className="mx-auto flex max-w-[840px] flex-col gap-[44px]">
                <DetailSection title={mockProjectDetails.title} body={mockProjectDetails.intro} />

                {mockProjectDetails.sections.map((section) => (
                  <DetailSection
                    key={section.title}
                    title={section.title}
                    body={section.body}
                    bullets={section.bullets}
                    attachment={section.attachment}
                  />
                ))}

                <div className="h-px w-full bg-[#E5E5E5]" />

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex h-[32px] w-fit cursor-pointer items-center gap-[8px] rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#525252] transition-colors hover:bg-[#F5F5F5]"
                >
                  <PlusIcon />
                  Attach File
                </button>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
      {isUploadModalOpen ? <UploadFileModal onClose={() => setIsUploadModalOpen(false)} /> : null}
    </WorkspaceFrame>
  );
}

function DetailSection({
  title,
  body,
  bullets,
  attachment,
}: {
  title: string;
  body: string;
  bullets?: string[];
  attachment?: {
    name: string;
    type: string;
    state: string;
    size: string;
  };
}) {
  return (
    <section className="flex flex-col gap-[8px]">
      <h2 className="text-[15px] font-medium leading-none text-[#171717]">{title}</h2>
      <p className="text-[13px] font-normal leading-[1.5] text-[#262626]">{body}</p>

      {bullets ? (
        <ul className="mt-[4px] list-disc space-y-[4px] pl-[19.5px] text-[13px] font-normal leading-[1.5] text-[#262626]">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      {attachment ? <AttachmentCard attachment={attachment} /> : null}
    </section>
  );
}

function AttachmentCard({
  attachment,
}: {
  attachment: {
    name: string;
    type: string;
    state: string;
    size: string;
  };
}) {
  return (
    <div className="mt-[12px] w-fit rounded-[12px] bg-[#F5F5F5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]">
      <div className="flex w-[348px] max-w-[calc(100vw-96px)] items-center justify-between rounded-[10px] bg-white px-[16px] py-[9px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-w-0 items-start gap-[8px]">
          <FileIcon />
          <div className="flex min-w-0 flex-col gap-[4px]">
            <p className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
              {attachment.name}
            </p>
            <div className="flex flex-wrap items-center gap-[12px] text-[12px] font-medium leading-[1.25] text-[#737373]">
              <span>{attachment.type}</span>
              <MetaDot />
              <span>{attachment.state}</span>
              <MetaDot />
              <span>{attachment.size}</span>
            </div>
          </div>
        </div>
        <DownloadIcon />
      </div>
    </div>
  );
}

function MetaDot() {
  return <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-[#D9D9D9]" />;
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0"
    >
      <path
        d="M10 4 6 8l4 4M6.5 8H13"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadFileModal({ onClose }: { onClose: () => void }) {
  const [source, setSource] = useState<"figma" | "device">("device");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-file-title"
    >
      <button
        type="button"
        aria-label="Close upload modal"
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
      />
      <div className="relative w-[min(516px,calc(100vw-48px))] rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col justify-center p-[12px]">
          <h2 id="upload-file-title" className="text-[15px] font-medium leading-[1.5] text-[#0A0A0A]">
            Upload File
          </h2>
          <p className="text-[13px] font-medium leading-[1.5] text-[#525252]">
            Upload Files to your project
          </p>
        </div>

        <div className="rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex flex-col gap-[12px]">
            <div className="flex w-fit gap-[4px] rounded-[8px] bg-[#F5F5F5] p-[2px]">
              <button
                type="button"
                onClick={() => setSource("figma")}
                className={`flex cursor-pointer items-center gap-[8px] rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none transition-colors ${
                  source === "figma" ? "bg-white text-[#171717]" : "text-[#737373] hover:text-[#171717]"
                }`}
              >
                <FigmaIcon />
                Figma Link
              </button>
              <button
                type="button"
                onClick={() => setSource("device")}
                className={`flex cursor-pointer items-center gap-[8px] rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none transition-colors ${
                  source === "device" ? "bg-white text-[#171717]" : "text-[#737373] hover:text-[#171717]"
                }`}
              >
                <FolderIcon />
                Upload from Device
              </button>
            </div>

            {source === "figma" ? (
              <div className="flex h-[245px] w-full items-center justify-center rounded-[8px] bg-[#F5F5F5] p-[44px]">
                <div className="flex w-full max-w-[360px] flex-col gap-[12px]">
                  <label className="flex flex-col gap-[6px] text-left">
                    <span className="text-[13px] font-medium leading-none text-[#171717]">
                      Figma file link
                    </span>
                    <input
                      type="url"
                      placeholder="https://figma.com/design/..."
                      className="h-[36px] w-full rounded-[6px] bg-white px-[12px] text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#A3A3A3]"
                    />
                  </label>
                  <button
                    type="button"
                    className="flex h-[34px] w-fit cursor-pointer items-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
                  >
                    <FigmaIcon />
                    Attach Figma Link
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex h-[245px] w-full cursor-pointer items-center justify-center rounded-[8px] bg-[#F5F5F5] p-[44px] text-center transition-colors hover:bg-[#EFEFEF]"
              >
                <div className="flex min-w-0 flex-col items-center justify-center gap-[12px]">
                  <FolderIcon />
                  <div className="flex flex-col items-center gap-[6px]">
                    <p className="text-[13px] font-medium leading-none text-[#171717]">
                      Upload files or drag and drop
                    </p>
                    <p className="text-[12px] font-medium leading-none text-[#737373]">
                      Images, PDFs, Fonts, Files etc.
                    </p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FigmaIcon() {
  return (
    <img src="/logos/integrations/figma.svg" alt="" aria-hidden="true" className="h-[15px] w-[10px] shrink-0" />
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px] shrink-0 text-[#525252]" aria-hidden="true">
      <path d="M3 6.25A2.25 2.25 0 0 1 5.25 4h3.2l1.7 1.75h4.6A2.25 2.25 0 0 1 17 8v5.25A2.25 2.25 0 0 1 14.75 15.5h-9.5A2.25 2.25 0 0 1 3 13.25v-7Z" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-[#525252]">
      <path d="M5.25 2.25v3M12.75 2.25v3M3 6.75h12M4.5 3.75h9A1.5 1.5 0 0 1 15 5.25v8.25A1.5 1.5 0 0 1 13.5 15h-9A1.5 1.5 0 0 1 3 13.5V5.25A1.5 1.5 0 0 1 4.5 3.75Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="h-[15px] w-[15px]">
      <path d="M7.5 3.5v8M3.5 7.5h8" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[20px] w-[20px] shrink-0 text-[#525252]">
      <path d="M4.25 4.75A1.75 1.75 0 0 1 6 3h5.25L15.75 7.5V15.25A1.75 1.75 0 0 1 14 17H6A1.75 1.75 0 0 1 4.25 15.25V4.75Z" fill="#525252" />
      <path d="M11.25 3v3.25c0 .7.55 1.25 1.25 1.25h3.25" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0 text-[#525252]">
      <path d="M9 3v8M5.75 8.25 9 11.5l3.25-3.25M4 14.25h10" />
    </svg>
  );
}
