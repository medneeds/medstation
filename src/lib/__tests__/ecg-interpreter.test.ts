import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ECG_ACCEPT_ATTR,
  ECG_FOLLOW_UPS,
  ECG_FUNCTION_NAME,
  ECG_MODE,
  ECG_MODEL,
  ECG_ORIGIN,
  MAX_ECG_IMAGES,
  appendEcgFiles,
  buildEcgRequestBody,
  canSendEcgMessage,
  collectEcgEvidenceIds,
  describeEcgMessage,
  ecgAssistantMessageMetadata,
  ecgChipLabel,
  ecgEvidenceMetadata,
  ecgStoragePath,
  ecgUserMessageMetadata,
  executeOnce,
  formatEcgBytes,
  hasEcgContext,
  normalizeEcgPrompt,
  resolveClinicusModes,
  resolveEcgWorkspaceLayout,
  routeClinicusFiles,
  selectEcgEvidenceIdsForRequest,
  validateEcgFile,
} from "@/lib/ecgInterpreter";
import {
  ECG_TEMPERATURE,
  buildEcgMessages,
  buildEcgSystemPrompt,
  detectEcgOutputMode,
  isDirectEcgFollowUp,
  sanitizeEcgHistory,
  selectOwnedEcgEvidences,
  validateEcgEvidenceIds,
  validateEcgOutputMode,
} from "../../../supabase/functions/_shared/ecg-interpreter";
import { RADIOLOGY_MODEL, RADIOLOGY_MODE, RADIOLOGY_ORIGIN } from "../../../supabase/functions/_shared/radiology-interpreter";

const MB = 1024 * 1024;
const file = (name: string, type: string, size = 200 * 1024) => ({ name, type, size });
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const U3 = "33333333-3333-4333-8333-333333333333";
const U4 = "44444444-4444-4444-8444-444444444444";
const U5 = "55555555-5555-4555-8555-555555555555";
const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const readSrc = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

/* ------------------------------------------------------------------------ */
/* 1) Exclusividade Anamnese / Relatório / Interpretador                     */
/* ------------------------------------------------------------------------ */
describe("ECG — exclusividade de modos do Clínicus", () => {
  const off = { directAHEMode: false, reportMode: false, ecgInterpretMode: false };

  it("ligar o Interpretador desliga Anamnese e Relatório", () => {
    expect(resolveClinicusModes({ ...off, directAHEMode: true }, { interpretador: true }))
      .toEqual({ directAHEMode: false, reportMode: false, ecgInterpretMode: true });
    expect(resolveClinicusModes({ ...off, reportMode: true }, { interpretador: true }))
      .toEqual({ directAHEMode: false, reportMode: false, ecgInterpretMode: true });
  });

  it("ligar Anamnese ou Relatório desliga o Interpretador", () => {
    expect(resolveClinicusModes({ ...off, ecgInterpretMode: true }, { anamnese: true }))
      .toEqual({ directAHEMode: true, reportMode: false, ecgInterpretMode: false });
    expect(resolveClinicusModes({ ...off, ecgInterpretMode: true }, { relatorio: true }))
      .toEqual({ directAHEMode: false, reportMode: true, ecgInterpretMode: false });
  });

  it("desligar um modo não liga nenhum outro", () => {
    expect(resolveClinicusModes({ ...off, ecgInterpretMode: true }, { interpretador: false })).toEqual(off);
    expect(resolveClinicusModes({ ...off, directAHEMode: true }, { anamnese: false })).toEqual(off);
    expect(resolveClinicusModes({ ...off, reportMode: true }, { relatorio: false })).toEqual(off);
  });

  it("com o Interpretador desligado, Anamnese/Relatório se comportam exatamente como o legado", () => {
    // Legado: setDirectAHEMode(v); if (v) setReportMode(false)  /  setReportMode(v); if (v) setDirectAHEMode(false)
    const legacyAnamnese = (s: typeof off, v: boolean) => ({ ...s, directAHEMode: v, reportMode: v ? false : s.reportMode });
    const legacyRelatorio = (s: typeof off, v: boolean) => ({ ...s, reportMode: v, directAHEMode: v ? false : s.directAHEMode });
    for (const start of [off, { ...off, directAHEMode: true }, { ...off, reportMode: true }]) {
      for (const v of [true, false]) {
        expect(resolveClinicusModes(start, { anamnese: v })).toEqual(legacyAnamnese(start, v));
        expect(resolveClinicusModes(start, { relatorio: v })).toEqual(legacyRelatorio(start, v));
      }
    }
  });
});

/* ------------------------------------------------------------------------ */
/* 2) Sem OCR + validação de arquivos                                        */
/* ------------------------------------------------------------------------ */
describe("ECG — roteamento de arquivos e validação", () => {
  it("com o Interpretador ativo, nenhum arquivo vai para OCR", () => {
    const files = [file("ecg.jpg", "image/jpeg"), file("laudo.pdf", "application/pdf")];
    expect(routeClinicusFiles(files, { ecgInterpretMode: true })).toEqual({ ecg: files, ocr: [] });
  });

  it("com o Interpretador desligado, o fluxo legado (OCR) permanece intacto", () => {
    const files = [file("ecg.jpg", "image/jpeg")];
    expect(routeClinicusFiles(files, { ecgInterpretMode: false })).toEqual({ ecg: [], ocr: files });
  });

  it("aceita JPEG, PNG e WebP e infere pelo nome quando o MIME está vazio", () => {
    expect(validateEcgFile(file("ecg.jpg", "image/jpeg"))).toEqual({ ok: true, mime: "image/jpeg" });
    expect(validateEcgFile(file("ecg.png", "image/png"))).toEqual({ ok: true, mime: "image/png" });
    expect(validateEcgFile(file("ecg.webp", "image/webp"))).toEqual({ ok: true, mime: "image/webp" });
    expect(validateEcgFile(file("ecg.JPEG", ""))).toEqual({ ok: true, mime: "image/jpeg" });
    expect(validateEcgFile(file("ecg.png", "application/octet-stream"))).toEqual({ ok: true, mime: "image/png" });
  });

  it("rejeita PDF, DICOM, HEIC e GIF com mensagem clara", () => {
    for (const f of [
      file("ecg.pdf", "application/pdf"),
      file("ecg.dcm", "application/dicom"),
      file("ecg.heic", "image/heic"),
      file("ecg.gif", "image/gif"),
      file("ecg.dcm", ""),
    ]) {
      const r = validateEcgFile(f);
      expect(r.ok).toBe(false);
      if (r.ok === false) expect(r.reason).toMatch(/JPEG, PNG ou WebP/);
    }
  });

  it("rejeita arquivos vazios e acima de 10 MB", () => {
    expect(validateEcgFile(file("ecg.jpg", "image/jpeg", 0)).ok).toBe(false);
    expect(validateEcgFile(file("ecg.jpg", "image/jpeg", 10 * MB + 1)).ok).toBe(false);
    expect(validateEcgFile(file("ecg.jpg", "image/jpeg", 10 * MB)).ok).toBe(true);
  });

  it("limita a fila a 4 traçados e informa o excedente", () => {
    const incoming = [1, 2, 3].map((i) => file(`e${i}.jpg`, "image/jpeg"));
    const { accepted, rejected } = appendEcgFiles(2, incoming);
    expect(accepted).toHaveLength(2);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatch(new RegExp(`Máximo de ${MAX_ECG_IMAGES}`));
  });

  it("atributo accept do input só lista imagens permitidas", () => {
    expect(ECG_ACCEPT_ATTR).toBe("image/jpeg,image/png,image/webp");
  });
});

/* ------------------------------------------------------------------------ */
/* 3) Envio só com imagem / seguimento                                        */
/* ------------------------------------------------------------------------ */
describe("ECG — regras de envio", () => {
  it("permite enviar apenas a imagem com o texto vazio", () => {
    expect(canSendEcgMessage({ text: "", pendingCount: 1, historicalCount: 0 })).toBe(true);
    expect(normalizeEcgPrompt("")).toBe("Interprete este eletrocardiograma.");
    expect(normalizeEcgPrompt("  paciente com dor torácica ")).toBe("paciente com dor torácica");
  });

  it("permite pergunta de seguimento só com texto quando já há ECG na conversa", () => {
    expect(canSendEcgMessage({ text: "Qual o ritmo?", pendingCount: 0, historicalCount: 1 })).toBe(true);
    expect(canSendEcgMessage({ text: "   ", pendingCount: 0, historicalCount: 1 })).toBe(false);
    expect(canSendEcgMessage({ text: "Qual o ritmo?", pendingCount: 0, historicalCount: 0 })).toBe(false);
  });

  it("sugestões de seguimento aprovadas", () => {
    expect([...ECG_FOLLOW_UPS]).toEqual(["Faça o laudo", "Qual o ritmo?", "Há sinais de isquemia aguda?", "Meça os intervalos"]);
  });
});

/* ------------------------------------------------------------------------ */
/* 4) Backend: UUIDs, ownership, MIME, tamanho                               */
/* ------------------------------------------------------------------------ */
describe("ECG — validação do payload no backend", () => {
  it("aceita até 4 UUIDs únicos e rejeita inválidos, vazios ou excedentes", () => {
    expect(validateEcgEvidenceIds([U1, U2, U1])).toEqual({ ok: true, value: [U1, U2] });
    expect(validateEcgEvidenceIds([])).toMatchObject({ ok: false, status: 400 });
    expect(validateEcgEvidenceIds(["nao-e-uuid"])).toMatchObject({ ok: false, status: 400 });
    expect(validateEcgEvidenceIds("abc")).toMatchObject({ ok: false, status: 400 });
    expect(validateEcgEvidenceIds([U1, U2, U3, U4, U5])).toMatchObject({ ok: false, status: 400 });
  });

  it("outputMode desconhecido cai para auto", () => {
    expect(validateEcgOutputMode("report")).toBe("report");
    expect(validateEcgOutputMode("xyz")).toBe("auto");
    expect(validateEcgOutputMode(undefined)).toBe("auto");
  });

  const row = (id: string, over: Partial<{ user_id: string; type: string; file_path: string | null; file_size: number; metadata: Record<string, unknown>; is_active: boolean }> = {}) => ({
    id,
    user_id: OWNER,
    type: "image",
    file_path: `${OWNER}/ecg/1-0.jpg`,
    file_size: 500_000,
    title: "ecg.jpg",
    is_active: true,
    metadata: { mode: ECG_MODE, modality: "ecg", body_region: "cardiac", mime_type: "image/jpeg" },
    ...over,
  });

  it("aceita evidências do próprio usuário com MIME permitido", () => {
    const r = selectOwnedEcgEvidences([U1], [row(U1)], OWNER);
    expect(r).toEqual({ ok: true, value: [{ id: U1, filePath: `${OWNER}/ecg/1-0.jpg`, mime: "image/jpeg" }] });
  });

  it("rejeita evidência de outro usuário, inexistente ou inativa com 403 sem revelar qual", () => {
    expect(selectOwnedEcgEvidences([U1], [row(U1, { user_id: OTHER })], OWNER)).toMatchObject({ ok: false, status: 403 });
    expect(selectOwnedEcgEvidences([U1], [], OWNER)).toMatchObject({ ok: false, status: 403 });
    expect(selectOwnedEcgEvidences([U1], [row(U1, { is_active: false })], OWNER)).toMatchObject({ ok: false, status: 403 });
  });

  it("rejeita caminho fora da pasta do usuário, tipo não-imagem, MIME inválido e >10 MB", () => {
    expect(selectOwnedEcgEvidences([U1], [row(U1, { file_path: `${OTHER}/ecg/x.jpg` })], OWNER)).toMatchObject({ ok: false, status: 400 });
    expect(selectOwnedEcgEvidences([U1], [row(U1, { type: "document" })], OWNER)).toMatchObject({ ok: false, status: 400 });
    expect(selectOwnedEcgEvidences([U1], [row(U1, { metadata: { mime_type: "application/pdf" }, file_path: `${OWNER}/ecg/x.pdf` })], OWNER)).toMatchObject({ ok: false, status: 400 });
    expect(selectOwnedEcgEvidences([U1], [row(U1, { file_size: 10 * MB + 1 })], OWNER)).toMatchObject({ ok: false, status: 400 });
  });
});

/* ------------------------------------------------------------------------ */
/* 5) image_url real + histórico sanitizado                                  */
/* ------------------------------------------------------------------------ */
describe("ECG — montagem multimodal", () => {
  it("a última mensagem do usuário carrega as imagens como image_url reais (nunca OCR)", () => {
    const msgs = buildEcgMessages({
      systemPrompt: "SYS",
      history: [
        { role: "user", content: "anterior" },
        { role: "assistant", content: "resposta" },
        { role: "user", content: "Há sinais de isquemia aguda?" },
      ],
      imageDataUrls: ["data:image/jpeg;base64,AAA", "data:image/png;base64,BBB"],
      outputMode: "auto",
    });
    expect(msgs[0]).toEqual({ role: "system", content: "SYS" });
    expect(msgs[1]).toEqual({ role: "user", content: "anterior" });
    expect(msgs[2]).toEqual({ role: "assistant", content: "resposta" });
    const last = msgs[3];
    expect(Array.isArray(last.content)).toBe(true);
    const parts = last.content as Array<{ type: string; text?: string; image_url?: { url: string } }>;
    expect(parts[0].type).toBe("text");
    expect(parts[0].text).toContain("Há sinais de isquemia aguda?");
    expect(parts[0].text).toContain("TRAÇADOS ANEXADOS: 2");
    expect(parts.filter((p) => p.type === "image_url").map((p) => p.image_url?.url)).toEqual([
      "data:image/jpeg;base64,AAA",
      "data:image/png;base64,BBB",
    ]);
  });

  it("usa o prompt padrão quando o médico envia só a imagem", () => {
    const msgs = buildEcgMessages({ systemPrompt: "S", history: [{ role: "user", content: "   " }], imageDataUrls: ["data:image/jpeg;base64,X"], outputMode: "quick" });
    const parts = msgs[msgs.length - 1].content as Array<{ type: string; text?: string }>;
    expect(parts[0].text).toContain("Interprete este eletrocardiograma.");
    expect(parts[0].text).toContain("AVALIAÇÃO RÁPIDA");
  });

  it("histórico sanitizado: só user/assistant, sem base64, limitado a 12", () => {
    const history = [
      { role: "system", content: "x" },
      { role: "user", content: "data:image/png;base64,QUJD" },
      { role: "tool", content: "y" },
      ...Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `m${i}` })),
    ];
    const clean = sanitizeEcgHistory(history);
    expect(clean).toHaveLength(12);
    expect(clean.every((m) => m.role === "user" || m.role === "assistant")).toBe(true);
    expect(JSON.stringify(sanitizeEcgHistory(history.slice(0, 2)))).not.toContain("base64,QUJD");
  });

  it("detecta laudo/rápida no texto, mas o modo explícito prevalece", () => {
    expect(detectEcgOutputMode("Faça o laudo")).toBe("report");
    expect(detectEcgOutputMode("avaliação rápida")).toBe("quick");
    expect(detectEcgOutputMode("Qual o ritmo?")).toBe("auto");
    expect(detectEcgOutputMode("Faça o laudo", "quick")).toBe("quick");
  });

  it("pergunta de seguimento após uma leitura pede resposta direta, não a estrutura completa", () => {
    const prev = [{ role: "user" as const, content: "Interprete este eletrocardiograma." }, { role: "assistant" as const, content: "QUALIDADE TÉCNICA\n..." }];
    expect(isDirectEcgFollowUp("Há sinais de isquemia aguda?", prev)).toBe(true);
    expect(isDirectEcgFollowUp("Qual o ritmo?", prev)).toBe(true);
    expect(isDirectEcgFollowUp("Meça os intervalos", prev)).toBe(true);
    // primeira mensagem, ou pedido de nova leitura completa → estrutura completa
    expect(isDirectEcgFollowUp("Há sinais de isquemia aguda?", [])).toBe(false);
    expect(isDirectEcgFollowUp("Interprete este eletrocardiograma.", prev)).toBe(false);
    expect(isDirectEcgFollowUp("Interprete novamente com foco em V1-V3", prev)).toBe(false);
    expect(isDirectEcgFollowUp("Faça a análise completa", prev)).toBe(false);

    const direct = buildEcgMessages({
      systemPrompt: "S",
      history: [...prev, { role: "user", content: "Há sinais de isquemia aguda?" }],
      imageDataUrls: ["data:image/jpeg;base64,X"],
      outputMode: "auto",
    });
    const directText = (direct[direct.length - 1].content as Array<{ text?: string }>)[0].text || "";
    expect(directText).toContain("RESPOSTA DIRETA À PERGUNTA DE SEGUIMENTO");
    expect(directText).not.toContain("FORMATO SOLICITADO: AUTOMÁTICO");

    const first = buildEcgMessages({ systemPrompt: "S", history: [{ role: "user", content: "Há sinais de isquemia aguda?" }], imageDataUrls: ["data:image/jpeg;base64,X"], outputMode: "auto" });
    expect(((first[first.length - 1].content as Array<{ text?: string }>)[0].text || "")).toContain("FORMATO SOLICITADO: AUTOMÁTICO");

    // laudo explícito nunca vira resposta direta
    const report = buildEcgMessages({ systemPrompt: "S", history: [...prev, { role: "user", content: "Faça o laudo" }], imageDataUrls: ["data:image/jpeg;base64,X"], outputMode: "report" });
    expect(((report[report.length - 1].content as Array<{ text?: string }>)[0].text || "")).toContain("LAUDO ESTRUTURADO COMPLETO");
  });
});

/* ------------------------------------------------------------------------ */
/* 6) Persistência: evidence, metadata, reidratação                          */
/* ------------------------------------------------------------------------ */
describe("ECG — persistência e reidratação", () => {
  it("evidence usa origin clinicus_interpreter e metadata ecg/cardiac com MIME", () => {
    expect(ECG_ORIGIN).toBe("clinicus_interpreter");
    expect(ecgEvidenceMetadata("image/png")).toEqual({ mode: "ecg_interpreter", modality: "ecg", body_region: "cardiac", mime_type: "image/png" });
  });

  it("caminho no bucket privado começa pela pasta do usuário e usa subpasta ecg", () => {
    expect(ecgStoragePath("user-1", "image/webp", 1, 1700000000000)).toBe("user-1/ecg/1700000000000-1.webp");
    expect(ecgStoragePath("u", "image/jpeg", 0, 1)).toMatch(/^u\/ecg\/.*\.jpg$/);
  });

  it("metadata da mensagem do usuário e do assistente segue o contrato, sem base64", () => {
    const user = ecgUserMessageMetadata(["a", "b"], 1);
    expect(user).toEqual({ mode: "ecg_interpreter", ecg_evidence_ids: ["a", "b"], attached_count: 1 });
    const assistant = ecgAssistantMessageMetadata(["a"], "report");
    expect(assistant).toEqual({ mode: "ecg_interpreter", ecg_evidence_ids: ["a"], output_mode: "report" });
    expect(JSON.stringify([user, assistant])).not.toMatch(/base64|data:image/);
  });

  it("após reload, os IDs de ECG são recuperados só de mensagens do usuário no modo, em ordem e sem repetição", () => {
    const msgs = [
      { role: "user", metadata: ecgUserMessageMetadata(["a", "b"]) },
      { role: "assistant", metadata: ecgAssistantMessageMetadata(["a", "b"], "auto") },
      { role: "user", metadata: { mode: "radiology_interpreter", radiology_evidence_ids: ["rx1"] } },
      { role: "user", metadata: ecgUserMessageMetadata(["b", "c"], 1) },
      { role: "user", metadata: ecgUserMessageMetadata(["c"], 0) },
      { role: "user", metadata: null },
    ];
    expect(collectEcgEvidenceIds(msgs)).toEqual(["a", "b", "c"]);
    expect(hasEcgContext(msgs)).toBe(true);
    expect(hasEcgContext([{ role: "user", metadata: { mode: "radiology_interpreter", radiology_evidence_ids: ["rx1"] } }])).toBe(false);
  });

  it("seguimento sem nova imagem reutiliza as evidências mais recentes, até 4", () => {
    expect(selectEcgEvidenceIdsForRequest([], ["h1", "h2"])).toEqual(["h2", "h1"]);
    expect(selectEcgEvidenceIdsForRequest(["n1"], ["h1", "h2", "h3", "h4"])).toEqual(["n1", "h4", "h3", "h2"]);
  });

  it("chip descreve a mensagem em português correto", () => {
    expect(describeEcgMessage(ecgUserMessageMetadata(["a", "b"], 2))).toEqual({ total: 2, attached: 2 });
    expect(describeEcgMessage({ mode: RADIOLOGY_MODE })).toBeNull();
    expect(ecgChipLabel({ total: 1, attached: 1 })).toBe("1 ECG anexado");
    expect(ecgChipLabel({ total: 2, attached: 2 })).toBe("2 ECGs anexados");
    expect(ecgChipLabel({ total: 1, attached: 0 })).toBe("Sobre 1 ECG");
    expect(formatEcgBytes(3.5 * MB)).toBe("3.5 MB");
  });

  it("corpo da requisição contém só texto do histórico, IDs e modo — nunca a imagem", () => {
    const body = buildEcgRequestBody({
      messages: [{ role: "user", content: "olá" }, { role: "system", content: "x" }, { role: "assistant", content: "r" }],
      evidenceIds: ["a"],
      caseId: "case-1",
      outputMode: "auto",
    });
    expect(body).toEqual({ messages: [{ role: "user", content: "olá" }, { role: "assistant", content: "r" }], evidenceIds: ["a"], outputMode: "auto", caseId: "case-1" });
    expect(buildEcgRequestBody({ messages: [], evidenceIds: [] })).not.toHaveProperty("caseId");
  });
});

/* ------------------------------------------------------------------------ */
/* 7) Um único INSERT por mensagem do usuário                                */
/* ------------------------------------------------------------------------ */
describe("ECG — um único INSERT por mensagem do usuário", () => {
  it("executeOnce chama then do builder exatamente uma vez, mesmo com múltiplos awaits", async () => {
    const then = vi.fn((resolve: (v: { data: { id: 1 } }) => void) => resolve({ data: { id: 1 } }));
    const builder = { then } as unknown as PromiseLike<{ data: { id: 1 } }>;
    const p = executeOnce(builder);
    const a = await p;
    const b = await p;
    p.then(() => undefined);
    await p;
    expect(a).toEqual({ data: { id: 1 } });
    expect(b).toEqual(a);
    expect(then).toHaveBeenCalledTimes(1);
  });

  it("AgentChat envolve o INSERT da mensagem do usuário em executeOnce no fluxo de ECG", () => {
    const src = readSrc("src/components/AgentChat.tsx");
    const start = src.indexOf("const sendEcgMessage = async");
    const end = src.indexOf("const sendMessage = async", start);
    const ecgFlow = src.slice(start, end);
    expect(ecgFlow).toContain("executeOnce(");
    // exatamente um INSERT de role "user" dentro do fluxo de ECG (a mensagem otimista não conta)
    expect(ecgFlow.match(/\.insert\(\{\s*conversation_id: conversation\.id,\s*role: "user"/g)).toHaveLength(1);
    expect(ecgFlow.match(/executeOnce\(\s*supabase\s*\.from\("messages"\)\s*\.insert\(/g)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------------ */
/* 8) Contratos de saída do prompt                                           */
/* ------------------------------------------------------------------------ */
describe("ECG — contrato de formato do prompt", () => {
  const auto = buildEcgSystemPrompt("auto");
  const quick = buildEcgSystemPrompt("quick");
  const report = buildEcgSystemPrompt("report");
  const structure = (p: string) => p.slice(p.indexOf("ESTRUTURA DA RESPOSTA"), p.indexOf("REGRAS DE FORMATAÇÃO"));

  it("modo automático usa exatamente os blocos aprovados, nesta ordem", () => {
    const blocks = [
      "QUALIDADE TÉCNICA",
      "FREQUÊNCIA E RITMO",
      "EIXO E INTERVALOS",
      "MORFOLOGIA",
      "ST-T E ISQUEMIA",
      "IMPRESSÃO",
      "ACHADOS CRÍTICOS",
      "LIMITAÇÕES",
      "CONFIANÇA",
      "CORRELAÇÃO CLÍNICA",
    ];
    const s = structure(auto);
    let last = -1;
    for (const b of blocks) {
      const idx = s.indexOf(b);
      expect(idx, b).toBeGreaterThan(last);
      last = idx;
    }
    expect(s).toContain("itens numerados");
    expect(s).toContain("Presente");
    expect(s).toContain("Suspeito");
    expect(s).toContain("Não identificado");
    expect(s).toContain("somente se for pertinente");
    expect(s).toContain("ALTA, MODERADA ou BAIXA");
  });

  it("modo rápido: ~6 linhas com qualidade/calibração, FC/ritmo, até 3 achados, emergência e impressão com confiança", () => {
    const s = structure(quick);
    expect(s).toContain("no máximo 6 linhas");
    expect(s).toContain("calibração");
    expect(s).toContain("frequência e ritmo");
    expect(s).toContain("até 3 achados-chave");
    expect(s).toContain("Emergência eletrocardiográfica");
    expect(s).toContain("Confiança: ALTA/MODERADA/BAIXA");
  });

  it("modo laudo usa exatamente EXAME/INDICAÇÃO/TÉCNICA/COMPARAÇÃO/ANÁLISE ELETROCARDIOGRÁFICA/CONCLUSÃO", () => {
    const s = structure(report);
    let last = -1;
    for (const b of ["EXAME", "INDICAÇÃO", "TÉCNICA", "COMPARAÇÃO", "ANÁLISE ELETROCARDIOGRÁFICA", "CONCLUSÃO"]) {
      const idx = s.indexOf(`\n${b}\n`);
      expect(idx, b).toBeGreaterThan(last);
      last = idx;
    }
    expect(s).not.toContain("ACHADOS CRÍTICOS");
    expect(s).not.toContain("QUALIDADE TÉCNICA");
  });

  it("checklist e segunda leitura são internos e nunca impressos; sem rodapé genérico", () => {
    for (const p of [auto, quick, report]) {
      expect(p).toContain("Segunda leitura interna obrigatória (INTERNA, nunca impressa)");
      expect(p).toContain('não imprima "SEGUNDA LEITURA"');
      expect(structure(p)).not.toMatch(/SEGUNDA (LEITURA|OLHADA)/);
      expect(structure(p)).not.toContain("CHECKLIST");
      expect(p).toContain("Não acrescente rodapé");
      expect(p).not.toContain("ENCERRAMENTO OBRIGATÓRIO");
    }
  });

  it("regras anti-alucinação essenciais estão presentes", () => {
    for (const needle of [
      "Não chame o ritmo de sinusal",
      "Não forneça FC, PR, QRS, QT ou QTc numéricos",
      "Não afirme eixo",
      "Não transforme alteração inespecífica de ST-T em isquemia",
      "Não diagnostique infarto apenas por",
      "Nesta versão interpreto apenas eletrocardiograma",
      "25 mm/s e 10 mm/mV",
    ]) {
      expect(auto).toContain(needle);
    }
  });

  it("padrões críticos exigidos estão na triagem", () => {
    for (const needle of ["STEMI", "taquicardia ventricular", "fibrilação ventricular", "bloqueio atrioventricular avançado ou total", "QT marcadamente prolongado", "Brugada tipo 1", "hipercalemia grave", "marca-passo"]) {
      expect(auto.toLowerCase()).toContain(needle.toLowerCase());
    }
  });
});

/* ------------------------------------------------------------------------ */
/* 9) Isolamento do modelo / motor                                           */
/* ------------------------------------------------------------------------ */
describe("ECG — isolamento do motor", () => {
  it("ECG_MODEL é isolado e usa gemini-3.1-pro-preview com temperature 0.1", () => {
    expect(ECG_MODEL).toBe("google/gemini-3.1-pro-preview");
    expect(ECG_TEMPERATURE).toBe(0.1);
  });

  it("taxonomias de ECG e RX não se misturam", () => {
    expect(ECG_MODE).not.toBe(RADIOLOGY_MODE);
    expect(ECG_ORIGIN).not.toBe(RADIOLOGY_ORIGIN);
    expect(ECG_FUNCTION_NAME).toBe("ecg-interpret");
    // O modelo é o mesmo por decisão de produto nesta V1, mas a constante é independente.
    expect(typeof RADIOLOGY_MODEL).toBe("string");
  });

  it("a Edge Function ecg-interpret não importa o núcleo de radiografia nem chama OCR", () => {
    const fn = readSrc("supabase/functions/ecg-interpret/index.ts");
    expect(fn).toContain('from "../_shared/ecg-interpreter.ts"');
    expect(fn).not.toContain("radiology-interpreter");
    expect(fn).not.toContain("extract-file-text");
    expect(fn).toContain("requirePlatformAccess(req)");
    expect(fn).toContain("model: ECG_MODEL");
    expect(fn).toContain('.from("evidences").download(');
    expect(fn).toContain('"X-Ecg-Output-Mode"');
    expect(fn).toContain('const ASSISTANT = "clinicus"');
  });

  it("o núcleo de ECG não referencia radiografia e vice-versa", () => {
    const ecgCore = readSrc("supabase/functions/_shared/ecg-interpreter.ts");
    const rxCore = readSrc("supabase/functions/_shared/radiology-interpreter.ts");
    expect(ecgCore.toLowerCase()).not.toContain("radiograph-interpret");
    expect(ecgCore).not.toContain("RADIOLOGY_");
    expect(rxCore).not.toContain("ECG_");
  });

  it("config e mapeamentos administrativos registram ecg-interpret -> clinicus", () => {
    expect(readSrc("supabase/config.toml")).toMatch(/\[functions\.ecg-interpret\]\s*\n\s*verify_jwt = true/);
    expect(readSrc("src/lib/adminMetrics.ts")).toContain('"ecg-interpret": "clinicus"');
    expect(readSrc("supabase/functions/admin-posthog/index.ts")).toContain('"ecg-interpret": "clinicus"');
  });
});

/* ------------------------------------------------------------------------ */
/* 10) Legado preservado com ECG desligado + roteamento no AgentChat         */
/* ------------------------------------------------------------------------ */
describe("ECG — AgentChat preserva o fluxo legado e o RX", () => {
  const src = readSrc("src/components/AgentChat.tsx");

  it("o fluxo de ECG não chama agent-chat, radiograph-interpret nem extract-file-text", () => {
    const start = src.indexOf("const sendEcgMessage = async");
    const end = src.indexOf("const sendMessage = async", start);
    const ecgFlow = src.slice(start, end);
    expect(ecgFlow).toContain("ECG_FUNCTION_NAME");
    expect(ecgFlow).not.toContain("agent-chat");
    expect(ecgFlow).not.toContain("radiograph-interpret");
    expect(ecgFlow).not.toContain("extract-file-text");
    expect(ecgFlow).toContain("origin: ECG_ORIGIN");
  });

  it("processFiles retorna antes do OCR quando o Interpretador de ECG está ativo, e o RX continua intacto", () => {
    const start = src.indexOf("const processFiles = async");
    const ocrIdx = src.indexOf("ocrImage(", start);
    const ecgGuard = src.indexOf("if (ecgActive) {", start);
    const rxGuard = src.indexOf("if (radiologyActive) {", start);
    expect(rxGuard).toBeGreaterThan(start);
    expect(ecgGuard).toBeGreaterThan(rxGuard);
    expect(ecgGuard).toBeLessThan(ocrIdx);
  });

  it("sendMessage roteia RX -> radiograph, ECG -> ecg-interpret, senão agent-chat legado", () => {
    const start = src.indexOf("const sendMessage = async");
    const chunk = src.slice(start, start + 600);
    expect(chunk.indexOf("await sendRadiologyMessage()")).toBeGreaterThan(-1);
    expect(chunk.indexOf("await sendEcgMessage()")).toBeGreaterThan(chunk.indexOf("await sendRadiologyMessage()"));
  });

  it("o payload legado do Clínicus para agent-chat permanece inalterado", () => {
    expect(src).toContain('...(agentType === "clinicus" && { directAHEMode, aheTemplate, reportMode, reportType, reportPurpose, reportSpecialty }),');
  });

  it("Anamnese e Relatório passam pelo resolvedor único de exclusividade", () => {
    expect(src).not.toMatch(/setDirectAHEMode\(v\); if \(v\) setReportMode\(false\)/);
    expect(src).not.toMatch(/setReportMode\(v\); if \(v\) setDirectAHEMode\(false\)/);
    expect(src.match(/setClinicusModes\(\{ anamnese: v \}\)/g)).toHaveLength(2);
    expect(src.match(/setClinicusModes\(\{ relatorio: v \}\)/g)).toHaveLength(2);
    expect(src.match(/setClinicusModes\(\{ interpretador: v \}\)/g)).toHaveLength(2);
  });

  it("o Interpretador de RX do Examinus não foi alterado no roteamento", () => {
    expect(src).toContain('const radiologyActive = agentType === "examinus" && radiologyInterpretMode;');
    expect(src).toContain("/functions/v1/radiograph-interpret");
    expect(src).toContain("origin: RADIOLOGY_ORIGIN");
  });
});

/* ------------------------------------------------------------------------ */
/* 11) Layout responsivo do workspace                                        */
/* ------------------------------------------------------------------------ */
describe("ECG — layout do workspace", () => {
  it("sem ECG = estado vazio com dropzone; com traçado ou conversa = workspace", () => {
    expect(resolveEcgWorkspaceLayout({ pendingCount: 0, historicalCount: 0, messageCount: 0 })).toBe("empty");
    expect(resolveEcgWorkspaceLayout({ pendingCount: 1, historicalCount: 0, messageCount: 0 })).toBe("workspace");
    expect(resolveEcgWorkspaceLayout({ pendingCount: 0, historicalCount: 1, messageCount: 2 })).toBe("workspace");
    expect(resolveEcgWorkspaceLayout({ pendingCount: 0, historicalCount: 0, messageCount: 2 })).toBe("workspace");
  });

  it("workspace: desktop 42/58 em dois painéis, mobile em card + composer sticky, sem controles legados", () => {
    const ws = readSrc("src/components/chat/EcgInterpreterWorkspace.tsx");
    expect(ws).toContain("grid-cols-[42fr_58fr]");
    expect(ws).toContain('data-testid="ecg-two-panels"');
    expect(ws).toContain('data-testid="ecg-viewer-mobile"');
    expect(ws).toContain("sticky bottom-0");
    expect(ws).toContain("object-contain");
    expect(ws).toContain("Arraste ou selecione um ECG");
    expect(ws).toContain("JPEG, PNG ou WebP");
    expect(ws).toContain("Contexto clínico ou pergunta sobre o ECG (opcional)");
    expect(ws).toContain("Sair do Interpretador");
    expect(ws).toContain("Adicionar/Comparar ECG");
    expect(ws).not.toContain("Anamnese");
    expect(ws).not.toContain("Relatório");
    expect(ws).not.toContain("Workflow");
  });

  it("AgentChat troca o chat legado pelo workspace apenas quando ecgActive", () => {
    const src = readSrc("src/components/AgentChat.tsx");
    expect(src).toContain("{ecgActive ? (");
    expect(src).toContain("<EcgInterpreterWorkspace");
    expect(src).toContain('accept={radiologyActive ? RADIOLOGY_ACCEPT_ATTR : ecgActive ? ECG_ACCEPT_ATTR :');
  });
});
