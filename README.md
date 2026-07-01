# FindOut — who's home? 🏠

A mobile-first web app for a 42-floor building. Search a **room**, **Slack handle**,
or **email**, and the app flies you to that room in an interactive 3D building and
shows who's there and their status. People only appear once they opt in and make
their room public.

## Features

- **Explore** — orbit / pinch-zoom a true 3D (Three.js) model of all 42 floors.
- **Exploded view** — tap _Explore → Exploded_ to spread the floors apart.
- **Search** — by room id (`3612`), `@slack-username`, email, name, or Slack ID.
  Selecting a result flies the camera to the room and opens its details.
- **Room details** — who's public in the room, their status, status message, and a
  link to their Slack profile. Rooms can hold multiple people (roommates).
- **Profile** — log in with **Hack Club Auth**, set your floor + room, pick a status,
  and toggle public/private.

### Statuses
- 🟢 **Open** — home & welcoming visitors
- ⚪ **Away** — not in the room
- 🔴 **Busy** — in the room but heads-down (do not disturb)

## Room numbering
Floor + zero-padded room, matching the evacuation sign. Floor 36 room 12 → `3612`;
floor 6 room 4 → `604`. Each floor has 31 rooms (天相/"Tianxiang" 01–31) laid out in
the same L-shape as the floor plan.

## Data
All occupancy is real and comes from the database — there is no mock/demo data.
The building shows only people who have logged in, set their room, and made it
public. An empty database renders an empty building.

```bash
npm install
npm run dev      # http://localhost:3000
```

## Setup (required)

1. Copy env and fill it in:
   ```bash
   cp .env.example .env.local
   ```
2. **Database** — point `DATABASE_URL` at any Postgres (Supabase / Neon / local), then:
   ```bash
   npm run db:push     # create the table
   ```
3. **Hack Club Auth** — register an app at <https://auth.hackclub.com>. It's a standard
   OpenID Connect provider. Set the redirect URI to:
   ```
   {NEXTAUTH_URL}/api/auth/callback/hackclub
   ```
   Put the client id/secret in `.env.local`, and generate `AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   The app requests scopes `openid profile email` (configurable via `HACKCLUB_SCOPE`).
   We read the `slack_id`, `nickname` (Slack username), `name`, `email`, and `picture`
   claims from the userinfo endpoint.

## Tech
Next.js 14 (App Router) · Auth.js v5 (Hack Club OIDC) · Prisma + Postgres ·
Three.js via @react-three/fiber + drei · Tailwind CSS.

## Deploy
Deploy to Vercel, add the same env vars, and set the Hack Club redirect URI to your
production URL. Use a hosted Postgres (Supabase/Neon) for `DATABASE_URL`.
