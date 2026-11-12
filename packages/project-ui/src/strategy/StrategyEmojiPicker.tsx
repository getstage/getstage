import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from "emoji-picker-react";

export function StrategyEmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  return (
    <EmojiPicker
      autoFocusSearch
      className="stage-emoji-picker"
      emojiStyle={EmojiStyle.NATIVE}
      height={316}
      lazyLoadEmojis
      onEmojiClick={(emoji: EmojiClickData) => onSelect(emoji.emoji)}
      previewConfig={{ showPreview: false }}
      searchPlaceHolder="Search"
      skinTonesDisabled
      style={{ fontFamily: "var(--font-body)" }}
      theme={Theme.LIGHT}
      width={384}
    />
  );
}
