const SOUP_BASE_CACHE_MS = 60_000;

type SoupBaseCheck =
  | { ok: true }
  | { ok: false; status: number; error: string };

type SlackMembersResponse = {
  ok: boolean;
  members?: string[];
  response_metadata?: { next_cursor?: string };
  error?: string;
};

let cachedMembers: { at: number; members: Set<string> } | null = null;

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
