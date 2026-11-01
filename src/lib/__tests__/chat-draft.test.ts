import { describe, expect, it } from "vitest";
import { chatDraftKey, clearChatDraft, draftToRestore, readChatDraft, writeChatDraft } from "@/components/chat/chatDraft";

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
};

const brokenStorage = {
  getItem: () => { throw new Error("bloqueado"); },
  setItem: () => { throw new Error("cheio"); },
  removeItem: () => { throw new Error("bloqueado"); },
};

describe("rascunho do chat", () => {
  it("cada assistente tem a sua chave", () => {
    expect(chatDraftKey("clinicus")).toBe("clinicus_draft");
  });

  it("só restaura com o campo vazio (o agent-prefill tem prioridade)", () => {
    expect(draftToRestore("", "Paciente 68a, dispneia")).toBe("Paciente 68a, dispneia");
    expect(draftToRestore("texto do Modo Escuta", "rascunho antigo")).toBeNull();
    expect(draftToRestore("", "   ")).toBeNull();
    expect(draftToRestore("", null)).toBeNull();
  });

  it("grava, lê e limpa; texto vazio apaga o rascunho", () => {
    const s = memoryStorage();
    writeChatDraft("examinus", "Hb 9,8", s);
    expect(readChatDraft("examinus", s)).toBe("Hb 9,8");
    writeChatDraft("examinus", "  ", s);
    expect(readChatDraft("examinus", s)).toBeNull();
    writeChatDraft("examinus", "Cr 2,1", s);
    clearChatDraft("examinus", s);
    expect(s.data.size).toBe(0);
  });

  it("storage indisponível nunca quebra o chat", () => {
    expect(() => writeChatDraft("clinicus", "x", brokenStorage)).not.toThrow();
    expect(() => clearChatDraft("clinicus", brokenStorage)).not.toThrow();
    expect(readChatDraft("clinicus", brokenStorage)).toBeNull();
    expect(readChatDraft("clinicus", null)).toBeNull();
  });
});
