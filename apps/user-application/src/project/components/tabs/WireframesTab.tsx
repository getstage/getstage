import { useMemo, useState } from "react";

const FIGMA_SYMBOL_URL = "https://www.figma.com/api/mcp/asset/0fb6d4b5-4b4a-43dd-b78a-56971a159d3f";

type WireframeKind = "lofi" | "hifi";
type WireframeStep = "choose-type" | "brand-kit" | "configure" | "generating" | "results";

type ScreenItem = {
  id: string;
  title: string;
  description: string;
  kind: "Page" | "Section";
  priority: string;
  required: boolean;
  selected: boolean;
};

const MOCK_SCREENS: ScreenItem[] = [
  {
    id: "homepage",
    title: "Homepage",
    description: "Primary Landing - communicates value, drives demo conversion",
    kind: "Page",
    priority: "P0",
    required: true,
    selected: true,
  },
  {
    id: "about",
    title: "About Us",
    description: "Describes company mission and vision",
    kind: "Section",
    priority: "P1",
    required: false,
    selected: true,
  },
  {
    id: "features",
    title: "Features",
    description: "Highlights key functionalities, engages users",
    kind: "Page",
    priority: "P2",
    required: true,
    selected: true,
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "Details pricing tiers, promotes sign-up",
    kind: "Page",
    priority: "P3",
    required: true,
    selected: true,
  },
  {
    id: "testimonials",
    title: "Testimonials",
    description: "Showcases user feedback, builds trust",
    kind: "Section",
    priority: "P4",
    required: false,
    selected: true,
  },
  {
    id: "blog",
    title: "Blog",
    description: "Provides insights, fosters community engagement",
    kind: "Page",
    priority: "P5",
    required: false,
    selected: true,
  },
  {
    id: "contact",
    title: "Contact Us",
    description: "Facilitates inquiries, supports user needs",
    kind: "Section",
    priority: "P6",
    required: true,
    selected: true,
  },
];

export function WireframesTab() {
  const [step, setStep] = useState<WireframeStep>("choose-type");
  const [wireframeKind, setWireframeKind] = useState<WireframeKind | null>(null);
  const [hasBrandKit, setHasBrandKit] = useState(false);
  const [screens, setScreens] = useState(MOCK_SCREENS);
  const selectedCount = screens.filter((screen) => screen.selected).length;

  function selectKind(nextKind: WireframeKind) {
    setWireframeKind(nextKind);
  }

  function continueFromType() {
    if (!wireframeKind) return;
    if (wireframeKind === "hifi") {
      setStep("brand-kit");
      return;
    }
    setStep("configure");
  }

  function generateWireframes() {
    setStep("generating");
    window.setTimeout(() => {
      setStep("results");
    }, 1300);
  }

  const generatedCards = useMemo(
    () =>
      screens
        .filter((screen) => screen.selected)
        .slice(0, 6)
        .map((screen) => ({
          ...screen,
          date: "6th April, 2025",
        })),
    [screens],
  );

  return (
    <section className="w-full">
      {step === "choose-type" ? (
        <CanvasShell centered>
          <TypeChooser
            selectedKind={wireframeKind}
            onSelect={selectKind}
            onContinue={continueFromType}
          />
        </CanvasShell>
      ) : null}

      {step === "brand-kit" ? (
        <CanvasShell centered>
          <BrandKitStep
            hasBrandKit={hasBrandKit}
            onUpload={() => setHasBrandKit(true)}
            onRemove={() => setHasBrandKit(false)}
            onBack={() => setStep("choose-type")}
            onContinue={() => setStep("configure")}
          />
        </CanvasShell>
      ) : null}

      {step === "configure" ? (
        <ConfigureStep
          wireframeKind={wireframeKind ?? "lofi"}
          screens={screens}
          selectedCount={selectedCount}
          onChangeType={() => setStep("choose-type")}
          onAddBrandKit={() => {
            setWireframeKind("hifi");
            setStep("brand-kit");
          }}
          onToggle={(id) =>
            setScreens((current) =>
              current.map((screen) =>
                screen.id === id && !screen.required ? { ...screen, selected: !screen.selected } : screen,
              ),
            )
          }
          onGenerate={generateWireframes}
        />
      ) : null}

      {step === "generating" ? (
        <CanvasShell centered>
          <GeneratingStep />
        </CanvasShell>
      ) : null}

      {step === "results" ? (
        <ResultsGrid
          wireframeKind={wireframeKind ?? "lofi"}
          cards={generatedCards}
          onConvert={() => {
            setWireframeKind("hifi");
            setStep("brand-kit");
          }}
        />
      ) : null}
    </section>
  );
}

function CanvasShell({
  centered,
  children,
}: {
  centered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[690px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div
        className={`flex min-h-[682px] rounded-[8px] bg-white p-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
          centered ? "items-center justify-center" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function TypeChooser({
  selectedKind,
  onSelect,
  onContinue,
}: {
  selectedKind: WireframeKind | null;
  onSelect: (kind: WireframeKind) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex w-[357px] flex-col gap-[6px]">
      <PanelTitle
        title="Create Wireframe"
        description="Select how you want your wireframe to look like."
      />
      <div className="rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="grid grid-cols-2 gap-[4px]">
          <TypeOption
            active={selectedKind === "lofi"}
            iconSrc="/logos/dashboard/lofi-wireframe.svg"
            label="Lo-Fi Wireframe"
            onClick={() => onSelect("lofi")}
          />
          <TypeOption
            active={selectedKind === "hifi"}
            iconSrc="/logos/dashboard/hifi-wireframe.svg"
            label="Hi-Fi Wireframe"
            onClick={() => onSelect("hifi")}
          />
        </div>
      </div>
      <PrimaryButton disabled={!selectedKind} onClick={onContinue}>
        Continue
        <ArrowRightIcon />
      </PrimaryButton>
    </div>
  );
}

function TypeOption({
  active,
  iconSrc,
  label,
  onClick,
}: {
  active: boolean;
  iconSrc: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[104px] items-center justify-center gap-[8px] overflow-hidden rounded-[6px] px-[12px] py-[44px] text-[12px] font-medium leading-none transition-colors ${
        active
          ? "bg-[#E7E6FD] text-[#16115A] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          : "bg-white text-[#525252] hover:bg-[#FAFAFA]"
      }`}
    >
      <img src={iconSrc} alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function BrandKitStep({
  hasBrandKit,
  onUpload,
  onRemove,
  onBack,
  onContinue,
}: {
  hasBrandKit: boolean;
  onUpload: () => void;
  onRemove: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex w-[357px] flex-col gap-[6px]">
      <PanelTitle
        title="Upload Your Brand Kit"
        description="Select how you want your wireframe to look like."
      />
      <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <button
          type="button"
          onClick={onUpload}
          className="flex h-[172px] w-full flex-col items-center justify-center gap-3 rounded-[8px] bg-white p-11 text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
        >
          <UploadFromDeviceIcon className="h-5 w-5" />
          <span className="flex flex-col gap-[6px]">
            <span className="text-[13px] font-medium leading-[1.25] text-[#171717]">
              Upload files or drag and drop
            </span>
            <span className="text-[12px] font-medium leading-[1.25] text-[#737373]">
              Images, PDFs, Fonts, Files etc.
            </span>
          </span>
        </button>
      </div>
      {hasBrandKit ? (
        <div className="w-[348px] max-w-full rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex min-h-9 items-center justify-between rounded-[8px] bg-white p-2 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex min-w-0 items-center gap-2">
              <UploadFromDeviceIcon className="h-5 w-5" />
              <span className="truncate pb-px text-[13px] font-medium leading-[1.2] text-[#171717]">
                Brand_guideline.pdf
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="pb-px text-[12px] font-medium leading-[1.2] text-[#737373]">2.3MB</span>
              <button
                type="button"
                onClick={onRemove}
                className="text-[#EF4444] transition-opacity hover:opacity-70"
                aria-label="Remove brand kit"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex gap-[6px]">
        <SecondaryButton size="action" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </SecondaryButton>
        <PrimaryButton disabled={!hasBrandKit} onClick={onContinue} className="flex-1">
          Continue
          <ArrowRightIcon />
        </PrimaryButton>
      </div>
    </div>
  );
}

function ConfigureStep({
  wireframeKind,
  screens,
  selectedCount,
  onChangeType,
  onAddBrandKit,
  onToggle,
  onGenerate,
}: {
  wireframeKind: WireframeKind;
  screens: ScreenItem[];
  selectedCount: number;
  onChangeType: () => void;
  onAddBrandKit: () => void;
  onToggle: (id: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-[10px] p-4">
        <div>
          <h2 className="text-[15px] font-medium leading-[1.25] text-[#0A0A0A]">
            Generate Wireframes
          </h2>
          <p className="mt-[10px] max-w-[354px] text-[12px] font-medium leading-[1.5] text-[#525252]">
            AI will produce low-fidelity block layouts for every screen. You&apos;ll take them into Figma for the High-fidelity design pass.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium leading-[1.25]">
            <span className="text-[#171717]">13 screens from Flows</span>
            <span className="h-1 w-1 rounded-full bg-[#D4D4D4]" />
            <span className="text-[#737373]">14 patterns applied from Moodboard</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <SecondaryButton onClick={onChangeType}>
              <ArrowLeftIcon />
              Change Wireframe type
            </SecondaryButton>
            {wireframeKind === "lofi" ? (
              <SecondaryButton purple onClick={onAddBrandKit}>
                <PlusIcon />
                Add Brand Kit
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[8px] bg-white p-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="mb-6 flex items-center justify-between text-[15px] font-medium leading-[1.25] text-[#171717]">
          <span>Screens To Generate</span>
          <span className="text-[13px] text-[#525252]">{selectedCount} of 13 selected</span>
        </div>
        <div className="flex flex-col gap-1">
          {screens.map((screen) => (
            <ScreenRow key={screen.id} screen={screen} onToggle={() => onToggle(screen.id)} />
          ))}
        </div>
        <label className="mt-6 block">
          <span className="mb-2 flex gap-2 text-[13px] font-medium leading-[1.25]">
            <span className="text-[#171717]">Layout Preference</span>
            <span className="text-[#737373]">(Optional)</span>
          </span>
          <textarea
            className="h-[84px] w-full resize-none rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-shadow placeholder:text-[#737373] focus:shadow-[0_0_0_1px_#8D87FF]"
            placeholder="ex. sticky header with primary CTA, wide hero, keep forms short, mobile-first density..."
          />
        </label>
        <div className="mt-6 flex justify-end">
          <PrimaryButton onClick={onGenerate}>
            Generate {selectedCount} Wireframes
            <ArrowRightIcon />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function ScreenRow({ screen, onToggle }: { screen: ScreenItem; onToggle: () => void }) {
  return (
    <article className="rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-end justify-between gap-4 rounded-[6px] p-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-[6px] text-left"
          aria-pressed={screen.selected}
        >
          <span
            className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] ${
              screen.selected ? "bg-[#0A0A0A] text-white" : "bg-[#E5E5E5] text-transparent"
            }`}
          >
            <CheckIcon />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
              {screen.title}
            </span>
            <span className="mt-[7px] block truncate text-[12px] font-normal leading-[1.5] text-[#525252]">
              {screen.description}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <Badge tone="blue">{screen.kind}</Badge>
          <Badge tone="rose">{screen.priority}</Badge>
          <Badge tone="stone">{screen.required ? "Required" : "Optional"}</Badge>
        </div>
      </div>
    </article>
  );
}

function GeneratingStep() {
  return (
    <div className="flex w-[330px] flex-col items-center gap-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center text-[#5B4FE0]">
        <img
          src="/logos/dashboard/creating-wireframe.svg"
          alt=""
          aria-hidden="true"
          className="h-11 w-11 shrink-0"
        />
      </div>
      <div className="flex w-full flex-col items-center gap-2">
        <h2 className="text-[16px] font-semibold leading-[1.25] text-[#171717]">Creating Wireframe</h2>
        <p className="w-[282px] text-[13px] font-medium leading-[1.5] text-[#525252]">
          Hold tight, we&apos;re building your wireframes based on the moodboard and
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 text-[13px] font-medium leading-[1.5] text-[#525252]">
        <ProgressRow done label="Scanned Moodboard" />
        <ProgressRow done label="Scanned Flows" />
        <ProgressRow loading label="Creating Layouts" />
        <ProgressRow label="Create Wireframes" />
      </div>
    </div>
  );
}

function ProgressRow({
  done,
  loading,
  label,
}: {
  done?: boolean;
  loading?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-[18px] w-[18px] items-center justify-center">
        {done ? <DoneCircleIcon /> : loading ? <SpinnerIcon /> : <PendingIcon />}
      </span>
      <span>{label}</span>
    </div>
  );
}

function ResultsGrid({
  wireframeKind,
  cards,
  onConvert,
}: {
  wireframeKind: WireframeKind;
  cards: Array<ScreenItem & { date: string }>;
  onConvert: () => void;
}) {
  const title = wireframeKind === "hifi" ? "Hi-Fi Wireframes" : "Lo-Fi Wireframes";

  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-end justify-between gap-4 p-4">
        <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">{title}</h2>
        {wireframeKind === "lofi" ? (
          <SecondaryButton purple onClick={onConvert}>
            Convert to High-fi
            <ArrowRightIcon />
          </SecondaryButton>
        ) : null}
      </div>
      <div className="grid gap-1 lg:grid-cols-3">
        {cards.map((card, index) => (
          <WireframeCard key={`${card.id}-${index}`} card={card} />
        ))}
      </div>
    </div>
  );
}

function WireframeCard({ card }: { card: ScreenItem & { date: string } }) {
  return (
    <article className="flex h-[336px] flex-col rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[6px] bg-[#E5E5E5] p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <ImageIcon />
      </div>
      <div className="shrink-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-[15px] font-medium leading-[1.1] text-[#171717]">
                {card.title} Wireframe
              </h3>
              <Badge tone="purple">{card.priority}</Badge>
            </div>
            <div className="mt-[7px] flex items-center gap-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
              <SparkleIcon />
              AI Generated
            </div>
            <p className="mt-[3px] text-[12px] font-medium leading-[1.5] text-[#737373]">
              {card.date}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-[27px] w-[125px] shrink-0 items-center justify-center gap-2 rounded-[4px] bg-[#F5F5F5] px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EDEDED]"
          >
            <img
              src={FIGMA_SYMBOL_URL}
              alt=""
              className="h-[15px] w-[10px] shrink-0"
              draggable={false}
            />
            Open in Figma
          </button>
        </div>
      </div>
    </article>
  );
}

function PanelTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-3 pb-3 pt-2">
      <h2 className="text-[13px] font-semibold leading-[1.5] text-[#0A0A0A]">{title}</h2>
      <p className="mt-1 text-[12px] font-medium leading-[1.5] text-[#525252]">{description}</p>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[38px] items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  purple,
  size = "compact",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  purple?: boolean;
  size?: "compact" | "action";
}) {
  const heightClass = size === "action" ? "h-[38px]" : "h-[32px]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex ${heightClass} items-center justify-center gap-2 rounded-[6px] bg-white pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA] ${
        purple ? "text-[#7C3AED]" : "text-[#525252]"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "blue" | "rose" | "stone" | "purple";
  children: React.ReactNode;
}) {
  const classes = {
    blue: "bg-[#DBEAFE] text-[#172554]",
    rose: "bg-[#FFE4E6] text-[#4C0519]",
    stone: "bg-[#E7E5E4] text-[#57534E]",
    purple: "bg-[#F3E8FF] text-[#3B0764]",
  };

  return (
    <span className={`inline-flex h-[18px] items-center rounded-[2px] px-[6px] text-[12px] font-normal leading-[1.25] ${classes[tone]}`}>
      {children}
    </span>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path d="M3.5 8h8M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0">
      <path d="M12.5 8h-8M7.5 4.5 4 8l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WireframeAssetIcon({ src, className }: { src: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-current`}
      style={{
        WebkitMask: `url("${src}") center / contain no-repeat`,
        mask: `url("${src}") center / contain no-repeat`,
      }}
    />
  );
}

function UploadFromDeviceIcon({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-[#525252]`}
      style={{
        WebkitMask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
      }}
    />
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-[14px] w-[14px]">
      <path d="M5.5 2.5h5l.5 1H14v1.4H2V3.5h3l.5-1ZM4 6h8l-.55 7A1.5 1.5 0 0 1 9.95 14.4h-3.9a1.5 1.5 0 0 1-1.5-1.4L4 6Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0">
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3 w-3">
      <path d="m4 8 2.4 2.4L12 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DoneCircleIcon() {
  return (
    <img src="/logos/dashboard/created-check.svg" alt="" aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
  );
}

function SpinnerIcon() {
  return (
    <img src="/logos/dashboard/loading.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />
  );
}

function PendingIcon() {
  return (
    <img src="/logos/dashboard/pending-check.svg" alt="" aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6 text-[#525252]">
      <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <path d="m6.5 17 4.2-4 2.4 2.2 1.8-1.7 2.6 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 bg-[#737373]"
      style={{
        WebkitMask: 'url("/logos/dashboard/ai-generated.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/ai-generated.svg") center / contain no-repeat',
      }}
    />
  );
}

function FigmaIcon() {
  return (
    <img src="/logos/integrations/figma.svg" alt="" aria-hidden="true" className="h-[15px] w-[10px] shrink-0" />
  );
}
