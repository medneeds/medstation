import { describe, expect, it } from "vitest";
import {
  classifyCandidate,
  firstName,
  inboundIntent,
  isPermanentFailure,
  isWithinSendWindow,
  localDayStart,
  mergeMessageStatus,
  nextStepDue,
  normalizeBrMobile,
  planRecoveryRun,
  recoveryFunnel,
  recoveryLink,
  templateSlug,
  type RecoveryCandidate,
  type RecoveryContact,
} from "../../../supabase/functions/_shared/whatsapp-recovery";

const H = 3_600_000;
const D = 24 * H;
// Terça-feira, 10/11/2026, 11h em Fortaleza (14h UTC): dentro do horário.
const NOW = Date.parse("2026-11-10T14:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const cand = (over: Partial<RecoveryCandidate> = {}): RecoveryCandidate => ({
  userId: "u1",
  email: "medico@gmail.com",
  fullName: "Ana Souza",
  phone: "(98) 98100-1234",
  professionalStatus: "medico",
  isAdmin: false,
  isPaying: false,
  hasCourtesy: false,
  everPaid: false,
  trialEndsAt: ago(3 * D),
  ...over,
});

const contact = (over: Partial<RecoveryContact> = {}): RecoveryContact => ({
  id: "c1",
  user_id: "u1",
  phone_e164: "+5598981001234",
  segment: "trial_expired",
  status: "active",
  last_step: 1,
  last_sent_at: ago(3 * D),
  entered_at: ago(3 * D),
  ...over,
});

describe("normalizeBrMobile", () => {
  it("aceita celulares em vários formatos", () => {
    expect(normalizeBrMobile("(98) 98100-1234")).toBe("+5598981001234");
    expect(normalizeBrMobile("+55 98 98100-1234")).toBe("+5598981001234");
    expect(normalizeBrMobile("5598981001234")).toBe("+5598981001234");
    expect(normalizeBrMobile("098981001234")).toBe("+5598981001234");
  });
  it("recusa fixo, curto, DDD inválido e número repetido", () => {
    expect(normalizeBrMobile("(98) 3221-1234")).toBeNull();
    expect(normalizeBrMobile("981001234")).toBeNull();
    expect(normalizeBrMobile("(01) 98100-1234")).toBeNull();
    expect(normalizeBrMobile("(98) 99999-9999")).toBeNull();
    expect(normalizeBrMobile(null)).toBeNull();
  });
});

describe("classifyCandidate", () => {
  const cls = (over: Partial<RecoveryCandidate>, opts = {}) => classifyCandidate(cand(over), { now: NOW, ...opts });

  it("teste expirado, médico, com celular e e-mail entra", () => {
    expect(cls({})).toEqual({ eligible: true, segment: "trial_expired", phoneE164: "+5598981001234" });
  });
  it("ex-assinante entra no segmento próprio mesmo sem teste", () => {
    expect(cls({ everPaid: true, trialEndsAt: null })).toMatchObject({ eligible: true, segment: "ex_subscriber" });
  });
  it.each([
    [{ isAdmin: true }, "admin"],
    [{ isPaying: true }, "paying"],
    [{ hasCourtesy: true }, "courtesy"],
    [{ professionalStatus: "interno" }, "not_doctor"],
    [{ professionalStatus: null }, "not_doctor"],
    [{ email: null }, "no_email"],
    [{ email: "x@example.com" }, "skip_list"],
    [{ email: "arturaugustosb@gmail.com" }, "skip_list"],
    [{ phone: "3221-1234" }, "no_phone"],
    [{ trialEndsAt: null }, "no_trial"],
    [{ trialEndsAt: new Date(NOW + D).toISOString() }, "trial_active"],
    [{ trialEndsAt: ago(5 * H) }, "trial_too_recent"],
    [{ trialEndsAt: ago(400 * D) }, "trial_too_old"],
  ] as [Partial<RecoveryCandidate>, string][])("%o → %s", (over, reason) => {
    expect(cls(over)).toEqual({ eligible: false, reason });
  });
  it("quem pediu para sair não volta", () => {
    expect(cls({}, { optedOutPhones: new Set(["+5598981001234"]) })).toEqual({ eligible: false, reason: "opted_out" });
  });
  it("pagante e cortesia vencem qualquer outra regra", () => {
    expect(cls({ isPaying: true, professionalStatus: "interno" })).toEqual({ eligible: false, reason: "paying" });
    expect(cls({ hasCourtesy: true, everPaid: true })).toEqual({ eligible: false, reason: "courtesy" });
  });
});

describe("horário de envio (Fortaleza)", () => {
  it("seg–sáb das 9h às 19h59", () => {
    expect(isWithinSendWindow(Date.parse("2026-11-10T12:00:00Z"))).toBe(true); // 9h
    expect(isWithinSendWindow(Date.parse("2026-11-10T11:59:00Z"))).toBe(false); // 8h59
    expect(isWithinSendWindow(Date.parse("2026-11-10T22:59:00Z"))).toBe(true); // 19h59
    expect(isWithinSendWindow(Date.parse("2026-11-10T23:00:00Z"))).toBe(false); // 20h
    expect(isWithinSendWindow(Date.parse("2026-11-14T14:00:00Z"))).toBe(true); // sábado
    expect(isWithinSendWindow(Date.parse("2026-11-15T14:00:00Z"))).toBe(false); // domingo
  });
  it("dia começa à meia-noite local", () => {
    expect(new Date(localDayStart(NOW)).toISOString()).toBe("2026-11-10T03:00:00.000Z");
    expect(new Date(localDayStart(Date.parse("2026-11-10T02:00:00Z"))).toISOString()).toBe("2026-11-09T03:00:00.000Z");
  });
});

describe("nextStepDue", () => {
  it("etapa 2 três dias depois da 1; etapa 3 quatro dias depois da 2", () => {
    expect(nextStepDue(contact({ last_step: 1, last_sent_at: ago(3 * D) }), NOW)).toBe(2);
    expect(nextStepDue(contact({ last_step: 1, last_sent_at: ago(2 * D) }), NOW)).toBeNull();
    expect(nextStepDue(contact({ last_step: 2, last_sent_at: ago(4 * D) }), NOW)).toBe(3);
    expect(nextStepDue(contact({ last_step: 2, last_sent_at: ago(3 * D) }), NOW)).toBeNull();
    expect(nextStepDue(contact({ last_step: 3 }), NOW)).toBeNull();
    expect(nextStepDue(contact({ last_step: 0, last_sent_at: null }), NOW)).toBe(1);
  });
  it("só contatos ativos recebem", () => {
    for (const status of ["replied", "converted", "opted_out", "finished", "failed", "paused"] as const) {
      expect(nextStepDue(contact({ status }), NOW)).toBeNull();
    }
  });
});

describe("planRecoveryRun", () => {
  const base = { contacts: [] as RecoveryContact[], optedOutPhones: new Set<string>(), enrolledToday: 0, now: NOW };

  it("inscreve elegíveis até o limite diário e ignora quem já está na base", () => {
    const candidates = Array.from({ length: 5 }, (_, i) =>
      cand({ userId: `u${i}`, phone: `(98) 98100-000${i}` }));
    const plan = planRecoveryRun({ ...base, candidates, enrolledToday: 1, dailyNewCap: 3 });
    expect(plan.enroll.map((e) => e.userId)).toEqual(["u0", "u1"]);

    const again = planRecoveryRun({
      ...base,
      candidates,
      contacts: [contact({ id: "c0", user_id: "u0", phone_e164: "+5598981000000", last_sent_at: ago(H) })],
    });
    expect(again.enroll.map((e) => e.userId)).not.toContain("u0");
  });

  it("mesmo celular em duas contas recebe uma vez só", () => {
    const plan = planRecoveryRun({ ...base, candidates: [cand({ userId: "a" }), cand({ userId: "b" })] });
    expect(plan.enroll).toHaveLength(1);
  });

  it("quem virou pagante para na hora, inclusive pausado ou em conversa", () => {
    const plan = planRecoveryRun({
      ...base,
      candidates: [cand({ userId: "u1", isPaying: true }), cand({ userId: "u2", isPaying: true })],
      contacts: [contact(), contact({ id: "c2", user_id: "u2", status: "replied" })],
    });
    expect(plan.close).toEqual([
      { contactId: "c1", status: "converted" },
      { contactId: "c2", status: "converted" },
    ]);
    expect(plan.send).toEqual([]);
  });

  it("envia a próxima etapa e fecha cadência concluída", () => {
    const plan = planRecoveryRun({
      ...base,
      candidates: [cand()],
      contacts: [
        contact(),
        contact({ id: "c3", user_id: "u3", phone_e164: "+5598981009999", last_step: 3, last_sent_at: ago(5 * D) }),
      ],
    });
    expect(plan.send).toEqual([{ contactId: "c1", step: 2 }]);
    expect(plan.close).toEqual([{ contactId: "c3", status: "finished" }]);
  });

  it("fora do horário não envia nem inscreve, mas registra conversões", () => {
    const night = Date.parse("2026-11-11T02:00:00Z"); // 23h
    const plan = planRecoveryRun({
      ...base,
      now: night,
      candidates: [cand({ userId: "new", phone: "(98) 98100-7777" }), cand({ isPaying: true })],
      contacts: [contact()],
    });
    expect(plan.enroll).toEqual([]);
    expect(plan.send).toEqual([]);
    expect(plan.close).toEqual([{ contactId: "c1", status: "converted" }]);
  });

  it("pedido de saída por outro canal encerra o contato", () => {
    const plan = planRecoveryRun({
      ...base,
      candidates: [cand()],
      contacts: [contact()],
      optedOutPhones: new Set(["+5598981001234"]),
    });
    expect(plan.close).toEqual([{ contactId: "c1", status: "opted_out" }]);
  });
});

describe("modelos e links", () => {
  it("slug por segmento e etapa", () => {
    expect(templateSlug("trial_expired", 1)).toBe("medstation_recupera_teste_1");
    expect(templateSlug("ex_subscriber", 3)).toBe("medstation_recupera_ex_3");
  });
  it("primeiro nome limpo", () => {
    expect(firstName("Dra. maria clara")).toBe("Maria");
    expect(firstName("JOÃO")).toBe("João");
    expect(firstName("")).toBe("doutor(a)");
    expect(firstName("a@b.com")).toBe("doutor(a)");
  });
  it("link com UTM do WhatsApp", () => {
    const url = new URL(recoveryLink("trial_expired", 2));
    expect(url.pathname).toBe("/black");
    expect(url.searchParams.get("utm_source")).toBe("whatsapp");
    expect(url.searchParams.get("utm_content")).toBe("etapa_2");
  });
});

describe("webhook", () => {
  it("reconhece pedido de saída só quando é a mensagem inteira", () => {
    expect(inboundIntent("SAIR")).toBe("opt_out");
    expect(inboundIntent(" parar. ")).toBe("opt_out");
    expect(inboundIntent("Não tenho interesse")).toBe("opt_out");
    expect(inboundIntent("", "nao_interesse")).toBe("opt_out");
    expect(inboundIntent("Quero saber como sair do plantão mais cedo")).toBe("reply");
    expect(inboundIntent("Quanto custa?")).toBe("reply");
  });
  it("status nunca volta atrás", () => {
    expect(mergeMessageStatus("read", "delivered")).toBe("read");
    expect(mergeMessageStatus("sent", "delivered")).toBe("delivered");
    expect(mergeMessageStatus("delivered", "failed")).toBe("delivered");
    expect(mergeMessageStatus("accepted", "failed")).toBe("failed");
    expect(mergeMessageStatus("failed", "read")).toBe("failed");
    expect(mergeMessageStatus("sent", "whatever")).toBe("sent");
  });
  it("erros permanentes conhecidos", () => {
    expect(isPermanentFailure("131026")).toBe(true);
    expect(isPermanentFailure("130429")).toBe(false);
    expect(isPermanentFailure(null)).toBe(false);
  });
});

describe("recoveryFunnel", () => {
  it("conta pessoas alcançadas, não mensagens", () => {
    const f = recoveryFunnel(
      [{ id: "a", status: "active" }, { id: "b", status: "converted" }, { id: "c", status: "opted_out" }],
      [
        { contact_id: "a", step: 1, status: "read" },
        { contact_id: "a", step: 2, status: "delivered" },
        { contact_id: "b", step: 1, status: "delivered" },
        { contact_id: "c", step: 1, status: "failed" },
      ],
    );
    expect(f).toMatchObject({ contacts: 3, messagesSent: 3, messagesFailed: 1, delivered: 2, read: 1, converted: 1, optedOut: 1 });
    expect(f.conversionRate).toBeCloseTo(1 / 3);
  });
});
