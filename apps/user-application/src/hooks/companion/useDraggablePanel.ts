import { useCallback, useEffect, useState } from "react";
import type { PointerEvent } from "react";

type Position = {
  x: number;
  y: number;
};

type DragBounds = {
  bottom?: number;
  height: number;
  left?: number;
  right?: number;
  top?: number;
  width: number;
};

function clampPosition(position: Position, bounds?: DragBounds): Position {
  if (!bounds || typeof window === "undefined") {
    return position;
  }

  const left = bounds.left ?? 0;
  const top = bounds.top ?? 0;
  const maxX = Math.max(left, window.innerWidth - bounds.width - (bounds.right ?? 0));
  const maxY = Math.max(top, window.innerHeight - bounds.height - (bounds.bottom ?? 0));

  return {
    x: Math.min(Math.max(position.x, left), maxX),
    y: Math.min(Math.max(position.y, top), maxY),
  };
}

export function useDraggablePanel(initialPosition: Position, bounds?: DragBounds) {
  const [position, setPosition] = useState(() => clampPosition(initialPosition, bounds));
  const [dragOffset, setDragOffset] = useState<Position | null>(null);

  const resetPosition = useCallback((nextPosition: Position) => {
    setDragOffset(null);
    setPosition(clampPosition(nextPosition, bounds));
  }, [bounds]);

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

    setPosition(clampPosition({
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y,
    }, bounds));
  }, [bounds, dragOffset]);

  const stopDrag = useCallback(() => {
    setDragOffset(null);
  }, []);

  useEffect(() => {
    const keepInsideViewport = () => {
      setPosition((currentPosition) => clampPosition(currentPosition, bounds));
    };

    keepInsideViewport();
    window.addEventListener("resize", keepInsideViewport);
    return () => window.removeEventListener("resize", keepInsideViewport);
  }, [bounds]);

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
