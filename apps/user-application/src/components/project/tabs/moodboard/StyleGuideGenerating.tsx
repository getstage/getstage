const generatingRows = [
  { label: "Extracted Colors", state: "done", delay: "0ms" },
  { label: "Extracted Typography", state: "done", delay: "140ms" },
  { label: "Extracing Component", state: "active", delay: "280ms" },
  { label: "Extract Spacing", state: "idle", delay: "420ms" },
  { label: "Extract Anti-Pattern", state: "idle", delay: "560ms" },
] as const;

export function StyleGuideGenerating({
  mode = "generate",
  previewUrl = null,
}: {
  mode?: "generate" | "regenerate";
  previewUrl?: string | null;
}) {
  const isRegenerating = mode === "regenerate";

  return (
    <div className="flex min-h-[640px] w-full items-center justify-center rounded-[10px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <style>
        {`
          @keyframes style-guide-panel-rise {
            0% { opacity: 0.45; transform: translateY(8px) scale(0.985); filter: blur(2px); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          }
          @keyframes style-guide-card-sheen {
            0% { transform: translateX(-120%); opacity: 0; }
            18% { opacity: 0.72; }
            50% { opacity: 0.28; }
            100% { transform: translateX(120%); opacity: 0; }
          }
          @keyframes style-guide-row-in {
            0% { opacity: 0; transform: translateY(5px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      <div className="isolate flex flex-col items-center justify-center">
        <div className="z-[2] mb-[-28px] flex flex-col items-center">
          <div className="relative mb-[-8px] h-[113px] w-[187px] overflow-hidden rounded-t-[6px] bg-gradient-to-b from-[#F5F5F5] to-[#D4D4D4] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                style={{ animation: "style-guide-card-sheen 1.9s ease-in-out infinite" }}
              />
            )}
          </div>
          <div
            className="flex w-[281px] items-center justify-center gap-2 overflow-hidden rounded-[6px] bg-[#FAFAFA] px-3 py-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
            style={{ animation: "style-guide-panel-rise 360ms cubic-bezier(.2,.8,.2,1) both" }}
          >
            <img
              src="/logos/stage.svg"
              alt=""
              aria-hidden="true"
              className="h-[14px] w-[11px] shrink-0 brightness-0"
            />
            <span className="text-[12px] font-medium leading-[1.25] text-[#171717]">
              {isRegenerating ? "Regenerating style guide..." : "Stage is creating..."}
            </span>
          </div>
        </div>

        <div className="z-[1] flex flex-col items-start gap-2">
          {generatingRows.map((row) => (
            <GeneratingRow key={row.label} label={row.label} state={row.state} delay={row.delay} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GeneratingRow({
  label,
  state,
  delay,
}: {
  label: string;
  state: "done" | "active" | "idle";
  delay: string;
}) {
  const done = state === "done";
  const active = state === "active";

  return (
    <div
      className={`flex items-center gap-2 ${done ? "opacity-50" : ""}`}
      style={{ animation: `style-guide-row-in 320ms ease-out ${delay} both` }}
    >
      <span className="flex h-[15px] w-[15px] items-center justify-center">
        {done ? (
          <img src="/logos/check.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px]" />
        ) : active ? (
          <img
            src="/logos/loader.svg"
            alt=""
            aria-hidden="true"
            className="h-[15px] w-[15px] animate-spin"
            style={{ animationDuration: "900ms" }}
          />
        ) : (
          <img src="/logos/unchecked.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px]" />
        )}
      </span>
      <span className={`text-[12px] font-medium leading-[1.25] ${active || done ? "text-[#404040]" : "text-[#737373]"}`}>
        {label}
      </span>
    </div>
  );
}
