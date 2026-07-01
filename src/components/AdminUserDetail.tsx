"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FLOOR_COUNT, ROOMS_PER_FLOOR, makeRoomId } from "@/lib/rooms";
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

type Draft = {
  name: string;
  nickname: string;
  email: string;
  image: string;
  floor: string;
  room: string;
  visitFloor: string;
  visitRoom: string;
  status: RoomStatus;
  statusMessage: string;
};

const numStr = (n: number | null) => (n == null ? "" : String(n));

function isStatusKey(s: string): s is RoomStatus {
  return s in STATUS_META;
}

function toDraft(p: Person): Draft {
  return {
    name: p.name ?? "",
    nickname: p.nickname ?? "",
    email: p.email ?? "",
    image: p.image ?? "",
    floor: numStr(p.floor),
    room: numStr(p.room),
    visitFloor: numStr(p.visitFloor),
    visitRoom: numStr(p.visitRoom),
    status: (isStatusKey(p.status) ? p.status : "open") as RoomStatus,
    statusMessage: p.statusMessage ?? "",
  };
}

function draftEqualsPerson(d: Draft, p: Person): boolean {
  const base = toDraft(p);
  return (Object.keys(base) as (keyof Draft)[]).every((k) => base[k] === d[k]);
}

const inputCls =
  "w-full rounded-lg border border-[#61453a]/15 bg-white/70 px-2.5 py-1.5 text-sm outline-none focus:border-[#61453a]/40";

export default function AdminUserDetail({ slackId }: { slackId: string }) {
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/admin/people/${encodeURIComponent(slackId)}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
      setPerson(json.person);
      setDraft(toDraft(json.person));
    } catch (e: any) {
      setError(e?.message ?? "Could not load.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slackId]);

  function setField(key: keyof Draft, value: string) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/people/${encodeURIComponent(slackId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
      setPerson(json.person);
      setDraft(toDraft(json.person));
    } catch (e: any) {
      setError(e?.message ?? "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    await patch({
      name: draft.name || null,
      nickname: draft.nickname || null,
      email: draft.email || null,
      image: draft.image || null,
      floor: draft.floor === "" ? null : Number(draft.floor),
      room: draft.room === "" ? null : Number(draft.room),
      visitFloor: draft.visitFloor === "" ? null : Number(draft.visitFloor),
      visitRoom: draft.visitRoom === "" ? null : Number(draft.visitRoom),
      status: draft.status,
      statusMessage: draft.statusMessage || null,
    });
  }

  async function resetOnboarding() {
    if (
      !confirm(
        "Send this person back through onboarding? Clears their nickname and room so they'll be prompted to set up again next time they open the app."
      )
    )
      return;
    await patch({
      nickname: null,
      floor: null,
      room: null,
      visitFloor: null,
      visitRoom: null,
      status: "open",
      statusMessage: null,
    });
  }

  async function unassignRoom() {
    await patch({ floor: null, room: null });
  }

  async function clearVisiting() {
    await patch({
      visitFloor: null,
      visitRoom: null,
      ...(person?.status === "visiting" ? { status: "open" } : {}),
    });
  }

  async function resetAvatar() {
    await patch({ image: null });
  }

  async function remove() {
    const label = person?.nickname || person?.name || person?.email || slackId;
    if (!confirm(`Delete ${label}? This removes their record entirely and can't be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/people/${encodeURIComponent(slackId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Delete failed (${res.status})`);
      router.push("/admin/users");
    } catch (e: any) {
      setError(e?.message ?? "Delete failed.");
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="text-[#61453a]/60">No one found with Slack ID {slackId}.</p>
        <Link href="/admin/users" className="mt-4 inline-block text-sm underline">
          Back to users
        </Link>
      </div>
    );
  }

  if (!person || !draft) {
    return <p className="py-16 text-center text-[#61453a]/50">{error ?? "Loading…"}</p>;
  }

  const dirty = !draftEqualsPerson(draft, person);
  const roomId = person.floor != null && person.room != null ? makeRoomId(person.floor, person.room) : null;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/users" className="text-sm text-[#61453a]/60 hover:underline">
        &larr; All users
      </Link>

      <div className="mt-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={person.image ?? `https://cachet.dunkirk.sh/users/${person.slackId}/r`}
          alt=""
          className="h-14 w-14 rounded-full bg-[#61453a]/10 object-cover"
        />
        <div className="min-w-0">
          <h1 className="truncate font-bells text-3xl leading-tight">
            {person.nickname || person.name || "Unnamed"}
          </h1>
          <p className="truncate font-mono text-sm text-[#61453a]/50">{person.slackId}</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-[#e5484d]/30 bg-[#e5484d]/10 px-4 py-3 text-sm text-[#b03038]">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-[#61453a]/10 bg-white/50 p-5 shadow-sm">
        <p className="mb-3 text-xs uppercase tracking-wide text-[#61453a]/50">Profile</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 sm:col-span-1">
            <span className="mb-1 block text-xs text-[#61453a]/50">Name</span>
            <input className={inputCls} value={draft.name} onChange={(e) => setField("name", e.target.value)} />
          </label>
          <label className="col-span-2 sm:col-span-1">
            <span className="mb-1 block text-xs text-[#61453a]/50">Nickname</span>
            <input
              className={inputCls}
              value={draft.nickname}
              onChange={(e) => setField("nickname", e.target.value)}
            />
          </label>
          <label className="col-span-2">
            <span className="mb-1 block text-xs text-[#61453a]/50">Email</span>
            <input className={inputCls} value={draft.email} onChange={(e) => setField("email", e.target.value)} />
          </label>
          <label className="col-span-2">
            <span className="mb-1 block text-xs text-[#61453a]/50">Avatar URL</span>
            <input
              className={inputCls}
              value={draft.image}
              onChange={(e) => setField("image", e.target.value)}
              placeholder="Falls back to Slack avatar"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#61453a]/10 bg-white/50 p-5 shadow-sm">
        <p className="mb-3 text-xs uppercase tracking-wide text-[#61453a]/50">Room &amp; status</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label>
            <span className="mb-1 block text-xs text-[#61453a]/50">Floor (1–{FLOOR_COUNT})</span>
            <input
              className={inputCls}
              inputMode="numeric"
              value={draft.floor}
              onChange={(e) => setField("floor", e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-[#61453a]/50">Room (1–{ROOMS_PER_FLOOR})</span>
            <input
              className={inputCls}
              inputMode="numeric"
              value={draft.room}
              onChange={(e) => setField("room", e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-[#61453a]/50">Status</span>
            <select className={inputCls} value={draft.status} onChange={(e) => setField("status", e.target.value)}>
              {(Object.keys(STATUS_META) as RoomStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].short}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-[#61453a]/50">Status message</span>
            <input
              className={inputCls}
              maxLength={80}
              value={draft.statusMessage}
              onChange={(e) => setField("statusMessage", e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-[#61453a]/50">Visiting floor</span>
            <input
              className={inputCls}
              inputMode="numeric"
              value={draft.visitFloor}
              onChange={(e) => setField("visitFloor", e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-[#61453a]/50">Visiting room</span>
            <input
              className={inputCls}
              inputMode="numeric"
              value={draft.visitRoom}
              onChange={(e) => setField("visitRoom", e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={save}
            disabled={!dirty || busy}
            className="rounded-full bg-[#61453a] px-4 py-1.5 text-sm font-medium text-[#fcf1e5] disabled:opacity-40"
          >
            {busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          {dirty && (
            <button
              onClick={() => setDraft(toDraft(person))}
              disabled={busy}
              className="rounded-full border border-[#61453a]/20 px-4 py-1.5 text-sm hover:bg-white/60"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#61453a]/10 bg-white/50 p-5 shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-[#61453a]/50">Fixes</p>
        <p className="mb-3 text-xs text-[#61453a]/50">
          Shortcuts for when someone&apos;s record gets stuck — each saves immediately.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={resetOnboarding}
            disabled={busy}
            className="rounded-full border border-[#61453a]/20 px-4 py-1.5 text-sm hover:bg-white/60 disabled:opacity-40"
          >
            Send back through onboarding
          </button>
          <button
            onClick={unassignRoom}
            disabled={busy || person.floor == null}
            className="rounded-full border border-[#61453a]/20 px-4 py-1.5 text-sm hover:bg-white/60 disabled:opacity-40"
          >
            Unassign room{roomId ? ` (${roomId})` : ""}
          </button>
          <button
            onClick={clearVisiting}
            disabled={busy || person.visitFloor == null}
            className="rounded-full border border-[#61453a]/20 px-4 py-1.5 text-sm hover:bg-white/60 disabled:opacity-40"
          >
            Clear visiting
          </button>
          <button
            onClick={resetAvatar}
            disabled={busy || !person.image}
            className="rounded-full border border-[#61453a]/20 px-4 py-1.5 text-sm hover:bg-white/60 disabled:opacity-40"
          >
            Reset avatar to Slack default
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#e5484d]/30 bg-[#e5484d]/5 p-5 shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-[#b03038]">Danger zone</p>
        <p className="mb-3 text-xs text-[#61453a]/50">
          Permanently deletes this person&apos;s record. They&apos;ll go through onboarding again if they
          sign back in.
        </p>
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-full border border-[#e5484d]/40 px-4 py-1.5 text-sm font-medium text-[#e5484d] hover:bg-[#e5484d]/10 disabled:opacity-40"
        >
          Delete person
        </button>
      </div>

      {(person.createdAt || person.updatedAt) && (
        <p className="mt-4 text-xs text-[#61453a]/40">
          {person.createdAt && <>Joined {new Date(person.createdAt).toLocaleString()}. </>}
          {person.updatedAt && <>Last updated {new Date(person.updatedAt).toLocaleString()}.</>}
        </p>
      )}
    </div>
  );
}
