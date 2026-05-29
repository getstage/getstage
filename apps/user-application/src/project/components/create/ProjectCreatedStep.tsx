import stageLogoLight from "@/assets/logos/stage-logo-light.png";
import { ArrowRightIcon } from "./CreateProjectPrimitives";

export function ProjectCreatedStep({ onViewProject }: { onViewProject: () => void }) {
  return (
    <main className="flex h-screen items-start overflow-hidden bg-white p-[8px]">
      <section className="flex h-full flex-1 flex-col items-center justify-center overflow-hidden rounded-[12px] bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
        <div className="w-full max-w-[460px] py-[22px]">
          <div className="flex w-full flex-col items-start rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
            <div className="flex w-full flex-col items-start rounded-[8px] bg-[linear-gradient(180deg,rgba(158,153,248,0.18)_0%,rgba(158,153,248,0.07)_34%,#ffffff_72%)] px-[12px] py-[72px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
              <div className="flex w-full flex-col items-center justify-center gap-[32px]">
                <img
                  src={stageLogoLight}
                  alt="Stage"
                  className="h-[23px] w-auto object-contain"
                />

                <div className="flex w-full items-start">
                  <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-[8px]">
                    <div className="flex w-full flex-col items-center justify-center">
                      <h1 className="w-full text-center text-[18px] font-semibold leading-[1.2] text-[#0a0a0a]">
                        Project Created!
                      </h1>
                    </div>
                    <p className="w-full text-center text-[12px] font-medium leading-[1.5] text-[#737373]">
                      Your roadmap is ready to go.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onViewProject}
                  className="flex shrink-0 cursor-pointer items-center justify-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[10px] pl-[24px] pr-[22px] text-[13px] font-medium leading-[1.25] text-[#fafafa] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
                >
                  <span className="[text-shadow:0px_0.5px_1.5px_rgba(0,0,0,0.15)]">
                    View Project
                  </span>
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
