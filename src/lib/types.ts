export type RoomStatus = "open" | "away" | "busy";

export const STATUS_META: Record<
  RoomStatus,
  { label: string; short: string; color: string; hint: string }
> = {
  open: { label: "Open — come hang out", short: "Open", color: "#37b576", hint: "Home & welcoming visitors" },
  away: { label: "Away", short: "Away", color: "#e5484d", hint: "Not in the room right now" },
  busy: { label: "Busy — do not disturb", short: "Busy", color: "#ff7d70", hint: "In the room but heads-down" },
};

export function isStatus(v: unknown): v is RoomStatus {
  return v === "open" || v === "away" || v === "busy";
}

export interface Occupant {
  slackId: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  image: string | null;
  floor: number;
  room: number;
  roomId: string;
  status: RoomStatus;
  statusMessage: string | null;
}

export interface RoomResult {
  roomId: string;
  floor: number;
  room: number;
  occupants: Occupant[];
}
