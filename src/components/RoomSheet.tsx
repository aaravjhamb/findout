"use client";

import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { STATUS_META, type Occupant, type RoomResult } from "@/lib/types";

function slackLink(slackId: string) {
  return `https://hackclub.slack.com/team/${slackId}`;
}

function OccupantRow({ o }: { o: Occupant }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b-2 border-line last:border-0">
      <Avatar image={o.image} name={o.name} nickname={o.nickname} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink truncate">{o.name || o.nickname || "Someone"}</span>
          <StatusBadge status={o.status} />
        </div>
        {o.nickname && (
          <a
            href={slackLink(o.slackId)}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-dark-blue hover:underline"
          >
            @{o.nickname}
          </a>
        )}
        {o.statusMessage && <p className="text-sm text-muted mt-0.5 truncate">{o.statusMessage}</p>}
      </div>
    </div>
  );
}

export default function RoomSheet({
  result,
  myRoom,
  onEditRoom,
  onClose,
}: {
  result: RoomResult | null;
  myRoom: { floor: number; room: number } | null;
  onEditRoom: (prefill?: { floor: number; room: number }) => void;
  onClose: () => void;
}) {
  if (!result) return null;
  const { floor, room, roomId, occupants } = result;

  const isMyRoom = !!myRoom && myRoom.floor === floor && myRoom.room === room;
  const hasRoom = !!myRoom;

  const anyOpen = occupants.some((o) => o.status === "open");
  const headline =
    occupants.length === 0
      ? "No one's shared this room yet"
      : anyOpen
        ? "Home & open to visitors"
        : "Someone's home";

  return (
    <>
      <div className="fixed inset-0 z-30 fade-in" style={{ background: "rgba(65,88,97,0.5)" }} onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-0 z-40 sheet-anim safe-bottom">
        <div className="mx-auto max-w-lg bg-card rounded-t-2xl shadow-sheet border-t-2 border-x-2 border-line">
          <div className="flex justify-center pt-2.5">
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
              {occupants.length === 0 ? (
                <div className="text-center py-8 text-muted text-sm">
                  Nobody here has shared their status yet.
                </div>
              ) : (
                occupants.map((o) => <OccupantRow key={o.slackId} o={o} />)
              )}
            </div>

            {isMyRoom ? (
              <button
                onClick={() => onEditRoom()}
                className="mt-4 w-full h-12 rounded-[10px] bg-ink text-paper font-bold border-2 border-ink"
                style={{ boxShadow: "0 3px 0 rgba(97,69,58,0.3)" }}
              >
                Edit your room
              </button>
            ) : !hasRoom ? (
              <button
                onClick={() => onEditRoom({ floor, room })}
                className="mt-4 w-full h-12 rounded-[10px] bg-card2 text-ink font-bold border-2 border-line"
              >
                Is this your room?
              </button>
            ) : null}

            {occupants.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                {(["open", "busy", "away"] as const).map((s) => {
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
