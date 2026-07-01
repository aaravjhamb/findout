import { prisma, DB_ENABLED } from "./db";
import { makeRoomId, isValidRoom } from "./rooms";
import { avatarUrl, resolveAvatar } from "./avatar";
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
  status: string;
  statusMessage: string | null;
};

function rowToOccupant(p: PersonRow): Occupant | null {
  if (p.floor == null || p.room == null || !isValidRoom(p.floor, p.room)) return null;
  const status: RoomStatus = isStatus(p.status) ? p.status : "open";
  return {
    slackId: p.slackId,
    name: p.name,
    nickname: p.nickname,
    email: p.email,
    image: p.image ?? avatarUrl(p.slackId),
    floor: p.floor,
    room: p.room,
    roomId: makeRoomId(p.floor, p.room),
    status,
    statusMessage: p.statusMessage,
  };
}

async function dbPublicOccupants(): Promise<Occupant[]> {
  const rows = await prisma.person.findMany({
    where: { floor: { not: null }, room: { not: null } },
  });
  const occupants = rows.map(rowToOccupant).filter((o): o is Occupant => o !== null);

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
  return all
    .filter((o) => {
      return (
        o.nickname?.toLowerCase().includes(needle) ||
        o.name?.toLowerCase().includes(needle) ||
        o.email?.toLowerCase().includes(needle) ||
        o.slackId.toLowerCase() === needle ||
        o.slackId.toLowerCase().includes(needle)
      );
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
  const { slackId, email, name, nickname, image } = input;
  await prisma.person.upsert({
    where: { slackId },
    create: { slackId, email, name, nickname, image },
    update: { email, name, nickname, image },
  });
}

export async function getOwnRecord(slackId: string): Promise<PersonRow | null> {
  requireDb();
  return prisma.person.findUnique({ where: { slackId } });
}

export async function updateOccupancy(
  slackId: string,
  patch: {
    floor?: number | null;
    room?: number | null;
    status?: RoomStatus;
    statusMessage?: string | null;
  }
): Promise<PersonRow> {
  requireDb();

  return prisma.person.upsert({
    where: { slackId },
    update: patch,
    create: { slackId, ...patch },
  });
}
