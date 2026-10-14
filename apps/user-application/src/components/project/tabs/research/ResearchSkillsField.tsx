import { useState, type KeyboardEvent } from "react";
import { useSkillHubPrefs } from "@/hooks/settings/useSkillHubPrefs";
import { MAX_SKILLS } from "@/lib/project/researchConfigureInput";
import { resolveSkillUrl, type ResolvedSkill } from "@/lib/project/resolveSkillUrl";

// Chip label for a saved skill link: the skill's folder (or the repository) name.
function skillLabel(url: string) {
  const parts = url.replace("https://github.com/", "").split("/");
  const file = parts.at(-1)?.toLowerCase() === "skill.md";
  const folder = file ? parts.at(-2) : undefined;
  return folder && !["blob", "tree", "HEAD", "main"].includes(folder) ? folder : (parts[1] ?? url);
}

// "Upload Skills" in Configure Research (Figma 2294:5734). A link is checked with GitHub
// when added: Stage finds the SKILL.md (also in subfolders) and requires a real skill
// header, then saves the exact file link the engine downloads.
export function ResearchSkillsField({ skillUrls, onChange }: { skillUrls: string[]; onChange: (urls: string[]) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [added, setAdded] = useState<ResolvedSkill>();
  const skillHub = useSkillHubPrefs();

  async function addSkill() {
    if (checking) return;
    if (!input.trim()) {
      setError("Paste a GitHub repository link");
      return;
    }
    if (skillUrls.length >= MAX_SKILLS) {
      setError(`Add up to ${MAX_SKILLS} skills`);
      return;
    }
    setChecking(true);
    setError(undefined);
    try {
      const skill = await resolveSkillUrl(input);
      if (!skillUrls.includes(skill.url)) onChange([...skillUrls, skill.url]);
      setAdded(skill);
      setInput("");
      // Also list it under Settings → Installed Skills; an existing entry is fine.
      void skillHub.importFromGithub("skill", skill.url).catch(() => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't check this skill.");
    } finally {
      setChecking(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void addSkill();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex w-[347px] max-w-full items-center overflow-hidden rounded-[8px] bg-[#F5F5F5] py-[2px] pr-[2px] pl-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <input
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError(undefined);
            }}
            onKeyDown={handleKeyDown}
            placeholder="URL to github repo"
            inputMode="url"
            aria-label="Skill GitHub URL"
            disabled={checking}
            className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#171717] outline-none placeholder:text-[#525252]"
          />
          <button
            type="button"
            onClick={() => void addSkill()}
            disabled={checking}
            className="inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] pr-3 pl-[10px] text-[12px] leading-none font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] disabled:opacity-60"
          >
            <img src="/logos/research/upload-skill.svg" width={16} height={16} alt="" aria-hidden="true" />
            {checking ? "Checking…" : "Upload SKILL"}
          </button>
        </div>
        {error ? <p role="alert" className="max-w-[385px] text-[12px] leading-[1.4] font-medium text-[#DC2626]">{error}</p> : null}
        {added && !error ? (
          <p className="max-w-[385px] text-[12px] leading-[1.4] font-medium text-[#737373]">
            Added <span className="text-[#171717]">{added.name}</span>: {added.description}
          </p>
        ) : null}
      </div>
      {skillUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skillUrls.map((url) => (
            <button
              key={url}
              type="button"
              title={url}
              aria-label={`Remove skill ${skillLabel(url)}`}
              onClick={() => onChange(skillUrls.filter((item) => item !== url))}
              className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-[6px] text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.15)]"
            >
              {skillLabel(url)}
              <span className="text-[#A3A3A3]">x</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
