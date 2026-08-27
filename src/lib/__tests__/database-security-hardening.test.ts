import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(
  path.resolve(
    __dirname,
    "../../../supabase/migrations/20260827234312_secure_search_cases_isolation.sql",
  ),
  "utf8",
);

describe("search_cases SECURITY DEFINER isolation", () => {
  it("binds case search to auth.uid and rejects a mismatched caller-supplied UUID", () => {
    expect(migration).toContain("caller_uuid := auth.uid()");
    expect(migration).toContain("IF user_uuid IS DISTINCT FROM caller_uuid THEN");
    expect(migration).toContain("WHERE c.user_id = caller_uuid");
  });

  it("does not expose the RPC to anon or PUBLIC", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.search_cases(text, uuid) FROM PUBLIC, anon",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.search_cases(text, uuid) TO authenticated, service_role",
    );
  });

  it("removes direct client execution from the signup-trial trigger function", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.initialize_signup_trial() FROM PUBLIC, anon, authenticated",
    );
  });
});
