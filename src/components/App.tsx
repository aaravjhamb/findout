"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import LoginGate from "./LoginGate";
import AuthButton from "./AuthButton";
import SearchBar from "./SearchBar";
import RoomSheet from "./RoomSheet";
import ProfileSheet from "./ProfileSheet";
import FloorPlan2D from "./FloorPlan2D";
import FloorRail from "./FloorRail";
import { makeRoomId } from "@/lib/rooms";
import { avatarUrl } from "@/lib/avatar";
import type { Occupant, RoomResult } from "@/lib/types";

export default function App({ authConfigured }: { authConfigured: boolean }) {
  const { data: session, status: authStatus } = useSession();
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [activeRoom, setActiveRoom] = useState<number | null>(null);
  const [roomResult, setRoomResult] = useState<RoomResult | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePrefill, setProfilePrefill] = useState<{ floor: number; room: number } | null>(null);
  const [myRoom, setMyRoom] = useState<{ floor: number; room: number } | null>(null);

  const loadOccupants = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      const { occupants } = await res.json();
      setOccupants(occupants ?? []);
      return (occupants ?? []) as Occupant[];
    } catch {
      return [] as Occupant[];
    }
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) return setMyRoom(null);
      const { me } = await res.json();
      setMyRoom(me && me.floor && me.room ? { floor: me.floor, room: me.room } : null);
    } catch {
      setMyRoom(null);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    loadOccupants();
    loadMe();
    const t = setInterval(loadOccupants, 20000);
    return () => clearInterval(t);
  }, [loadOccupants, loadMe, authStatus]);

  useEffect(() => {
    if (activeFloor !== null || occupants.length === 0) return;
    const counts = new Map<number, number>();
    for (const o of occupants) counts.set(o.floor, (counts.get(o.floor) ?? 0) + 1);
    let best = occupants[0].floor;
    let max = 0;
    for (const [f, n] of counts) if (n > max) ((max = n), (best = f));
    setActiveFloor(best);
  }, [occupants, activeFloor]);

  const me = session?.user;

  const myImage = me?.slackId ? me.image ?? avatarUrl(me.slackId) : null;
  const withMe = useCallback(
    (list: Occupant[]) =>
      me?.slackId && myImage
        ? list.map((o) => (o.slackId === me.slackId ? { ...o, image: myImage } : o))
        : list,
    [me?.slackId, myImage]
  );
  const viewOccupants = useMemo(() => withMe(occupants), [withMe, occupants]);

  const openRoom = useCallback(
    (floor: number, room: number, source?: Occupant[]) => {
      const src = withMe(source ?? occupants);
      const list = src.filter((o) => o.floor === floor && o.room === room);
      setActiveFloor(floor);
      setActiveRoom(room);
      setRoomResult({ floor, room, roomId: makeRoomId(floor, room), occupants: list });
    },
    [occupants, withMe]
  );

  const handlePick = useCallback(
    async (floor: number, room: number) => {
      const fresh = await loadOccupants();
      openRoom(floor, room, fresh);
    },
    [loadOccupants, openRoom]
  );

  const pickFloor = useCallback((f: number) => {
    setActiveFloor(f);
    setActiveRoom(null);
    setRoomResult(null);
  }, []);

  const openProfile = useCallback((prefill?: { floor: number; room: number }) => {
    setProfilePrefill(prefill ?? null);
    setRoomResult(null);
    setProfileOpen(true);
  }, []);

  const onProfileSaved = useCallback(() => {
    loadOccupants();
    loadMe();
  }, [loadOccupants, loadMe]);

  if (authStatus === "loading") {
    return (
      <div className="app-shell grid place-items-center">
        <span className="h-8 w-8 rounded-full border-2 border-line border-t-ink animate-spin" />
      </div>
    );
  }
  if (authStatus !== "authenticated") {
    return <LoginGate authConfigured={authConfigured} />;
  }

  return (
    <div className="app-shell flex flex-col">
      <header className="safe-top z-20 px-3 pt-3 pb-2 border-b-2 border-line bg-paper/80 backdrop-blur">
        <div className="flex items-center gap-3 pt-3">
          <div className="min-w-0">
            <h1 className="font-bells text-2xl leading-none text-ink">FindOut</h1>
            <p className="text-[11px] text-muted leading-tight mt-0.5">who&apos;s home?</p>
          </div>
          <div className="flex-1 min-w-0">
            <SearchBar onPick={handlePick} />
          </div>
          <div className="shrink-0">
            <AuthButton authConfigured={authConfigured} onOpenProfile={() => openProfile()} />
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex">
        <div className="border-r-2 border-line bg-card2/50">
          <FloorRail occupants={viewOccupants} activeFloor={activeFloor} onPick={pickFloor} />
        </div>

        <div className="flex-1 min-w-0 relative flex flex-col">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-baseline gap-2">
              <span className="font-bells text-3xl text-ink leading-none">
                {activeFloor !== null ? `Floor ${activeFloor}` : "—"}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 px-2 pb-2">
            {activeFloor !== null ? (
              <FloorPlan2D
                floor={activeFloor}
                occupants={viewOccupants}
                activeRoom={activeRoom}
                onSelectRoom={openRoom}
              />
            ) : (
              <div className="h-full grid place-items-center text-muted text-sm">
                No floors configured yet. Log in and set your room to add one.
              </div>
            )}
          </div>
        </div>
      </main>

      <RoomSheet
        result={roomResult}
        myRoom={myRoom}
        onEditRoom={openProfile}
        onClose={() => setRoomResult(null)}
      />
      <ProfileSheet
        open={profileOpen}
        authConfigured={authConfigured}
        prefill={profilePrefill}
        onClose={() => setProfileOpen(false)}
        onSaved={onProfileSaved}
      />
    </div>
  );
}
