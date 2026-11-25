/**
 * Teste LOCAL do mecanismo de assinatura do webhook do Stripe.
 * Escrito pelo Claude em 24/11/2026.
 *
 * Usa a mesma biblioteca e a mesma chamada da função stripe-webhook
 * (stripe@18.5.0, `webhooks.constructEventAsync` com SubtleCrypto), com um
 * segredo fictício gerado na hora. Não fala com o Stripe, não usa chave
 * nenhuma e não exercita a função publicada: prova só que a verificação de
 * assinatura aceita o que deve e recusa o que deve.
 *
 * Uso: ops/stripe-sandbox/rodar-teste-local-webhook.sh
 */
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

const { default: Stripe } = await import(pathToFileURL(process.env.STRIPE_ENTRY).href);
// A chave abaixo é um texto fictício: nenhuma requisição é feita.
const stripe = new Stripe("sk_test_ficticia_sem_uso_em_rede", { apiVersion: "2025-08-27.basil" });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const secret = `whsec_${randomBytes(24).toString("hex")}`;
const otherSecret = `whsec_${randomBytes(24).toString("hex")}`;

const payload = JSON.stringify({
  id: "evt_test_ficticio_001",
  object: "event",
  type: "checkout.session.completed",
  livemode: false,
  data: { object: { id: "cs_test_ficticio_001", object: "checkout.session", mode: "payment" } },
});

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "passou  " : "FALHOU  "} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures += 1;
};
const verify = async (body, header, key) => {
  try {
    const event = await stripe.webhooks.constructEventAsync(body, header, key, undefined, cryptoProvider);
    return { ok: true, event };
  } catch (e) {
    return { ok: false, type: e?.type ?? e?.name };
  }
};
const header = (opts = {}) =>
  stripe.webhooks.generateTestHeaderStringAsync({ payload, secret, cryptoProvider, ...opts });

let r = await verify(payload, await header(), secret);
check("assinatura válida é aceita", r.ok && r.event.id === "evt_test_ficticio_001" && r.event.livemode === false);
r = await verify(payload.replace("cs_test_ficticio_001", "cs_test_adulterado"), await header(), secret);
check("corpo adulterado é recusado", !r.ok, String(r.type));
r = await verify(payload, await header(), otherSecret);
check("segredo errado é recusado", !r.ok, String(r.type));
r = await verify(payload, await header({ timestamp: Math.floor(Date.now() / 1000) - 3600 }), secret);
check("assinatura com mais de 5 minutos é recusada", !r.ok, String(r.type));
r = await verify(payload, "t=1,v1=00", secret);
check("cabeçalho malformado é recusado", !r.ok, String(r.type));

console.log(failures === 0 ? "\nRESULTADO: passou (teste local; não é checkout validado)" : `\nRESULTADO: falhou (${failures})`);
process.exit(failures === 0 ? 0 : 1);
