import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOwnRecord, updateOccupancy, requireDb } from "@/lib/data";
import { isValidRoom } from "@/lib/rooms";
import { isStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const slackId = session?.user?.slackId;
  if (!slackId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    requireDb();
  } catch {

    return NextResponse.json({
      me: {
        slackId,
        name: session!.user.name ?? null,
        nickname: session!.user.nickname ?? null,
        image: session!.user.image ?? null,
        floor: null,
        room: null,
        status: "open",
        statusMessage: null,
      },
      persisted: false,
    });
  }

  const row = await getOwnRecord(slackId);
  return NextResponse.json({ me: row, persisted: true });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const slackId = session?.user?.slackId;
  if (!slackId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  const clearing = body.floor === null || body.room === null;
  if (clearing) {
    patch.floor = null;
    patch.room = null;
  } else if (body.floor !== undefined || body.room !== undefined) {
    const floor = Number(body.floor);
    const room = Number(body.room);
    if (!isValidRoom(floor, room)) {
      return NextResponse.json({ error: "invalid room (floor 1-42, room 1-31)" }, { status: 400 });
    }
    patch.floor = floor;
    patch.room = room;
  }

  if (body.status !== undefined) {
    if (!isStatus(body.status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
    patch.status = body.status;
  }
  if (body.statusMessage !== undefined) {
    patch.statusMessage = body.statusMessage ? String(body.statusMessage).slice(0, 80) : null;
  }
  try {
    requireDb();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 });
  }

  try {
    const row = await updateOccupancy(slackId, patch as any);
    return NextResponse.json({ me: row });
  } catch (e: any) {

    return NextResponse.json({ error: "could not save: " + (e?.message ?? "unknown") }, { status: 500 });
  }
}
