import { describe, expect, it } from "vitest";
import {
  MAX_RADIOLOGY_IMAGES,
  RADIOLOGY_ORIGIN,
  RADIOLOGY_ACCEPT_ATTR,
  RADIOLOGY_MODE,
  appendRadiologyFiles,
  buildRadiologyRequestBody,
  canSendRadiologyMessage,
  collectRadiologyEvidenceIds,
  describeRadiologyMessage,
  formatBytes,
  normalizeRadiologyPrompt,
  radiologyAssistantMessageMetadata,
  radiologyChipLabel,
  radiologyEvidenceMetadata,
  radiologyStoragePath,
  radiologyUserMessageMetadata,
  resolveExaminusModes,
  routeExaminusFiles,
  selectEvidenceIdsForRequest,
  validateRadiologyFile,
} from "@/lib/radiologyInterpreter";
import { buildRadiologySystemPrompt } from "../../../supabase/functions/_shared/radiology-interpreter";

const MB = 1024 * 1024;
const file = (name: string, type: string, size = 200 * 1024) => ({ name, type, size });

describe("Interpretador — exclusividade de modos do Examinus", () => {
  it("ligar o Interpretador desliga o Consultor", () => {
    const next = resolveExaminusModes({ examSuggestMode: true, radiologyInterpretMode: false }, { interpretador: true });
    expect(next).toEqual({ examSuggestMode: false, radiologyInterpretMode: true });
  });

  it("ligar o Consultor desliga o Interpretador", () => {
    const next = resolveExaminusModes({ examSuggestMode: false, radiologyInterpretMode: true }, { consultor: true });
    expect(next).toEqual({ examSuggestMode: true, radiologyInterpretMode: false });
  });

  it("desligar um modo não liga o outro", () => {
    expect(resolveExaminusModes({ examSuggestMode: false, radiologyInterpretMode: true }, { interpretador: false }))
      .toEqual({ examSuggestMode: false, radiologyInterpretMode: false });
    expect(resolveExaminusModes({ examSuggestMode: true, radiologyInterpretMode: false }, { consultor: false }))
      .toEqual({ examSuggestMode: false, radiologyInterpretMode: false });
  });
});

describe("Interpretador — validação de arquivos", () => {
  it("aceita JPEG, PNG e WebP", () => {
    expect(validateRadiologyFile(file("rx.jpg", "image/jpeg"))).toEqual({ ok: true, mime: "image/jpeg" });
    expect(validateRadiologyFile(file("rx.png", "image/png"))).toEqual({ ok: true, mime: "image/png" });
    expect(validateRadiologyFile(file("rx.webp", "image/webp"))).toEqual({ ok: true, mime: "image/webp" });
  });

  it("infere o tipo pela extensão quando o navegador não informa MIME", () => {
    expect(validateRadiologyFile(file("torax.jpeg", ""))).toEqual({ ok: true, mime: "image/jpeg" });
    expect(validateRadiologyFile(file("torax.PNG", "application/octet-stream"))).toEqual({ ok: true, mime: "image/png" });
  });

  it("rejeita PDF, DICOM, HEIC e GIF — nunca vão para OCR nem para o modelo", () => {
    for (const f of [
      file("laudo.pdf", "application/pdf"),
      file("estudo.dcm", "application/dicom"),
      file("foto.heic", "image/heic"),
      file("anim.gif", "image/gif"),
      file("sem-extensao", ""),
    ]) {
      const v = validateRadiologyFile(f);
      expect(v.ok).toBe(false);
      if (v.ok === false) expect(v.reason).toContain(f.name);
    }
  });

  it("rejeita arquivos vazios e acima de 10 MB", () => {
    expect(validateRadiologyFile(file("vazio.jpg", "image/jpeg", 0)).ok).toBe(false);
    expect(validateRadiologyFile(file("grande.jpg", "image/jpeg", 10 * MB + 1)).ok).toBe(false);
    expect(validateRadiologyFile(file("limite.jpg", "image/jpeg", 10 * MB)).ok).toBe(true);
  });

  it("o atributo accept do input só lista os MIMEs permitidos", () => {
    expect(RADIOLOGY_ACCEPT_ATTR.split(",")).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });
});

describe("Interpretador — roteamento e fila de anexos", () => {
  it("com o Interpretador ativo nenhum arquivo vai para OCR", () => {
    const files = [file("a.jpg", "image/jpeg"), file("b.pdf", "application/pdf")];
    expect(routeExaminusFiles(files, { radiologyInterpretMode: true })).toEqual({ radiology: files, ocr: [] });
  });

  it("com o Interpretador inativo todos os arquivos seguem o fluxo de OCR", () => {
    const files = [file("a.jpg", "image/jpeg")];
    expect(routeExaminusFiles(files, { radiologyInterpretMode: false })).toEqual({ radiology: [], ocr: files });
  });

  it("limita a fila a 4 imagens e explica o que ficou de fora", () => {
    const incoming = [1, 2, 3].map((i) => file(`rx${i}.jpg`, "image/jpeg"));
    const { accepted, rejected } = appendRadiologyFiles(2, incoming);
    expect(accepted.map((a) => a.file.name)).toEqual(["rx1.jpg", "rx2.jpg"]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toContain(String(MAX_RADIOLOGY_IMAGES));
  });

  it("separa inválidos de excedentes na mesma leva", () => {
    const { accepted, rejected } = appendRadiologyFiles(0, [
      file("ok.png", "image/png"),
      file("ruim.pdf", "application/pdf"),
    ]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].file.name).toBe("ruim.pdf");
  });
});

describe("Interpretador — regra de envio e prompt padrão", () => {
  it("permite enviar sem texto quando há imagem pendente", () => {
    expect(canSendRadiologyMessage({ text: "", pendingCount: 1, historicalCount: 0 })).toBe(true);
  });

  it("permite pergunta de seguimento só com texto quando já há radiografia na conversa", () => {
    expect(canSendRadiologyMessage({ text: "e o mediastino?", pendingCount: 0, historicalCount: 1 })).toBe(true);
    expect(canSendRadiologyMessage({ text: "   ", pendingCount: 0, historicalCount: 1 })).toBe(false);
  });

  it("bloqueia envio sem imagem e sem contexto prévio", () => {
    expect(canSendRadiologyMessage({ text: "interprete", pendingCount: 0, historicalCount: 0 })).toBe(false);
  });

  it("usa o prompt padrão quando o médico não escreve nada", () => {
    expect(normalizeRadiologyPrompt("  ")).toBe(normalizeRadiologyPrompt(""));
    expect(normalizeRadiologyPrompt("").length).toBeGreaterThan(10);
    expect(normalizeRadiologyPrompt(" avaliação rápida ")).toBe("avaliação rápida");
  });
});

describe("Interpretador — contexto de imagens na conversa", () => {
  const msgs = [
    { role: "user", metadata: radiologyUserMessageMetadata(["a", "b"]) },
    { role: "assistant", metadata: radiologyAssistantMessageMetadata(["a", "b"], "report") },
    { role: "user", metadata: { mode: "outro", radiology_evidence_ids: ["zzz"] } },
    { role: "user", metadata: radiologyUserMessageMetadata(["b", "c"], 1) },
    { role: "user", metadata: null },
  ];

  it("coleta IDs só de mensagens do usuário no modo, sem repetição e em ordem", () => {
    expect(collectRadiologyEvidenceIds(msgs)).toEqual(["a", "b", "c"]);
  });

  it("prioriza imagens novas e completa com as mais recentes do histórico até 4", () => {
    expect(selectEvidenceIdsForRequest(["n1"], ["h1", "h2", "h3", "h4"])).toEqual(["n1", "h4", "h3", "h2"]);
    expect(selectEvidenceIdsForRequest(["n1", "n2", "n3", "n4", "n5"], ["h1"])).toEqual(["n1", "n2", "n3", "n4"]);
    expect(selectEvidenceIdsForRequest([], [])).toEqual([]);
  });

  it("metadados nunca carregam base64 e descrevem a mensagem para o chip", () => {
    const meta = radiologyUserMessageMetadata(["a", "b", "c"], 1);
    expect(meta).toEqual({ mode: RADIOLOGY_MODE, radiology_evidence_ids: ["a", "b", "c"], attached_count: 1 });
    expect(JSON.stringify(meta)).not.toMatch(/base64|data:image/);
    expect(describeRadiologyMessage(meta)).toEqual({ total: 3, attached: 1 });
    expect(describeRadiologyMessage({ mode: "outro" })).toBeNull();
    expect(describeRadiologyMessage(undefined)).toBeNull();
  });

  it("rótulos do chip em português correto", () => {
    expect(radiologyChipLabel({ total: 1, attached: 1 })).toBe("1 radiografia anexada");
    expect(radiologyChipLabel({ total: 3, attached: 2 })).toBe("2 radiografias anexadas");
    expect(radiologyChipLabel({ total: 2, attached: 0 })).toBe("Sobre 2 radiografias");
    expect(radiologyChipLabel({ total: 0, attached: 0 })).toBe("Interpretador");
  });
});

describe("Interpretador — armazenamento e corpo da requisição", () => {
  it("caminho no bucket privado sempre começa pela pasta do usuário", () => {
    const p = radiologyStoragePath("user-123", "image/png", 2, 1700000000000);
    expect(p).toBe("user-123/rx/1700000000000-2.png");
    expect(radiologyStoragePath("u", "image/jpeg", 0, 1)).toMatch(/\.jpg$/);
    expect(radiologyStoragePath("u", "image/webp", 0, 1)).toMatch(/\.webp$/);
  });

  it("metadados da evidência registram modalidade e MIME", () => {
    expect(radiologyEvidenceMetadata("image/jpeg")).toMatchObject({ mode: RADIOLOGY_MODE, mime_type: "image/jpeg" });
  });

  it("corpo da requisição contém só texto do histórico, IDs e modo — nunca a imagem", () => {
    const body = buildRadiologyRequestBody({
      messages: [
        { role: "user", content: "olá" },
        { role: "system", content: "ignorar" },
        { role: "assistant", content: "resposta" },
      ],
      evidenceIds: ["a"],
      caseId: "case-1",
    });
    expect(body).toEqual({
      messages: [
        { role: "user", content: "olá" },
        { role: "assistant", content: "resposta" },
      ],
      evidenceIds: ["a"],
      outputMode: "auto",
      caseId: "case-1",
    });
    expect(buildRadiologyRequestBody({ messages: [], evidenceIds: [] })).not.toHaveProperty("caseId");
  });

  it("formata tamanhos para o rodapé da fila", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * MB)).toBe("3.5 MB");
  });
});

describe("Interpretador — contrato de formato do prompt", () => {
  const auto = buildRadiologySystemPrompt("auto");
  const quick = buildRadiologySystemPrompt("quick");
  const report = buildRadiologySystemPrompt("report");

  it("modo automático usa exatamente os blocos aprovados", () => {
    for (const block of [
      "TÉCNICA E QUALIDADE",
      "ACHADOS",
      "IMPRESSÃO",
      "ACHADOS CRÍTICOS",
      "LIMITAÇÕES",
      "CONFIANÇA",
      "CORRELAÇÃO CLÍNICA",
    ]) {
      expect(auto).toContain(block);
    }
    expect(auto).toContain("itens numerados");
    expect(auto).toContain("Presente");
    expect(auto).toContain("Não identificado");
  });

  it("modo rápido pede qualidade, até 3 achados, emergência e impressão curta", () => {
    expect(quick).toContain("no máximo 5 linhas");
    expect(quick).toContain("até 3 achados");
    expect(quick).toContain("Emergência radiográfica");
    expect(quick).toContain("Confiança: ALTA/MODERADA/BAIXA");
  });

  it("modo laudo usa exatamente EXAME/INDICAÇÃO/TÉCNICA/COMPARAÇÃO/ACHADOS/CONCLUSÃO", () => {
    for (const block of ["EXAME", "INDICAÇÃO", "TÉCNICA", "COMPARAÇÃO", "ACHADOS", "CONCLUSÃO"]) {
      expect(report).toContain(block);
    }
    expect(report).not.toContain("VIAS AÉREAS E DISPOSITIVOS");
    expect(report).not.toContain("ESQUELETO E PARTES MOLES");
  });

  it("mantém a segunda olhada obrigatória, porém interna e nunca impressa", () => {
    for (const prompt of [auto, quick, report]) {
      expect(prompt).toContain("Segunda olhada obrigatória (INTERNA, nunca impressa)");
      expect(prompt).toContain('não imprima "SEGUNDA OLHADA"');
      expect(prompt).not.toContain("SEGUNDA OLHADA (");
    }
  });

  it("não impõe disclaimer genérico ao final de toda resposta", () => {
    for (const prompt of [auto, quick, report]) {
      expect(prompt).not.toContain("ENCERRAMENTO OBRIGATÓRIO");
      expect(prompt).not.toContain("Segunda leitura assistida por IA.");
      expect(prompt).toContain("Não acrescente rodapé");
    }
  });

  it("não cria bloco de alerta fora da estrutura aprovada", () => {
    for (const prompt of [auto, quick, report]) {
      expect(prompt).not.toContain("ALERTA DE ACHADO CRÍTICO");
    }
  });

  it("cliente e núcleo compartilham a mesma taxonomia de origem", () => {
    expect(RADIOLOGY_ORIGIN).toBe("examinus_interpreter");
  });
});
