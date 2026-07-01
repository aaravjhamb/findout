import { diagnoseAvatar, type AvatarDiagnosis, type AvatarStatus } from "./avatar";
import type { AdminPerson } from "./data";

export type AvatarReportEntry = AvatarDiagnosis & {
  slackId: string;
  nickname: string | null;
  name: string | null;
};

export type AvatarReport = {
  entries: AvatarReportEntry[];
  counts: Record<AvatarStatus, number>;
};

export async function buildAvatarReport(people: AdminPerson[]): Promise<AvatarReport> {
  const entries = await Promise.all(
    people.map(async (p) => {
      const d = await diagnoseAvatar(p.image, p.slackId);
      return { ...d, slackId: p.slackId, nickname: p.nickname, name: p.name };
    })
  );

  const counts: Record<AvatarStatus, number> = { custom: 0, slack: 0, "custom-broken": 0, none: 0 };
  for (const e of entries) counts[e.status]++;

  return { entries, counts };
}
