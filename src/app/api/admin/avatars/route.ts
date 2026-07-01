import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listAllPeople } from "@/lib/data";
import { buildAvatarReport } from "@/lib/avatarReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const people = await listAllPeople();
    const report = await buildAvatarReport(people);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not build avatar report." }, { status: 503 });
  }
}
