"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ROOM_CELLS,
  SERVICE_CELLS,
  FLOOR_PLATES,
  FLOOR_OUTLINE,
  CORRIDORS,
  cellForRoom,
} from "@/lib/rooms";
import { STATUS_META, type Occupant, type RoomStatus } from "@/lib/types";

function initials(nickname?: string | null): string {
  const base = (nickname || "?").trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function aggregateStatus(list: Occupant[]): RoomStatus {
  if (list.some((o) => o.status === "open")) return "open";
  if (list.some((o) => o.status === "busy")) return "busy";
  if (list.some((o) => o.status === "visiting")) return "visiting";
  return "away";
}

function clipId(entryId: string) {
  return `clip-${entryId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

const POI_MARGIN = 2;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function bboxOf(cells: { x: number; z: number; w: number; d: number }[], pad: number): Box {
  const x0 = Math.min(...cells.map((c) => c.x - c.w / 2)) - pad;
  const x1 = Math.max(...cells.map((c) => c.x + c.w / 2)) + pad;
  const y0 = Math.min(...cells.map((c) => c.z - c.d / 2)) - pad;
  const y1 = Math.max(...cells.map((c) => c.z + c.d / 2)) + pad;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export default function FloorPlan2D({
  floor,
  occupants,
  activeRoom,
  onSelectRoom,
  onOpenHelp,
}: {
  floor: number;
  occupants: Occupant[];
  activeRoom: number | null;
  onSelectRoom: (floor: number, room: number) => void;
  onOpenHelp: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const byRoom = useMemo(() => {
    const m = new Map<number, Occupant[]>();
    for (const o of occupants) {
      if (o.floor !== floor) continue;
      if (!m.has(o.room)) m.set(o.room, []);
      m.get(o.room)!.push(o);
    }
    return m;
  }, [occupants, floor]);

  const full = useMemo(
    () => bboxOf(FLOOR_PLATES.map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d })), 0.6),
    []
  );

  const poiView = useMemo<Box>(() => {
    const cells = [
      ...SERVICE_CELLS.map((s) => ({ x: s.x, z: s.z, w: s.w, d: s.d })),
      ...[...byRoom.keys()]
        .map((r) => cellForRoom(r))
        .filter(Boolean)
        .map((c) => ({ x: c!.x, z: c!.z, w: c!.w, d: c!.d })),
    ];
    return bboxOf(cells, POI_MARGIN);
  }, [byRoom]);

  const [view, setView] = useState<Box>(poiView);
  const MINW = full.w * 0.16;
  const MAXW = full.w * 1.25;

  const clampView = useMemo(() => {
    const clamp1D = (vs: number, vl: number, fs: number, fl: number) => {
      const keep = Math.min(vl, fl) * 0.4;
      return Math.min(Math.max(vs, fs + keep - vl), fs + fl - keep);
    };
    return (b: Box): Box => ({
      ...b,
      x: clamp1D(b.x, b.w, full.x, full.w),
      y: clamp1D(b.y, b.h, full.y, full.h),
    });
  }, [full]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const downPos = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const pinchDist = useRef(0);
  const pinchMid = useRef<{ x: number; y: number } | null>(null);

  const userAdjusted = useRef(false);

  useEffect(() => {
    if (userAdjusted.current) return;
    setView(poiView);
  }, [poiView]);

  useEffect(() => {
    userAdjusted.current = false;
    setView(poiView);

  }, [floor]);

  useEffect(() => {
    if (activeRoom == null) return;
    const cell = cellForRoom(activeRoom);
    if (!cell) return;
    userAdjusted.current = true;
    setView((v) => {
      const w = Math.min(v.w, full.w * 0.55);
      const h = w * (v.h / v.w);
      return clampView({ x: cell.x - w / 2, y: cell.z - h / 2, w, h });
    });
  }, [activeRoom, full.w, clampView]);

  function clientToSvg(cx: number, cy: number) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return { x: cx * inv.a + cy * inv.c + inv.e, y: cx * inv.b + cy * inv.d + inv.f };
  }

  function zoomAtClient(cx: number, cy: number, factor: number) {
    userAdjusted.current = true;
    const p = clientToSvg(cx, cy);
    setView((v) => {
      const nw = Math.min(MAXW, Math.max(MINW, v.w * factor));
      const k = nw / v.w;
      return clampView({ x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k, w: nw, h: v.h * k });
    });
  }

  function zoomButtons(factor: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    zoomAtClient(r.left + r.width / 2, r.top + r.height / 2, factor);
  }

  function resetView() {
    userAdjusted.current = false;
    setView(poiView);
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAtClient(e.clientX, e.clientY, e.deltaY > 0 ? 1.12 : 0.893);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);

  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downPos.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = dist(a, b);
      pinchMid.current = mid(a, b);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    const size = pointers.current.size;
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;

    if (size === 1) {
      const dx = (cur.x - prev.x) / ctm.a;
      const dy = (cur.y - prev.y) / ctm.d;
      setView((v) => clampView({ ...v, x: v.x - dx, y: v.y - dy }));
      pointers.current.set(e.pointerId, cur);
      if (Math.hypot(cur.x - downPos.current.x, cur.y - downPos.current.y) > 6) {
        moved.current = true;
        userAdjusted.current = true;
      }
    } else if (size === 2) {
      pointers.current.set(e.pointerId, cur);
      const [a, b] = [...pointers.current.values()];
      const nd = dist(a, b);
      const nm = mid(a, b);
      if (pinchDist.current) zoomAtClient(nm.x, nm.y, pinchDist.current / nd);
      if (pinchMid.current) {
        const dx = (nm.x - pinchMid.current.x) / ctm.a;
        const dy = (nm.y - pinchMid.current.y) / ctm.d;
        setView((v) => clampView({ ...v, x: v.x - dx, y: v.y - dy }));
      }
      pinchDist.current = nd;
      pinchMid.current = nm;
      moved.current = true;
      userAdjusted.current = true;
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pinchDist.current = 0;
      pinchMid.current = null;
    }
  };

  const handleRoomClick = (room: number) => {
    if (moved.current) return;
    onSelectRoom(floor, room);
  };

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onDoubleClick={resetView}
      >
        <defs>
          {occupants
            .filter((o) => o.floor === floor && o.image)
            .map((o) => (
              <clipPath id={clipId(o.entryId)} key={o.entryId}>
                <circle cx="0" cy="0" r="0.44" />
              </clipPath>
            ))}
        </defs>

        {FLOOR_PLATES.map((p, i) => (
          <rect key={i} x={p.x - p.w / 2} y={p.z - p.d / 2} width={p.w} height={p.d} fill="#f3e4cd" />
        ))}
        <polygon
          points={FLOOR_OUTLINE.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="#c5a080"
          strokeWidth={0.16}
          strokeLinejoin="round"
        />

        {CORRIDORS.map((c, i) => (
          <g key={`hall-${i}`}>
            <rect
              x={c.x - c.w / 2}
              y={c.z - c.d / 2}
              width={c.w}
              height={c.d}
              rx={Math.min(c.w, c.d) / 2}
              fill="#fbf3e4"
            />
            <line
              x1={c.dir === "h" ? c.x - c.w / 2 + 0.4 : c.x}
              y1={c.dir === "h" ? c.z : c.z - c.d / 2 + 0.4}
              x2={c.dir === "h" ? c.x + c.w / 2 - 0.4 : c.x}
              y2={c.dir === "h" ? c.z : c.z + c.d / 2 - 0.4}
              stroke="#d8b88f"
              strokeWidth={0.05}
              strokeDasharray="0.32 0.28"
              strokeLinecap="round"
            />
          </g>
        ))}

        {SERVICE_CELLS.map((s, i) => {
          const half = 0.42;
          return (
            <g key={`lift-${i}`}>
              <rect
                x={s.x - s.w / 2 + 0.08}
                y={s.z - s.d / 2 + 0.08}
                width={s.w - 0.16}
                height={s.d - 0.16}
                rx={0.14}
                fill="#eadfce"
                stroke="#c5a080"
                strokeWidth={0.1}
              />
              <rect
                x={s.x - half}
                y={s.z - 0.42 - half}
                width={half * 2}
                height={half * 2}
                fill="none"
                stroke="#9a8574"
                strokeWidth={0.09}
              />
              <line x1={s.x - half} y1={s.z - 0.42 - half} x2={s.x + half} y2={s.z - 0.42 + half} stroke="#9a8574" strokeWidth={0.09} />
              <line x1={s.x + half} y1={s.z - 0.42 - half} x2={s.x - half} y2={s.z - 0.42 + half} stroke="#9a8574" strokeWidth={0.09} />
              <text
                x={s.x}
                y={s.z + 0.62}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={0.38}
                fill="#9a8574"
                style={{ fontWeight: 800, letterSpacing: "0.04em" }}
              >
                LIFT
              </text>
            </g>
          );
        })}

        {ROOM_CELLS.map((c) => {
          if (c.kitchen) {
            return (
              <g key="kitchen">
                <rect
                  x={c.x - c.w / 2 + 0.06}
                  y={c.z - c.d / 2 + 0.06}
                  width={c.w - 0.12}
                  height={c.d - 0.12}
                  rx={0.16}
                  fill="#f2e4cf"
                  stroke="#c5a080"
                  strokeWidth={0.12}
                />
                <text x={c.x} y={c.z} textAnchor="middle" dominantBaseline="central" fontSize={0.4} fill="#9a8574" style={{ fontWeight: 800 }}>
                  KIT
                </text>
              </g>
            );
          }

          const list = byRoom.get(c.room) ?? [];
          const residents = list.filter((o) => !o.isVisitor);
          const visitors = list.filter((o) => o.isVisitor);
          const occupied = list.length > 0;
          const status = residents.length > 0 ? aggregateStatus(residents) : visitors.length > 0 ? "visiting" : null;
          const isActive = c.room === activeRoom;

          let fill = "#fffcf5";
          let stroke = "#c5a080";
          let strokeWidth = 0.12;
          if (occupied && status) {
            fill = `${STATUS_META[status].color}22`;
            stroke = STATUS_META[status].color;
            strokeWidth = 0.15;
          }
          if (isActive) {
            fill = "#ffebad";
            stroke = "#ef9300";
            strokeWidth = 0.24;
          }

          const lead = residents[0] ?? visitors[0];
          const avatarY = c.z - 0.32;
          const numberY = occupied ? c.z + 0.66 : c.z;

          return (
            <g
              key={c.room}
              onClick={() => handleRoomClick(c.room)}
              style={{ cursor: "pointer" }}
              className=""
            >
              <rect
                x={c.x - c.w / 2 + 0.06}
                y={c.z - c.d / 2 + 0.06}
                width={c.w - 0.12}
                height={c.d - 0.12}
                rx={0.16}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />

              {occupied && lead && (
                <g transform={`translate(${c.x}, ${avatarY})`}>
                  <circle cx="0" cy="0" r="0.5" fill="#fffcf5" stroke={STATUS_META[status!].color} strokeWidth={0.1} />
                  {lead.image ? (
                    <image
                      href={lead.image}
                      xlinkHref={lead.image}
                      x={-0.44}
                      y={-0.44}
                      width={0.88}
                      height={0.88}
                      clipPath={`url(#${clipId(lead.entryId)})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize={0.4} fill="#61453a" style={{ fontWeight: 700 }}>
                      {initials(lead.nickname)}
                    </text>
                  )}
                  {residents.length > 1 && (
                    <>
                      <circle cx="0.44" cy="-0.36" r="0.28" fill="#61453a" />
                      <text x="0.44" y="-0.36" textAnchor="middle" dominantBaseline="central" fontSize={0.3} fill="#fffcf5" style={{ fontWeight: 700 }}>
                        +{residents.length - 1}
                      </text>
                    </>
                  )}
                </g>
              )}

              <text x={c.x} y={numberY} textAnchor="middle" dominantBaseline="central" fontSize={occupied ? 0.42 : 0.56} fill="#61453a" style={{ fontWeight: 700 }}>
                {String(c.room).padStart(2, "0")}
              </text>

              {visitors.length > 0 && (
                <g transform={`translate(${c.x}, ${c.z + 0.18})`}>
                  <rect x="-0.58" y="-0.18" width="1.16" height="0.36" rx="0.18" fill="#3b82f6" />
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize="0.22" fill="#fffcf5" style={{ fontWeight: 800 }}>
                    {visitors.length} VIS
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute right-2 bottom-2 flex flex-col gap-1.5">
        <button
          onClick={onOpenHelp}
          className="h-9 w-9 rounded-[10px] bg-card border-2 border-line text-ink text-lg font-bold grid place-items-center active:scale-95"
          aria-label="Open help"
        >
          ?
        </button>
        <button
          onClick={() => zoomButtons(0.8)}
          className="h-9 w-9 rounded-[10px] bg-card border-2 border-line text-ink text-xl font-bold grid place-items-center active:scale-95"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => zoomButtons(1.25)}
          className="h-9 w-9 rounded-[10px] bg-card border-2 border-line text-ink text-xl font-bold grid place-items-center active:scale-95"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={resetView}
          className="h-9 w-9 rounded-[10px] bg-card border-2 border-line text-ink grid place-items-center active:scale-95"
          aria-label="Fit to points of interest"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
