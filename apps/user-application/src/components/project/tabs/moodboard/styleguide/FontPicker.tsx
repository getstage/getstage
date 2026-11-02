import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Check, UploadSimple } from "@phosphor-icons/react";
import { GOOGLE_FONTS, ensureGoogleFont } from "@/lib/fonts/googleFonts";
import type { UploadedFont } from "@/lib/fonts/uploadedFonts";
import { STYLEGUIDE_FONT_ACCEPT } from "@/lib/r2Uploads";
import { cn } from "@/lib/utils";
import { Icon } from "./fields";

// Searchable font picker for the Style Guide: the team's uploaded fonts, then every
// Google Font (most popular first). Only the first matches render; typing narrows it.
const VISIBLE_LIMIT = 80;

type Props = {
  label: string;
  value: string;
  uploads: UploadedFont[];
  onChange: (family: string) => void;
  /** Uploads a font file and selects it. */
  onUpload: (file: File) => Promise<void>;
};

export function FontPicker({ label, value, uploads, onChange, onUpload }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const needle = query.trim().toLowerCase();
  const matches = (family: string) => family.toLowerCase().includes(needle);
  const uploaded = uploads.filter((font) => matches(font.family));
  const google = useMemo(
    () => GOOGLE_FONTS.filter((font) => font.family.toLowerCase().includes(needle)),
    [needle],
  );
  const visibleGoogle = google.slice(0, VISIBLE_LIMIT);

  const choose = (family: string) => {
    onChange(family);
    setOpen(false);
    setQuery("");
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
      setOpen(false);
      setQuery("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload this font.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-[27px] w-full items-center justify-between rounded-[4px] border-[0.5px] border-neutral-300 bg-neutral-100 pr-2.5 pl-3 text-left text-[12px] font-medium text-neutral-800 shadow-stage-control outline-none focus-visible:border-accent-deep"
      >
        <span className="truncate" style={{ fontFamily: `"${value}", ui-sans-serif, system-ui` }}>{value}</span>
        <Icon name="chevron-down" />
      </button>

      {open ? (
        <div className="absolute top-[31px] left-0 z-30 flex w-full min-w-[240px] flex-col gap-1 rounded-[6px] border-[0.5px] border-neutral-300 bg-white p-1 shadow-stage-control">
          <input
            autoFocus
            aria-label={`Search ${label.toLowerCase()}`}
            placeholder="Search fonts"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              const first = uploaded[0]?.family ?? visibleGoogle[0]?.family;
              if (event.key === "Enter" && first) choose(first);
            }}
            className="h-[27px] w-full rounded-[4px] border-[0.5px] border-neutral-300 bg-neutral-100 px-3 text-[12px] font-medium text-neutral-800 outline-none placeholder:text-neutral-400 focus-visible:border-accent-deep"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-left text-[12px] font-medium text-accent-deep hover:bg-neutral-50 disabled:opacity-60"
          >
            <UploadSimple size={13} />
            {uploading ? "Uploading…" : "Upload your own font"}
            <span className="ml-auto text-[11px] font-normal text-neutral-400">.woff2 .woff .ttf .otf</span>
          </button>
          <input ref={fileRef} type="file" accept={STYLEGUIDE_FONT_ACCEPT} className="hidden" onChange={upload} />
          {error ? <p className="px-2 text-[11px] text-red-500">{error}</p> : null}

          <div role="listbox" aria-label={label} className="flex max-h-[260px] flex-col overflow-y-auto">
            {uploaded.length > 0 ? <GroupLabel>Your fonts</GroupLabel> : null}
            {uploaded.map((font) => (
              <Option key={`upload-${font.key}`} family={font.family} hint="Uploaded" selected={font.family === value} onSelect={choose} />
            ))}
            {visibleGoogle.length > 0 ? <GroupLabel>Google Fonts</GroupLabel> : null}
            {visibleGoogle.map((font) => (
              <Option key={font.family} family={font.family} hint={font.category} selected={font.family === value} onSelect={choose} />
            ))}
            {google.length > VISIBLE_LIMIT ? (
              <p className="px-2 py-1.5 text-[11px] text-neutral-400">{google.length - VISIBLE_LIMIT} more, keep typing to narrow it down.</p>
            ) : null}
            {uploaded.length === 0 && google.length === 0 ? (
              <p className="px-2 py-1.5 text-[12px] text-neutral-500">No font called “{query.trim()}”. Upload it instead.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GroupLabel({ children }: { children: string }) {
  return <p className="px-2 pt-2 pb-1 text-[11px] font-medium text-neutral-400">{children}</p>;
}

function Option({ family, hint, selected, onSelect }: { family: string; hint: string; selected: boolean; onSelect: (family: string) => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseEnter={() => ensureGoogleFont(family)}
      onClick={() => onSelect(family)}
      className={cn(
        "flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[12px] font-medium text-neutral-800 hover:bg-neutral-50",
        selected && "text-accent-deep",
      )}
    >
      <span className="truncate" style={{ fontFamily: `"${family}", ui-sans-serif, system-ui` }}>{family}</span>
      <span className="ml-auto shrink-0 text-[11px] font-normal text-neutral-400">{hint}</span>
      {selected ? <Check size={12} className="shrink-0" /> : null}
    </button>
  );
}
