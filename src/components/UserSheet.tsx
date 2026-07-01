"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { useDragDismiss } from "@/lib/useDragDismiss";
import { copyText, roomLink, userLink } from "@/lib/shareLinks";
import type { Occupant } from "@/lib/types";

function slackLink(slackId: string) {
  return `https://hackclub.slack.com/team/${slackId}`;
}

export default function UserSheet({
  user,
  onOpenRoom,
  onClose,
}: {
  user: Occupant | null;
  onOpenRoom: (floor: number, room: number) => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"user" | "room" | null>(null);
  const { sheetStyle, handleProps } = useDragDismiss(onClose);

  useEffect(() => {
    setCopied(null);
  }, [user?.slackId]);

  if (!user) return null;

  const copyUser = async () => {
    await copyText(userLink(user.slackId));
    setCopied("user");
  };

  const copyRoom = async () => {
    await copyText(roomLink(user.floor, user.room));
    setCopied("room");
  };

  const locationLabel = user.isVisitor
    ? `Visiting room ${user.roomId}`
    : user.status === "visiting" && user.visitRoomId
      ? `Home room ${user.homeRoomId} - visiting ${user.visitRoomId}`
      : `Room ${user.homeRoomId}`;

  return (
    <>
      <div className="fixed inset-0 z-30 fade-in" style={{ background: "rgba(65,88,97,0.5)" }} onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-0 z-40 sheet-anim safe-bottom" style={sheetStyle}>
        <div className="mx-auto max-w-lg max-h-[92dvh] flex flex-col bg-card rounded-t-2xl shadow-sheet border-t-2 border-x-2 border-line">
          <div
            className="flex justify-center pt-2.5 pb-1 touch-none cursor-grab active:cursor-grabbing"
            aria-label="Drag down to close"
            role="button"
            tabIndex={0}
            {...handleProps}
          >
            <div className="h-1.5 w-10 rounded-full bg-line" />
          </div>

          <div className="px-5 pt-3 pb-6 min-h-0 scroll-y">
            <div className="flex items-start gap-3">
              <Avatar image={user.image} name={null} nickname={user.nickname} size={54} />
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wide text-muted font-bold">Resident file</div>
                <h2 className="font-bells text-3xl mt-0.5 text-ink truncate">
                  {user.nickname || user.name || "Someone"}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={user.status} />
                  <span className="text-sm text-muted">{locationLabel}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full h-8 w-8 grid place-items-center bg-card2 border-2 border-line text-ink"
                aria-label="Close"
              >
                x
              </button>
            </div>

            {user.statusMessage && (
              <p className="mt-4 rounded-[10px] bg-card2 border-2 border-line px-3 py-2 text-sm text-ink">
                {user.statusMessage}
              </p>
            )}

            {user.status === "visiting" && user.visitRoomId && (
              <div className="mt-4 rounded-[10px] bg-card2 border-2 border-line px-3 py-2 text-sm text-muted">
                Lives in room <span className="font-bold text-ink">{user.homeRoomId}</span>
                {" "}and is visiting room <span className="font-bold text-ink">{user.visitRoomId}</span>.
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => onOpenRoom(user.floor, user.room)}
                className="h-11 rounded-[10px] bg-ink text-paper font-bold border-2 border-ink"
              >
                Open room
              </button>
              <a
                href={slackLink(user.slackId)}
                target="_blank"
                rel="noreferrer"
                className="h-11 rounded-[10px] bg-card2 text-ink font-bold border-2 border-line grid place-items-center"
              >
                Slack
              </a>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={copyUser}
                className="h-11 rounded-[10px] bg-card2 text-ink font-bold border-2 border-line"
              >
                {copied === "user" ? "User link copied" : "Copy user link"}
              </button>
              <button
                onClick={copyRoom}
                className="h-11 rounded-[10px] bg-card2 text-ink font-bold border-2 border-line"
              >
                {copied === "room" ? "Room link copied" : "Copy room link"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
