import { useState, type KeyboardEvent } from "react";
import { useSkillHubPrefs } from "@/hooks/settings/useSkillHubPrefs";
import { MAX_SKILLS, parseSkillUrl } from "@/lib/project/researchConfigureInput";

// "Upload Skills" in Configure Research (Figma 2294:5734). Each link is a public GitHub
// repository whose SKILL.md the engine applies after Stage's research; the result
// appears as Research.md at the top of the Research tab.
export function ResearchSkillsField({ skillUrls, onChange }: { skillUrls: string[]; onChange: (urls: string[]) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const skillHub = useSkillHubPrefs();

  function addSkill() {
    const parsed = parseSkillUrl(input);
    if (!parsed.success) {
      setError(input.trim() ? parsed.error : "Paste a GitHub repository link");
      return;
    }
    if (skillUrls.includes(parsed.url)) {
      setInput("");
      return;
    }
    if (skillUrls.length >= MAX_SKILLS) {
      setError(`Add up to ${MAX_SKILLS} skills`);
      return;
    }
    onChange([...skillUrls, parsed.url]);
    setInput("");
    setError(undefined);
    // Also list it under Settings → Installed Skills; an existing entry is fine.
    void skillHub.importFromGithub("skill", parsed.url).catch(() => undefined);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addSkill();
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
            className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#171717] outline-none placeholder:text-[#525252]"
          />
          <button
            type="button"
            onClick={addSkill}
            className="inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] pr-3 pl-[10px] text-[12px] leading-none font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
          >
            <img src="/logos/research/upload-skill.svg" width={16} height={16} alt="" aria-hidden="true" />
            Upload SKILL
          </button>
        </div>
        {error ? <p className="text-[12px] leading-[1.4] font-medium text-[#DC2626]">{error}</p> : null}
      </div>
      {skillUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skillUrls.map((url) => (
            <button
              key={url}
              type="button"
              aria-label={`Remove skill ${url}`}
              onClick={() => onChange(skillUrls.filter((item) => item !== url))}
              className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-[6px] text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.15)]"
            >
              {url.replace("https://github.com/", "")}
              <span className="text-[#A3A3A3]">x</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
