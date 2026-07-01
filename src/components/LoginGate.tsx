"use client";

import { signIn } from "next-auth/react";

export default function LoginGate({ authConfigured }: { authConfigured: boolean }) {
  return (
    <div className="app-shell flex flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <div className="max-w-md w-full">
        <img
          src="/findout.png"
          alt="FindOut logo"
          className="mx-auto mb-6 h-24 w-24 object-cover rounded-2xl"
        />
        <h1 className="font-bells text-6xl text-ink leading-none">FindOut</h1>
        <p className="text-muted mt-4 text-lg">
          See who&apos;s home in the building. Search a room, person, or Slack handle and drop by.
        </p>

        {authConfigured ? (
          <button
            onClick={() => signIn("hackclub")}
            className="mt-8 w-full h-14 py-4 rounded-[12px] bg-ink text-paper font-bold border-2 border-ink text-lg active:scale-[0.98] transition"
            style={{ boxShadow: "0 4px 0 rgba(97,69,58,0.3)" }}
          >
            Log in with Hack Club
          </button>
        ) : (
          <div className="mt-7 text-sm text-busy bg-busy/10 rounded-[10px] p-3 border-2 border-busy/40">
            Hack Club OAuth isn&apos;t configured. Set HACKCLUB_CLIENT_ID and
            HACKCLUB_CLIENT_SECRET to enable login.
          </div>
        )}

        <p className="text-xs text-muted mt-5">
        </p>
      </div>
    </div>
  );
}
