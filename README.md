# FindOut

FindOut is a mobile-first room finder for a 42-floor building. Log in with Hack Club, set your room and status, then use the floor rail, 2D floor plan, or search bar to see who is home.

Its made to answer the simple question: "Can I drop by?"

## What It Does

- Shows a 42-floor building as a tappable 2D floor plan.
- Searches by room number, name, Slack handle, email, or Slack ID.
- Opens room details with everyone currently listed in that room.
- Lets signed-in users save their floor, room, status, and a short status message.
- Pulls profile info from Hack Club Auth, including Slack username, Slack ID, email, display name, and avatar.

## Statuses

- `Open`: home and welcoming visitors.
- `Away`: not in the room right now.
- `Busy`: in the room, but heads-down.

## Room Format

Rooms are stored as `floor + two-digit room`.

Examples:

- Floor 36, room 12 -> `3612`
- Floor 6, room 4 -> `604`

Each floor supports rooms `1-31`, laid out in the same L-shaped plan.

## Data Model

FindOut stores one `Person` record per Slack ID. A person appears in search and on
the floor plan when their record has a valid floor and room.

There is no bundled demo occupancy data. Without `DATABASE_URL`, the app can still
boot, but it cannot persist rooms and the building will be empty.

## Tech Stack

- Next.js 14 App Router
- Auth.js v5 with Hack Club OIDC
- Prisma 5
- PostgreSQL
- Tailwind CSS
- TypeScript

## Local Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env.local
```

Fill in:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/findout?schema=public"
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
HACKCLUB_CLIENT_ID="..."
HACKCLUB_CLIENT_SECRET="..."
HACKCLUB_SCOPE="openid profile email slack_id"
```

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Register a Hack Club Auth app at <https://auth.hackclub.com> and set the redirect
URI to:

```text
http://localhost:3000/api/auth/callback/hackclub
```

Create or update the database tables:

```bash
npm run db:push
```

Start the app:

```bash
npm run dev
```

Then open <http://localhost:3000>.

## Scripts

```bash
npm run dev      # start the local Next.js server
npm run build    # generate Prisma client and build for production
npm run start    # run the production server
npm run db:push  # push the Prisma schema to Postgres
```

## Deploy

Deploy like a normal Next.js app. Set the same environment variables in your host,
point `DATABASE_URL` at a hosted Postgres database, and add your production callback
URL in Hack Club Auth:

```text
https://your-domain.example/api/auth/callback/hackclub
```

The included Dockerfile builds the app, ships Prisma, and runs the entrypoint on
port `3000`.
