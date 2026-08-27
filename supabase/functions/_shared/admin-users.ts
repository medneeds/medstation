/**
 * Pure helper for looking a user up by email through the Supabase Admin API.
 *
 * `auth.admin.listUsers()` defaults to 50 users per page. Calling it without
 * pagination silently reports "user does not exist" for every account beyond
 * the first page, which made checkout completion create duplicate accounts /
 * fail after a successful payment.
 *
 * No imports here on purpose so the logic is unit-testable outside Deno.
 */

export type MinimalAuthUser = { id: string; email?: string | null };

export type ListUsersPage = {
  data: { users: MinimalAuthUser[] } | null;
  error: { message: string } | null;
};

export type ListUsersFn = (params: { page: number; perPage: number }) => Promise<ListUsersPage>;

export const USERS_PER_PAGE = 1000;
export const MAX_USER_PAGES = 20;

/**
 * Walks every page of the admin user list and returns the user whose email
 * matches (case-insensitive), or null. Throws on API errors so the caller can
 * decide explicitly instead of silently treating a failure as "not found".
 */
export async function findUserByEmail(
  listUsers: ListUsersFn,
  email: string,
  perPage: number = USERS_PER_PAGE,
): Promise<MinimalAuthUser | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  for (let page = 1; page <= MAX_USER_PAGES; page++) {
    const { data, error } = await listUsers({ page, perPage });
    if (error) throw new Error(`Falha ao consultar usuários: ${error.message}`);

    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? "").trim().toLowerCase() === target);
    if (match) return match;

    if (users.length < perPage) break; // last page reached
  }

  return null;
}

/** Strong random password used when the account is created on our side. */
export function generateTempPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9]/g, "").slice(0, 28) + "aA1!";
}

/** Never log raw emails: keep only a non-reversible-ish shape for debugging. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  const head = user.slice(0, 1);
  return `${head}***@${domain.replace(/^[^.]*/, (m) => m.slice(0, 1) + "***")}`;
}
