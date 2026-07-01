import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { adminGetPerson, adminUpdatePerson, adminDeletePerson, type AdminPatch } from "@/lib/data";
import { FLOOR_COUNT, ROOMS_PER_FLOOR } from "@/lib/rooms";
import { isStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { slackId: string } };

function str(v: unknown, max: number): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v).slice(0, max);
}

// Parses an optional floor/room field. Returns undefined to skip, null to clear,
// a number when valid, or an Error message string when invalid.
function coord(v: unknown, max: number, label: string): number | null | undefined | string {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > max) return `${label} must be 1-${max}`;
  return n;
}

function isErr(v: unknown): v is string {
  return typeof v === "string";
}

function notFound(e: any): boolean {
  return e?.code === "P2025" || /not found/i.test(e?.message ?? "");
}

export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const person = await adminGetPerson(params.slackId);
    if (!person) return NextResponse.json({ error: "person not found" }, { status: 404 });
    return NextResponse.json({ person }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "could not load" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const patch: AdminPatch = {};

  if ("name" in body) patch.name = str(body.name, 120);
  if ("nickname" in body) patch.nickname = str(body.nickname, 120);
  if ("email" in body) patch.email = str(body.email, 200);
  if ("image" in body) patch.image = str(body.image, 500);
  if ("statusMessage" in body) patch.statusMessage = str(body.statusMessage, 80);

  if ("status" in body) {
    if (!isStatus(body.status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
    patch.status = body.status;
  }

  if ("floor" in body) {
    const r = coord(body.floor, FLOOR_COUNT, "floor");
    if (isErr(r)) return NextResponse.json({ error: r }, { status: 400 });
    patch.floor = r;
  }
  if ("room" in body) {
    const r = coord(body.room, ROOMS_PER_FLOOR, "room");
    if (isErr(r)) return NextResponse.json({ error: r }, { status: 400 });
    patch.room = r;
  }
  if ("visitFloor" in body) {
    const r = coord(body.visitFloor, FLOOR_COUNT, "visit floor");
    if (isErr(r)) return NextResponse.json({ error: r }, { status: 400 });
    patch.visitFloor = r;
  }
  if ("visitRoom" in body) {
    const r = coord(body.visitRoom, ROOMS_PER_FLOOR, "visit room");
    if (isErr(r)) return NextResponse.json({ error: r }, { status: 400 });
    patch.visitRoom = r;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  try {
    const person = await adminUpdatePerson(params.slackId, patch);
    return NextResponse.json({ person });
  } catch (e: any) {
    if (notFound(e)) return NextResponse.json({ error: "person not found" }, { status: 404 });
    return NextResponse.json({ error: e?.message ?? "could not update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    await adminDeletePerson(params.slackId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (notFound(e)) return NextResponse.json({ error: "person not found" }, { status: 404 });
    return NextResponse.json({ error: e?.message ?? "could not delete" }, { status: 500 });
  }
}
