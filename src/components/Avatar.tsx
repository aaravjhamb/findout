"use client";

import { useState } from "react";

function initials(name?: string | null, nickname?: string | null): string {
  const base = (name || nickname || "?").trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export function Avatar({
  image,
  name,
  nickname,
  size = 40,
}: {
  image?: string | null;
  name?: string | null;
  nickname?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size };

  if (image && !failed) {

    return (
      <img
        src={image}
        alt={name || nickname || "avatar"}
        style={dim}
        onError={() => setFailed(true)}
        className="block shrink-0 rounded-full object-cover bg-card2 ring-1 ring-line"
      />
    );
  }
  return (
    <div
      style={{ ...dim, fontSize: size * 0.36 }}
      className="shrink-0 rounded-full grid place-items-center bg-card2 text-ink font-semibold ring-1 ring-line"
    >
      {initials(name, nickname)}
    </div>
  );
}
