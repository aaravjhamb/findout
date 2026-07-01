import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { adminClearAllNicknames } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const count = await adminClearAllNicknames();
    return NextResponse.json({ count });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "could not clear nicknames" }, { status: 500 });
  }
}
