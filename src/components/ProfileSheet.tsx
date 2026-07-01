"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Avatar } from "./Avatar";
import { avatarUrl } from "@/lib/avatar";
import { makeRoomId } from "@/lib/rooms";
import { STATUS_META, type RoomStatus } from "@/lib/types";

interface Me {
  slackId: string;
  name: string | null;
  nickname: string | null;
  image: string | null;
  floor: number | null;
  room: number | null;
  status: string;
  statusMessage: string | null;
}

const STATUSES: RoomStatus[] = ["open", "away", "busy"];

const inputCls =
  "mt-1 w-full h-11 rounded-[10px] bg-card2 px-3 outline-none border-2 border-line focus:border-ink text-ink";

export default function ProfileSheet({
  open,
  authConfigured,
  prefill,
  onClose,
  onSaved,
}: {
  open: boolean;
  authConfigured: boolean;
  prefill?: { floor: number; room: number } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: session, status: authStatus } = useSession();
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState<RoomStatus>("open");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleSession, setStaleSession] = useState(false);

  useEffect(() => {
    if (!open || !session?.user) return;
    setStaleSession(false);
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (res.status === 401) {
          setStaleSession(true);
          return;
        }
        if (!res.ok) return;
        const { me } = (await res.json()) as { me: Me | null };
        if (!me) return;
        setFloor(prefill ? String(prefill.floor) : me.floor ? String(me.floor) : "");
        setRoom(prefill ? String(prefill.room) : me.room ? String(me.room) : "");
        setStatus((["open", "away", "busy"].includes(me.status) ? me.status : "open") as RoomStatus);
        setMsg(me.statusMessage ?? "");
      } catch {

      }
    })();
  }, [open, session?.user, prefill?.floor, prefill?.room]);

  if (!open) return null;

  const save = async () => {
    setError(null);
    const f = parseInt(floor, 10);
    const r = parseInt(room, 10);
    if (!Number.isInteger(f) || f < 1 || f > 42) return setError("Floor must be 1–42.");
    if (!Number.isInteger(r) || r < 1 || r > 31) return setError("Room must be 1–31.");
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floor: f, room: r, status, statusMessage: msg }),
      });
      if (res.status === 401) {
        setStaleSession(true);
        return;
      }
      const json = await res.json();
      if (!res.ok) setError(json.error || "Could not save.");
      else {
        onSaved();
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setSaving(false);
    }
  };

  const previewId = floor && room ? makeRoomId(parseInt(floor, 10), parseInt(room, 10)) : null;

  return (
    <>
      <div className="fixed inset-0 z-30 fade-in" style={{ background: "rgba(65,88,97,0.5)" }} onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-0 z-40 sheet-anim safe-bottom">
        <div className="mx-auto max-w-lg bg-card rounded-t-2xl shadow-sheet border-t-2 border-x-2 border-line">
          <div className="flex justify-center pt-2.5">
            <div className="h-1.5 w-10 rounded-full bg-line" />
          </div>

          <div className="px-5 pt-3 pb-6">
            {authStatus !== "authenticated" ? (
              <div className="text-center py-6">
                <h2 className="font-bells text-2xl text-ink">Share your room</h2>
                <p className="text-sm text-muted mt-2 mb-5">
                  Log in with Hack Club, then set your room and status. It stays private until you
                  choose to make it public.
                </p>
                {authConfigured ? (
                  <button
                    onClick={() => signIn("hackclub")}
                    className="w-full h-12 rounded-[10px] bg-ink text-paper font-bold border-2 border-ink"
                    style={{ boxShadow: "0 3px 0 rgba(97,69,58,0.3)" }}
                  >
                    Continue with Hack Club
                  </button>
                ) : (
                  <div className="text-xs text-busy bg-busy/10 rounded-lg p-3 border-2 border-busy/40">
                    Hack Club OAuth isn&apos;t configured yet. Add HACKCLUB_CLIENT_ID /
                    HACKCLUB_CLIENT_SECRET to enable login.
                  </div>
                )}
                <button onClick={onClose} className="mt-4 text-sm text-muted">
                  Maybe later
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Avatar
                    image={session?.user?.image ?? avatarUrl(session?.user?.slackId)}
                    name={session?.user?.name}
                    nickname={session?.user?.nickname}
                    size={48}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-ink truncate">{session?.user?.name}</div>
                    {session?.user?.nickname && (
                      <div className="text-sm text-muted truncate">@{session.user.nickname}</div>
                    )}
                  </div>
                  <button onClick={() => signOut()} className="ml-auto text-sm text-muted hover:text-ink">
                    Sign out
                  </button>
                </div>

                {staleSession && (
                  <div className="mt-4 rounded-[10px] bg-busy/10 border-2 border-busy/40 p-3">
                    <p className="text-sm text-ink font-bold">Your session needs a refresh</p>
                    <p className="text-xs text-muted mt-1">
                      Sign out and back in to reconnect your Slack ID, then you can save your room.
                    </p>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="mt-3 w-full h-11 rounded-[10px] bg-ink text-paper font-bold border-2 border-ink"
                    >
                      Sign out &amp; back in
                    </button>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-muted font-bold">Floor (1–42)</span>
                    <input
                      value={floor}
                      onChange={(e) => setFloor(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      placeholder="36"
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted font-bold">Room (1–31)</span>
                    <input
                      value={room}
                      onChange={(e) => setRoom(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      placeholder="12"
                      className={inputCls}
                    />
                  </label>
                </div>
                {previewId && (
                  <p className="text-xs text-muted mt-1.5">
                    That&apos;s room <span className="text-dark-blue font-bold">{previewId}</span>.
                  </p>
                )}

                <div className="mt-4">
                  <span className="text-xs text-muted font-bold">Status</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className="h-11 rounded-[10px] text-sm font-bold border-2 transition"
                        style={{
                          background: status === s ? `${STATUS_META[s].color}22` : "#f5e8d5",
                          color: status === s ? STATUS_META[s].color : "#9a8574",
                          borderColor: status === s ? STATUS_META[s].color : "#c5a080",
                        }}
                      >
                        {STATUS_META[s].short}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1.5">{STATUS_META[status].hint}</p>
                </div>

                <label className="block mt-4">
                  <span className="text-xs text-muted font-bold">Status message (optional)</span>
                  <input
                    value={msg}
                    onChange={(e) => setMsg(e.target.value.slice(0, 80))}
                    placeholder="come hang out 👋"
                    className={inputCls}
                  />
                </label>

                {error && <p className="mt-3 text-sm text-busy">{error}</p>}

                <button
                  onClick={save}
                  disabled={saving}
                  className="mt-5 w-full h-12 rounded-[10px] bg-ink text-paper font-bold border-2 border-ink disabled:opacity-60"
                  style={{ boxShadow: "0 3px 0 rgba(97,69,58,0.3)" }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
