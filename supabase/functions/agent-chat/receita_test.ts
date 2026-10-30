import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isReceitaRequest, RECEITA_FINAL_RULES } from "./receita.ts";

Deno.test("modo ligado ou gatilho de texto ativa a receita", () => {
  assertEquals(isReceitaRequest(true, "amoxicilina"), true);
  assertEquals(isReceitaRequest(false, "MODO RECEITA: dipirona"), true);
  assertEquals(isReceitaRequest(false, "modo receita - dipirona"), true);
  assertEquals(isReceitaRequest(false, "qual a dose de dipirona?"), false);
});
Deno.test("trava final proíbe análise e confiança", () => {
  assert(RECEITA_FINAL_RULES.includes("CONFIANÇA GERAL"));
  assert(RECEITA_FINAL_RULES.includes("começa diretamente pela linha \"RECEITUÁRIO\""));
});
