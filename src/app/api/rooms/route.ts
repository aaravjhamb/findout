import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPublicOccupants } from "@/lib/data";
import { checkSoupBaseMembership } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const slackId = session?.user?.slackId;
  if (!slackId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const soupBase = await checkSoupBaseMembership(slackId);
  if (!soupBase.ok) return NextResponse.json({ error: soupBase.error }, { status: soupBase.status });

  const occupants = await getPublicOccupants();
  return NextResponse.json(
    { occupants },
    { headers: { "Cache-Control": "no-store" } }
  );
}
