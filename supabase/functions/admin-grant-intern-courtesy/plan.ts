// Pure rule for applying the intern campaign courtesy. Each person has a single
// courtesy_access row (UNIQUE user_id), so an older courtesy (e.g. a legacy
// trial) is updated instead of inserted, and a longer access is never shortened.

export type CourtesyPlan =
  | { action: "insert"; expiresAt: string }
  | { action: "update"; expiresAt: string }
  | { action: "keep"; expiresAt: string | null };

export function planInternCourtesy(
  existing: { expires_at: string | null } | null,
  days: number,
  now = new Date(),
): CourtesyPlan {
  const target = new Date(now.getTime() + days * 86400000);
  if (!existing) return { action: "insert", expiresAt: target.toISOString() };
  if (existing.expires_at === null) return { action: "keep", expiresAt: null };
  const current = new Date(existing.expires_at);
  if (current.getTime() >= target.getTime()) {
    return { action: "keep", expiresAt: existing.expires_at };
  }
  return { action: "update", expiresAt: target.toISOString() };
}
