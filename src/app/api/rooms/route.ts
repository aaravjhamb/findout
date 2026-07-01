import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPublicOccupants } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const occupants = await getPublicOccupants();
  return NextResponse.json(
    { occupants },
    { headers: { "Cache-Control": "no-store" } }
  );
}
