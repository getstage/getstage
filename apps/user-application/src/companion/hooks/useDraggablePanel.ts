import { useCallback, useState } from "react";
import type { PointerEvent } from "react";

type Position = {
  x: number;
  y: number;
};

export function useDraggablePanel(initialPosition: Position) {
  const [position, setPosition] = useState(initialPosition);
  const [dragOffset, setDragOffset] = useState<Position | null>(null);

  const resetPosition = useCallback((nextPosition: Position) => {
    setDragOffset(null);
    setPosition(nextPosition);
  }, []);

  const startDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragOffset({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  }, [position.x, position.y]);

  const drag = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!dragOffset) {
      return;
    }

    setPosition({
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y,
    });
  }, [dragOffset]);

  const stopDrag = useCallback(() => {
    setDragOffset(null);
  }, []);

  return {
    position,
    resetPosition,
    dragHandlers: {
      onPointerDown: startDrag,
      onPointerMove: drag,
      onPointerUp: stopDrag,
      onPointerCancel: stopDrag,
    },
  };
}
