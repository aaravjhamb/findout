import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listAllPeople } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const people = await listAllPeople();
    return NextResponse.json({ people }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Could not load people." },
      { status: 503 }
    );
  }
}
