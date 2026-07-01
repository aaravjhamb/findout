import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { RoomStatus } from "./types";

export type LocalPersonRow = {
  slackId: string;
  email: string | null;
  name: string | null;
  nickname: string | null;
  image: string | null;
  floor: number | null;
  room: number | null;
  visitFloor: number | null;
  visitRoom: number | null;
  status: string;
  statusMessage: string | null;
};

type LocalDbFile = {
  people: LocalPersonRow[];
};

const LOCAL_DB_PATH = join(process.cwd(), ".data", "findout.local.json");

const defaultPerson = (slackId: string): LocalPersonRow => ({
  slackId,
  email: null,
  name: null,
  nickname: null,
  image: null,
  floor: null,
  room: null,
  visitFloor: null,
  visitRoom: null,
  status: "open",
  statusMessage: null,
});

async function readLocalDb(): Promise<LocalDbFile> {
  try {
    const raw = await readFile(LOCAL_DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalDbFile>;
    return { people: Array.isArray(parsed.people) ? parsed.people : [] };
  } catch (e: any) {
    if (e?.code === "ENOENT") return { people: [] };
    throw e;
  }
}

async function writeLocalDb(db: LocalDbFile): Promise<void> {
  await mkdir(dirname(LOCAL_DB_PATH), { recursive: true });
  const tmp = `${LOCAL_DB_PATH}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(db, null, 2)}\n`);
  await rename(tmp, LOCAL_DB_PATH);
}

function upsertLocalPerson(db: LocalDbFile, slackId: string): LocalPersonRow {
  let row = db.people.find((p) => p.slackId === slackId);
  if (!row) {
    row = defaultPerson(slackId);
    db.people.push(row);
  }
  return row;
}

export async function localPeopleWithRooms(): Promise<LocalPersonRow[]> {
  const db = await readLocalDb();
  return db.people.filter((p) => p.floor !== null && p.room !== null);
}

export async function localUpsertIdentity(input: {
  slackId: string;
  email?: string | null;
  name?: string | null;
  nickname?: string | null;
  image?: string | null;
}): Promise<void> {
  const db = await readLocalDb();
  const row = upsertLocalPerson(db, input.slackId);
  row.email = input.email ?? null;
  row.name = input.name ?? null;
  if (input.nickname !== undefined) row.nickname = input.nickname;
  row.image = input.image ?? null;
  await writeLocalDb(db);
}

export async function localOwnRecord(slackId: string): Promise<LocalPersonRow | null> {
  const db = await readLocalDb();
  return db.people.find((p) => p.slackId === slackId) ?? null;
}

export async function localUpdateOccupancy(
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
): Promise<LocalPersonRow> {
  const db = await readLocalDb();
  const row = upsertLocalPerson(db, slackId);

  if (patch.floor !== undefined) row.floor = patch.floor;
  if (patch.room !== undefined) row.room = patch.room;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.nickname !== undefined) row.nickname = patch.nickname;
  if (patch.visitFloor !== undefined) row.visitFloor = patch.visitFloor;
  if (patch.visitRoom !== undefined) row.visitRoom = patch.visitRoom;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.statusMessage !== undefined) row.statusMessage = patch.statusMessage;

  await writeLocalDb(db);
  return row;
}
