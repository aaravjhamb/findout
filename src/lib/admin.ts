import { auth } from "@/auth";
import type { Session } from "next-auth";

// Fallback so the panel works out of the box for the project owner even if the
// env var is unset. Override with ADMIN_EMAILS (comma-separated) in production.
const DEFAULT_ADMIN_EMAIL = "admin@yindus-ai.com.au";

export function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAIL;
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

export type AdminCheck =
  | { ok: true; session: Session; email: string }
  | { ok: false; status: number; error: string };

/**
 * Resolves the current session and confirms the signed-in user is an admin.
 * Returns a discriminated result so callers can map it straight to a response.
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401, error: "unauthenticated" };

  const email = session.user.email ?? null;
  if (!isAdminEmail(email)) {
    return { ok: false, status: 403, error: "Admin access required." };
  }
  return { ok: true, session, email: email! };
}
