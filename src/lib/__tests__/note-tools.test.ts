import { describe, it, expect } from "vitest";
import {
  applyToRange,
  collapseBlankLines,
  limitStatus,
  parseCharLimit,
  removeSpecialChars,
  toUpperPtBr,
} from "../noteTools";
import { checkSpellingOnly } from "../../../supabase/functions/note-spellcheck/guard";

describe("limite de caracteres escolhido pelo médico", () => {
  it("sem limite não mostra alerta", () => {
    expect(limitStatus(9999, null)).toBe("none");
  });
  it("abaixo de 90% está ok", () => {
    expect(limitStatus(3599, 4000)).toBe("ok");
  });
  it("a partir de 90% avisa que está perto", () => {
    expect(limitStatus(3600, 4000)).toBe("near");
    expect(limitStatus(4000, 4000)).toBe("near");
  });
  it("acima do limite fica vermelho", () => {
    expect(limitStatus(4001, 4000)).toBe("over");
  });
  it("aceita só números inteiros positivos", () => {
    expect(parseCharLimit("4.000")).toBe(4000);
    expect(parseCharLimit("0")).toBeNull();
    expect(parseCharLimit("abc")).toBeNull();
    expect(parseCharLimit(999999)).toBe(50000);
  });
});

describe("ferramentas rápidas", () => {
  it("MAIÚSCULAS só no trecho selecionado, com acentos", () => {
    const r = applyToRange("hipótese: pneumonia", 10, 19, toUpperPtBr);
    expect(r.text).toBe("hipótese: PNEUMONIA");
  });
  it("sem seleção aplica no texto todo", () => {
    expect(applyToRange("ação", 0, 0, toUpperPtBr).text).toBe("AÇÃO");
  });
  it("limpar linhas deixa no máximo uma linha em branco", () => {
    expect(collapseBlankLines("A\n\n\n\nB  \n\n\nC")).toBe("A\n\nB\n\nC");
  });
  it("remove símbolos decorativos e mantém sinais clínicos", () => {
    expect(removeSpecialChars("**HDA:** PA > 140/90 | FC 88 ✅")).toBe("HDA: PA > 140/90 | FC 88");
    expect(removeSpecialChars("• Dipirona 1 g")).toBe("- Dipirona 1 g");
    expect(removeSpecialChars("falta de ar ✅, com tosse")).toBe("falta de ar, com tosse");
  });
});

describe("correção ortográfica não altera o conteúdo clínico", () => {
  it("aceita só correção de palavras", () => {
    expect(checkSpellingOnly("Paciente com febre a 3 dias", "Paciente com febre há 3 dias").ok).toBe(true);
  });
  it("recusa se algum número mudar", () => {
    expect(checkSpellingOnly("Dipirona 1 g 6/6h", "Dipirona 1 g 8/8h").ok).toBe(false);
  });
  it("recusa se mudar as linhas", () => {
    expect(checkSpellingOnly("A\nB", "A B").ok).toBe(false);
  });
});

import {
  emptyHistory,
  firstDifference,
  recordEdit,
  redoEdit,
  toLowerPtBr,
  toSentenceCasePtBr,
  toTitleCasePtBr,
  undoEdit,
  HISTORY_LIMIT,
} from "../noteTools";

describe("maiúsculas, minúsculas e padrão no trecho selecionado", () => {
  it("minúsculas com acentos", () => {
    expect(applyToRange("HIPÓTESE: PNEUMONIA", 10, 19, toLowerPtBr).text).toBe("HIPÓTESE: pneumonia");
  });
  it("padrão põe maiúscula só no início de cada frase e linha", () => {
    expect(toSentenceCasePtBr("PACIENTE ESTÁVEL. SEM QUEIXAS\nREFERE DOR")).toBe("Paciente estável. Sem queixas\nRefere dor");
  });
  it("padrão mantém siglas clínicas", () => {
    expect(toSentenceCasePtBr("PORTADOR DE HAS E DM2, SPO2 94%, ATB D3")).toBe("Portador de HAS e DM2, SpO2 94%, atb D3");
  });
  it("iniciais maiúsculas sem capitalizar conectivos", () => {
    expect(toTitleCasePtBr("MARIA DA SILVA E SOUZA")).toBe("Maria da Silva e Souza");
  });
});

describe("desfazer e refazer", () => {
  it("desfaz em ordem e refaz o que foi desfeito", () => {
    let h = recordEdit(emptyHistory(), "a", "digitação");
    h = recordEdit(h, "ab", "MAIÚSCULAS");
    const u1 = undoEdit(h, "AB")!;
    expect(u1.content).toBe("ab");
    const u2 = undoEdit(u1.history, u1.content)!;
    expect(u2.content).toBe("a");
    expect(undoEdit(u2.history, u2.content)).toBeNull();
    const r1 = redoEdit(u2.history, u2.content)!;
    expect(r1.content).toBe("ab");
  });
  it("nova edição apaga o que podia ser refeito", () => {
    const h = recordEdit(emptyHistory(), "a", "digitação");
    const u = undoEdit(h, "ab")!;
    const h2 = recordEdit(u.history, "a", "digitação");
    expect(redoEdit(h2, "ax")).toBeNull();
  });
  it(`guarda no máximo ${HISTORY_LIMIT} passos`, () => {
    let h = emptyHistory();
    for (let i = 0; i < 150; i++) h = recordEdit(h, String(i), "digitação");
    expect(h.past.length).toBe(100);
    expect(h.past[0].content).toBe("50");
  });
  it("cursor volta para onde o texto mudou", () => {
    expect(firstDifference("evolução estável", "evolução instável")).toBe(9);
  });
});
