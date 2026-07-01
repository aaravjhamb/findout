"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useRef, useState } from "react";

const CLOSE_DISTANCE = 96;
const CLOSE_VELOCITY = 0.5;

export function useDragDismiss(onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const drag = useRef<{ startY: number; startAt: number; active: boolean } | null>(null);

  const endDrag = (clientY: number) => {
    const current = drag.current;
    if (!current?.active) return;

    const distance = Math.max(0, clientY - current.startY);
    const elapsed = Math.max(1, Date.now() - current.startAt);
    const velocity = distance / elapsed;

    drag.current = null;
    setDragY(0);

    if (distance > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) onClose();
  };

  return {
    sheetStyle: {
      transform: dragY ? `translateY(${dragY}px)` : undefined,
      transition: drag.current?.active ? "none" : undefined,
    } satisfies CSSProperties,
    handleProps: {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        drag.current = { startY: e.clientY, startAt: Date.now(), active: true };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (!drag.current?.active) return;
        setDragY(Math.max(0, e.clientY - drag.current.startY));
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => endDrag(e.clientY),
      onPointerCancel: (e: PointerEvent<HTMLElement>) => endDrag(e.clientY),
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClose();
        }
      },
    },
  };
}
