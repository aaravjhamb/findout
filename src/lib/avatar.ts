export function avatarUrl(slackId: string | null | undefined): string | null {
  if (!slackId) return null;
  return `https://cachet.dunkirk.sh/users/${encodeURIComponent(slackId)}/r`;
}

const CACHET_BASE = "https://cachet.dunkirk.sh/";

const CACHET_PLACEHOLDER = "https://l4.dunkirk.sh/i/5DjfoBI58Pfw.webp";

type Cached = { url: string | null; at: number };
const resolveCache = new Map<string, Cached>();
const badImageCache = new Map<string, number>();
const RESOLVE_TTL = 10 * 60 * 1000;
const BAD_IMAGE_TTL = 10 * 60 * 1000;

async function imageLooksUsable(url: string): Promise<boolean> {
  const now = Date.now();
  const badAt = badImageCache.get(url);
  if (badAt && now - badAt < BAD_IMAGE_TTL) return false;

  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    const type = res.headers.get("content-type") ?? "";
    const ok = res.ok && (!type || type.startsWith("image/"));
    if (!ok) badImageCache.set(url, now);
    return ok;
  } catch {
    badImageCache.set(url, now);
    return false;
  }
}

export async function resolveAvatar(
  image: string | null | undefined,
  slackId: string | null | undefined
): Promise<string | null> {
  const url = image ?? avatarUrl(slackId);
  if (!url) return null;
  if (!url.startsWith(CACHET_BASE)) {
    const now = Date.now();
    const hit = resolveCache.get(url);
    if (hit && now - hit.at < RESOLVE_TTL) return hit.url;
    if (await imageLooksUsable(url)) {
      resolveCache.set(url, { url, at: now });
      return url;
    }
    resolveCache.set(url, { url: null, at: now });
    const fallback = avatarUrl(slackId);
    if (!fallback || fallback === url) return null;
    return resolveAvatar(fallback, slackId);
  }

  const now = Date.now();
  const hit = resolveCache.get(url);
  if (hit && now - hit.at < RESOLVE_TTL) return hit.url;

  try {
    const res = await fetch(url, { redirect: "manual" });
    const loc = res.headers.get("location");
    const resolved = loc ? (loc === CACHET_PLACEHOLDER ? null : loc) : url;

    if (resolved !== null) resolveCache.set(url, { url: resolved, at: now });
    return resolved;
  } catch {
    return url;
  }
}
