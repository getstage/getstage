import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useSettingsOverviewQuery, type ProjectMember } from "@/hooks/convex-data";

type BlockType = "heading" | "paragraph" | "bullet";
type Block = { id: number; type: BlockType; text: string };

type Props = {
  value: string;
  members: ProjectMember[];
  onChange: (value: string) => void;
};

const BLOCK_COMMANDS = [
  { id: "heading" as const, label: "Heading 1", icon: "H1" },
  { id: "paragraph" as const, label: "Body text", icon: "T" },
  { id: "bullet" as const, label: "Bulleted list", icon: "•" },
  { id: "mention" as const, label: "Mention member", icon: "@" },
];

const SLASH_TRIGGER_PATTERN = /(?:^|\s)\/([^\s/]*)$/;
const MENTION_TRIGGER_PATTERN = /(?:^|\s)@([^\s@]*)$/;

let nextBlockId = 1;

function parseBlocks(value: string): Block[] {
  const lines = value.split("\n");
  const blocks = lines.map((line) => {
    if (line.startsWith("# ")) return { id: nextBlockId++, type: "heading" as const, text: line.slice(2) };
    if (line.startsWith("- ")) return { id: nextBlockId++, type: "bullet" as const, text: line.slice(2) };
    return { id: nextBlockId++, type: "paragraph" as const, text: line };
  });
  return blocks.length ? blocks : [{ id: nextBlockId++, type: "paragraph", text: "" }];
}

function serializeBlocks(blocks: Block[]) {
  return blocks
    .map((block) => `${block.type === "heading" ? "# " : block.type === "bullet" ? "- " : ""}${block.text}`)
    .join("\n");
}

function memberLabel(member: ProjectMember) {
  return member.name?.trim() || member.email?.trim() || "Team member";
}

function hasOpenEditorTrigger(text: string) {
  return SLASH_TRIGGER_PATTERN.test(text) || MENTION_TRIGGER_PATTERN.test(text);
}

export function TaskDetailsEditor({ value, members, onChange }: Props) {
  const [blocks, setBlocks] = useState(() => parseBlocks(value));
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRefs = useRef(new Map<number, HTMLInputElement>());
  const isLocalChangeRef = useRef(false);

  useEffect(() => {
    if (isLocalChangeRef.current) {
      isLocalChangeRef.current = false;
      return;
    }
    setBlocks(parseBlocks(value));
  }, [value]);

  const activeBlock = blocks.find((block) => block.id === activeBlockId);
  const slashMatch = activeBlock?.text.match(SLASH_TRIGGER_PATTERN);
  const mentionMatch = activeBlock?.text.match(MENTION_TRIGGER_PATTERN);
  const slashQuery = slashMatch?.[1].toLocaleLowerCase() ?? "";
  const mentionQuery = mentionMatch?.[1].toLocaleLowerCase() ?? "";
  const isMentionMode = Boolean(mentionMatch) || slashQuery === "mention";
  const options = useMemo(() => {
    if (isMentionMode) {
      return members
        .map((member) => ({ id: member.userId, label: memberLabel(member), member }))
        .filter((option) => option.label.toLocaleLowerCase().includes(mentionQuery));
    }
    return BLOCK_COMMANDS.filter((command) =>
      `${command.label} ${command.id}`.toLocaleLowerCase().includes(slashQuery),
    );
  }, [isMentionMode, members, mentionQuery, slashQuery]);
  const isMenuOpen = Boolean(activeBlock && (slashMatch || mentionMatch));

  useEffect(() => setSelectedIndex(0), [slashQuery, mentionQuery, activeBlockId]);

  function commit(next: Block[]) {
    isLocalChangeRef.current = true;
    setBlocks(next);
    onChange(serializeBlocks(next));
  }

  function focusBlock(id: number) {
    window.requestAnimationFrame(() => {
      const input = inputRefs.current.get(id);
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function replaceSlash(block: Block, replacement: string) {
    const text = block.text.replace(SLASH_TRIGGER_PATTERN, (match) => {
      const prefix = match.startsWith(" ") ? " " : "";
      return `${prefix}${replacement}`;
    });
    return text;
  }

  function replaceMention(block: Block, replacement: string) {
    const text = block.text.replace(MENTION_TRIGGER_PATTERN, (match) => {
      const prefix = match.startsWith(" ") ? " " : "";
      return `${prefix}${replacement}`;
    });
    return text;
  }

  function selectOption(index: number) {
    const block = activeBlock;
    const option = options[index];
    if (!block || !option) return;

    if ("member" in option) {
      const next = blocks.map((item) =>
        item.id === block.id
          ? {
              ...item,
              text: mentionMatch
                ? replaceMention(item, `@${option.label} `)
                : replaceSlash(item, `@${option.label} `),
            }
          : item,
      );
      setActiveBlockId(null);
      commit(next);
      focusBlock(block.id);
      return;
    }

    if (option.id === "mention") {
      const next = blocks.map((item) =>
        item.id === block.id ? { ...item, text: replaceSlash(item, "/mention") } : item,
      );
      commit(next);
      return;
    }

    const next = blocks.map((item) =>
      item.id === block.id ? { ...item, type: option.id, text: replaceSlash(item, "") } : item,
    );
    setActiveBlockId(null);
    commit(next);
    focusBlock(block.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, block: Block, index: number) {
    if (isMenuOpen && block.id === activeBlockId) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSelectedIndex((current) => (current + direction + options.length) % Math.max(options.length, 1));
        return;
      }
      if (event.key === "Enter" && options.length) {
        event.preventDefault();
        selectOption(selectedIndex);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveBlockId(null);
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (block.type === "bullet" && block.text === "") {
        const next = blocks.map((item) => item.id === block.id ? { ...item, type: "paragraph" as const } : item);
        commit(next);
        return;
      }
      const newBlock: Block = {
        id: nextBlockId++,
        type: block.type === "bullet" ? "bullet" : "paragraph",
        text: "",
      };
      const next = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
      commit(next);
      focusBlock(newBlock.id);
    }

    if (event.key === "Backspace" && block.text === "" && blocks.length > 1) {
      event.preventDefault();
      const previous = blocks[Math.max(0, index - 1)];
      commit(blocks.filter((item) => item.id !== block.id));
      focusBlock(previous.id);
    }
  }

  return (
    <div className="min-h-[280px]" role="textbox" aria-label="Task details" aria-multiline="true">
      {blocks.map((block, index) => (
        <div key={block.id} className="relative flex min-h-[30px] items-start gap-[8px]">
          {block.type === "bullet" ? (
            <span className="mt-[7px] flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[18px] leading-none text-[#525252]">•</span>
          ) : null}
          <input
            ref={(node) => {
              if (node) inputRefs.current.set(block.id, node);
              else inputRefs.current.delete(block.id);
            }}
            value={block.text}
            onFocus={() => hasOpenEditorTrigger(block.text) && setActiveBlockId(block.id)}
            onChange={(event) => {
              const text = event.target.value;
              const next = blocks.map((item) => item.id === block.id ? { ...item, text } : item);
              setActiveBlockId(hasOpenEditorTrigger(text) ? block.id : null);
              commit(next);
            }}
            onKeyDown={(event) => handleKeyDown(event, block, index)}
            placeholder={index === 0 && !block.text ? "Type / for formatting and mentions…" : undefined}
            className={`min-w-0 flex-1 border-0 bg-transparent px-0 outline-none placeholder:text-[#a3a3a3] ${
              block.type === "heading"
                ? "py-[2px] text-[22px] font-semibold leading-[1.35] text-[#171717]"
                : "py-[5px] text-[13px] font-normal leading-[1.5] text-[#262626]"
            }`}
          />
          {isMenuOpen && activeBlockId === block.id ? (
            <SlashMenu
              options={options}
              selectedIndex={selectedIndex}
              onSelect={selectOption}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SlashMenu({
  options,
  selectedIndex,
  onSelect,
}: {
  options: Array<{ id: string; label: string; icon?: string; member?: ProjectMember }>;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const settingsOverviewQuery = useSettingsOverviewQuery();
  const profile = settingsOverviewQuery.data?.profile;

  return (
    <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[212px] rounded-[8px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[6px] bg-white p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        {options.length ? options.map((option, index) => (
          <button
            key={option.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(index)}
            className={`flex h-[32px] w-full items-center gap-[8px] rounded-[6px] px-[8px] text-left text-[13px] font-medium leading-none text-[#171717] outline-none transition-colors ${index === selectedIndex ? "bg-[#f5f5f5]" : "hover:bg-[#f5f5f5]"}`}
          >
            {option.member ? (
              <Avatar
                name={option.label}
                src={getMemberAvatarUrl(option.member, profile)}
                className="h-[18px] w-[18px] text-[10px]"
              />
            ) : (
              <span className="flex w-[18px] shrink-0 items-center justify-center text-[11px] font-semibold text-[#737373]">
                {option.icon}
              </span>
            )}
            <span className="min-w-0 truncate">{option.label}</span>
          </button>
        )) : <p className="px-[8px] py-[8px] text-[12px] font-medium text-[#737373]">No matching members</p>}
      </div>
    </div>
  );
}

function getMemberAvatarUrl(
  member: ProjectMember,
  profile: { id: string; email: string; avatarUrl: string | null } | undefined,
) {
  if (!profile?.avatarUrl) return undefined;

  if (member.userId === profile.id || member.email === profile.email) {
    return profile.avatarUrl;
  }

  return undefined;
}
