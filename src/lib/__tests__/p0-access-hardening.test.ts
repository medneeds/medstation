import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  summarizeSubscriptions,
  resolveSubscriptionEnd,
  type MinimalSubscription,
} from "../../../supabase/functions/_shared/stripe-access";
import { findUserByEmail } from "../../../supabase/functions/_shared/admin-users";

describe("confirmação de e-mail", () => {
  it("não faz signOut ao voltar com ?confirmed=1", () => {
    const auth = readFileSync(path.resolve(__dirname, "../../pages/Auth.tsx"), "utf8");
    const confirmBlock = auth.slice(auth.indexOf("justConfirmed"), auth.indexOf("const { data: { subscription } }"));
    expect(confirmBlock).not.toContain("signOut");
  });
});

describe("acesso com múltiplos Stripe customers", () => {
  const end = 1893456000; // 2030
  const sub = (status: string, product: string, periodEnd = end): MinimalSubscription => ({
    status,
    items: { data: [{ current_period_end: periodEnd, price: { product } }] },
  });

  it("usa current_period_end do item (API atual)", () => {
    expect(resolveSubscriptionEnd(sub("active", "prod_x"))).toBe(new Date(end * 1000).toISOString());
  });

  it("encontra assinatura válida mesmo quando não é do primeiro customer", () => {
    const summary = summarizeSubscriptions([
      sub("canceled", "prod_old"),
      sub("active", "prod_new"),
    ]);
    expect(summary?.hasHealthy).toBe(true);
    expect(summary?.productIds).toEqual(["prod_new"]);
  });

  it("retorna null quando nenhuma assinatura é válida", () => {
    expect(summarizeSubscriptions([sub("canceled", "prod_old")])).toBeNull();
  });

  it("marca past_due sem considerar saudável", () => {
    const summary = summarizeSubscriptions([sub("past_due", "prod_x")]);
    expect(summary?.hasPastDue).toBe(true);
    expect(summary?.hasHealthy).toBe(false);
  });
});

describe("complete-checkout com mais de 50 usuários", () => {
  const makeUsers = (n: number, offset = 0) =>
    Array.from({ length: n }, (_, i) => ({ id: `u${offset + i}`, email: `user${offset + i}@x.com` }));

  it("pagina até encontrar usuário além da primeira página", async () => {
    const listUsers = vi.fn(async ({ page, perPage }: { page: number; perPage: number }) => {
      if (page === 1) return { data: { users: makeUsers(perPage) }, error: null };
      return { data: { users: [{ id: "target", email: "alvo@x.com" }] }, error: null };
    });

    const found = await findUserByEmail(listUsers, "ALVO@x.com", 60);
    expect(found?.id).toBe("target");
    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(listUsers.mock.calls[0][0]).toEqual({ page: 1, perPage: 60 });
  });

  it("propaga erro da API em vez de tratar como inexistente", async () => {
    const listUsers = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    await expect(findUserByEmail(listUsers, "a@b.com")).rejects.toThrow(/boom/);
  });

  it("retorna null quando o usuário não existe", async () => {
    const listUsers = vi.fn(async () => ({ data: { users: makeUsers(3) }, error: null }));
    expect(await findUserByEmail(listUsers, "nao@existe.com", 1000)).toBeNull();
  });
});
