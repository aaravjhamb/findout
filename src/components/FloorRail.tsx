"use client";

import { useMemo } from "react";
import type { Occupant } from "@/lib/types";

export default function FloorRail({
  occupants,
  activeFloor,
  onPick,
}: {
  occupants: Occupant[];
  activeFloor: number | null;
  onPick: (floor: number) => void;
}) {
  const floors = useMemo(() => {
    const set = new Set<number>();
    for (const o of occupants) set.add(o.floor);
    if (activeFloor) set.add(activeFloor);
    return Array.from(set).sort((a, b) => b - a);
  }, [occupants, activeFloor]);

  const openByFloor = useMemo(() => {
    const m = new Map<number, Set<string>>();
    for (const o of occupants) {
      if (o.status !== "open") continue;
      if (!m.has(o.floor)) m.set(o.floor, new Set());
      m.get(o.floor)!.add(o.roomId);
    }
    return m;
  }, [occupants]);

  return (
    <div className="h-full w-[64px] shrink-0 flex flex-col items-center gap-2 py-2 overflow-y-auto no-scrollbar">
      <div className="select-none text-[10px] font-bold text-muted tracking-wider mb-0.5">FLOOR</div>
      {floors.length === 0 && (
        <div className="text-[10px] text-muted text-center px-1 mt-2">no floors yet</div>
      )}
      {floors.map((f) => {
        const active = f === activeFloor;
        const openCount = openByFloor.get(f)?.size ?? 0;
        return (
          <button
            key={f}
            onClick={() => onPick(f)}
            className="relative h-12 w-12 shrink-0 rounded-[10px] grid place-items-center border-2 transition active:scale-95"
            style={{
              background: active ? "#61453a" : "#fffcf5",
              borderColor: active ? "#61453a" : "#c5a080",
              color: active ? "#fcf1e5" : "#61453a",
              boxShadow: active ? "0 3px 0 rgba(97,69,58,0.3)" : "0 2px 0 rgba(97,69,58,0.15)",
            }}
          >
            <span className="text-lg font-bold leading-none">{f}</span>
            {openCount > 0 && (
              <span
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full grid place-items-center text-[10px] font-bold"
                style={{ background: "#37b576", color: "#fff" }}
              >
                {openCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
