"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

const PROJECT_URL = "https://github.com/SharKingStudios/Soupocalypse";

const ARENA_MIN_X = -2.0;
const ARENA_MAX_X = 2.0;
const ARENA_MIN_Y = 0.8;
const ARENA_MAX_Y = 4.5;
const BEAM_WIDTH_M = 0.68;
const BUBBLE_RADIUS_M = 0.62;
const BUBBLE_COOLDOWN = 1.1;
const BEAM_COOLDOWN = 1.64;

const PALETTE = {
  bg: "#120d0b",
  panel: "#1e1613",
  panel2: "#2a1e19",
  darkBrown: "#61453a",
  brown: "#9f715d",
  lightBrown: "#edd1b0",
  beige: "#fcf1e5",
  text: "#e8d5c4",
  muted: "#b89a85",
  soup: "#ffebad",
  soupDeep: "#ef9300",
  p1: "#37b576",
  p1Dark: "#1d6246",
  p2: "#ff7d70",
  p2Dark: "#8f372f",
  white: "#ffffff",
  bubble: "#38c9ff",
  bad: "#fb2c36",
};

const players = {
  left: { x: -0.95, y: 2.5, color: PALETTE.p1, dark: PALETTE.p1Dark },
  right: { x: 0.95, y: 2.5, color: PALETTE.p2, dark: PALETTE.p2Dark },
  bowl: { x: 0, y: 4.18, color: PALETTE.soup, dark: PALETTE.soupDeep },
};

function clamp(value: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function worldToStage(x: number, y: number) {
  const tx = (x - ARENA_MIN_X) / (ARENA_MAX_X - ARENA_MIN_X);
  const ty = (y - ARENA_MIN_Y) / (ARENA_MAX_Y - ARENA_MIN_Y);
  return {
    left: lerp(12, 88, clamp(tx, 0, 1)),
    top: lerp(76, 24, clamp(ty, 0, 1)),
  };
}

function pointStyle(x: number, y: number, extra?: CSSProperties) {
  const point = worldToStage(x, y);
  return {
    left: `${point.left}%`,
    top: `${point.top}%`,
    ...extra,
  } satisfies CSSProperties;
}

function beamStyle() {
  const start = worldToStage(players.left.x + 0.16, players.left.y + 0.07);
  const end = worldToStage(players.right.x - 0.16, players.right.y + 0.03);
  const dx = end.left - start.left;
  const dy = end.top - start.top;

  return {
    left: `${start.left}%`,
    top: `${start.top}%`,
    width: `${Math.hypot(dx, dy)}%`,
    transform: `translateY(-50%) rotate(${Math.atan2(dy, dx)}rad)`,
    "--beam-width": `${Math.round(14 + BEAM_WIDTH_M * 26)}px`,
    "--beam-cooldown": `${BEAM_COOLDOWN}s`,
  } as CSSProperties;
}

export default function SoupocalypseAd() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => {
        const t = (index + 1) / 23;
        const wave = Math.sin(index * 1.73) * 0.15;
        const x = lerp(players.left.x, players.right.x, t);
        const y = lerp(players.left.y + 0.18, players.right.y + 0.02, t) + wave;
        const colors = [PALETTE.soup, PALETTE.white, PALETTE.bubble, PALETTE.p1, PALETTE.p2];

        return {
          ...worldToStage(x, y),
          size: 5 + (index % 5) * 2,
          color: colors[index % colors.length],
          dx: `${Math.round(Math.cos(index * 1.17) * (18 + (index % 4) * 7))}px`,
          dy: `${Math.round(Math.sin(index * 1.41) * (14 + (index % 3) * 8))}px`,
          duration: `${0.72 + (index % 5) * 0.12}s`,
          delay: -(index * 0.087),
        };
      }),
    []
  );

  const arenaDots = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const x = lerp(ARENA_MIN_X, ARENA_MAX_X, ((index * 37) % 100) / 100);
        const y = lerp(ARENA_MIN_Y, ARENA_MAX_Y, ((index * 61 + 18) % 100) / 100);
        const point = worldToStage(x, y);

        return {
          ...point,
          color: index % 3 === 0 ? PALETTE.soupDeep : index % 3 === 1 ? PALETTE.p1 : PALETTE.p2,
          dx: `${Math.round(Math.sin(index * 1.9) * 18)}px`,
          dy: `${Math.round(Math.cos(index * 1.3) * 14)}px`,
          delay: -(index * 0.14),
        };
      }),
    []
  );

  const soupChunks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        const radius = 0.18 + (index % 4) * 0.12;
        const point = worldToStage(players.bowl.x + Math.cos(angle) * radius, players.bowl.y + Math.sin(angle) * radius * 0.55);

        return {
          ...point,
          size: 10 + (index % 3) * 5,
          rotate: `${Math.round(index * 23)}deg`,
          dx: `${Math.round(Math.cos(angle) * (18 + (index % 4) * 8))}px`,
          dy: `${Math.round(Math.sin(angle) * (20 + (index % 5) * 6))}px`,
          delay: -(index * 0.11),
        };
      }),
    []
  );

  if (!open) return null;

  return (
    <section
      className="soup-ad"
      role="dialog"
      aria-modal="true"
      aria-labelledby="soup-ad-title"
      aria-describedby="soup-ad-description"
    >
      <div className="soup-ad-flash" />
      <div className="soup-ad-ink soup-ad-ink-a" />
      <div className="soup-ad-ink soup-ad-ink-b" />
      <div className="soup-ad-slash soup-ad-slash-a" />
      <div className="soup-ad-slash soup-ad-slash-b" />
      <div className="soup-ad-halftone soup-ad-halftone-a" />
      <div className="soup-ad-halftone soup-ad-halftone-b" />

      <button className="soup-ad-close" type="button" onClick={() => setOpen(false)} aria-label="Enter FindOut" title="Enter FindOut">
        X
      </button>

      <div className="soup-ad-layout">
        <div className="soup-ad-copy">
          <p className="soup-ad-kicker">Team Rocket presents</p>
          <h2 id="soup-ad-title" className="font-bells">
            Soupocalypse
          </h2>
          <p className="soup-ad-tagline">The last bowl is demoing live.</p>
          <p id="soup-ad-description" className="soup-ad-blurb">
            A radar-driven duel for the last bowl of soup in the world.
          </p>

          <div className="soup-ad-actions" aria-label="Soupocalypse actions">
            <a className="soup-ad-primary" href={PROJECT_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
              Open GitHub
            </a>
            <button className="soup-ad-secondary" type="button" onClick={() => setOpen(false)}>
              Enter FindOut
            </button>
          </div>
        </div>

        <div className="soup-ad-stage" aria-hidden="true">
          <div className="soup-ad-stage-shadow" />
          <div className="soup-ad-arena">
            <div className="soup-ad-grid" />
            <span className="soup-ad-split" />

            {arenaDots.map((dot, index) => (
              <span
                className="soup-ad-radar-dot"
                key={index}
                style={
                  {
                    left: `${dot.left}%`,
                    top: `${dot.top}%`,
                    background: dot.color,
                    "--dot-dx": dot.dx,
                    "--dot-dy": dot.dy,
                    animationDelay: `${dot.delay}s`,
                  } as CSSProperties
                }
              />
            ))}

            <span
              className="soup-ad-bubble soup-ad-bubble-left"
              style={
                {
                  ...pointStyle(players.left.x, players.left.y),
                  "--bubble-size": `${Math.round(44 + BUBBLE_RADIUS_M * 78)}px`,
                  "--bubble-cooldown": `${BUBBLE_COOLDOWN}s`,
                } as CSSProperties
              }
            />
            <span
              className="soup-ad-bubble soup-ad-bubble-right"
              style={
                {
                  ...pointStyle(players.right.x, players.right.y),
                  "--bubble-size": `${Math.round(38 + BUBBLE_RADIUS_M * 70)}px`,
                  "--bubble-cooldown": `${BUBBLE_COOLDOWN + 0.22}s`,
                } as CSSProperties
              }
            />

            <img
              className="soup-ad-bowl"
              src="/soupocalypse/last-bowl.png"
              alt=""
              style={pointStyle(players.bowl.x, players.bowl.y)}
              draggable={false}
            />
            {soupChunks.map((chunk, index) => (
              <span
                className="soup-ad-soup-chunk"
                key={index}
                style={
                  {
                    left: `${chunk.left}%`,
                    top: `${chunk.top}%`,
                    "--chunk-size": `${chunk.size}px`,
                    "--chunk-rotate": chunk.rotate,
                    "--chunk-dx": chunk.dx,
                    "--chunk-dy": chunk.dy,
                    animationDelay: `${chunk.delay}s`,
                  } as CSSProperties
                }
              />
            ))}

            <span className="soup-ad-beam" style={beamStyle()} />
            {particles.map((particle, index) => (
              <span
                className="soup-ad-particle"
                key={index}
                style={
                  {
                    left: `${particle.left}%`,
                    top: `${particle.top}%`,
                    "--particle-color": particle.color,
                    "--particle-size": `${particle.size}px`,
                    "--particle-dx": particle.dx,
                    "--particle-dy": particle.dy,
                    "--particle-duration": particle.duration,
                    animationDelay: `${particle.delay}s`,
                  } as CSSProperties
                }
              />
            ))}

            <img
              className="soup-ad-fighter soup-ad-fighter-left"
              src="/soupocalypse/broth-beast.png"
              alt=""
              style={pointStyle(players.left.x, players.left.y)}
              draggable={false}
            />
            <img
              className="soup-ad-fighter soup-ad-fighter-right"
              src="/soupocalypse/noodle-wyrm.png"
              alt=""
              style={pointStyle(players.right.x, players.right.y)}
              draggable={false}
            />

            <span className="soup-ad-impact soup-ad-impact-left">P1 READY</span>
            <span className="soup-ad-impact soup-ad-impact-right">P2 READY</span>
            <span className="soup-ad-impact soup-ad-impact-center font-bells">FIGHT!</span>
          </div>
        </div>
      </div>
    </section>
  );
}
