import { useState } from "react";
import { parseGithubSourceUrl } from "@shared/models/safeHttpsUrl";
import {
  DISCOVER_SKILL_CATALOG,
  type SkillCatalogItem,
} from "@/lib/settings/skillsCatalog";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import { MetaChip, OfficialBadge, SkillArtwork } from "./SkillsComponentsHub";

function shareableGithubUrl(sourceUrl: string): string | null {
  try {
    return parseGithubSourceUrl(sourceUrl);
  } catch {
    return null;
  }
}

export function SkillDetailPanel({
  skill,
  installed,
  busy,
  onBack,
  onAddSkill,
  onUninstallSkill,
  onOpenSkill,
}: {
  skill: SkillCatalogItem;
  installed: boolean;
  busy: boolean;
  onBack: () => void;
  onAddSkill: (id: string) => void;
  onUninstallSkill: (id: string) => void;
  onOpenSkill: (id: string) => void;
}) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const similar = DISCOVER_SKILL_CATALOG.filter((entry) => entry.id !== skill.id).slice(0, 3);
  const shareUrl = shareableGithubUrl(skill.sourceUrl);

  return (
    <section className="relative flex flex-col gap-[20px]">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit cursor-pointer items-center gap-[8px] text-[13px] font-medium leading-none text-[#A3A3A3] transition-colors hover:text-[#525252]"
      >
        <img src="/logos/back.svg" alt="" aria-hidden className="h-[14px] w-[14px]" />
        Back to libraries
      </button>

      <div className="flex flex-col gap-[24px] lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-[24px]">
          <header className="flex flex-wrap items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-[8px]">
                <h2 className="text-[16px] font-semibold leading-none text-[#0A0A0A]">
                  {skill.name}
                </h2>
                {skill.official ? <OfficialBadge /> : null}
              </div>
              <p className="mt-[6px] text-[13px] font-medium leading-[1.4] text-[#737373]">
                {skill.description}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                installed ? onUninstallSkill(skill.id) : onAddSkill(skill.id)
              }
              className={
                installed
                  ? "inline-flex h-[30px] shrink-0 items-center rounded-[6px] bg-[#F5F5F5] px-[12px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.2)] transition-opacity enabled:hover:opacity-95 disabled:opacity-60"
                  : "inline-flex h-[30px] shrink-0 items-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] text-[12px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity enabled:hover:opacity-95 disabled:opacity-60"
              }
            >
              {busy
                ? installed
                  ? "Removing…"
                  : "Adding…"
                : installed
                  ? "Uninstall"
                  : "Use in Stage"}
            </button>
          </header>

          <div className="overflow-hidden rounded-[8px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <SkillArtwork skill={skill} />
          </div>

          <DetailSection title="Description">
            <p className="text-[12px] font-medium leading-[1.6] text-[#525252]">
              {skill.longDescription}
            </p>
          </DetailSection>

          <div className="grid gap-[16px] sm:grid-cols-2">
            <DetailSection title="Features & Use Cases">
              <ul className="flex list-disc flex-col gap-[6px] pl-[16px]">
                {skill.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-[12px] font-medium leading-[1.5] text-[#525252]"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </DetailSection>

            <div className="h-fit rounded-[8px] bg-[#F5F5F5] p-[12px]">
              <p className="text-[12px] font-semibold leading-none text-[#0A0A0A]">Best for</p>
              <div className="mt-[10px] flex flex-wrap gap-[10px]">
                {skill.bestFor.map((entry) => (
                  <MetaChip key={entry} icon="/logos/skills/blocks.svg" label={entry} />
                ))}
              </div>
            </div>
          </div>

          <DetailSection title="Similar Skills">
            <div className="flex flex-col gap-[4px]">
              {similar.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onOpenSkill(entry.id)}
                  className="flex cursor-pointer items-center gap-[12px] rounded-[8px] bg-white p-[8px] text-left shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
                >
                  <span
                    aria-hidden
                    className="flex h-[48px] w-[96px] shrink-0 items-center justify-center rounded-[6px] bg-cover bg-center px-[6px] text-center font-mono text-[10px] font-medium leading-[1.2] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                    style={{ backgroundImage: `url(${entry.meshSrc})` }}
                  >
                    {entry.overlayTitle}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-none text-[#0A0A0A]">
                      {entry.name}
                    </span>
                    <span className="mt-[4px] line-clamp-2 block text-[12px] font-medium leading-[1.4] text-[#737373]">
                      {entry.description}
                    </span>
                    <span className="mt-[6px] flex flex-wrap items-center gap-[10px]">
                      <MetaChip icon="/logos/skills/toolbox.svg" label={entry.category} />
                      <MetaChip icon="/logos/download.svg" label={entry.installsLabel} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </DetailSection>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-[16px] border-t border-dashed border-[#E5E5E5] pt-[16px] lg:w-[200px] lg:border-l lg:border-t-0 lg:pl-[20px] lg:pt-0">
          <div className="flex flex-col gap-[8px]">
            <SidebarAction
              icon="/logos/skills/blocks.svg"
              label={installed ? "Uninstall" : "Add to collection"}
              disabled={busy}
              onClick={() =>
                installed ? onUninstallSkill(skill.id) : onAddSkill(skill.id)
              }
            />
            <SidebarAction
              icon="/logos/skills/shopping-bag.svg"
              label="Share Skill"
              disabled={!shareUrl}
              onClick={() => {
                if (shareUrl) setIsShareOpen(true);
              }}
            />
          </div>

          <div className="flex flex-col gap-[12px] border-t border-[#E5E5E5] pt-[16px]">
            <MetaField label="Price" value="Free with Stage" />
            <MetaField label="Works with" value="Wireframes, Hi-Fi generation" />
            <MetaField label="Category" value={skill.category} />
            <MetaField label="Source" value="Stage Library (curated)" />
            <MetaField label="Author" value={skill.author} />
            <MetaField label="Popularity" value={skill.installsLabel} />
            <div>
              <p className="text-[11px] font-medium leading-none text-[#A3A3A3]">Links</p>
              <button
                type="button"
                onClick={() => void openExternalLink(skill.sourceUrl)}
                className="mt-[4px] cursor-pointer text-[12px] font-medium leading-[1.4] text-[#7C3AED] underline"
              >
                Upstream repository
              </button>
            </div>
            <div>
              <p className="text-[11px] font-medium leading-none text-[#A3A3A3]">Tags</p>
              <p className="mt-[4px] text-[12px] font-medium leading-[1.4] text-[#171717]">
                {skill.tags.join(", ")}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {isShareOpen && shareUrl ? (
        <ShareSkillDialog
          url={shareUrl}
          onClose={() => setIsShareOpen(false)}
        />
      ) : null}
    </section>
  );
}

function ShareSkillDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const safeUrl = parseGithubSourceUrl(url);
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", safeUrl);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-label="Share skill"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex w-[min(320px,calc(100vw-48px))] flex-col rounded-[12px] bg-white p-[16px] shadow-[0_18px_42px_rgba(10,10,10,0.18)]"
      >
        <p className="text-center text-[13px] font-semibold leading-none text-[#0A0A0A]">
          Share skills
        </p>
        <p className="mt-[6px] text-center text-[12px] font-medium leading-[1.4] text-[#737373]">
          Copy the GitHub repository link.
        </p>

        <label className="mt-[16px] block">
          <span className="text-[11px] font-medium leading-none text-[#A3A3A3]">URL Link</span>
          <input
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-[6px] h-[32px] w-full rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium text-[#525252] outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => void copy()}
          className={`mt-[12px] inline-flex h-[32px] w-full items-center justify-center gap-[6px] rounded-[6px] text-[12px] font-medium leading-none text-white transition-colors ${
            copied ? "bg-[#16A34A]" : "bg-gradient-to-b from-[#7B76DF] to-[#463FBA]"
          }`}
        >
          {copied ? "✓ Copied" : "Copy Link"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-[6px] inline-flex h-[32px] w-full items-center justify-center rounded-[6px] bg-white text-[12px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#E5E5E5] pt-[16px]">
      <p className="text-[12px] font-semibold leading-none text-[#0A0A0A]">{title}</p>
      <div className="mt-[10px]">{children}</div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium leading-none text-[#A3A3A3]">{label}</p>
      <p className="mt-[4px] text-[12px] font-medium leading-[1.4] text-[#171717]">{value}</p>
    </div>
  );
}

function SidebarAction({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-[8px] text-left text-[12px] font-medium leading-none text-[#171717] transition-colors hover:text-[#000000] disabled:cursor-default disabled:text-[#A3A3A3]"
    >
      <span
        aria-hidden
        className="h-[14px] w-[14px] shrink-0 bg-current"
        style={{
          WebkitMask: `url("${icon}") center / contain no-repeat`,
          mask: `url("${icon}") center / contain no-repeat`,
        }}
      />
      {label}
    </button>
  );
}

