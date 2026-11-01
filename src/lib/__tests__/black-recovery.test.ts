import { describe, expect, it } from "vitest";
import {
  abandonedCheckouts,
  planRecoveryEmails,
  recoveryContinueUrl,
  recoveryStepDue,
  type RecoveryAttempt,
} from "../../../supabase/functions/_shared/black-recovery";
import { BLACK_OFFER } from "../pricingSchedule";

const H = 3_600_000;
const NOW = Date.parse("2026-11-10T15:00:00.000Z");
const ago = (hours: number) => new Date(NOW - hours * H).toISOString();
const offer = { startsAt: BLACK_OFFER.startsAt, endsAt: BLACK_OFFER.endsAt };

function plan(input: {
  leads?: { email: string; source?: string; created_at: string }[];
  attempts?: RecoveryAttempt[];
  sent?: Record<string, string[]>;
  suppressed?: string[];
  purchased?: string[];
  now?: number;
}) {
  const now = input.now ?? NOW;
  const abandoned = abandonedCheckouts({
    leads: (input.leads ?? []).map((l) => ({ source: "black_checkout", ...l })),
    attempts: input.attempts ?? [],
    now,
  });
  return planRecoveryEmails({
    abandoned,
    offer,
    sent: new Map(Object.entries(input.sent ?? {})),
    suppressed: new Set(input.suppressed ?? []),
    purchased: new Set(input.purchased ?? []),
    now,
  });
}

describe("lembretes da Black: janelas", () => {
  it("1º e-mail entre 1 h e 3 h, 2º entre 24 h e 30 h depois da última tentativa", () => {
    expect(recoveryStepDue(ago(0.5), NOW)).toBeNull();
    expect(recoveryStepDue(ago(1), NOW)).toBe("1h");
    expect(recoveryStepDue(ago(2.9), NOW)).toBe("1h");
    expect(recoveryStepDue(ago(3), NOW)).toBeNull();
    expect(recoveryStepDue(ago(12), NOW)).toBeNull();
    expect(recoveryStepDue(ago(24), NOW)).toBe("24h");
    expect(recoveryStepDue(ago(29.9), NOW)).toBe("24h");
    expect(recoveryStepDue(ago(30), NOW)).toBeNull();
    expect(recoveryStepDue(null, NOW)).toBeNull();
  });

  it("conta a partir da tentativa mais recente (clique ou pagamento aberto)", () => {
    const out = plan({
      leads: [{ email: "Dra@Clinica.com ", created_at: ago(26) }],
      attempts: [{ id: "p1", email: "dra@clinica.com", status: "expired", created_at: ago(1.5) }],
    });
    expect(out).toEqual([expect.objectContaining({ email: "dra@clinica.com", step: "1h" })]);
  });

  it("só durante a oferta", () => {
    const leads = [{ email: "a@b.com", created_at: "2026-11-30T23:00:00.000Z" }];
    expect(plan({ leads, now: Date.parse("2026-12-01T01:00:00.000Z") })).toHaveLength(1);
    expect(plan({ leads, now: Date.parse("2026-12-01T03:30:00.000Z") })).toEqual([]);
    const early = [{ email: "a@b.com", created_at: "2026-10-31T20:00:00.000Z" }];
    expect(plan({ leads: early, now: Date.parse("2026-10-31T22:00:00.000Z") })).toEqual([]);
  });
});

describe("lembretes da Black: quem não recebe", () => {
  const leads = [{ email: "medico@gmail.com", created_at: ago(2) }];

  it("quem comprou a Black (mesmo depois de uma tentativa falha) sai da lista", () => {
    const out = plan({
      leads,
      attempts: [
        { id: "p1", email: "medico@gmail.com", status: "failed", created_at: ago(2) },
        { id: "p2", email: "MEDICO@gmail.com", status: "paid", created_at: ago(1.5) },
      ],
    });
    expect(out).toEqual([]);
  });

  it("quem tem anual pago ou assinatura ativa (vem do banco) não recebe", () => {
    expect(plan({ leads, purchased: ["medico@gmail.com"] })).toEqual([]);
  });

  it("descadastrado ou bloqueado não recebe", () => {
    expect(plan({ leads, suppressed: ["medico@gmail.com"] })).toEqual([]);
  });

  it("nunca a mesma etapa duas vezes, mas a 2ª etapa sai mesmo se a 1ª já foi", () => {
    expect(plan({ leads, sent: { "medico@gmail.com": ["1h"] } })).toEqual([]);
    const later = [{ email: "medico@gmail.com", created_at: ago(25) }];
    expect(plan({ leads: later, sent: { "medico@gmail.com": ["1h"] } })[0]?.step).toBe("24h");
    expect(plan({ leads: later, sent: { "medico@gmail.com": ["1h", "24h"] } })).toEqual([]);
  });

  it("endereços de teste e o do dono ficam de fora", () => {
    const out = plan({
      leads: [
        { email: "qa@example.com", created_at: ago(2) },
        { email: "x@teste.com", created_at: ago(2) },
        { email: "arturaugustosb@gmail.com", created_at: ago(2) },
      ],
    });
    expect(out).toEqual([]);
  });

  it("boleto ainda no prazo não conta como abandono; lista VIP também não", () => {
    const out = plan({
      leads: [{ email: "vip@gmail.com", source: "black_vip", created_at: ago(2) }],
      attempts: [{
        id: "b1", email: "boleto@gmail.com", status: "pending", payment_method: "boleto",
        created_at: ago(2), boleto_expires_at: ago(-48),
      }],
    });
    expect(out).toEqual([]);
  });
});

describe("lembretes da Black: link para continuar", () => {
  it("usa o link de retomada do Stripe quando existe e ainda vale", () => {
    const attempt = { id: "p", email: "a@b.com", status: "expired", created_at: ago(25), recovery_url: "https://checkout.stripe.com/c/pay/cs_live_x" };
    expect(recoveryContinueUrl(attempt, "24h", NOW)).toBe("https://checkout.stripe.com/c/pay/cs_live_x");
    expect(recoveryContinueUrl({ ...attempt, created_at: ago(24 * 40) }, "24h", NOW)).toContain("/black?");
    expect(recoveryContinueUrl({ ...attempt, recovery_url: "https://evil.example/x" }, "24h", NOW)).toContain("/black?");
  });

  it("senão manda para /black com UTM da etapa", () => {
    expect(recoveryContinueUrl(null, "1h", NOW)).toBe(
      "https://medstation-ai.com.br/black?utm_source=email&utm_medium=recovery&utm_campaign=black_2026&utm_content=1h",
    );
    expect(recoveryContinueUrl(null, "24h", NOW)).toContain("utm_content=24h");
  });
});
