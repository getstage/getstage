import type { MouseEvent } from "react";

// Native dialog backdrops target the dialog itself; its padding does too.
// Only clicks beyond the dialog bounds should dismiss it.
export function closeOnDialogBackdrop(event: MouseEvent<HTMLDialogElement>, close: () => void) {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) close();
}
