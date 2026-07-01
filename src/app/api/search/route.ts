import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRoomOccupants, searchPeople } from "@/lib/data";
import { parseRoomId, makeRoomId } from "@/lib/rooms";
import type { RoomResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ result: null, people: [] });

  const parsed = parseRoomId(q);
  if (parsed) {
    const occupants = await getRoomOccupants(parsed.floor, parsed.room);
    const result: RoomResult = {
      roomId: makeRoomId(parsed.floor, parsed.room),
      floor: parsed.floor,
      room: parsed.room,
      occupants,
    };
    return NextResponse.json({ result, people: occupants, matched: null });
  }

  const people = await searchPeople(q);
  if (people.length === 0) {
    return NextResponse.json({ result: null, people: [] });
  }
  const top = people[0];
  const occupants = await getRoomOccupants(top.floor, top.room);
  const result: RoomResult = {
    roomId: top.roomId,
    floor: top.floor,
    room: top.room,
    occupants,
  };
  return NextResponse.json({ result, people, matched: top.slackId });
}
