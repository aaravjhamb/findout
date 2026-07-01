export type RoomStatus = "open" | "away" | "busy" | "visiting";

export const STATUS_META: Record<
  RoomStatus,
  { label: string; short: string; color: string; hint: string }
> = {
  open: { label: "Open - come hang out", short: "Open", color: "#37b576", hint: "Home & welcoming visitors" },
  away: { label: "Away", short: "Away", color: "#e5484d", hint: "Not in the room right now" },
  busy: { label: "Busy - do not disturb", short: "Busy", color: "#ff7d70", hint: "In the room but heads-down" },
  visiting: { label: "Visiting", short: "Visiting", color: "#3b82f6", hint: "Away from your room and visiting someone else" },
};

export function isStatus(v: unknown): v is RoomStatus {
  return v === "open" || v === "away" || v === "busy" || v === "visiting";
}

export interface Occupant {
  entryId: string;
  slackId: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  image: string | null;
  floor: number;
  room: number;
  roomId: string;
  homeFloor: number;
  homeRoom: number;
  homeRoomId: string;
  visitFloor: number | null;
  visitRoom: number | null;
  visitRoomId: string | null;
  isVisitor: boolean;
  status: RoomStatus;
  statusMessage: string | null;
}

export interface RoomResult {
  roomId: string;
  floor: number;
  room: number;
  occupants: Occupant[];
}
