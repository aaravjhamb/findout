export const FLOOR_COUNT = 42;
export const ROOMS_PER_FLOOR = 31;

export const FLOORS: number[] = Array.from({ length: FLOOR_COUNT }, (_, i) => i + 1);

export const FLOOR_THICKNESS = 0.18;

const RW = 1.7;
const RH = 2.0;
const GAP = 0.16;
const HALL = 1.0;
const PAD = 0.5;

const colX: number[] = [];
colX[0] = 0;
colX[1] = colX[0] + RW + HALL;
for (let i = 2; i <= 10; i++) colX[i] = colX[i - 1] + RW + GAP;

const rowY: number[] = [];
rowY[0] = 0;
rowY[1] = rowY[0] + RH + HALL;
for (let i = 2; i <= 8; i++) rowY[i] = rowY[i - 1] + RH + GAP;

type Raw = { room: number; col: number; row: number; kitchen?: boolean };

const RAW_CELLS: Raw[] = [
  { room: 0, col: 0, row: 0, kitchen: true },

  ...[16, 14, 12, 10, 8, 7, 5, 3, 1].map((room, i) => ({ room, col: i + 2, row: 0 })),

  ...[17, 15, 13, 11, 9, 6, 4, 2].map((room, i) => ({ room, col: i + 2, row: 1 })),

  { room: 18, col: 0, row: 1 },
  { room: 19, col: 0, row: 2 }, { room: 20, col: 1, row: 2 },
  { room: 21, col: 0, row: 3 }, { room: 22, col: 1, row: 3 },
  { room: 23, col: 0, row: 4 }, { room: 24, col: 1, row: 4 },
  { room: 25, col: 0, row: 5 }, { room: 26, col: 1, row: 5 },
  { room: 27, col: 0, row: 6 }, { room: 28, col: 1, row: 6 },
  { room: 29, col: 0, row: 7 }, { room: 30, col: 1, row: 7 },
  { room: 31, col: 0, row: 8 },
];

const RAW_ELEV = [
  { col: 1, row: 0 },
  { col: 1, row: 1 },
];

const allX = RAW_CELLS.flatMap((c) => [colX[c.col] - RW / 2, colX[c.col] + RW / 2]);
const allZ = RAW_CELLS.flatMap((c) => [rowY[c.row] - RH / 2, rowY[c.row] + RH / 2]);
const OX = -(Math.min(...allX) + Math.max(...allX)) / 2;
const OZ = -(Math.min(...allZ) + Math.max(...allZ)) / 2;

export interface RoomCell {
  room: number;
  kitchen: boolean;
  x: number;
  z: number;
  w: number;
  d: number;
}

export const ROOM_CELLS: RoomCell[] = RAW_CELLS.map((c) => ({
  room: c.room,
  kitchen: !!c.kitchen,
  x: colX[c.col] + OX,
  z: rowY[c.row] + OZ,
  w: RW,
  d: RH,
}));

const CELL_BY_ROOM = new Map<number, RoomCell>(ROOM_CELLS.map((c) => [c.room, c]));
export function cellForRoom(room: number): RoomCell | undefined {
  return CELL_BY_ROOM.get(room);
}

export interface ServiceCell {
  kind: "lift";
  x: number;
  z: number;
  w: number;
  d: number;
}
export const SERVICE_CELLS: ServiceCell[] = RAW_ELEV.map((e) => ({
  kind: "lift",
  x: colX[e.col] + OX,
  z: rowY[e.row] + OZ,
  w: RW,
  d: RH,
}));

export interface Corridor {
  x: number;
  z: number;
  w: number;
  d: number;
  dir: "h" | "v";
}

const hcLeft = colX[0] - RW / 2 + OX;
const hcRight = colX[10] + RW / 2 + OX;
const hcTop = rowY[0] + RH / 2 + OZ;
const hcBot = rowY[1] - RH / 2 + OZ;

const vcLeft = colX[0] + RW / 2 + OX;
const vcRight = colX[1] - RW / 2 + OX;
const vcTop = rowY[0] - RH / 2 + OZ;
const vcBot = rowY[8] + RH / 2 + OZ;

export const CORRIDORS: Corridor[] = [
  { x: (hcLeft + hcRight) / 2, z: (hcTop + hcBot) / 2, w: hcRight - hcLeft, d: hcBot - hcTop, dir: "h" },
  { x: (vcLeft + vcRight) / 2, z: (vcTop + vcBot) / 2, w: vcRight - vcLeft, d: vcBot - vcTop, dir: "v" },
];

function plateFor(cells: { x: number; z: number }[]) {
  const x0 = Math.min(...cells.map((c) => c.x - RW / 2)) - PAD;
  const x1 = Math.max(...cells.map((c) => c.x + RW / 2)) + PAD;
  const z0 = Math.min(...cells.map((c) => c.z - RH / 2)) - PAD;
  const z1 = Math.max(...cells.map((c) => c.z + RH / 2)) + PAD;
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
}

const HORIZ_SET = new Set([16, 14, 12, 10, 8, 7, 5, 3, 1, 17, 15, 13, 11, 9, 6, 4, 2, 0, 18]);
const VERT_SET = new Set([0, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]);

export const FLOOR_PLATES = [
  plateFor([...ROOM_CELLS.filter((c) => HORIZ_SET.has(c.room)), ...SERVICE_CELLS]),
  plateFor([...ROOM_CELLS.filter((c) => VERT_SET.has(c.room)), ...SERVICE_CELLS]),
];

const _H = FLOOR_PLATES[0];
const _V = FLOOR_PLATES[1];
const _hR = _H.x + _H.w / 2;
const _hB = _H.z + _H.d / 2;
const _vR = _V.x + _V.w / 2;
const _vB = _V.z + _V.d / 2;
const _left = Math.min(_H.x - _H.w / 2, _V.x - _V.w / 2);
const _top = Math.min(_H.z - _H.d / 2, _V.z - _V.d / 2);

export const FLOOR_OUTLINE: [number, number][] = [
  [_left, _top],
  [_hR, _top],
  [_hR, _hB],
  [_vR, _hB],
  [_vR, _vB],
  [_left, _vB],
];

export const FOOTPRINT_RADIUS = Math.max(
  ...ROOM_CELLS.flatMap((c) => [Math.abs(c.x) + c.w, Math.abs(c.z) + c.d])
);

export function makeRoomId(floor: number, room: number): string {
  return `${floor}${String(room).padStart(2, "0")}`;
}

export function parseRoomId(raw: string): { floor: number; room: number } | null {
  const s = raw.trim().replace(/[^0-9]/g, "");
  if (s.length < 3 || s.length > 4) return null;
  const room = parseInt(s.slice(-2), 10);
  const floor = parseInt(s.slice(0, -2), 10);
  if (!isValidRoom(floor, room)) return null;
  return { floor, room };
}

export function isValidRoom(floor: number, room: number): boolean {
  return (
    Number.isInteger(floor) &&
    Number.isInteger(room) &&
    floor >= 1 &&
    floor <= FLOOR_COUNT &&
    room >= 1 &&
    room <= ROOMS_PER_FLOOR
  );
}
