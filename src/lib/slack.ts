const SOUP_BASE_CACHE_MS = 60_000;
const DISPLAY_NAME_CACHE_MS = 5 * 60_000;

type SoupBaseCheck =
  | { ok: true }
  | { ok: false; status: number; error: string };

type SlackMembersResponse = {
  ok: boolean;
  members?: string[];
  response_metadata?: { next_cursor?: string };
  error?: string;
};

type SlackUsersListResponse = {
  ok: boolean;
  members?: Array<{
    id: string;
    profile?: { display_name?: string; real_name?: string };
    real_name?: string;
    name?: string;
  }>;
  response_metadata?: { next_cursor?: string };
  error?: string;
};

let cachedMembers: { at: number; members: Set<string> } | null = null;
let cachedDisplayNames: { at: number; names: Map<string, string> } | null = null;

function slackConfig() {
  return {
    token: process.env.SLACK_BOT_TOKEN,
    channel: process.env.SOUP_BASE_CHANNEL_ID,
  };
}

async function fetchSoupBaseMembers(): Promise<Set<string>> {
  const { token, channel } = slackConfig();
  if (!token || !channel) {
    throw new Error("Slack membership check is not configured.");
  }

  const members = new Set<string>();
  let cursor = "";

  do {
    const url = new URL("https://slack.com/api/conversations.members");
    url.searchParams.set("channel", channel);
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Slack membership check failed with HTTP ${res.status}.`);
    }

    const json = (await res.json()) as SlackMembersResponse;
    if (!json.ok) {
      throw new Error(`Slack membership check failed: ${json.error ?? "unknown_error"}.`);
    }

    for (const member of json.members ?? []) members.add(member);
    cursor = json.response_metadata?.next_cursor ?? "";
  } while (cursor);

  cachedMembers = { at: Date.now(), members };
  return members;
}

async function getSoupBaseMembers(): Promise<Set<string>> {
  if (cachedMembers && Date.now() - cachedMembers.at < SOUP_BASE_CACHE_MS) {
    return cachedMembers.members;
  }
  return fetchSoupBaseMembers();
}

export async function checkSoupBaseMembership(slackId: string | null | undefined): Promise<SoupBaseCheck> {
  if (!slackId) return { ok: false, status: 401, error: "unauthenticated" };

  try {
    const members = await getSoupBaseMembers();
    if (!members.has(slackId)) {
      return {
        ok: false,
        status: 403,
        error: "You need to be in the private #soup-base Slack channel to use FindOut.",
      };
    }
    return { ok: true };
  } catch (e) {
    console.error("[slack] soup-base membership check failed:", e);
    return {
      ok: false,
      status: 503,
      error: e instanceof Error ? e.message : "Slack membership check failed.",
    };
  }
}

export async function filterSoupBaseMembers<T extends { slackId: string }>(records: T[]): Promise<T[]> {
  const members = await getSoupBaseMembers();
  return records.filter((record) => members.has(record.slackId));
}

async function fetchSlackDisplayNames(): Promise<Map<string, string>> {
  const { token } = slackConfig();
  if (!token) {
    throw new Error("Slack display name lookup is not configured.");
  }

  const names = new Map<string, string>();
  let cursor = "";

  do {
    const url = new URL("https://slack.com/api/users.list");
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Slack users.list failed with HTTP ${res.status}.`);
    }

    const json = (await res.json()) as SlackUsersListResponse;
    if (!json.ok) {
      throw new Error(`Slack users.list failed: ${json.error ?? "unknown_error"}.`);
    }

    for (const member of json.members ?? []) {
      const displayName =
        member.profile?.display_name?.trim() ||
        member.profile?.real_name?.trim() ||
        member.real_name?.trim() ||
        member.name?.trim();
      if (displayName) names.set(member.id, displayName);
    }
    cursor = json.response_metadata?.next_cursor ?? "";
  } while (cursor);

  cachedDisplayNames = { at: Date.now(), names };
  return names;
}

async function getSlackDisplayNames(): Promise<Map<string, string>> {
  if (cachedDisplayNames && Date.now() - cachedDisplayNames.at < DISPLAY_NAME_CACHE_MS) {
    return cachedDisplayNames.names;
  }
  return fetchSlackDisplayNames();
}

/** Fill in `name` from the Slack workspace directory for any record that doesn't already have one. */
export async function attachSlackDisplayNames<T extends { slackId: string; name: string | null }>(
  records: T[]
): Promise<T[]> {
  if (records.every((r) => r.name)) return records;
  try {
    const names = await getSlackDisplayNames();
    return records.map((r) => (r.name ? r : { ...r, name: names.get(r.slackId) ?? r.name }));
  } catch (e) {
    console.error("[slack] display name lookup failed:", e);
    return records;
  }
}
