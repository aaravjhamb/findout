"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_META, type RoomStatus } from "@/lib/types";
import type { AdminStats } from "@/lib/adminStats";

function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#61453a]/10 bg-white/50 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-[#61453a]/50">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#61453a]/50">{hint}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
        setStats(json.stats);
      } catch (e: any) {
        setError(e?.message ?? "Could not load stats.");
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-[#e5484d]/30 bg-[#e5484d]/10 px-4 py-3 text-sm text-[#b03038]">
        {error}
      </div>
    );
  }
  if (!stats) return <p className="py-16 text-center text-[#61453a]/50">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total people" value={stats.totalPeople} />
        <StatCard
          label="Placed in a room"
          value={stats.placed}
          hint={`${stats.needsOnboarding} need onboarding`}
        />
        <StatCard
          label="Room occupancy"
          value={`${stats.occupancyRatePct}%`}
          hint={`${stats.occupiedRooms} of ${stats.totalRoomSlots} rooms`}
        />
        <StatCard label="Floors in use" value={stats.floorsInUse} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#61453a]/10 bg-white/50 p-5 shadow-sm">
          <p className="mb-3 text-xs uppercase tracking-wide text-[#61453a]/50">Status breakdown</p>
          <div className="space-y-2">
            {(Object.keys(STATUS_META) as RoomStatus[]).map((s) => {
              const count = stats.byStatus[s] ?? 0;
              const pct = stats.totalPeople ? Math.round((count / stats.totalPeople) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0" style={{ color: STATUS_META[s].color }}>
                    {STATUS_META[s].short}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#61453a]/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: STATUS_META[s].color }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[#61453a]/60">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#61453a]/10 bg-white/50 p-5 shadow-sm">
          <p className="mb-3 text-xs uppercase tracking-wide text-[#61453a]/50">Profile completeness</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Have a nickname</span>
              <span className="font-medium">{stats.withNicknamePct}%</span>
            </div>
            <div className="flex justify-between">
              <span>Have an email on file</span>
              <span className="font-medium">{stats.withEmailPct}%</span>
            </div>
            <div className="flex justify-between">
              <span>Custom avatar</span>
              <span className="font-medium">{stats.withCustomAvatarPct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#61453a]/10 bg-white/50 p-5 shadow-sm">
        <p className="mb-3 text-xs uppercase tracking-wide text-[#61453a]/50">Fun facts</p>
        <ul className="space-y-1.5 text-sm">
          <li>
            {stats.busiestFloor ? (
              <>
                Busiest floor is <strong>Floor {stats.busiestFloor.floor}</strong> with{" "}
                {stats.busiestFloor.count} people.
              </>
            ) : (
              "No one has claimed a floor yet."
            )}
          </li>
          <li>
            {stats.busiestRoom ? (
              <>
                Busiest room is <strong>{stats.busiestRoom.roomId}</strong> with{" "}
                {stats.busiestRoom.count} people.
              </>
            ) : (
              "No room has more than one person yet."
            )}
          </li>
          <li>
            {stats.mostVisitedRoom ? (
              <>
                Most-visited room right now is <strong>{stats.mostVisitedRoom.roomId}</strong> (
                {stats.mostVisitedRoom.count} visiting).
              </>
            ) : (
              "Nobody is marked as visiting right now."
            )}
          </li>
          {stats.newLast7Days !== null && (
            <li>
              <strong>{stats.newLast7Days}</strong> new people joined in the last 7 days.
            </li>
          )}
        </ul>
      </div>

      {stats.timestampsAvailable && stats.recentlyUpdated.length > 0 && (
        <div className="rounded-2xl border border-[#61453a]/10 bg-white/50 p-5 shadow-sm">
          <p className="mb-3 text-xs uppercase tracking-wide text-[#61453a]/50">Recent activity</p>
          <div className="space-y-1">
            {stats.recentlyUpdated.map((p) => (
              <Link
                key={p.slackId}
                href={`/admin/users/${encodeURIComponent(p.slackId)}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-white/60"
              >
                <span className="truncate">{p.nickname || p.name || p.slackId}</span>
                <span className="shrink-0 text-[#61453a]/50">
                  {p.roomId ?? "unplaced"} · {p.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!stats.timestampsAvailable && (
        <p className="text-xs text-[#61453a]/40">
          Sign-up and activity timestamps aren’t available in local dev-db mode.
        </p>
      )}
    </div>
  );
}
