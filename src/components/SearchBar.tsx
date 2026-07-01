"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { StatusDot } from "./StatusBadge";
import type { Occupant, RoomResult } from "@/lib/types";

interface SearchResponse {
  result: RoomResult | null;
  people: Occupant[];
  matched?: string | null;
}

export default function SearchBar({
  onPick,
}: {
  onPick: (floor: number, room: number) => void;
}) {
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = (await res.json()) as SearchResponse;
        setData(json);
        setOpen(true);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (floor: number, room: number) => {
    onPick(floor, room);
    setOpen(false);
    setQ("");
    setData(null);
  };

  const roomOnly =
    data?.result &&
    !data.people.some((p) => p.floor === data.result!.floor && p.room === data.result!.room)
      ? data.result
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data?.result) pick(data.result.floor, data.result.room);
    else if (data?.people?.[0]) pick(data.people[0].floor, data.people[0].room);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit}>
        <div className="flex items-center gap-2 bg-card rounded-[10px] px-3 h-11 border-2 border-line">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted shrink-0">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => data && setOpen(true)}
            inputMode="search"
            placeholder="Room 3612, @slack, email…"
            className="bg-transparent outline-none flex-1 min-w-0 text-[15px] text-ink placeholder:text-muted"
          />
          {loading && (
            <span className="h-3.5 w-3.5 rounded-full border-2 border-line border-t-ink animate-spin" />
          )}
        </div>
      </form>

      {open && data && q.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-card rounded-[10px] border-2 border-line shadow-sheet overflow-hidden fade-in max-h-[55dvh] scroll-y z-30">
          {roomOnly && (
            <button
              onClick={() => pick(roomOnly.floor, roomOnly.room)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card2 text-left border-b-2 border-line"
            >
              <div className="h-10 w-10 rounded-[8px] bg-card2 border-2 border-line grid place-items-center text-ink font-bold">
                #
              </div>
              <div className="min-w-0">
                <div className="font-bold text-ink">Room {roomOnly.roomId}</div>
                <div className="text-sm text-muted">
                  Floor {roomOnly.floor} ·{" "}
                  {roomOnly.occupants.length ? `${roomOnly.occupants.length} here` : "nobody public"}
                </div>
              </div>
            </button>
          )}

          {data.people.map((p) => (
            <button
              key={p.slackId}
              onClick={() => pick(p.floor, p.room)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card2 text-left border-b-2 border-line last:border-0"
            >
              <Avatar image={p.image} name={p.name} nickname={p.nickname} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink truncate flex items-center gap-2">
                  {p.name || p.nickname}
                  <StatusDot status={p.status} />
                </div>
                <div className="text-sm text-muted truncate">
                  {p.nickname ? `@${p.nickname} · ` : ""}Room {p.roomId}
                </div>
              </div>
            </button>
          ))}

          {!roomOnly && data.people.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted">
              No matches. Try a room like 3612.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
