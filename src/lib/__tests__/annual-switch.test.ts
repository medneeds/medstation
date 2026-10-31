import { describe, expect, it } from "vitest";
import {
  allowsPurchaseWithActiveSubscription,
  laterDate,
  planMonthlyHandoff,
} from "../../../supabase/functions/_shared/annual-switch";
import { boletoReminderStage } from "../../../supabase/functions/_shared/boleto-reminder";

const NOW = new Date("2026-11-05T15:00:00.000Z"); // 12h em Brasília

describe("troca do mensal para o anual sem cobrança dupla", () => {
  it("assinante mensal pode comprar o anual à vista; o mensal não bloqueia", () => {
    expect(allowsPurchaseWithActiveSubscription("annual_12m")).toBe(true);
    expect(allowsPurchaseWithActiveSubscription("monthly_30d")).toBe(false);
  });

  it("mensal em dia encerra no fim do período pago e o anual começa depois dele", () => {
    const plan = planMonthlyHandoff(
      [{ id: "sub_1", status: "active", currentPeriodEnd: "2026-11-20T10:00:00.000Z" }],
      NOW,
    );
    expect(plan.cancelAtPeriodEnd).toEqual(["sub_1"]);
    expect(plan.cancelNow).toEqual([]);
    expect(plan.accessFrom).toBe("2026-11-20T10:00:00.000Z");
  });

  it("mensal com cobrança em aberto encerra na hora e não adia o anual", () => {
    const plan = planMonthlyHandoff(
      [{ id: "sub_2", status: "past_due", currentPeriodEnd: "2026-11-20T10:00:00.000Z" }],
      NOW,
    );
    expect(plan.cancelNow).toEqual(["sub_2"]);
    expect(plan.cancelAtPeriodEnd).toEqual([]);
    expect(plan.accessFrom).toBeNull();
  });

  it("mensal já marcado para encerrar não é alterado de novo, mas os dias pagos contam", () => {
    const plan = planMonthlyHandoff(
      [{ id: "sub_3", status: "active", currentPeriodEnd: "2026-11-10T00:00:00.000Z", cancelAtPeriodEnd: true }],
      NOW,
    );
    expect(plan.cancelAtPeriodEnd).toEqual([]);
    expect(plan.accessFrom).toBe("2026-11-10T00:00:00.000Z");
  });

  it("assinatura cancelada é ignorada", () => {
    const plan = planMonthlyHandoff([{ id: "sub_4", status: "canceled", currentPeriodEnd: null }], NOW);
    expect(plan).toEqual({ cancelAtPeriodEnd: [], cancelNow: [], accessFrom: null });
  });

  it("vale a data mais distante entre o acesso atual e o mensal", () => {
    expect(laterDate("2026-11-10T00:00:00.000Z", "2026-11-20T00:00:00.000Z")).toBe("2026-11-20T00:00:00.000Z");
    expect(laterDate(null, "2026-11-20T00:00:00.000Z")).toBe("2026-11-20T00:00:00.000Z");
    expect(laterDate(null, null)).toBeNull();
  });
});

describe("lembrete do boleto", () => {
  // Boleto gerado 1º/11 às 12h de Brasília, vence 4/11 às 23h59 de Brasília.
  const createdAt = "2026-11-01T15:00:00.000Z";
  const expiresAt = "2026-11-05T02:59:00.000Z";

  it("não lembra antes de 20 horas", () => {
    expect(boletoReminderStage({ createdAt, expiresAt, sent: [], now: new Date("2026-11-02T10:00:00.000Z") })).toBeNull();
  });

  it("lembra no dia seguinte", () => {
    expect(boletoReminderStage({ createdAt, expiresAt, sent: [], now: new Date("2026-11-02T13:00:00.000Z") })).toBe("day_after");
  });

  it("não repete o lembrete do dia seguinte", () => {
    expect(boletoReminderStage({ createdAt, expiresAt, sent: ["day_after"], now: new Date("2026-11-03T13:00:00.000Z") })).toBeNull();
  });

  it("lembra no último dia, mesmo se já lembrou no dia seguinte", () => {
    expect(boletoReminderStage({ createdAt, expiresAt, sent: ["day_after"], now: new Date("2026-11-04T12:00:00.000Z") })).toBe("last_day");
  });

  it("não envia de madrugada", () => {
    expect(boletoReminderStage({ createdAt, expiresAt, sent: [], now: new Date("2026-11-04T09:00:00.000Z") })).toBeNull();
  });

  it("não envia depois do vencimento", () => {
    expect(boletoReminderStage({ createdAt, expiresAt, sent: [], now: new Date("2026-11-05T13:00:00.000Z") })).toBeNull();
  });
});
