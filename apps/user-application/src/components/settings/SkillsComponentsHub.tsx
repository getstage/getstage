import { useMemo, useState, type ReactNode } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import {
  COMPONENT_PACK_CATALOG,
  DISCOVER_SKILL_CATALOG,
  defaultEnabledComponentPackIds,
  defaultEnabledSkillIds,
  defaultInstalledSkillIds,
  type ComponentPackCatalogItem,
  type SkillCatalogItem,
} from "@/lib/settings/skillsCatalog";

function useSkillHubPrefs() {
  const overview = useSettingsOverviewQuery();
  const updatePrefs = useConvexMutation(api.settings.updateSkillHubPrefs);

  const installedSkillIds =
    overview.data?.skillHub?.installedSkillIds ?? defaultInstalledSkillIds();
  const enabledSkillIds =
    overview.data?.skillHub?.enabledSkillIds ?? defaultEnabledSkillIds();
  const enabledComponentPackIds =
    overview.data?.skillHub?.enabledComponentPackIds ??
    defaultEnabledComponentPackIds();

  async function setSkillEnabled(id: string, enabled: boolean) {
    const next = enabled
      ? Array.from(new Set([...enabledSkillIds, id]))
      : enabledSkillIds.filter((entry) => entry !== id);
    await updatePrefs({ enabledSkillIds: next });
  }

  async function addSkill(id: string) {
    await updatePrefs({
      installedSkillIds: Array.from(new Set([...installedSkillIds, id])),
      enabledSkillIds: Array.from(new Set([...enabledSkillIds, id])),
    });
  }

  async function setPackEnabled(id: string, enabled: boolean) {
    const next = enabled
      ? Array.from(new Set([...enabledComponentPackIds, id]))
      : enabledComponentPackIds.filter((entry) => entry !== id);
    await updatePrefs({ enabledComponentPackIds: next });
  }

  return {
    installedSkillIds,
    enabledSkillIds,
    enabledComponentPackIds,
    setSkillEnabled,
    addSkill,
    setPackEnabled,
    isLoading: overview.isLoading,
  };
}

export function SkillsHubPanel() {
  const prefs = useSkillHubPrefs();
  const installedSkills = DISCOVER_SKILL_CATALOG.filter((skill) =>
    prefs.installedSkillIds.includes(skill.id),
  );
  const activeCount = installedSkills.filter((skill) =>
    prefs.enabledSkillIds.includes(skill.id),
  ).length;

  return (
    <HubSurface>
      <SurfaceHeader
        title="Installed Skills"
        count={`${installedSkills.length} installed · ${activeCount} active`}
      />

      {installedSkills.length === 0 ? (
        <div className="rounded-[8px] bg-white px-[14px] py-[24px] text-center">
          <p className="text-[13px] font-medium text-[#737373]">
            No skills added yet. Add one from Marketplace.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-[4px] sm:grid-cols-2">
          {installedSkills.map((skill) => (
            <InstalledSkillCard
              key={skill.id}
              skill={skill}
              enabled={prefs.enabledSkillIds.includes(skill.id)}
              disabled={prefs.isLoading}
              onToggle={(next) => void prefs.setSkillEnabled(skill.id, next)}
            />
          ))}
        </div>
      )}
    </HubSurface>
  );
}

export function ComponentsHubPanel() {
  const prefs = useSkillHubPrefs();

  return (
    <HubSurface>
      <SurfaceHeader title="Component Libraries" count="12 installed · 5 enabled" />
      <div className="flex flex-col gap-[4px]">
        {COMPONENT_PACK_CATALOG.map((pack) => (
          <ComponentPackRow
            key={pack.id}
            pack={pack}
            enabled={prefs.enabledComponentPackIds.includes(pack.id)}
            disabled={prefs.isLoading}
            onToggle={(next) => void prefs.setPackEnabled(pack.id, next)}
          />
        ))}
      </div>
    </HubSurface>
  );
}

export function MarketplaceHubPanel({
  onViewLibraries,
  onViewSkills,
}: {
  onViewLibraries?: () => void;
  onViewSkills?: () => void;
}) {
  const prefs = useSkillHubPrefs();
  const [marketTab, setMarketTab] = useState<"skills" | "components">("skills");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<"skill" | "library" | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const discoverSkills = useMemo(
    () =>
      DISCOVER_SKILL_CATALOG.filter(
        (skill) =>
          !normalizedQuery ||
          skill.name.toLowerCase().includes(normalizedQuery) ||
          skill.description.toLowerCase().includes(normalizedQuery) ||
          skill.category.toLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery],
  );
  const discoverPacks = useMemo(
    () =>
      COMPONENT_PACK_CATALOG.filter(
        (pack) =>
          !normalizedQuery ||
          pack.name.toLowerCase().includes(normalizedQuery) ||
          pack.description.toLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery],
  );

  function showToast(kind: "skill" | "library") {
    setToast(kind);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function addSkill(skill: SkillCatalogItem) {
    setBusyId(skill.id);
    try {
      await prefs.addSkill(skill.id);
      showToast("skill");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not add skill.");
    } finally {
      setBusyId(null);
    }
  }

  async function addLibrary(pack: ComponentPackCatalogItem) {
    try {
      await prefs.setPackEnabled(pack.id, true);
      showToast("library");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not add library.");
    }
  }

  return (
    <section className="relative flex flex-col gap-[20px]">
      <div className="grid gap-[8px] sm:grid-cols-2">
        <div className="grid grid-cols-2 rounded-[8px] bg-[#F5F5F5] p-[2px]">
          {[
            { id: "skills" as const, label: "Skills" },
            { id: "components" as const, label: "Component Libraries" },
          ].map((tab) => {
            const selected = marketTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMarketTab(tab.id);
                  setQuery("");
                }}
                className={[
                  "rounded-[6px] px-[12px] py-[7px] text-[13px] font-medium leading-none transition-all",
                  selected
                    ? "bg-white text-[#0A0A0A] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                    : "text-[#737373]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <label className="relative block">
          <span className="sr-only">
            {marketTab === "skills" ? "Search Skills" : "Search Components"}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute left-[12px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 bg-[#737373]"
            style={{
              WebkitMask: 'url("/logos/dashboard/search.svg") center / contain no-repeat',
              mask: 'url("/logos/dashboard/search.svg") center / contain no-repeat',
            }}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={marketTab === "skills" ? "Search Skills" : "Search Components"}
            className="h-full min-h-[34px] w-full rounded-[8px] border border-transparent bg-[#F5F5F5] py-[8px] pl-[34px] pr-[12px] text-[13px] font-medium text-[#0A0A0A] outline-none placeholder:text-[#737373] focus:border-[#D4D4D4] focus:bg-white"
          />
        </label>
      </div>

      <HubSurface>
        <SurfaceHeader
          title={marketTab === "skills" ? "Discover Skills" : "Discover Components"}
        />

        {marketTab === "skills" ? (
          <div className="grid grid-cols-1 gap-[4px] sm:grid-cols-2">
            {discoverSkills.map((skill) => {
              const installed = prefs.installedSkillIds.includes(skill.id);
              return (
                <MarketplaceSkillCard
                  key={skill.id}
                  skill={skill}
                  installed={installed}
                  busy={busyId === skill.id}
                  disabled={prefs.isLoading}
                  onAdd={() => void addSkill(skill)}
                />
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[4px] sm:grid-cols-2">
            {discoverPacks.map((pack, index) => (
              <MarketplacePackCard
                key={pack.id}
                pack={pack}
                disabled={prefs.isLoading}
                className={
                  index === discoverPacks.length - 1 && discoverPacks.length % 2 === 1
                    ? "sm:col-span-2"
                    : undefined
                }
                onAdd={() => void addLibrary(pack)}
              />
            ))}
          </div>
        )}
      </HubSurface>

      {toast ? (
        <div className="absolute bottom-[4px] right-[4px] z-10 flex min-w-[220px] items-start gap-[10px] rounded-[8px] border border-[#E5E5E5] bg-white px-[12px] py-[10px] shadow-[0_8px_24px_rgba(10,10,10,0.15)]">
          <img src="/logos/check.svg" alt="" aria-hidden className="mt-[1px] h-[14px] w-[14px]" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium leading-none text-[#171717]">
              {toast === "skill" ? "Skill added" : "Library added"}
            </p>
            <button
              type="button"
              className="mt-[6px] text-[11px] font-medium leading-none text-[#737373] underline"
              onClick={() => {
                if (toast === "skill") onViewSkills?.();
                else onViewLibraries?.();
                setToast(null);
              }}
            >
              {toast === "skill" ? "View installed skills" : "View all libraries"}
            </button>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-[14px] leading-none text-[#A3A3A3]"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      ) : null}
    </section>
  );
}

function HubSurface({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      {children}
    </section>
  );
}

function SurfaceHeader({ title, count }: { title: string; count?: string }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-[12px] px-[10px] py-[8px]">
      <h2 className="text-[13px] font-medium leading-none text-[#0A0A0A]">{title}</h2>
      {count ? (
        <p className="shrink-0 text-[12px] font-medium leading-none text-[#737373]">{count}</p>
      ) : null}
    </div>
  );
}

function InstalledSkillCard({
  skill,
  enabled,
  disabled,
  onToggle,
}: {
  skill: SkillCatalogItem;
  enabled: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <article className="overflow-hidden rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <SkillArtwork skill={skill} />
      <div className="flex min-h-[112px] flex-col gap-[8px] p-[12px]">
        <div className="flex items-center justify-between gap-[8px]">
          <SkillTypeIcon />
          <ToggleSwitch checked={enabled} disabled={disabled} onChange={onToggle} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-[6px]">
            <h3 className="text-[13px] font-medium leading-none text-[#0A0A0A]">{skill.name}</h3>
            {skill.official ? <OfficialBadge /> : null}
          </div>
          <p className="mt-[6px] line-clamp-2 text-[12px] font-medium leading-[1.4] text-[#737373]">
            {skill.description}
          </p>
        </div>
      </div>
    </article>
  );
}

function MarketplaceSkillCard({
  skill,
  installed,
  busy,
  disabled,
  onAdd,
}: {
  skill: SkillCatalogItem;
  installed: boolean;
  busy: boolean;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <SkillArtwork skill={skill} />
      <div className="flex min-h-[170px] flex-col gap-[10px] p-[12px]">
        <div>
          <h3 className="text-[13px] font-medium leading-[1.3] text-[#0A0A0A]">{skill.name}</h3>
          <p className="mt-[4px] line-clamp-2 text-[12px] font-medium leading-[1.4] text-[#737373]">
            {skill.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <MetaChip icon="/logos/skills/toolbox.svg" label={skill.category} />
          <MetaChip icon="/logos/download.svg" label={skill.installsLabel} />
        </div>
        <button
          type="button"
          disabled={disabled || busy || installed}
          onClick={onAdd}
          className="mt-auto inline-flex h-[30px] w-fit items-center rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.2)] disabled:text-[#A3A3A3]"
        >
          {busy ? "Adding…" : installed ? "Added" : "+ Add Skill"}
        </button>
      </div>
    </article>
  );
}

function MarketplacePackCard({
  pack,
  disabled,
  className,
  onAdd,
}: {
  pack: ComponentPackCatalogItem;
  disabled: boolean;
  className?: string;
  onAdd: () => void;
}) {
  return (
    <article
      className={[
        "flex min-h-[190px] flex-col gap-[10px] rounded-[8px] bg-white p-[16px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]",
        className ?? "",
      ].join(" ")}
    >
      <PackIcon src={pack.iconSrc} name={pack.name} compact />
      <div>
        <h3 className="text-[13px] font-medium leading-[1.3] text-[#0A0A0A]">{pack.name}</h3>
        <p className="mt-[4px] line-clamp-2 text-[12px] font-medium leading-[1.4] text-[#737373]">
          {pack.description}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-[10px]">
        <MetaChip icon="/logos/skills/toolbox.svg" label={pack.category} />
        <MetaChip icon="/logos/download.svg" label={pack.installsLabel} />
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="mt-auto inline-flex h-[30px] w-fit items-center rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.2)] disabled:opacity-50"
      >
        + Add Library
      </button>
    </article>
  );
}

function ComponentPackRow({
  pack,
  enabled,
  disabled,
  onToggle,
}: {
  pack: ComponentPackCatalogItem;
  enabled: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="flex min-h-[68px] items-center gap-[12px] rounded-[8px] bg-white px-[12px] py-[14px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <PackIcon src={pack.iconSrc} name={pack.name} compact />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-[6px]">
          <p className="text-[13px] font-medium leading-none text-[#0A0A0A]">{pack.name}</p>
          {pack.official ? <OfficialBadge /> : null}
        </div>
        <p className="mt-[6px] text-[12px] font-medium leading-[1.4] text-[#737373]">
          {pack.description}
        </p>
      </div>
      <ToggleSwitch checked={enabled} disabled={disabled} onChange={onToggle} />
    </div>
  );
}

function SkillArtwork({ skill }: { skill: SkillCatalogItem }) {
  return (
    <div
      className="flex h-[120px] items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${skill.meshSrc})` }}
    >
      <p className="px-[12px] text-center font-mono text-[13px] font-medium leading-[1.2] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
        {skill.overlayTitle}
      </p>
    </div>
  );
}

function SkillTypeIcon() {
  return (
    <span
      aria-hidden
      className="h-[16px] w-[16px] bg-[#737373]"
      style={{
        WebkitMask: 'url("/logos/skills/phone.svg") center / contain no-repeat',
        mask: 'url("/logos/skills/phone.svg") center / contain no-repeat',
      }}
    />
  );
}

function PackIcon({
  src,
  name,
  compact = false,
}: {
  src: string;
  name: string;
  compact?: boolean;
}) {
  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#F5F5F5]",
        compact ? "h-[28px] w-[28px]" : "h-[36px] w-[36px]",
      ].join(" ")}
    >
      <img src={src} alt="" aria-hidden className="h-[20px] w-[20px] object-contain" />
      <span className="sr-only">{name}</span>
    </span>
  );
}

function MetaChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] text-[11px] font-medium leading-none text-[#737373]">
      <span
        aria-hidden
        className="h-[12px] w-[12px] shrink-0 bg-[#737373]"
        style={{
          WebkitMask: `url("${icon}") center / contain no-repeat`,
          mask: `url("${icon}") center / contain no-repeat`,
        }}
      />
      {label}
    </span>
  );
}

function OfficialBadge() {
  return (
    <span className="rounded-[4px] border border-[#A78BFA] px-[5px] py-[2px] text-[10px] font-medium leading-none text-[#7C3AED]">
      Official
    </span>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-[#C7C4FF]" : "bg-[#D4D4D4]",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-[2px] h-[18px] w-[18px] rounded-full shadow transition-[left,background-color]",
          checked ? "left-[20px] bg-[#312E81]" : "left-[2px] bg-[#737373]",
        ].join(" ")}
      />
    </button>
  );
}
