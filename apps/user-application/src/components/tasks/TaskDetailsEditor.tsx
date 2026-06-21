import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ProjectMember } from "@/hooks/convex-data";

type BlockType = "heading" | "paragraph" | "bullet";
type Block = { id: number; type: BlockType; text: string };

type Props = {
  value: string;
  members: ProjectMember[];
  onChange: (value: string) => void;
};

const BLOCK_COMMANDS = [
  { id: "heading" as const, label: "Heading 1", hint: "Large section heading", icon: "H1" },
  { id: "paragraph" as const, label: "Body text", hint: "Plain text paragraph", icon: "T" },
  { id: "bullet" as const, label: "Bulleted list", hint: "Create a simple list", icon: "•" },
  { id: "mention" as const, label: "Mention member", hint: "Notify a teammate in context", icon: "@" },
];

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
  const slashMatch = activeBlock?.text.match(/(?:^|\s)\/([^\s/]*)$/);
  const slashQuery = slashMatch?.[1].toLocaleLowerCase() ?? "";
  const isMentionMode = slashQuery === "mention";
  const options = useMemo(() => {
    if (isMentionMode) {
      return members.map((member) => ({ id: member.userId, label: memberLabel(member), member }));
    }
    return BLOCK_COMMANDS.filter((command) =>
      `${command.label} ${command.id}`.toLocaleLowerCase().includes(slashQuery),
    );
  }, [isMentionMode, members, slashQuery]);
  const isMenuOpen = Boolean(activeBlock && slashMatch);

  useEffect(() => setSelectedIndex(0), [slashQuery, activeBlockId]);

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
    const text = block.text.replace(/(?:^|\s)\/[^\s/]*$/, (match) => {
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
          ? { ...item, text: replaceSlash(item, `@${option.label} `) }
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
            onFocus={() => block.text.match(/(?:^|\s)\/[^\s/]*$/) && setActiveBlockId(block.id)}
            onChange={(event) => {
              const text = event.target.value;
              const next = blocks.map((item) => item.id === block.id ? { ...item, text } : item);
              setActiveBlockId(text.match(/(?:^|\s)\/[^\s/]*$/) ? block.id : null);
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
              isMentionMode={isMentionMode}
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
  isMentionMode,
  onSelect,
}: {
  options: Array<{ id: string; label: string; hint?: string; icon?: string; member?: ProjectMember }>;
  selectedIndex: number;
  isMentionMode: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[240px] rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] bg-white p-[6px] shadow-[0_8px_24px_rgba(10,10,10,0.12)]">
      <p className="px-[8px] pb-[4px] pt-[2px] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3]">
        {isMentionMode ? "Team members" : "Basic blocks"}
      </p>
      {options.length ? options.map((option, index) => (
        <button
          key={option.id}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(index)}
          className={`flex w-full items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left transition-colors ${index === selectedIndex ? "bg-[#f5f5f5]" : "hover:bg-[#f5f5f5]"}`}
        >
          <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[5px] border border-[#e5e5e5] bg-white text-[11px] font-semibold text-[#525252]">
            {option.member ? memberLabel(option.member).charAt(0).toUpperCase() : option.icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium leading-[1.2] text-[#171717]">{option.label}</span>
            {option.hint ? <span className="mt-[2px] block text-[10px] leading-[1.2] text-[#737373]">{option.hint}</span> : null}
          </span>
        </button>
      )) : <p className="px-[8px] py-[10px] text-[12px] text-[#737373]">No matching members</p>}
      <p className="mt-[3px] border-t border-[#eeeeee] px-[8px] pt-[5px] text-[9px] text-[#a3a3a3]">↑↓ navigate · Enter select · Esc close</p>
    </div>
  );
}
