/**
 * Função da homologação SIMULADA, só para o ensaio local. Escrito pelo Claude
 * em 24/11/2026. Carregada com `node --import` no processo da ponte MCP: troca
 * o `fetch` global, de modo que a ponte real roda sem tocar a rede.
 *
 * Aceita só o endereço e as credenciais FICTÍCIOS do ensaio; qualquer outro
 * destino lança erro. Responde no mesmo formato da função
 * ai-core-hermes-sandbox e acrescenta uma linha por chamada em
 * ENSAIO_FUNCAO_REGISTRO (só o identificador sintético).
 */
import { appendFileSync } from "node:fs";
import { ENSAIO } from "./constantes.mjs";

globalThis.fetch = async (url, init) => {
  if (String(url) !== ENSAIO.url || init?.method !== "POST" || init?.redirect !== "error" ||
      init?.headers?.Authorization !== `Bearer ${ENSAIO.jwt}` || init?.headers?.apikey !== ENSAIO.anonKey) {
    throw new Error("ensaio: destino ou credencial fora do previsto");
  }
  const request = JSON.parse(init.body);
  if (Object.keys(request).sort().join(",") !== "requestId,workflow" || request.workflow !== "admission-review") {
    throw new Error("ensaio: corpo fora do previsto");
  }
  if (process.env.ENSAIO_FUNCAO_REGISTRO) {
    appendFileSync(process.env.ENSAIO_FUNCAO_REGISTRO,
      JSON.stringify({ hora: new Date().toISOString(), requestId: request.requestId }) + "\n");
  }
  return new Response(JSON.stringify({
    environment: "synthetic-staging",
    plan: { workflow: "admission-review", version: 1, requestId: request.requestId, dryRun: true },
    simulation: {
      ok: true, mode: "simulation", workflow: "admission-review", requestId: request.requestId,
      requiresMedicalReview: true,
      steps: [
        { tool: "clinical.document", target: "clinicus", status: "simulated" },
        { tool: "clinical.labs", target: "examinus", status: "simulated" },
      ],
    },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};
