import { FLOOR_COUNT, ROOMS_PER_FLOOR, makeRoomId } from "./rooms";
import { STATUS_META, type RoomStatus } from "./types";
import type { AdminPerson } from "./data";

export type AdminStats = {
  totalPeople: number;
  placed: number;
  needsOnboarding: number;
  byStatus: Record<RoomStatus, number>;
  occupiedRooms: number;
  totalRoomSlots: number;
  occupancyRatePct: number;
  floorsInUse: number;
  busiestFloor: { floor: number; count: number } | null;
  busiestRoom: { roomId: string; floor: number; room: number; count: number } | null;
  mostVisitedRoom: { roomId: string; floor: number; room: number; count: number } | null;
  withEmailPct: number;
  withNicknamePct: number;
  withCustomAvatarPct: number;
  timestampsAvailable: boolean;
  newLast7Days: number | null;
  recentlyUpdated: {
    slackId: string;
    nickname: string | null;
    name: string | null;
    roomId: string | null;
    status: string;
    updatedAt: string;
  }[];
};

function isRoomStatus(s: string): s is RoomStatus {
  return s in STATUS_META;
}

export function computeAdminStats(people: AdminPerson[]): AdminStats {
  const total = people.length;
  const placed = people.filter((p) => p.floor != null && p.room != null);
  const needsOnboarding = people.filter(
    (p) => !p.nickname?.trim() || p.floor == null || p.room == null
  ).length;

  const byStatus: Record<RoomStatus, number> = { open: 0, away: 0, busy: 0, visiting: 0 };
  for (const p of people) {
    if (isRoomStatus(p.status)) byStatus[p.status]++;
  }

  const floorCounts = new Map<number, number>();
  const roomCounts = new Map<string, { floor: number; room: number; count: number }>();
  for (const p of placed) {
    floorCounts.set(p.floor!, (floorCounts.get(p.floor!) ?? 0) + 1);
    const key = makeRoomId(p.floor!, p.room!);
    const cur = roomCounts.get(key) ?? { floor: p.floor!, room: p.room!, count: 0 };
    cur.count++;
    roomCounts.set(key, cur);
  }

  const visitCounts = new Map<string, { floor: number; room: number; count: number }>();
  for (const p of people) {
    if (p.status !== "visiting" || p.visitFloor == null || p.visitRoom == null) continue;
    const key = makeRoomId(p.visitFloor, p.visitRoom);
    const cur = visitCounts.get(key) ?? { floor: p.visitFloor, room: p.visitRoom, count: 0 };
    cur.count++;
    visitCounts.set(key, cur);
  }

  function top(m: Map<string, { floor: number; room: number; count: number }>) {
    let best: { roomId: string; floor: number; room: number; count: number } | null = null;
    for (const [roomId, v] of m) if (!best || v.count > best.count) best = { roomId, ...v };
    return best;
  }

  let busiestFloor: { floor: number; count: number } | null = null;
  for (const [floor, count] of floorCounts) if (!busiestFloor || count > busiestFloor.count) busiestFloor = { floor, count };

  const totalRoomSlots = FLOOR_COUNT * ROOMS_PER_FLOOR;
  const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

  const timestampsAvailable = people.some((p) => p.updatedAt != null);
  const newLast7Days = timestampsAvailable
    ? people.filter((p) => p.createdAt && Date.now() - Date.parse(p.createdAt) <= 7 * 24 * 60 * 60 * 1000).length
    : null;

  const recentlyUpdated = timestampsAvailable
    ? [...people]
        .filter((p) => p.updatedAt)
        .sort((a, b) => Date.parse(b.updatedAt!) - Date.parse(a.updatedAt!))
        .slice(0, 8)
        .map((p) => ({
          slackId: p.slackId,
          nickname: p.nickname,
          name: p.name,
          roomId: p.floor != null && p.room != null ? makeRoomId(p.floor, p.room) : null,
          status: p.status,
          updatedAt: p.updatedAt!,
        }))
    : [];

  return {
    totalPeople: total,
    placed: placed.length,
    needsOnboarding,
    byStatus,
    occupiedRooms: roomCounts.size,
    totalRoomSlots,
    occupancyRatePct: pct(roomCounts.size, totalRoomSlots),
    floorsInUse: floorCounts.size,
    busiestFloor,
    busiestRoom: top(roomCounts),
    mostVisitedRoom: top(visitCounts),
    withEmailPct: pct(people.filter((p) => p.email).length, total),
    withNicknamePct: pct(people.filter((p) => p.nickname?.trim()).length, total),
    withCustomAvatarPct: pct(people.filter((p) => p.image).length, total),
    timestampsAvailable,
    newLast7Days,
    recentlyUpdated,
  };
}
