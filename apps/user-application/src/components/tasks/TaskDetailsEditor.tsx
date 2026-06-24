import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useSettingsOverviewQuery, type ProjectMember } from "@/hooks/convex-data";

type BlockType = "heading" | "paragraph" | "bullet";
type Block = { id: string; type: BlockType; text: string };
type MenuState = { blockId: string; top: number } | null;

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
  const blocks = value.split("\n").map((line) => {
    if (line.startsWith("# ")) return { id: String(nextBlockId++), type: "heading" as const, text: line.slice(2) };
    if (line.startsWith("- ")) return { id: String(nextBlockId++), type: "bullet" as const, text: line.slice(2) };
    return { id: String(nextBlockId++), type: "paragraph" as const, text: line };
  });
  return blocks.length ? blocks : [{ id: String(nextBlockId++), type: "paragraph", text: "" }];
}

function memberLabel(member: ProjectMember) {
  return member.name?.trim() || member.email?.trim() || "Team member";
}

function blockType(element: HTMLElement): BlockType {
  const type = element.dataset.type;
  return type === "heading" || type === "bullet" ? type : "paragraph";
}

function blockText(element: HTMLElement) {
  return element.querySelector<HTMLElement>("[data-block-text]")?.textContent ?? "";
}

function createBlockElement(block: Block) {
  const element = document.createElement("div");
  element.dataset.taskBlock = block.id;
  element.dataset.type = block.type;
  element.className = "flex min-h-[30px] items-start gap-[8px]";

  if (block.type === "bullet") {
    const marker = document.createElement("span");
    marker.dataset.bulletMarker = "";
    marker.contentEditable = "false";
    marker.className = "mt-[7px] flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[18px] leading-none text-[#525252]";
    marker.textContent = "•";
    element.append(marker);
  }

  const text = document.createElement("span");
  text.dataset.blockText = "";
  text.className = block.type === "heading"
    ? "min-w-0 flex-1 py-[2px] text-[22px] font-semibold leading-[1.35] text-[#171717] outline-none"
    : "min-w-0 flex-1 py-[5px] text-[13px] font-normal leading-[1.5] text-[#262626] outline-none";
  text.textContent = block.text;
  element.append(text);
  return element;
}

function setBlockType(element: HTMLElement, type: BlockType) {
  const text = element.querySelector<HTMLElement>("[data-block-text]");
  if (!text) return;

  element.dataset.type = type;
  element.querySelector("[data-bullet-marker]")?.remove();
  if (type === "bullet") {
    const marker = document.createElement("span");
    marker.dataset.bulletMarker = "";
    marker.contentEditable = "false";
    marker.className = "mt-[7px] flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[18px] leading-none text-[#525252]";
    marker.textContent = "•";
    element.prepend(marker);
  }
  text.className = type === "heading"
    ? "min-w-0 flex-1 py-[2px] text-[22px] font-semibold leading-[1.35] text-[#171717] outline-none"
    : "min-w-0 flex-1 py-[5px] text-[13px] font-normal leading-[1.5] text-[#262626] outline-none";
}

function closestBlock(node: Node | null): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : node?.parentElement;
  return element?.closest<HTMLElement>("[data-task-block]") ?? null;
}

function placeCaretAtEnd(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function TaskDetailsEditor({ value, members, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedValueRef = useRef<string | null>(null);
  const blockSelectionRef = useRef<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(!value);

  useEffect(() => {
    if (lastEmittedValueRef.current === value) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.replaceChildren(...parseBlocks(value).map(createBlockElement));
    setIsEmpty(value.length === 0);
  }, [value]);

  const activeBlock = menu
    ? editorRef.current?.querySelector<HTMLElement>(`[data-task-block="${menu.blockId}"]`) ?? null
    : null;
  const activeText = activeBlock ? blockText(activeBlock) : "";
  const slashMatch = activeText.match(SLASH_TRIGGER_PATTERN);
  const mentionMatch = activeText.match(MENTION_TRIGGER_PATTERN);
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

  useEffect(() => setSelectedIndex(0), [slashQuery, mentionQuery, menu?.blockId]);

  function readBlocks(): Block[] {
    const editor = editorRef.current;
    if (!editor) return [];
    return Array.from(editor.querySelectorAll<HTMLElement>("[data-task-block]")).map((element) => ({
      id: element.dataset.taskBlock ?? String(nextBlockId++),
      type: blockType(element),
      text: blockText(element),
    }));
  }

  function serializeEditor() {
    return readBlocks()
      .map((block) => `${block.type === "heading" ? "# " : block.type === "bullet" ? "- " : ""}${block.text}`)
      .join("\n");
  }

  function emitChange() {
    const next = serializeEditor();
    lastEmittedValueRef.current = next;
    setIsEmpty(next.length === 0);
    onChange(next);
  }

  function updateMenu(block: HTMLElement | null) {
    if (!block || (!SLASH_TRIGGER_PATTERN.test(blockText(block)) && !MENTION_TRIGGER_PATTERN.test(blockText(block)))) {
      setMenu(null);
      return;
    }
    const editor = editorRef.current;
    if (!editor) return;
    const blockRect = block.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    setMenu({ blockId: block.dataset.taskBlock ?? "", top: blockRect.bottom - editorRect.top + 6 });
  }

  function replaceTrigger(text: string, replacement: string) {
    const pattern = MENTION_TRIGGER_PATTERN.test(text) ? MENTION_TRIGGER_PATTERN : SLASH_TRIGGER_PATTERN;
    return text.replace(pattern, (match) => `${match.startsWith(" ") ? " " : ""}${replacement}`);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!activeBlock || !option) return;
    const textElement = activeBlock.querySelector<HTMLElement>("[data-block-text]");
    if (!textElement) return;

    if ("member" in option) {
      textElement.textContent = replaceTrigger(blockText(activeBlock), `@${option.label} `);
    } else if (option.id === "mention") {
      textElement.textContent = replaceTrigger(blockText(activeBlock), "/mention");
      placeCaretAtEnd(textElement);
      emitChange();
      updateMenu(activeBlock);
      return;
    } else {
      textElement.textContent = replaceTrigger(blockText(activeBlock), "");
      setBlockType(activeBlock, option.id);
    }

    setMenu(null);
    editorRef.current?.focus();
    placeCaretAtEnd(textElement);
    emitChange();
  }

  function selectCurrentBlock(block: HTMLElement) {
    const text = block.querySelector<HTMLElement>("[data-block-text]");
    const selection = window.getSelection();
    if (!text || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(text);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function selectEntireEditor() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const selection = window.getSelection();
    const block = closestBlock(selection?.anchorNode ?? null);
    const key = event.key.toLocaleLowerCase();

    if ((event.metaKey || event.ctrlKey) && key === "a") {
      event.preventDefault();
      if (block && blockSelectionRef.current !== block.dataset.taskBlock) {
        selectCurrentBlock(block);
        blockSelectionRef.current = block.dataset.taskBlock ?? null;
      } else {
        selectEntireEditor();
        blockSelectionRef.current = block?.dataset.taskBlock ?? null;
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && key === "c") return;
    blockSelectionRef.current = null;

    if (menu) {
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
        setMenu(null);
        return;
      }
    }

    if (event.key === "Enter" && block) {
      event.preventDefault();
      if (blockType(block) === "bullet" && blockText(block) === "") {
        setBlockType(block, "paragraph");
        placeCaretAtEnd(block.querySelector<HTMLElement>("[data-block-text]") ?? block);
        emitChange();
        return;
      }

      const nextBlock = createBlockElement({
        id: String(nextBlockId++),
        type: blockType(block) === "bullet" ? "bullet" : "paragraph",
        text: "",
      });
      block.after(nextBlock);
      placeCaretAtEnd(nextBlock.querySelector<HTMLElement>("[data-block-text]") ?? nextBlock);
      emitChange();
      return;
    }

    if (event.key === "Backspace" && block && blockText(block) === "") {
      const previous = block.previousElementSibling;
      if (previous instanceof HTMLElement) {
        event.preventDefault();
        block.remove();
        placeCaretAtEnd(previous.querySelector<HTMLElement>("[data-block-text]") ?? previous);
        emitChange();
      }
    }
  }

  return (
    <div className="relative min-h-[280px]">
      {isEmpty ? (
        <p className="pointer-events-none absolute left-0 top-[5px] text-[13px] font-normal leading-[1.5] text-[#a3a3a3]">
          Type / for formatting and mentions…
        </p>
      ) : null}
      <div
        ref={editorRef}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        role="textbox"
        aria-label="Task details"
        aria-multiline="true"
        className="min-h-[280px] cursor-text outline-none"
        onPointerDown={() => {
          blockSelectionRef.current = null;
          setMenu(null);
        }}
        onInput={() => {
          const block = closestBlock(window.getSelection()?.anchorNode ?? null);
          emitChange();
          updateMenu(block);
        }}
        onKeyDown={handleKeyDown}
      />
      {menu ? (
        <div className="absolute left-0 z-40" style={{ top: menu.top }}>
          <SlashMenu options={options} selectedIndex={selectedIndex} onSelect={selectOption} />
        </div>
      ) : null}
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
    <div className="w-[212px] rounded-[8px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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
              <Avatar name={option.label} src={getMemberAvatarUrl(option.member, profile)} className="h-[18px] w-[18px] text-[10px]" />
            ) : (
              <span className="flex w-[18px] shrink-0 items-center justify-center text-[11px] font-semibold text-[#737373]">{option.icon}</span>
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
  return member.userId === profile.id || member.email === profile.email ? profile.avatarUrl : undefined;
}
