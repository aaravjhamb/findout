"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { makeRoomId } from "@/lib/rooms";
import { STATUS_META, type RoomStatus } from "@/lib/types";

type Person = {
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
  createdAt: string | null;
  updatedAt: string | null;
};

function isStatusKey(s: string): s is RoomStatus {
  return s in STATUS_META;
}

export default function AdminUserList() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/people", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
      setPeople(json.people ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Could not load.");
      setPeople([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const withNickname = people?.filter((p) => p.nickname?.trim()).length ?? 0;

  async function clearAllNicknames() {
    if (!withNickname) return;
    if (
      !confirm(
        `Clear nicknames for all ${withNickname} people who have one set? ` +
          `They'll be prompted to pick a new nickname next time they open the app. This can't be undone in bulk.`
      )
    )
      return;
    setBulkBusy(true);
    setBulkMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/bulk/clear-nicknames", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
      setBulkMessage(`Cleared ${json.count} nickname${json.count === 1 ? "" : "s"}.`);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  const filtered = useMemo(() => {
    if (!people) return [];
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => {
      const roomId = p.floor != null && p.room != null ? makeRoomId(p.floor, p.room) : null;
      const visitRoomId =
        p.visitFloor != null && p.visitRoom != null ? makeRoomId(p.visitFloor, p.visitRoom) : null;
      return [p.name, p.nickname, p.email, p.slackId, roomId, visitRoomId, p.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [people, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, nickname, email, Slack ID, room, or status…"
        className="mb-4 w-full rounded-xl border border-[#61453a]/15 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-[#61453a]/40"
      />

      <div className="mb-4 rounded-2xl border border-[#e5484d]/30 bg-[#e5484d]/5 p-4">
        <p className="mb-1 text-xs uppercase tracking-wide text-[#b03038]">Bulk actions</p>
        <p className="mb-3 text-xs text-[#61453a]/50">
          Affects everyone at once — use with care.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={clearAllNicknames}
            disabled={bulkBusy || !withNickname}
            className="rounded-full border border-[#e5484d]/40 px-4 py-1.5 text-sm font-medium text-[#e5484d] hover:bg-[#e5484d]/10 disabled:opacity-40"
          >
            {bulkBusy ? "Clearing…" : `Clear all nicknames${withNickname ? ` (${withNickname})` : ""}`}
          </button>
          {bulkMessage && <span className="text-xs text-[#61453a]/60">{bulkMessage}</span>}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#e5484d]/30 bg-[#e5484d]/10 px-4 py-3 text-sm text-[#b03038]">
          {error}
        </div>
      )}

      {people === null ? (
        <p className="py-16 text-center text-[#61453a]/50">Loading…</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-[#61453a]/50">
            {filtered.length} of {people.length} people
          </p>
          <div className="overflow-hidden rounded-2xl border border-[#61453a]/10 bg-white/50 shadow-sm">
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-[#61453a]/50">No matches.</p>
            ) : (
              filtered.map((p) => {
                const roomId = p.floor != null && p.room != null ? makeRoomId(p.floor, p.room) : null;
                const status = isStatusKey(p.status) ? p.status : "open";
                return (
                  <Link
                    key={p.slackId}
                    href={`/admin/users/${encodeURIComponent(p.slackId)}`}
                    className="flex items-center gap-3 border-b border-[#61453a]/10 px-4 py-3 last:border-b-0 hover:bg-white/70"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image ?? `https://cachet.dunkirk.sh/users/${p.slackId}/r`}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full bg-[#61453a]/10 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.nickname || p.name || "—"}</p>
                      <p className="truncate font-mono text-xs text-[#61453a]/50">
                        {p.slackId}
                        {p.email ? ` · ${p.email}` : ""}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: `${STATUS_META[status].color}1f`, color: STATUS_META[status].color }}
                    >
                      {STATUS_META[status].short}
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs text-[#61453a]/50">
                      {roomId ?? "unplaced"}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
