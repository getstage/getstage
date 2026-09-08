import { Children, useState, type ReactNode } from "react";
import {
  MetaChip,
  PackIcon,
  SkillArtwork,
} from "@/components/settings/SkillsComponentsHub";
import { useSkillHubPrefs } from "@/hooks/settings/useSkillHubPrefs";
import {
  CATALOG_PACK_IDS,
  CATALOG_SKILL_IDS,
  parseCatalogPackId,
  parseCatalogSkillId,
  sanitizeCatalogIds,
  sanitizeProjectCatalogSelection,
} from "@/lib/settings/skillHubIds";
import {
  COMPONENT_PACK_CATALOG,
  DISCOVER_SKILL_CATALOG,
  type ComponentPackCatalogItem,
  type SkillCatalogItem,
} from "@/lib/settings/skillsCatalog";
import { toUserFacingErrorMessage } from "@/lib/errors";

export function catalogEntry(id: string | null): { name: string; iconSrc?: string } | null {
  if (!id) return null;
  const skill = DISCOVER_SKILL_CATALOG.find((entry) => entry.id === id);
  if (skill) return { name: skill.name };
  const pack = COMPONENT_PACK_CATALOG.find((entry) => entry.id === id);
  if (pack) return { name: pack.name, iconSrc: pack.iconSrc };
  return { name: id };
}

/**
 * Marketplace-style Skills / Components picker. Added items sit on top; the rest of
 * the catalog is below so the user can install without leaving the flow. Project
 * selection is a multi-select of catalog ids — not the old five exclusive axes.
 */
export function SkillsComponentsPanel({
  skillIds,
  componentPackIds,
  onChange,
  disabled = false,
}: {
  skillIds: readonly string[];
  componentPackIds: readonly string[];
  onChange: (next: { skillIds: string[]; componentPackIds: string[] }) => void;
  disabled?: boolean;
}) {
  const prefs = useSkillHubPrefs();
  const [tab, setTab] = useState<"skills" | "components">("skills");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSkills = sanitizeCatalogIds(skillIds, CATALOG_SKILL_IDS);
  const selectedPacks = sanitizeCatalogIds(componentPackIds, CATALOG_PACK_IDS);
  const addedSkills = DISCOVER_SKILL_CATALOG.filter((skill) =>
    prefs.installedSkillIds.includes(skill.id),
  );
  const otherSkills = DISCOVER_SKILL_CATALOG.filter(
    (skill) => !prefs.installedSkillIds.includes(skill.id),
  );
  const addedPacks = COMPONENT_PACK_CATALOG.filter((pack) =>
    prefs.enabledComponentPackIds.includes(pack.id),
  );
  const otherPacks = COMPONENT_PACK_CATALOG.filter(
    (pack) => !prefs.enabledComponentPackIds.includes(pack.id),
  );

  function emit(nextSkills: readonly string[], nextPacks: readonly string[]) {
    onChange(sanitizeProjectCatalogSelection(nextSkills, nextPacks));
  }

  function toggleSkill(id: string) {
    const skillId = parseCatalogSkillId(id);
    emit(
      selectedSkills.includes(skillId)
        ? selectedSkills.filter((entry) => entry !== skillId)
        : [...selectedSkills, skillId],
      selectedPacks,
    );
  }

  function togglePack(id: string) {
    const packId = parseCatalogPackId(id);
    emit(
      selectedSkills,
      selectedPacks.includes(packId)
        ? selectedPacks.filter((entry) => entry !== packId)
        : [...selectedPacks, packId],
    );
  }

  async function addSkill(skill: SkillCatalogItem) {
    setBusyId(skill.id);
    setError(null);
    try {
      await prefs.addSkill(skill.id);
      emit(
        selectedSkills.includes(skill.id) ? selectedSkills : [...selectedSkills, skill.id],
        selectedPacks,
      );
    } catch (caught) {
      setError(toUserFacingErrorMessage(caught, "Could not add skill."));
    } finally {
      setBusyId(null);
    }
  }

  async function addPack(pack: ComponentPackCatalogItem) {
    setBusyId(pack.id);
    setError(null);
    try {
      await prefs.setPackEnabled(pack.id, true);
      emit(
        selectedSkills,
        selectedPacks.includes(pack.id) ? selectedPacks : [...selectedPacks, pack.id],
      );
    } catch (caught) {
      setError(toUserFacingErrorMessage(caught, "Could not add library."));
    } finally {
      setBusyId(null);
    }
  }

  const locked = disabled || prefs.isLoading;

  return (
    <div className="flex w-full flex-col gap-[12px]">
      <div className="grid grid-cols-2 rounded-[8px] bg-[#F5F5F5] p-[2px]">
        {(
          [
            { id: "skills" as const, label: "Skills" },
            { id: "components" as const, label: "Components" },
          ] as const
        ).map((entry) => (
          <button
            key={entry.id}
            type="button"
            disabled={locked}
            onClick={() => setTab(entry.id)}
            className={`h-[30px] rounded-[6px] text-[12px] font-medium leading-none transition-colors ${
              tab === entry.id
                ? "bg-white text-[#0A0A0A] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.2)]"
                : "text-[#737373]"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "skills" ? (
        <>
          <PickerSection
            title="Added skills"
            empty="No skills added yet. Add one from the catalog below."
          >
            {addedSkills.map((skill) => {
              const selected = selectedSkills.includes(skill.id);
              return (
                <SkillPickerCard
                  key={skill.id}
                  skill={skill}
                  selected={selected}
                  busy={busyId === skill.id}
                  disabled={locked}
                  actionLabel={selected ? "Selected" : "Use in project"}
                  onAction={() => toggleSkill(skill.id)}
                />
              );
            })}
          </PickerSection>
          {otherSkills.length > 0 ? (
            <PickerSection title="Add skills">
              {otherSkills.map((skill) => (
                <SkillPickerCard
                  key={skill.id}
                  skill={skill}
                  selected={false}
                  busy={busyId === skill.id}
                  disabled={locked}
                  actionLabel={busyId === skill.id ? "Adding…" : "+ Add Skill"}
                  onAction={() => void addSkill(skill)}
                />
              ))}
            </PickerSection>
          ) : null}
        </>
      ) : (
        <>
          <PickerSection
            title="Added components"
            empty="No libraries enabled yet. Add one from the catalog below."
          >
            {addedPacks.map((pack) => {
              const selected = selectedPacks.includes(pack.id);
              return (
                <PackPickerCard
                  key={pack.id}
                  pack={pack}
                  selected={selected}
                  busy={busyId === pack.id}
                  disabled={locked}
                  actionLabel={selected ? "Selected" : "Use in project"}
                  onAction={() => togglePack(pack.id)}
                />
              );
            })}
          </PickerSection>
          {otherPacks.length > 0 ? (
            <PickerSection title="Add components">
              {otherPacks.map((pack) => (
                <PackPickerCard
                  key={pack.id}
                  pack={pack}
                  selected={false}
                  busy={busyId === pack.id}
                  disabled={locked}
                  actionLabel={busyId === pack.id ? "Adding…" : "+ Add Library"}
                  onAction={() => void addPack(pack)}
                />
              ))}
            </PickerSection>
          ) : null}
        </>
      )}

      {error ? <p className="text-[12px] font-medium text-[#b91c1c]">{error}</p> : null}
    </div>
  );
}

function PickerSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string;
  children: ReactNode;
}) {
  const hasItems = Children.count(children) > 0;

  return (
    <div className="flex flex-col gap-[8px]">
      <p className="text-[12px] font-semibold leading-none text-[#0A0A0A]">{title}</p>
      {hasItems ? (
        <div className="grid grid-cols-1 gap-[4px] sm:grid-cols-2">{children}</div>
      ) : empty ? (
        <p className="rounded-[8px] bg-[#F5F5F5] px-[12px] py-[16px] text-center text-[12px] font-medium text-[#737373]">
          {empty}
        </p>
      ) : null}
    </div>
  );
}

function SkillPickerCard({
  skill,
  selected,
  busy,
  disabled,
  actionLabel,
  onAction,
}: {
  skill: SkillCatalogItem;
  selected: boolean;
  busy: boolean;
  disabled: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <SkillArtwork skill={skill} />
      <div className="flex min-h-[148px] flex-col gap-[10px] p-[12px]">
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
          disabled={disabled || busy}
          onClick={onAction}
          className={`mt-auto inline-flex h-[30px] w-fit items-center rounded-[6px] px-[10px] text-[12px] font-medium shadow-[0_0.45px_0.5px_rgba(10,10,10,0.2)] disabled:text-[#A3A3A3] ${
            selected
              ? "bg-[#EDE9FE] text-[#5B21B6]"
              : "bg-[#F5F5F5] text-[#171717]"
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </article>
  );
}

function PackPickerCard({
  pack,
  selected,
  busy,
  disabled,
  actionLabel,
  onAction,
}: {
  pack: ComponentPackCatalogItem;
  selected: boolean;
  busy: boolean;
  disabled: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="flex min-h-[168px] flex-col gap-[10px] rounded-[8px] bg-white p-[16px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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
        disabled={disabled || busy}
        onClick={onAction}
        className={`mt-auto inline-flex h-[30px] w-fit items-center rounded-[6px] px-[10px] text-[12px] font-medium shadow-[0_0.45px_0.5px_rgba(10,10,10,0.2)] disabled:opacity-50 ${
          selected
            ? "bg-[#EDE9FE] text-[#5B21B6]"
            : "bg-[#F5F5F5] text-[#171717]"
        }`}
      >
        {actionLabel}
      </button>
    </article>
  );
}
