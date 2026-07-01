import { prisma, DB_ENABLED, LOCAL_FILE_DB } from "./db";
import { makeRoomId, isValidRoom } from "./rooms";
import { avatarUrl, resolveAvatar } from "./avatar";
import { localOwnRecord, localPeopleWithRooms, localUpdateOccupancy, localUpsertIdentity } from "./localDb";
import { filterSoupBaseMembers } from "./slack";
import { type Occupant, type RoomStatus, isStatus } from "./types";

type PersonRow = {
  slackId: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  image: string | null;
  floor: number | null;
  room: number | null;
  visitFloor: number | null;
  visitRoom: number | null;
  status: string;
  statusMessage: string | null;
};

function rowToResident(p: PersonRow): Occupant | null {
  if (p.floor == null || p.room == null || !isValidRoom(p.floor, p.room)) return null;
  const status: RoomStatus = isStatus(p.status) ? p.status : "open";
  const visitRoomId =
    p.visitFloor != null && p.visitRoom != null && isValidRoom(p.visitFloor, p.visitRoom)
      ? makeRoomId(p.visitFloor, p.visitRoom)
      : null;

  return {
    entryId: `${p.slackId}:resident`,
    slackId: p.slackId,
    name: null,
    nickname: p.nickname,
    email: p.email,
    image: p.image ?? avatarUrl(p.slackId),
    floor: p.floor,
    room: p.room,
    roomId: makeRoomId(p.floor, p.room),
    homeFloor: p.floor,
    homeRoom: p.room,
    homeRoomId: makeRoomId(p.floor, p.room),
    visitFloor: p.visitFloor,
    visitRoom: p.visitRoom,
    visitRoomId,
    isVisitor: false,
    status,
    statusMessage: p.statusMessage,
  };
}

function rowToOccupants(p: PersonRow): Occupant[] {
  const resident = rowToResident(p);
  if (!resident) return [];
  const entries = [resident];

  if (
    resident.status === "visiting" &&
    p.visitFloor != null &&
    p.visitRoom != null &&
    isValidRoom(p.visitFloor, p.visitRoom) &&
    (p.visitFloor !== resident.homeFloor || p.visitRoom !== resident.homeRoom)
  ) {
    entries.push({
      ...resident,
      entryId: `${p.slackId}:visitor`,
      floor: p.visitFloor,
      room: p.visitRoom,
      roomId: makeRoomId(p.visitFloor, p.visitRoom),
      isVisitor: true,
    });
  }

  return entries;
}

async function dbPublicOccupants(): Promise<Occupant[]> {
  const rows: PersonRow[] = LOCAL_FILE_DB
    ? await localPeopleWithRooms()
    : await prisma.person.findMany({
      where: { floor: { not: null }, room: { not: null } },
    }) as unknown as PersonRow[];
  const occupants = rows.flatMap(rowToOccupants);

  await Promise.all(
    occupants.map(async (o) => {
      o.image = await resolveAvatar(o.image, o.slackId);
    })
  );
  return occupants;
}

export async function getPublicOccupants(): Promise<Occupant[]> {
  if (!DB_ENABLED) return [];
  try {
    return await filterSoupBaseMembers(await dbPublicOccupants());
  } catch (e) {
    console.error("[data] getPublicOccupants query failed:", e);
    return [];
  }
}

export async function getRoomOccupants(floor: number, room: number): Promise<Occupant[]> {
  const all = await getPublicOccupants();
  return all.filter((o) => o.floor === floor && o.room === room);
}

export async function searchPeople(q: string): Promise<Occupant[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const all = await getPublicOccupants();
  const seen = new Set<string>();
  return all
    .filter((o) => {
      const matches =
        o.nickname?.toLowerCase().includes(needle) ||
        o.email?.toLowerCase().includes(needle) ||
        o.slackId.toLowerCase() === needle ||
        o.slackId.toLowerCase().includes(needle) ||
        o.roomId === needle ||
        o.homeRoomId === needle ||
        o.visitRoomId === needle;
      if (!matches || seen.has(o.slackId)) return false;
      seen.add(o.slackId);
      return true;
    })
    .slice(0, 12);
}

export function requireDb() {
  if (!DB_ENABLED) {
    throw new Error(
      "No database configured. Set DATABASE_URL to let people save their room."
    );
  }
}

export async function upsertIdentity(input: {
  slackId: string;
  email?: string | null;
  name?: string | null;
  nickname?: string | null;
  image?: string | null;
}): Promise<void> {
  if (!DB_ENABLED) return;
  if (LOCAL_FILE_DB) return localUpsertIdentity(input);

  const { slackId, email, name, nickname, image } = input;
  await prisma.person.upsert({
    where: { slackId },
    create: { slackId, email, name, nickname, image },
    update: { email, name, ...(nickname !== undefined ? { nickname } : {}), image },
  });
}

export async function getOwnRecord(slackId: string): Promise<PersonRow | null> {
  requireDb();
  if (LOCAL_FILE_DB) return localOwnRecord(slackId);
  return prisma.person.findUnique({ where: { slackId } }) as unknown as Promise<PersonRow | null>;
}

export async function updateOccupancy(
  slackId: string,
  patch: {
    floor?: number | null;
    room?: number | null;
    name?: string | null;
    nickname?: string | null;
    visitFloor?: number | null;
    visitRoom?: number | null;
    status?: RoomStatus;
    statusMessage?: string | null;
  }
): Promise<PersonRow> {
  requireDb();
  if (LOCAL_FILE_DB) return localUpdateOccupancy(slackId, patch);

  return prisma.person.upsert({
    where: { slackId },
    update: patch,
    create: { slackId, ...patch },
  }) as unknown as Promise<PersonRow>;
}
