import { useMemo, useState, type ReactNode } from "react";
import { SkillDetailPanel } from "./SkillDetailPanel";
import { useSkillHubPrefs } from "@/hooks/settings/useSkillHubPrefs";
import { toUserFacingErrorMessage } from "@/lib/errors";
import {
  COMPONENT_PACK_CATALOG,
  DISCOVER_SKILL_CATALOG,
  withImportedPacks,
  withImportedSkills,
  type ComponentPackCatalogItem,
  type SkillCatalogItem,
} from "@/lib/settings/skillsCatalog";

export function SkillsHubPanel() {
  const prefs = useSkillHubPrefs();
  const skillCatalog = withImportedSkills(prefs.importedSkillHubItems);
  const installedSkills = skillCatalog.filter((skill) =>
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
        action={
          <GithubImportControl
            kind="skill"
            source="github"
            disabled={prefs.isLoading}
            onImport={(url) => prefs.importFromGithub("skill", url)}
          />
        }
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
              imported={prefs.extraSkillIds.includes(skill.id)}
              enabled={prefs.enabledSkillIds.includes(skill.id)}
              disabled={prefs.isLoading}
              onToggle={(next) => void prefs.setSkillEnabled(skill.id, next)}
              onRename={(name) => prefs.renameImportedItem(skill.id, name)}
              onRemove={() => prefs.removeImportedItem(skill.id)}
            />
          ))}
        </div>
      )}
    </HubSurface>
  );
}

export function ComponentsHubPanel() {
  const prefs = useSkillHubPrefs();
  const packCatalog = withImportedPacks(prefs.importedSkillHubItems);
  const installedCount = packCatalog.length;
  const enabledCount = packCatalog.filter((pack) =>
    prefs.enabledComponentPackIds.includes(pack.id),
  ).length;

  return (
    <HubSurface>
      <SurfaceHeader
        title="Component Libraries"
        count={`${installedCount} installed · ${enabledCount} enabled`}
        action={
          <GithubImportControl
            kind="component"
            source="web"
            disabled={prefs.isLoading}
            onImport={(url) => prefs.importComponentLibrary(url)}
          />
        }
      />
      <div className="flex flex-col gap-[4px]">
        {packCatalog.map((pack) => (
          <ComponentPackRow
            key={pack.id}
            pack={pack}
            imported={prefs.extraPackIds.includes(pack.id)}
            enabled={prefs.enabledComponentPackIds.includes(pack.id)}
            disabled={prefs.isLoading}
            onToggle={(next) => void prefs.setPackEnabled(pack.id, next)}
            onRemove={() => prefs.removeImportedItem(pack.id)}
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
  const [openSkillId, setOpenSkillId] = useState<string | null>(null);

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

  async function uninstallSkill(skill: SkillCatalogItem) {
    setBusyId(skill.id);
    try {
      await prefs.uninstallSkill(skill.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not uninstall skill.");
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

  const openSkill = openSkillId
    ? DISCOVER_SKILL_CATALOG.find((entry) => entry.id === openSkillId)
    : undefined;

  const toastNode = toast ? (
    <div className="absolute bottom-[4px] right-[4px] z-10 flex min-w-[220px] items-start gap-[10px] rounded-[8px] border border-[#E5E5E5] bg-white px-[12px] py-[10px] shadow-[0_8px_24px_rgba(10,10,10,0.15)]">
      <img src="/logos/check.svg" alt="" aria-hidden className="mt-[1px] h-[14px] w-[14px]" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium leading-none text-[#171717]">
          {toast === "skill" ? "Skill added to your library" : "Library added"}
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
          {toast === "skill" ? "View all skills" : "View all libraries"}
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
  ) : null;

  if (openSkill) {
    return (
      <div className="relative">
        <SkillDetailPanel
          skill={openSkill}
          installed={prefs.installedSkillIds.includes(openSkill.id)}
          busy={busyId === openSkill.id}
          onBack={() => setOpenSkillId(null)}
          onAddSkill={(id) => {
            const target = DISCOVER_SKILL_CATALOG.find((entry) => entry.id === id);
            if (target) void addSkill(target);
          }}
          onUninstallSkill={(id) => {
            const target = DISCOVER_SKILL_CATALOG.find((entry) => entry.id === id);
            if (target) void uninstallSkill(target);
          }}
          onOpenSkill={setOpenSkillId}
        />
        {toastNode}
      </div>
    );
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
                  onUninstall={() => void uninstallSkill(skill)}
                  onOpen={() => setOpenSkillId(skill.id)}
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

      {toastNode}
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

function SurfaceHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-[12px] px-[10px] py-[8px]">
      <h2 className="text-[13px] font-medium leading-none text-[#0A0A0A]">{title}</h2>
      <div className="flex shrink-0 items-center gap-[10px]">
        {count ? (
          <p className="text-[12px] font-medium leading-none text-[#737373]">{count}</p>
        ) : null}
        {action}
      </div>
    </div>
  );
}

function GithubImportControl({
  kind,
  source = "github",
  disabled,
  onImport,
}: {
  kind: "skill" | "component";
  source?: "github" | "web";
  disabled?: boolean;
  onImport: (url: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = kind === "skill" ? "skill" : "component library";
  const iconSrc =
    source === "web" ? "/logos/dashboard/web-design.svg" : "/logos/integrations/github.svg";
  const hint =
    source === "web"
      ? "Paste the library homepage URL. GitHub repositories still work."
      : "Paste a public GitHub repository URL.";
  const fieldLabel = source === "web" ? "Homepage URL" : "GitHub URL";
  const placeholder =
    source === "web" ? "https://ui.shadcn.com" : "https://github.com/owner/repo";

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onImport(url);
      setUrl("");
      setOpen(false);
    } catch (caught) {
      setError(toUserFacingErrorMessage(caught, `Could not import this ${label}.`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex h-[28px] items-center gap-[6px] rounded-[6px] bg-white px-[10px] text-[12px] font-medium text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.2)] disabled:opacity-50"
      >
        <img src={iconSrc} alt="" aria-hidden="true" className="h-[14px] w-[14px]" />
        Import
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-[5px]"
          role="dialog"
          aria-modal="true"
          aria-label={`Import ${label}`}
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="flex w-[min(360px,calc(100vw-48px))] flex-col rounded-[12px] bg-white p-[16px] shadow-[0_18px_42px_rgba(10,10,10,0.18)]"
          >
            <p className="flex items-center gap-[8px] text-[13px] font-semibold leading-none text-[#0A0A0A]">
              <img src={iconSrc} alt="" aria-hidden="true" className="h-[16px] w-[16px]" />
              Import {label}
            </p>
            <p className="mt-[6px] text-[12px] font-medium leading-[1.4] text-[#737373]">{hint}</p>
            <label className="mt-[16px] block">
              <span className="text-[11px] font-medium leading-none text-[#A3A3A3]">
                {fieldLabel}
              </span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={placeholder}
                autoFocus
                disabled={busy}
                className="mt-[6px] h-[32px] w-full rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium text-[#525252] outline-none"
              />
            </label>
            {error ? (
              <p className="mt-[8px] text-[12px] font-medium text-[#991B1B]">{error}</p>
            ) : null}
            <button
              type="button"
              disabled={busy || url.trim().length === 0}
              onClick={() => void submit()}
              className="mt-[12px] inline-flex h-[32px] w-full items-center justify-center gap-[6px] rounded-[6px] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-[12px] font-medium leading-none text-white disabled:opacity-50"
            >
              {source === "github" ? (
                <img
                  src="/logos/integrations/github.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[14px] w-[14px] invert"
                />
              ) : (
                <img
                  src="/logos/dashboard/web-design.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[14px] w-[14px] brightness-0 invert"
                />
              )}
              {busy ? "Importing…" : "Import"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="mt-[6px] inline-flex h-[32px] w-full items-center justify-center rounded-[6px] bg-white text-[12px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function InstalledSkillCard({
  skill,
  imported = false,
  enabled,
  disabled,
  onToggle,
  onRename,
  onRemove,
}: {
  skill: SkillCatalogItem;
  imported?: boolean;
  enabled: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
  onRename?: (name: string) => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(skill.name);
  const [saving, setSaving] = useState(false);

  async function commit() {
    const next = draft.trim();
    if (!onRename || next === skill.name || next.length === 0) {
      setDraft(skill.name);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(next.slice(0, 80));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <SkillArtwork skill={skill} />
      <div className="flex min-h-[112px] flex-col gap-[8px] p-[12px]">
        <div className="flex items-center justify-between gap-[8px]">
          <SkillTypeIcon />
          <div className="flex items-center gap-[8px]">
            {imported ? <RemoveImportedButton name={skill.name} disabled={disabled} onRemove={onRemove} /> : null}
            <ToggleSwitch checked={enabled} disabled={disabled} onChange={onToggle} />
          </div>
        </div>
        <div>
          <div className="group flex min-h-[16px] items-center gap-[6px]">
            {editing ? (
              <input
                value={draft}
                maxLength={80}
                autoFocus
                disabled={saving || disabled}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => void commit()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void commit();
                  }
                  if (event.key === "Escape") {
                    setDraft(skill.name);
                    setEditing(false);
                  }
                }}
                aria-label="Skill title"
                className="h-[20px] min-w-0 flex-1 rounded-[4px] bg-[#F5F5F5] px-[6px] text-[13px] font-medium leading-none text-[#0A0A0A] outline-none"
              />
            ) : (
              <>
                <h3 className="min-w-0 truncate text-[13px] font-medium leading-none text-[#0A0A0A]">
                  {skill.name}
                </h3>
                {imported ? (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Rename ${skill.name}`}
                    onClick={() => {
                      setDraft(skill.name);
                      setEditing(true);
                    }}
                    className="inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-0"
                  >
                    <img src="/logos/dashboard/edit.svg" alt="" aria-hidden="true" className="h-[12px] w-[12px]" />
                  </button>
                ) : null}
                {skill.official ? <OfficialBadge /> : null}
              </>
            )}
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
  onUninstall,
  onOpen,
}: {
  skill: SkillCatalogItem;
  installed: boolean;
  busy: boolean;
  disabled: boolean;
  onAdd: () => void;
  onUninstall: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View ${skill.name} details`}
        className="block w-full cursor-pointer text-left"
      >
        <SkillArtwork skill={skill} />
      </button>
      <div className="flex min-h-[170px] flex-col gap-[10px] p-[12px]">
        <button type="button" onClick={onOpen} className="cursor-pointer text-left">
          <h3 className="text-[13px] font-medium leading-[1.3] text-[#0A0A0A]">{skill.name}</h3>
          <p className="mt-[4px] line-clamp-2 text-[12px] font-medium leading-[1.4] text-[#737373]">
            {skill.description}
          </p>
        </button>
        <div className="flex flex-wrap items-center gap-[10px]">
          <MetaChip icon="/logos/skills/toolbox.svg" label={skill.category} />
          <MetaChip icon="/logos/download.svg" label={skill.installsLabel} />
        </div>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => (installed ? onUninstall() : onAdd())}
          className="mt-auto inline-flex h-[30px] w-fit items-center rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.2)] disabled:text-[#A3A3A3]"
        >
          {busy ? (installed ? "Removing…" : "Adding…") : installed ? "Uninstall" : "+ Add Skill"}
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
  imported = false,
  enabled,
  disabled,
  onToggle,
  onRemove,
}: {
  pack: ComponentPackCatalogItem;
  imported?: boolean;
  enabled: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
  onRemove?: () => Promise<void>;
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
      {imported ? <RemoveImportedButton name={pack.name} disabled={disabled} onRemove={onRemove} /> : null}
      <ToggleSwitch checked={enabled} disabled={disabled} onChange={onToggle} />
    </div>
  );
}

export function SkillArtwork({ skill }: { skill: SkillCatalogItem }) {
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

export function PackIcon({
  src,
  name,
  compact = false,
}: {
  src: string;
  name: string;
  compact?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const shown = failedSrc === src ? "/logos/skills/blocks.svg" : src;
  const remote = shown.startsWith("https://");
  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#F5F5F5]",
        compact ? "h-[28px] w-[28px]" : "h-[36px] w-[36px]",
      ].join(" ")}
    >
      <img
        src={shown}
        alt=""
        aria-hidden
        onError={() => setFailedSrc(src)}
        className={remote ? "h-full w-full object-contain" : "h-[20px] w-[20px] object-contain"}
      />
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function MetaChip({ icon, label }: { icon: string; label: string }) {
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

export function OfficialBadge() {
  return (
    <span className="rounded-[4px] border border-[#A78BFA] px-[5px] py-[2px] text-[10px] font-medium leading-none text-[#7C3AED]">
      Official
    </span>
  );
}

function RemoveImportedButton({
  name,
  disabled,
  onRemove,
}: {
  name: string;
  disabled?: boolean;
  onRemove?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  if (!onRemove) return null;
  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-label={`Remove ${name}`}
      onClick={() => {
        if (busy) return;
        setBusy(true);
        void onRemove().finally(() => setBusy(false));
      }}
      className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] hover:bg-[#FEF2F2] disabled:opacity-50"
    >
      <img src="/logos/trash.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px]" />
    </button>
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

