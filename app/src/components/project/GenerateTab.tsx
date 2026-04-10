type GenerateTabProps = {
  projectName: string;
};

const wireframes = [
  {
    title: "Homepage",
    description: "Hero, value props, social proof, CTA",
  },
  {
    title: "Product",
    description: "Feature overview with workflow stages",
  },
  {
    title: "Pricing",
    description: "Three tiers with comparison matrix",
  },
  {
    title: "Demo",
    description: "Conversion form with social proof sidebar",
  },
] as const;

export function GenerateTab({ projectName: _projectName }: GenerateTabProps) {
  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#EDFCF2] px-3 py-1 text-[13px] font-medium text-[#22C55E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
          Generated
        </span>
        <button
          type="button"
          className="rounded-[10px] border border-border px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
        >
          Share
        </button>
      </div>

      {/* Wireframe cards grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {wireframes.map((wf) => (
          <div
            key={wf.title}
            className="overflow-hidden rounded-[12px] border border-border-subtle"
          >
            {/* Preview area */}
            <div className="flex aspect-[16/10] items-center justify-center bg-bg-subtle">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="text-text-tertiary"
              >
                <rect
                  x="4"
                  y="6"
                  width="24"
                  height="20"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="4"
                  y1="12"
                  x2="28"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <rect x="7" y="15" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
                <rect x="7" y="20" width="12" height="1.5" rx="0.5" fill="currentColor" opacity="0.2" />
                <rect x="7" y="23" width="9" height="1.5" rx="0.5" fill="currentColor" opacity="0.2" />
              </svg>
            </div>

            {/* Card body */}
            <div className="p-4">
              <h3 className="font-heading text-[15px] font-semibold text-text-primary">
                {wf.title}
              </h3>
              <p className="mt-1 text-[13px] text-text-secondary">
                {wf.description}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-[7px] border border-accent bg-accent/5 px-3 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  Open in Figma
                </button>
                <button
                  type="button"
                  className="rounded-[7px] border border-border px-3 py-1.5 text-[12px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="rounded-[7px] border border-border px-3 py-1.5 text-[12px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
                >
                  Iterate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom delivery bar */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-[12px] bg-accent p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[15px] font-semibold text-white">
            4 wireframes generated
          </p>
          <p className="mt-1 text-[13px] text-white/70">
            Share with your client or save to assets for delivery.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-[10px] border border-white/30 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
          >
            Share
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-white/30 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
          >
            Export
          </button>
          <button
            type="button"
            className="rounded-[10px] bg-white px-4 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-white/90"
          >
            Save to Assets
          </button>
        </div>
      </div>
    </div>
  );
}
