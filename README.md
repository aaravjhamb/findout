# FindOut

FindOut is a mobile-first room finder for a 42-floor building. Log in with Hack Club, set your room and status, then use the floor rail, 2D floor plan, or search bar to see who is home.

It's made to answer the simple question: "Can I drop by?"

## What It Does

- Shows a 42-floor building as a tappable 2D floor plan.
- Searches by room number, name, Slack handle, email, or Slack ID.
- Opens room details with everyone currently listed in that room.
- Lets signed-in users save their floor, room, status, and a short status message.
- Pulls profile info from Hack Club Auth, including Slack username, Slack ID, email, display name, and avatar.
- Requires membership in the private Slack channel `#soup-base` before someone can
  load rooms, search, or update their own room.

## Statuses

- `Open`: home and welcoming visitors.
- `Away`: not in the room right now.
- `Busy`: in the room, but heads-down.
- `Visiting`: away from your own room and visiting another room.

## Room Format

Rooms are stored as `floor + two-digit room`.

Examples:

- Floor 36, room 12 -> `3612`
- Floor 6, room 4 -> `604`

Each floor supports rooms `1-31`, laid out in the same L-shaped plan.

## Data Model

FindOut stores one `Person` record per Slack ID. A person appears in search and on
the floor plan when their record has a valid floor and room.

There is no bundled demo occupancy data. Production uses `DATABASE_URL`. Local dev
can use `LOCAL_DEV_DB=file` to persist rooms to `.data/findout.local.json`.

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

For local testing without Postgres, use the file-backed dev store:

```env
LOCAL_DEV_DB="file"
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
HACKCLUB_CLIENT_ID="..."
HACKCLUB_CLIENT_SECRET="..."
HACKCLUB_SCOPE="openid profile email slack_id"
SLACK_BOT_TOKEN="xoxb-..."
SOUP_BASE_CHANNEL_ID="G..."
```

If your `.env` points at production or an internal deploy database, keep it there
and put `LOCAL_DEV_DB=file` in `.env.local`. The local scripts load `.env.local`
first, then fall back to `.env` for values like Slack and Hack Club credentials.

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Register a Hack Club Auth app at <https://auth.hackclub.com> and set the redirect
URI to:

```text
http://localhost:3000/api/auth/callback/hackclub
```

Start the app:

```bash
npm run dev:local
```

Then open <http://localhost:3000>.

## Slack Gate

FindOut checks `#soup-base` membership on the server before returning occupancy
data, search results, or accepting profile updates. The check uses Slack's
`conversations.members` API and fails closed if Slack is not configured or cannot
verify the user.

Slack setup:

- Create a Slack app with the `groups:read` bot scope.
- Install it to the workspace.
- Invite the bot to the private `#soup-base` channel.
- Set `SLACK_BOT_TOKEN` to the bot token.
- Set `SOUP_BASE_CHANNEL_ID` to the private channel ID, not the name.

## Scripts

```bash
npm run dev      # start the local Next.js server
npm run dev:local # start Next.js using .env.local over .env
npm run build    # generate Prisma client and build for production
npm run build:local # build using .env.local over .env
npm run start    # run the production server
npm run db:push  # push the Prisma schema to Postgres
npm run db:push:local # push schema using .env.local over .env
npm run db:local:up # optional: start local Docker Postgres
npm run db:local:down # optional: stop local Docker Postgres
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
