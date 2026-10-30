import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cleanDocument, documentPromptFor, parseClinicalContext, readResponsesText } from "./clinical-context.ts";

Deno.test("contexto inválido volta para consultório", () => {
  assertEquals(parseClinicalContext("x"), "consultorio");
  assertEquals(parseClinicalContext("emergencia_admissao"), "emergencia_admissao");
});
Deno.test("cada contexto usa seu modelo", () => {
  assert(documentPromptFor("emergencia_rapida").includes("AVALIAÇÃO RÁPIDA"));
  assert(documentPromptFor("emergencia_admissao").includes("INDICAÇÃO DE INTERNAÇÃO"));
  assert(documentPromptFor("consultorio").includes("QUEIXA PRINCIPAL:"));
});
Deno.test("admissão exige acolhimento familiar", () => {
  assert(documentPromptFor("emergencia_admissao").includes("acolhimento do paciente e da família"));
});
Deno.test("remove markdown e lê resposta", () => {
  assertEquals(cleanDocument("## **QP:**\nDor"), "QP:\nDor");
  assertEquals(readResponsesText({ output: [{ content: [{ text: "ok" }] }] }), "ok");
});
