"use client";

import { useSession, signIn } from "next-auth/react";
import { Avatar } from "./Avatar";
import { avatarUrl } from "@/lib/avatar";

export default function AuthButton({
  authConfigured,
  onOpenProfile,
}: {
  authConfigured: boolean;
  onOpenProfile: () => void;
}) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-11 w-11 rounded-full bg-card border-2 border-line animate-pulse" />;
  }

  if (session?.user) {
    return (
      <button
        onClick={onOpenProfile}
        className="h-11 w-11 rounded-full border-2 border-ink shrink-0 overflow-hidden active:scale-95 transition"
        style={{ boxShadow: "0 2px 0 rgba(97,69,58,0.25)" }}
        aria-label="Your profile"
      >
        <Avatar
          image={session.user.image ?? avatarUrl(session.user.slackId)}
          name={session.user.name}
          nickname={session.user.nickname}
          size={44}
        />
      </button>
    );
  }

  return (
    <button
      onClick={() => (authConfigured ? signIn("hackclub") : onOpenProfile())}
      className="h-11 px-4 rounded-[10px] bg-ink text-paper font-bold shrink-0 active:scale-95 transition text-sm border-2 border-ink"
      style={{ boxShadow: "0 3px 0 rgba(97,69,58,0.3)" }}
    >
      Log in
    </button>
  );
}
