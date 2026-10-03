import { describe, it, expect } from "vitest";
import { canUseVoice, appendSpoken, applySpoken } from "@/lib/voiceAccess";

describe("microfone dos assistentes", () => {
  it("libera para quem está no teste grátis (acesso ativo, sem assinatura paga)", () => {
    expect(canUseVoice({ accessActive: true, subscribed: false, loading: false })).toBe("allowed");
  });
  it("bloqueia quem não tem acesso", () => {
    expect(canUseVoice({ accessActive: false, subscribed: false, loading: false })).toBe("locked");
  });
  it("frases ditadas são acrescentadas, não apagam o texto já escrito", () => {
    expect(appendSpoken("Paciente 60 anos.", "Dor torácica.")).toBe("Paciente 60 anos. Dor torácica.");
  });
  it("revisão do áudio completo substitui o trecho ao vivo sem duplicar", () => {
    expect(applySpoken("Obs: dor torac", "dor torácica há 2 horas", "dor torac")).toBe("Obs: dor torácica há 2 horas");
  });
});
