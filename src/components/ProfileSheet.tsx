"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Avatar } from "./Avatar";
import { avatarUrl } from "@/lib/avatar";
import { makeRoomId } from "@/lib/rooms";
import { useDragDismiss } from "@/lib/useDragDismiss";
import { STATUS_META, type RoomStatus } from "@/lib/types";

interface Me {
  slackId: string;
  name: string | null;
  nickname: string | null;
  image: string | null;
  floor: number | null;
  room: number | null;
  visitFloor: number | null;
  visitRoom: number | null;
  status: string;
  statusMessage: string | null;
}

const STATUSES: RoomStatus[] = ["open", "busy", "away", "visiting"];
const ONBOARDING_STEPS = 4;

const inputCls =
  "mt-1 w-full h-11 rounded-[10px] bg-card2 px-3 outline-none border-2 border-line focus:border-ink text-ink";

export default function ProfileSheet({
  open,
  authConfigured,
  prefill,
  onboarding = false,
  onClose,
  onSaved,
}: {
  open: boolean;
  authConfigured: boolean;
  prefill?: { floor: number; room: number } | null;
  onboarding?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: session, status: authStatus } = useSession();
  const [nickname, setNickname] = useState("");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");
  const [visitFloor, setVisitFloor] = useState("");
  const [visitRoom, setVisitRoom] = useState("");
  const [status, setStatus] = useState<RoomStatus>("open");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleSession, setStaleSession] = useState(false);
  const [step, setStep] = useState(0);
  const [stepDir, setStepDir] = useState<"next" | "back">("next");
  const closeSheet = onboarding ? () => {} : onClose;
  const { sheetStyle, handleProps } = useDragDismiss(closeSheet);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

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
        setNickname(me.nickname ?? "");
        setFloor(prefill ? String(prefill.floor) : me.floor ? String(me.floor) : "");
        setRoom(prefill ? String(prefill.room) : me.room ? String(me.room) : "");
        setVisitFloor(me.visitFloor ? String(me.visitFloor) : "");
        setVisitRoom(me.visitRoom ? String(me.visitRoom) : "");
        setStatus((["open", "away", "busy", "visiting"].includes(me.status) ? me.status : "open") as RoomStatus);
        setMsg(me.statusMessage ?? "");
      } catch {

      }
    })();
  }, [open, session?.user, prefill?.floor, prefill?.room]);

  if (!open) return null;

  const save = async () => {
    setError(null);
    const trimmedNickname = nickname.trim();
    const f = parseInt(floor, 10);
    const r = parseInt(room, 10);
    const vf = parseInt(visitFloor, 10);
    const vr = parseInt(visitRoom, 10);
    if (trimmedNickname.length < 2) return setError("Nickname must be at least 2 characters.");
    if (!Number.isInteger(f) || f < 1 || f > 42) return setError("Floor must be 1-42.");
    if (!Number.isInteger(r) || r < 1 || r > 31) return setError("Room must be 1-31.");
    if (status === "visiting") {
      if (!Number.isInteger(vf) || vf < 1 || vf > 42) return setError("Visiting floor must be 1-42.");
      if (!Number.isInteger(vr) || vr < 1 || vr > 31) return setError("Visiting room must be 1-31.");
    }
    setSaving(true);
    try {
      const visitPatch =
        status === "visiting"
          ? { visitFloor: vf, visitRoom: vr }
          : { visitFloor: null, visitRoom: null };
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: trimmedNickname,
          floor: f,
          room: r,
          status,
          statusMessage: msg,
          ...visitPatch,
        }),
      });
      if (res.status === 401) {
        setStaleSession(true);
        return;
      }
      const json = await res.json();
      if (!res.ok) setError(json.error || "Could not save.");
      else {
        onSaved();
        closeSheet();
      }
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setSaving(false);
    }
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (nickname.trim().length < 2) return "Nickname must be at least 2 characters.";
    }
    if (s === 1) {
      const f = parseInt(floor, 10);
      const r = parseInt(room, 10);
      if (!Number.isInteger(f) || f < 1 || f > 42) return "Floor must be 1-42.";
      if (!Number.isInteger(r) || r < 1 || r > 31) return "Room must be 1-31.";
    }
    if (s === 2 && status === "visiting") {
      const vf = parseInt(visitFloor, 10);
      const vr = parseInt(visitRoom, 10);
      if (!Number.isInteger(vf) || vf < 1 || vf > 42) return "Visiting floor must be 1-42.";
      if (!Number.isInteger(vr) || vr < 1 || vr > 31) return "Visiting room must be 1-31.";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) return setError(err);
    setError(null);
    if (step === ONBOARDING_STEPS - 1) {
      save();
      return;
    }
    setStepDir("next");
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setError(null);
    setStepDir("back");
    setStep((s) => Math.max(0, s - 1));
  };

  const previewId = floor && room ? makeRoomId(parseInt(floor, 10), parseInt(room, 10)) : null;
  const visitPreviewId =
    visitFloor && visitRoom ? makeRoomId(parseInt(visitFloor, 10), parseInt(visitRoom, 10)) : null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 fade-in"
        style={{ background: "rgba(65,88,97,0.5)" }}
        onClick={onboarding ? undefined : onClose}
      />
      <div className="fixed left-0 right-0 bottom-0 z-40 sheet-anim safe-bottom" style={sheetStyle}>
        <div className="mx-auto max-w-lg max-h-[92dvh] flex flex-col bg-card rounded-t-2xl shadow-sheet border-t-2 border-x-2 border-line">
          <div
            className="flex justify-center pt-2.5 pb-1 touch-none cursor-grab active:cursor-grabbing"
            aria-label={onboarding ? "Finish setup to continue" : "Drag down to close"}
            role="button"
            tabIndex={0}
            {...handleProps}
          >
            <div className="h-1.5 w-10 rounded-full bg-line" />
          </div>

          <div className="px-5 pt-3 pb-6 min-h-0 scroll-y">
            {authStatus !== "authenticated" ? (
              <div className="text-center py-6">
                <h2 className="font-bells text-2xl text-ink">Share your room</h2>
                <p className="text-sm text-muted mt-2 mb-5">
                  Log in with Hack Club, then set a nickname, room, and status.
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
                    Hack Club OAuth is not configured yet. Add HACKCLUB_CLIENT_ID /
                    HACKCLUB_CLIENT_SECRET to enable login.
                  </div>
                )}
                {!onboarding && (
                  <button onClick={onClose} className="mt-4 text-sm text-muted">
                    Maybe later
                  </button>
                )}
              </div>
            ) : onboarding ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar
                    image={session?.user?.image ?? avatarUrl(session?.user?.slackId)}
                    name={null}
                    nickname={nickname}
                    size={48}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-ink truncate">Set up FindOut</div>
                    <div className="text-sm text-muted truncate">
                      Nickname, room, then you are in.
                    </div>
                  </div>
                  <button onClick={() => signOut()} className="ml-auto text-sm text-muted hover:text-ink">
                    Sign out
                  </button>
                </div>

                {step === 0 && (
                  <div className="mt-4 rounded-[10px] bg-card2 border-2 border-line p-3">
                    <p className="text-sm text-ink font-bold">Welcome in.</p>
                    <p className="text-xs text-muted mt-1">
                      Add the nickname you want people to see and your room. After that, the map
                      will show where you are and whether visitors should drop by.
                    </p>
                  </div>
                )}

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

                <div className="mt-5 flex items-center gap-1.5">
                  {Array.from({ length: ONBOARDING_STEPS }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= step ? "bg-ink" : "bg-line"
                      }`}
                    />
                  ))}
                </div>

                <div key={step} className={stepDir === "next" ? "step-in-next" : "step-in-back"}>
                  {step === 0 && (
                    <label className="block mt-4">
                      <span className="text-xs text-muted font-bold">Nickname</span>
                      <input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value.slice(0, 32))}
                        placeholder="soup person"
                        className={inputCls}
                        autoFocus
                      />
                    </label>
                  )}

                  {step === 1 && (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-xs text-muted font-bold">Floor (1-42)</span>
                          <input
                            value={floor}
                            onChange={(e) => setFloor(e.target.value.replace(/[^0-9]/g, ""))}
                            inputMode="numeric"
                            placeholder="36"
                            className={inputCls}
                            autoFocus
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-muted font-bold">Room (1-31)</span>
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
                          That is room <span className="text-dark-blue font-bold">{previewId}</span>.
                        </p>
                      )}
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="mt-4">
                        <span className="text-xs text-muted font-bold">Status</span>
                        <div className="mt-1.5 grid grid-cols-2 gap-2">
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

                      {status === "visiting" && (
                        <div className="mt-4 rounded-[10px] bg-card2 border-2 border-line p-3">
                          <span className="text-xs text-muted font-bold">Visiting room</span>
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-xs text-muted font-bold">Floor</span>
                              <input
                                value={visitFloor}
                                onChange={(e) => setVisitFloor(e.target.value.replace(/[^0-9]/g, ""))}
                                inputMode="numeric"
                                placeholder="36"
                                className={inputCls}
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs text-muted font-bold">Room</span>
                              <input
                                value={visitRoom}
                                onChange={(e) => setVisitRoom(e.target.value.replace(/[^0-9]/g, ""))}
                                inputMode="numeric"
                                placeholder="12"
                                className={inputCls}
                              />
                            </label>
                          </div>
                          {visitPreviewId && (
                            <p className="text-xs text-muted mt-1.5">
                              You will show as visiting room{" "}
                              <span className="text-dark-blue font-bold">{visitPreviewId}</span>.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <label className="block mt-4">
                        <span className="text-xs text-muted font-bold">Status message (optional)</span>
                        <input
                          value={msg}
                          onChange={(e) => setMsg(e.target.value.slice(0, 80))}
                          placeholder="come hang out"
                          className={inputCls}
                          autoFocus
                        />
                      </label>
                      <p className="text-xs text-muted mt-3">
                        That is everything. Hit finish and you will show up on the map.
                      </p>
                    </>
                  )}
                </div>

                {error && <p className="mt-3 text-sm text-busy">{error}</p>}

                <div className="mt-5 flex gap-3">
                  {step > 0 && (
                    <button
                      onClick={goBack}
                      className="h-12 px-5 rounded-[10px] border-2 border-line text-ink font-bold"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={goNext}
                    disabled={saving}
                    className="flex-1 h-12 rounded-[10px] bg-ink text-paper font-bold border-2 border-ink disabled:opacity-60"
                    style={{ boxShadow: "0 3px 0 rgba(97,69,58,0.3)" }}
                  >
                    {saving ? "Saving..." : step === ONBOARDING_STEPS - 1 ? "Finish setup" : "Next"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Avatar
                    image={session?.user?.image ?? avatarUrl(session?.user?.slackId)}
                    name={null}
                    nickname={nickname}
                    size={48}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-ink truncate">{nickname || "Your profile"}</div>
                    <div className="text-sm text-muted truncate">Nickname and room</div>
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

                <label className="block mt-5">
                  <span className="text-xs text-muted font-bold">Nickname</span>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 32))}
                    placeholder="soup person"
                    className={inputCls}
                  />
                </label>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-muted font-bold">Floor (1-42)</span>
                    <input
                      value={floor}
                      onChange={(e) => setFloor(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      placeholder="36"
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted font-bold">Room (1-31)</span>
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
                    That is room <span className="text-dark-blue font-bold">{previewId}</span>.
                  </p>
                )}

                <div className="mt-4">
                  <span className="text-xs text-muted font-bold">Status</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
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

                {status === "visiting" && (
                  <div className="mt-4 rounded-[10px] bg-card2 border-2 border-line p-3">
                    <span className="text-xs text-muted font-bold">Visiting room</span>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs text-muted font-bold">Floor</span>
                        <input
                          value={visitFloor}
                          onChange={(e) => setVisitFloor(e.target.value.replace(/[^0-9]/g, ""))}
                          inputMode="numeric"
                          placeholder="36"
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted font-bold">Room</span>
                        <input
                          value={visitRoom}
                          onChange={(e) => setVisitRoom(e.target.value.replace(/[^0-9]/g, ""))}
                          inputMode="numeric"
                          placeholder="12"
                          className={inputCls}
                        />
                      </label>
                    </div>
                    {visitPreviewId && (
                      <p className="text-xs text-muted mt-1.5">
                        You will show as visiting room{" "}
                        <span className="text-dark-blue font-bold">{visitPreviewId}</span>.
                      </p>
                    )}
                  </div>
                )}

                <label className="block mt-4">
                  <span className="text-xs text-muted font-bold">Status message (optional)</span>
                  <input
                    value={msg}
                    onChange={(e) => setMsg(e.target.value.slice(0, 80))}
                    placeholder="come hang out"
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
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
