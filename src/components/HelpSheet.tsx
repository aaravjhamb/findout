"use client";

import { useDragDismiss } from "@/lib/useDragDismiss";

export default function HelpSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { sheetStyle, handleProps } = useDragDismiss(onClose);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 fade-in"
        style={{ background: "rgba(65,88,97,0.5)" }}
        onClick={onClose}
      />
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
            <div>
              <div className="text-xs uppercase tracking-wide text-muted font-bold">Field guide</div>
              <h2 className="font-bells text-3xl mt-0.5 text-ink">How FindOut works</h2>
            </div>

            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>
                FindOut shows who has shared a room and whether they are open to visitors.
              </p>
              <p>
                Search by room or nickname, tap a room to see who is there, and use your profile
                button to update your nickname, room, status, or message.
              </p>
              <p>
                Open means visitors are welcome. Busy means heads-down. Away means not in the room.
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-5 w-full h-12 rounded-[10px] bg-ink text-paper font-bold border-2 border-ink"
              style={{ boxShadow: "0 3px 0 rgba(97,69,58,0.3)" }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
