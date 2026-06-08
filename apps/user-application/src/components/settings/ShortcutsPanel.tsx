import { useEffect, useState, type KeyboardEvent } from "react";
import {
  DEFAULT_DESKTOP_SHORTCUT_SETTINGS,
  type DesktopShortcutSettings,
  type DesktopShortcutSettingsResult,
} from "@shared/models/desktop";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { formatAcceleratorLabel } from "@/lib/settings/formatAcceleratorLabel";
import { SettingsCard, SettingsRow } from "./SettingsPrimitives";

type ShortcutField = keyof DesktopShortcutSettings;

export function ShortcutsPanel() {
  const desktop = useDesktopBridge();
  const [settings, setSettings] = useState<DesktopShortcutSettings>(DEFAULT_DESKTOP_SHORTCUT_SETTINGS);
  const [result, setResult] = useState<DesktopShortcutSettingsResult | null>(null);
  const [recordingField, setRecordingField] = useState<ShortcutField | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const nextResult = await desktop.voice.getSettings();
        if (cancelled) return;
        setSettings(nextResult.settings);
        setResult(nextResult);
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [desktop.voice]);

  async function saveSettings(nextSettings = settings) {
    setStatus("saving");
    try {
      const nextResult = await desktop.voice.updateSettings(nextSettings);
      setSettings(nextResult.settings);
      setResult(nextResult);
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
    }
  }

  function updateField(field: ShortcutField, value: string) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
  }

  function resetDefaults() {
    setSettings(DEFAULT_DESKTOP_SHORTCUT_SETTINGS);
    void saveSettings(DEFAULT_DESKTOP_SHORTCUT_SETTINGS);
  }

  return (
    <SettingsCard title="Keyboard shortcuts">
      <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
        Customize how Stage opens voice notes and chat from anywhere on your desktop.
      </p>
      <div className="flex flex-col gap-[4px]">
        <ShortcutRecorderRow
          label="Voice note"
          description="Start or stop a Stage voice note."
          value={settings.voiceNoteShortcut}
          field="voiceNoteShortcut"
          isRecording={recordingField === "voiceNoteShortcut"}
          status={result?.registrations.voiceNote}
          onRecord={setRecordingField}
          onChange={updateField}
        />
        <ShortcutRecorderRow
          label="Open chat"
          description="Open the latest Stage chat, or start an empty chat when none exists."
          value={settings.aiChatShortcut}
          field="aiChatShortcut"
          isRecording={recordingField === "aiChatShortcut"}
          status={result?.registrations.aiChat}
          onRecord={setRecordingField}
          onChange={updateField}
        />
        <SettingsRow>
          <div className="flex items-center justify-between gap-[16px]">
            <p className="text-[12px] font-medium leading-[1.5] text-[#525252]">
              {status === "loading"
                ? "Loading shortcuts..."
                : status === "saving"
                  ? "Saving shortcuts..."
                  : status === "saved"
                    ? "Shortcuts saved."
                    : status === "error"
                      ? "Could not save shortcuts."
                      : "Shortcuts are stored locally on this device."}
            </p>
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                onClick={resetDefaults}
                className="rounded-[6px] border border-[#E5E5E5] bg-white px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#171717] transition-colors hover:bg-[#FAFAFA]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={status === "saving" || status === "loading"}
                className="rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </SettingsRow>
      </div>
    </SettingsCard>
  );
}

function ShortcutRecorderRow({
  description,
  field,
  isRecording,
  label,
  onChange,
  onRecord,
  status,
  value,
}: {
  description: string;
  field: ShortcutField;
  isRecording: boolean;
  label: string;
  onChange: (field: ShortcutField, value: string) => void;
  onRecord: (field: ShortcutField | null) => void;
  status?: DesktopShortcutSettingsResult["registrations"]["voiceNote"];
  value: string;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      onRecord(null);
      return;
    }

    const accelerator = eventToAccelerator(event);
    if (!accelerator) {
      return;
    }

    onChange(field, accelerator);
    onRecord(null);
  }

  return (
    <SettingsRow>
      <div className="flex items-center justify-between gap-[20px]">
        <div>
          <h2 className="text-[15px] font-semibold leading-none text-[#171717]">{label}</h2>
          <p className="mt-[4px] max-w-[390px] text-[12px] font-normal leading-[1.5] text-[#171717]">
            {description}
          </p>
          {status && !status.registered ? (
            <p className="mt-[8px] text-[12px] font-medium leading-[1.5] text-[#B42318]">
              {status.reason ?? "This shortcut could not be registered."}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onRecord(isRecording ? null : field)}
          onKeyDown={isRecording ? handleKeyDown : undefined}
          className={`min-w-[220px] rounded-[6px] border px-[12px] py-[9px] text-left text-[13px] font-medium leading-none shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-colors ${
            isRecording
              ? "border-[#8D87FF] bg-white text-[#463FBA]"
              : "border-[#E5E5E5] bg-[#F5F5F5] text-[#262626] hover:bg-white"
          }`}
        >
          {isRecording ? "Press shortcut..." : formatAcceleratorLabel(value)}
        </button>
      </div>
    </SettingsRow>
  );
}

function eventToAccelerator(event: KeyboardEvent) {
  const key = normalizeShortcutKey(event.key);
  if (!key) return null;

  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push("CommandOrControl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(key);

  return parts.join("+");
}

function normalizeShortcutKey(key: string) {
  if (["Meta", "Control", "Alt", "Shift"].includes(key)) {
    return null;
  }
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}
