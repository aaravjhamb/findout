"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import LoginGate from "./LoginGate";
import AuthButton from "./AuthButton";
import SearchBar from "./SearchBar";
import RoomSheet from "./RoomSheet";
import UserSheet from "./UserSheet";
import ProfileSheet from "./ProfileSheet";
import HelpSheet from "./HelpSheet";
import FloorPlan2D from "./FloorPlan2D";
import FloorRail from "./FloorRail";
import { makeRoomId, parseRoomId } from "@/lib/rooms";
import { avatarUrl } from "@/lib/avatar";
import type { Occupant, RoomResult } from "@/lib/types";

interface MeRecord {
  slackId: string;
  nickname: string | null;
  floor: number | null;
  room: number | null;
}

export default function App({ authConfigured }: { authConfigured: boolean }) {
  const { data: session, status: authStatus } = useSession();
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [activeRoom, setActiveRoom] = useState<number | null>(null);
  const [roomResult, setRoomResult] = useState<RoomResult | null>(null);
  const [selectedUser, setSelectedUser] = useState<Occupant | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profilePrefill, setProfilePrefill] = useState<{ floor: number; room: number } | null>(null);
  const [myRoom, setMyRoom] = useState<{ floor: number; room: number } | null>(null);
  const [meRecord, setMeRecord] = useState<MeRecord | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [linkQuery, setLinkQuery] = useState<string | null>(null);

  const replaceLink = useCallback((params: Record<string, string> | null) => {
    const url = new URL(window.location.href);
    url.search = "";
    if (params) {
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    }
    window.history.pushState(null, "", url);
    setLinkQuery(url.search);
  }, []);

  const clearShareLink = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("room") && !url.searchParams.has("user")) return;
    url.searchParams.delete("room");
    url.searchParams.delete("user");
    window.history.pushState(null, "", url);
    setLinkQuery(url.search);
  }, []);

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
      if (!res.ok) {
        setMeRecord(null);
        setMeLoaded(true);
        return setMyRoom(null);
      }
      const { me } = await res.json();
      setMeRecord(me ?? null);
      setMeLoaded(true);
      setMyRoom(me && me.floor && me.room ? { floor: me.floor, room: me.room } : null);
    } catch {
      setMeRecord(null);
      setMeLoaded(true);
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
    const sync = () => setLinkQuery(window.location.search);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

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
    (floor: number, room: number, source?: Occupant[], syncUrl = true) => {
      const src = withMe(source ?? occupants);
      const list = src.filter((o) => o.floor === floor && o.room === room);
      setSelectedUser(null);
      setActiveFloor(floor);
      setActiveRoom(room);
      setRoomResult({ floor, room, roomId: makeRoomId(floor, room), occupants: list });
      if (syncUrl) replaceLink({ room: makeRoomId(floor, room) });
    },
    [occupants, replaceLink, withMe]
  );

  const openUser = useCallback(
    (user: Occupant, syncUrl = true) => {
      setRoomResult(null);
      setActiveFloor(user.floor);
      setActiveRoom(user.room);
      setSelectedUser(user);
      if (syncUrl) replaceLink({ user: user.slackId });
    },
    [replaceLink]
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

  const needsOnboarding =
    authStatus === "authenticated" &&
    meLoaded &&
    (!meRecord?.nickname?.trim() || !meRecord.floor || !meRecord.room);

  useEffect(() => {
    if (authStatus !== "authenticated" || needsOnboarding || linkQuery === null) return;
    const params = new URLSearchParams(linkQuery);
    const roomParam = params.get("room");
    const userParam = params.get("user");

    if (!roomParam && !userParam) {
      setRoomResult(null);
      setSelectedUser(null);
      return;
    }

    if (roomParam) {
      const parsed = parseRoomId(roomParam);
      if (parsed) openRoom(parsed.floor, parsed.room, occupants, false);
      return;
    }

    if (userParam) {
      const needle = userParam.trim().toLowerCase();
      const user = viewOccupants.find((o) =>
        o.slackId.toLowerCase() === needle || o.nickname?.toLowerCase() === needle
      );
      if (user) openUser(user, false);
    }
  }, [authStatus, linkQuery, needsOnboarding, occupants, openRoom, openUser, viewOccupants]);

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
            <h1 className="select-none font-bells text-2xl leading-none text-ink">FindOut</h1>
            <p className="select-none text-[11px] text-muted leading-tight mt-0.5">who&apos;s home?</p>
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
          {activeFloor !== null && (
            <div className="pointer-events-none absolute left-4 top-3 z-10">
              <span className="select-none font-bells text-3xl text-ink leading-none drop-shadow-[0_1px_0_rgba(255,252,245,0.9)]">
                Floor {activeFloor}
              </span>
            </div>
          )}

          <div className="flex-1 min-h-0 px-2 pb-2">
            {activeFloor !== null ? (
              <FloorPlan2D
                floor={activeFloor}
                occupants={viewOccupants}
                activeRoom={activeRoom}
                onSelectRoom={openRoom}
                onOpenHelp={() => setHelpOpen(true)}
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
        onOpenUser={openUser}
        onClose={() => {
          setRoomResult(null);
          clearShareLink();
        }}
      />
      <UserSheet
        user={selectedUser}
        onOpenRoom={(floor, room) => openRoom(floor, room)}
        onClose={() => {
          setSelectedUser(null);
          clearShareLink();
        }}
      />
      <ProfileSheet
        open={profileOpen || needsOnboarding}
        authConfigured={authConfigured}
        prefill={profilePrefill}
        onboarding={needsOnboarding}
        onClose={() => setProfileOpen(false)}
        onSaved={onProfileSaved}
      />
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="fixed inset-x-0 bottom-2 z-10 safe-bottom select-none text-center text-xs font-bold text-muted/75">
        Made by{" "}
        <a className="pointer-events-auto hover:text-ink hover:underline" href="?user=U079WLY0HLY">
          Logan
        </a>
        {", "}
        <a className="pointer-events-auto hover:text-ink hover:underline" href="?user=U07UK4S94KC">
          Aarav
        </a>
        {", and "}
        <a className="pointer-events-auto hover:text-ink hover:underline" href="?user=U0AJV167GQJ">
          Steven
        </a>
      </div>
    </div>
  );
}
