"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { useDragDismiss } from "@/lib/useDragDismiss";
import { copyText, roomLink } from "@/lib/shareLinks";
import { STATUS_META, type Occupant, type RoomResult } from "@/lib/types";

function OccupantRow({ o, onOpenUser }: { o: Occupant; onOpenUser: (user: Occupant) => void }) {
  const detail = o.isVisitor
    ? `visiting from room ${o.homeRoomId}`
    : o.status === "visiting" && o.visitRoomId
      ? `visiting room ${o.visitRoomId}`
      : o.nickname
        ? `@${o.nickname}`
        : null;

  return (
    <button
      onClick={() => onOpenUser(o)}
      className="w-full flex items-start gap-3 rounded-[10px] px-2 py-3 border-b-2 border-transparent text-left hover:bg-card2/50"
    >
      <Avatar image={o.image} name={null} nickname={o.nickname} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink truncate">{o.nickname || o.name || "Someone"}</span>
          <StatusBadge status={o.status} />
        </div>
        {detail && <p className="text-sm text-dark-blue">{detail}</p>}
        {o.statusMessage && <p className="text-sm text-muted mt-0.5 truncate">{o.statusMessage}</p>}
      </div>
    </button>
  );
}

function PeopleSection({
  title,
  people,
  empty,
  onOpenUser,
}: {
  title: string;
  people: Occupant[];
  empty: string;
  onOpenUser: (user: Occupant) => void;
}) {
  return (
    <div>
      <div className="select-none text-xs uppercase tracking-wide text-muted font-bold px-2 pb-1">
        {title}
      </div>
      {people.length === 0 ? (
        <div className="px-2 py-3 text-muted text-sm">{empty}</div>
      ) : (
        people.map((o) => <OccupantRow key={o.entryId} o={o} onOpenUser={onOpenUser} />)
      )}
    </div>
  );
}

export default function RoomSheet({
  result,
  myRoom,
  onEditRoom,
  onOpenUser,
  onClose,
}: {
  result: RoomResult | null;
  myRoom: { floor: number; room: number } | null;
  onEditRoom: (prefill?: { floor: number; room: number }) => void;
  onOpenUser: (user: Occupant) => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { sheetStyle, handleProps } = useDragDismiss(onClose);

  useEffect(() => {
    setCopied(false);
  }, [result?.roomId]);

  if (!result) return null;
  const { floor, room, roomId, occupants } = result;
  const residents = occupants.filter((o) => !o.isVisitor);
  const visitors = occupants.filter((o) => o.isVisitor);

  const isMyRoom = !!myRoom && myRoom.floor === floor && myRoom.room === room;
  const hasRoom = !!myRoom;

  const anyOpen = residents.some((o) => o.status === "open");
  const headline =
    residents.length === 0 && visitors.length === 0
      ? "No one's shared this room yet"
      : anyOpen
        ? "Home & open to visitors"
        : visitors.length > 0
          ? "People are visiting"
          : "Someone's home";

  return (
    <>
      <div className="fixed inset-0 z-30 fade-in" style={{ background: "rgba(65,88,97,0.5)" }} onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-0 z-40 sheet-anim safe-bottom" style={sheetStyle}>
        <div className="mx-auto max-w-lg bg-card rounded-t-2xl shadow-sheet border-t-2 border-x-2 border-line">
          <div
            className="flex justify-center pt-2.5 pb-1 touch-none cursor-grab active:cursor-grabbing"
            aria-label="Drag down to close"
            role="button"
            tabIndex={0}
            {...handleProps}
          >
            <div className="h-1.5 w-10 rounded-full bg-line" />
          </div>

          <div className="px-5 pt-3 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted font-bold">
                  Floor {floor} · Room {String(room).padStart(2, "0")}
                </div>
                <h2 className="font-bells text-3xl mt-0.5 text-ink">Room {roomId}</h2>
                <p className="text-sm text-muted mt-1">{headline}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full h-8 w-8 grid place-items-center bg-card2 border-2 border-line text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-[45dvh] scroll-y">
              {residents.length === 0 && visitors.length === 0 ? (
                <div className="text-center py-8 text-muted text-sm">
                  Nobody here has shared their status yet.
                </div>
              ) : (
                <div className="space-y-4">
                  <PeopleSection
                    title="Residents"
                    people={residents}
                    empty="No residents are listed for this room."
                    onOpenUser={onOpenUser}
                  />
                  {visitors.length > 0 && (
                    <PeopleSection
                      title="Visitors"
                      people={visitors}
                      empty=""
                      onOpenUser={onOpenUser}
                    />
                  )}
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                await copyText(roomLink(floor, room));
                setCopied(true);
              }}
              className="mt-4 w-full h-11 rounded-[10px] bg-card2 text-ink font-bold border-2 border-line"
            >
              {copied ? "Room link copied" : "Copy room link"}
            </button>

            {isMyRoom ? (
              <button
                onClick={() => onEditRoom()}
                className="mt-3 w-full h-12 rounded-[10px] bg-ink text-paper font-bold border-2 border-ink"
                style={{ boxShadow: "0 3px 0 rgba(97,69,58,0.3)" }}
              >
                Edit your room
              </button>
            ) : !hasRoom ? (
              <button
                onClick={() => onEditRoom({ floor, room })}
                className="mt-3 w-full h-12 rounded-[10px] bg-card2 text-ink font-bold border-2 border-line"
              >
                Is this your room?
              </button>
            ) : null}

            {occupants.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                {(["open", "busy", "away", "visiting"] as const).map((s) => {
                  const n = occupants.filter((o) => o.status === s).length;
                  if (!n) return null;
                  return (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[s].color }} />
                      {n} {STATUS_META[s].short.toLowerCase()}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
