"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AvatarStatus } from "@/lib/avatar";

type Entry = {
  slackId: string;
  nickname: string | null;
  name: string | null;
  storedImage: string | null;
  status: AvatarStatus;
  resolvedUrl: string | null;
  slackAvatarUrl: string | null;
};

const STATUS_META: Record<AvatarStatus, { label: string; color: string; hint: string }> = {
  none: { label: "No avatar", color: "#e5484d", hint: "Shows initials in the app — no image resolves at all" },
  "custom-broken": {
    label: "Custom broken",
    color: "#ff7d70",
    hint: "Their custom image URL doesn't load, so it's falling back to Slack",
  },
  slack: { label: "Slack avatar", color: "#37b576", hint: "Using their Slack profile photo via Cachet" },
  custom: { label: "Custom avatar", color: "#3b82f6", hint: "Using a working custom image URL" },
};

// Worst-first, so the people worth fixing surface at the top.
const ORDER: AvatarStatus[] = ["none", "custom-broken", "slack", "custom"];

export default function AdminAvatarReport() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AvatarStatus | "all">("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/avatars", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
        setEntries(json.entries ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Could not load.");
        setEntries([]);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const c: Record<AvatarStatus, number> = { none: 0, "custom-broken": 0, slack: 0, custom: 0 };
    for (const e of entries ?? []) c[e.status]++;
    return c;
  }, [entries]);

  const sorted = useMemo(() => {
    if (!entries) return [];
    const list = filter === "all" ? entries : entries.filter((e) => e.status === filter);
    return [...list].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  }, [entries, filter]);

  if (error) {
    return (
      <div className="rounded-xl border border-[#e5484d]/30 bg-[#e5484d]/10 px-4 py-3 text-sm text-[#b03038]">
        {error}
      </div>
    );
  }

  if (!entries) {
    return (
      <p className="py-16 text-center text-[#61453a]/50">
        Checking avatars… this pings Slack/Cachet for everyone, give it a moment.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            className="rounded-2xl border p-4 text-left shadow-sm"
            style={{
              borderColor: filter === s ? STATUS_META[s].color : "rgba(97,69,58,0.1)",
              background: filter === s ? `${STATUS_META[s].color}14` : "rgba(255,255,255,0.5)",
            }}
          >
            <p className="text-xs uppercase tracking-wide" style={{ color: STATUS_META[s].color }}>
              {STATUS_META[s].label}
            </p>
            <p className="mt-1 text-2xl font-bold">{counts[s]}</p>
          </button>
        ))}
      </div>

      {filter !== "all" && (
        <button onClick={() => setFilter("all")} className="mb-3 text-xs text-[#61453a]/50 hover:underline">
          Clear filter
        </button>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#61453a]/10 bg-white/50 shadow-sm">
        {sorted.length === 0 ? (
          <p className="py-16 text-center text-[#61453a]/50">No one matches.</p>
        ) : (
          sorted.map((e) => (
            <div
              key={e.slackId}
              className="flex items-center gap-3 border-b border-[#61453a]/10 px-4 py-3 last:border-b-0"
            >
              {e.resolvedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.resolvedUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full bg-[#61453a]/10 object-cover"
                />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#61453a]/10 text-xs text-[#61453a]/40">
                  ?
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/users/${encodeURIComponent(e.slackId)}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {e.nickname || e.name || "—"}
                </Link>
                <p className="truncate font-mono text-xs text-[#61453a]/50">{e.slackId}</p>
                {e.storedImage && (
                  <p className="truncate text-xs text-[#61453a]/40">
                    stored:{" "}
                    <a href={e.storedImage} target="_blank" rel="noreferrer" className="underline">
                      {e.storedImage}
                    </a>
                  </p>
                )}
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: `${STATUS_META[e.status].color}1f`, color: STATUS_META[e.status].color }}
                title={STATUS_META[e.status].hint}
              >
                {STATUS_META[e.status].label}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
