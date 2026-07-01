import { STATUS_META, type RoomStatus } from "@/lib/types";

export function StatusDot({ status, className = "" }: { status: RoomStatus; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full ${className}`}
      style={{ background: STATUS_META[status].color, width: 10, height: 10, boxShadow: `0 0 8px ${STATUS_META[status].color}` }}
    />
  );
}

export function StatusBadge({ status }: { status: RoomStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: `${m.color}1f`, color: m.color }}
    >
      <StatusDot status={status} />
      {m.short}
    </span>
  );
}
