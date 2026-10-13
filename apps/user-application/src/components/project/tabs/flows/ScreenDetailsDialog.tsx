import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Screen } from "@stage/data-ops/contracts";
import { EditIcon, HomeIcon } from "./flowsIcons";
import { ScreenElementList } from "./ScreenElementList";
import { ScreenEditActions } from "./ScreenEditActions";

export type ScreenDetailsChange = {
  label: string;
  originalLabel: string;
  // Absent when the node has no linked screen: only the label is saved.
  elements?: { screenId: string; next: string[]; original: string[] };
};
export type SaveScreenDetails = (change: ScreenDetailsChange) => Promise<void>;

type Props = {
  nodeLabel: string;
  screen?: Screen;
  disabled: boolean;
  anchor: HTMLElement;
  onClose: () => void;
  onSave: SaveScreenDetails;
};

export function ScreenDetailsDialog({ nodeLabel, screen, disabled, anchor, onClose, onSave }: Props) {
  const [edit, setEdit] = useState<{ label: string; elements: string[]; original: string[] }>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const savingRef = useRef(false);

  async function save() {
    const label = edit?.label.trim();
    if (!edit || !label || disabled || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(undefined);
    try {
      await onSave({
        label,
        originalLabel: nodeLabel,
        elements: screen ? { screenId: screen.id, next: edit.elements.map((element) => element.trim()).filter(Boolean), original: edit.original } : undefined,
      });
      setEdit(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this screen.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <Dialog.Root open onOpenChange={(open) => { if (!open && !savingRef.current) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="flows-screen-overlay" />
      <Dialog.Content className="flows-screen-dialog" aria-busy={saving} onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (anchor.isConnected) anchor.focus({ preventScroll: true });
      }}>
        <header className="flows-screen-heading">
          <span className="flows-screen-icon"><HomeIcon /></span>
          <div className="min-w-0 flex-1">
            <div className="flows-screen-title-row">
              <Dialog.Title className={edit ? "flows-screen-hidden-title" : undefined}>{screen?.title ?? nodeLabel}</Dialog.Title>
              {edit ? (
                <input
                  className="flows-screen-label-input"
                  aria-label="Node label"
                  value={edit.label}
                  maxLength={160}
                  autoFocus
                  onChange={(event) => setEdit((current) => current ? { ...current, label: event.target.value } : current)}
                />
              ) : null}
              {screen ? <span>Appears in {screen.flowCount} {screen.flowCount === 1 ? "flow" : "flows"}</span> : null}
            </div>
            <Dialog.Description>{screen?.description ?? "No saved screen is linked to this node."}</Dialog.Description>
          </div>
          {!edit ? <button type="button" aria-label="Edit screen" disabled={disabled} onClick={() => {
            setError(undefined);
            const elements = screen?.keyElements ?? [];
            setEdit({ label: nodeLabel, elements: [...elements], original: [...elements] });
          }}><EditIcon /></button> : null}
        </header>
        <div className="flows-screen-body">
          <h4>Key elements</h4>
          <div className={edit ? "flows-screen-element-editor" : undefined}>
            {screen?.keyElements.length || edit?.elements.length ? <ScreenElementList elements={edit?.elements ?? screen?.keyElements ?? []} editing={!!edit} onDraftElementChange={(index, value) => {
              setEdit((current) => current ? { ...current, elements: current.elements.map((element, i) => i === index ? value : element) } : current);
            }} /> : <p className="flows-screen-empty">{screen ? "No elements have been saved for this screen." : "This step has no screen details to display."}</p>}
          </div>
          {error ? <p role="alert" className="flows-canvas-error">{error}</p> : null}
          {edit ? <div className="flows-screen-actions"><ScreenEditActions cancelLabel="Cancel" saving={saving} saveDisabled={disabled || !edit.label.trim()} onDiscard={() => { setEdit(undefined); setError(undefined); }} onSave={() => void save()} /></div> : null}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
