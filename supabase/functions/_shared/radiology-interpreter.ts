// Núcleo puro do Modo Interpretador do Examinus (V1: radiografia de tórax).
// Sem dependências Deno/Supabase para que possa ser importado tanto pela Edge Function
// quanto pelos testes (vitest) do frontend.

/** Modelo multimodal isolado do restante da plataforma — troque aqui se necessário. */
export const RADIOLOGY_MODEL = "google/gemini-3.1-pro-preview";
export const RADIOLOGY_TEMPERATURE = 0.1;
export const RADIOLOGY_MAX_TOKENS = 3200;

export const MAX_RADIOLOGY_IMAGES = 4;
export const MAX_RADIOLOGY_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB por imagem
export const MAX_RADIOLOGY_HISTORY = 12;

export const RADIOLOGY_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type RadiologyMime = (typeof RADIOLOGY_ALLOWED_MIME)[number];

export const RADIOLOGY_MODE = "radiology_interpreter" as const;
export const RADIOLOGY_ORIGIN = "examinus_interpreter" as const;
export const RADIOLOGY_MODALITY = "xray" as const;
export const RADIOLOGY_BODY_REGION = "chest" as const;

export type RadiologyOutputMode = "auto" | "quick" | "report";
export const RADIOLOGY_OUTPUT_MODES: RadiologyOutputMode[] = ["auto", "quick", "report"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isAllowedRadiologyMime(mime: unknown): mime is RadiologyMime {
  return typeof mime === "string" && (RADIOLOGY_ALLOWED_MIME as readonly string[]).includes(mime.toLowerCase());
}

export function mimeFromFilename(name: string | null | undefined): RadiologyMime | null {
  const ext = (name || "").toLowerCase().split("?")[0].split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

/** Valida a lista de evidenceIds recebida do cliente: UUIDs únicos, no máximo 4. */
export function validateEvidenceIds(input: unknown): ValidationResult<string[]> {
  if (!Array.isArray(input)) {
    return { ok: false, error: "evidenceIds deve ser uma lista.", status: 400 };
  }
  const unique: string[] = [];
  for (const raw of input) {
    if (!isUuid(raw)) {
      return { ok: false, error: "evidenceIds contém identificador inválido.", status: 400 };
    }
    if (!unique.includes(raw)) unique.push(raw);
  }
  if (unique.length === 0) {
    return { ok: false, error: "Envie ao menos uma radiografia para interpretar.", status: 400 };
  }
  if (unique.length > MAX_RADIOLOGY_IMAGES) {
    return { ok: false, error: `Máximo de ${MAX_RADIOLOGY_IMAGES} imagens por interpretação.`, status: 400 };
  }
  return { ok: true, value: unique };
}

export function validateOutputMode(input: unknown): RadiologyOutputMode {
  return typeof input === "string" && (RADIOLOGY_OUTPUT_MODES as string[]).includes(input)
    ? (input as RadiologyOutputMode)
    : "auto";
}

export interface EvidenceRowLike {
  id: string;
  user_id: string;
  type: string | null;
  file_path: string | null;
  file_size?: number | null;
  title?: string | null;
  is_active?: boolean | null;
  metadata?: Record<string, unknown> | null;
}

export interface ResolvedRadiologyEvidence {
  id: string;
  filePath: string;
  mime: RadiologyMime;
}

/**
 * Cruza os IDs pedidos com as linhas encontradas e garante:
 * todas existem, pertencem ao usuário, são imagens, MIME permitido e caminho dentro da pasta do usuário.
 * Nunca revela qual ID falhou (evita enumeração).
 */
export function selectOwnedRadiologyEvidences(
  requestedIds: string[],
  rows: EvidenceRowLike[],
  userId: string,
): ValidationResult<ResolvedRadiologyEvidence[]> {
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  const resolved: ResolvedRadiologyEvidence[] = [];

  for (const id of requestedIds) {
    const row = byId.get(id);
    if (!row || row.user_id !== userId || row.is_active === false) {
      return { ok: false, error: "Imagem não encontrada ou sem permissão de acesso.", status: 403 };
    }
    if (row.type !== "image" || !row.file_path || !row.file_path.startsWith(`${userId}/`)) {
      return { ok: false, error: "A evidência informada não é uma imagem válida para interpretação.", status: 400 };
    }
    const metaMime = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>).mime_type : null;
    const mime = isAllowedRadiologyMime(metaMime) ? (String(metaMime).toLowerCase() as RadiologyMime) : mimeFromFilename(row.file_path) ?? mimeFromFilename(row.title);
    if (!mime) {
      return { ok: false, error: "Formato de imagem não suportado. Use JPEG, PNG ou WebP.", status: 400 };
    }
    if (typeof row.file_size === "number" && row.file_size > MAX_RADIOLOGY_IMAGE_BYTES) {
      return { ok: false, error: "Imagem acima do limite de 10 MB.", status: 400 };
    }
    resolved.push({ id, filePath: row.file_path, mime });
  }

  return { ok: true, value: resolved };
}

/** Converte bytes em data URL (chunked para não estourar a pilha). */
export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/** Detecta pedido explícito de formato no texto; o modo explícito do cliente sempre prevalece. */
export function detectOutputMode(text: string, requested: RadiologyOutputMode = "auto"): RadiologyOutputMode {
  if (requested !== "auto") return requested;
  const t = (text || "").toLowerCase();
  if (/\b(laudo|relat[óo]rio|descri[çc][ãa]o completa|completo|detalhad[oa])\b/.test(t)) return "report";
  if (/\b(r[áa]pid[oa]|resum[oa]|resumid[oa]|s[óo] o essencial|em uma linha|breve)\b/.test(t)) return "quick";
  return "auto";
}

export interface HistoryMessageLike {
  role?: string;
  content?: unknown;
}

export interface ChatTextMessage {
  role: "user" | "assistant";
  content: string;
}

/** Sanitiza histórico: apenas role/content string, últimos N, sem metadados nem base64. */
export function sanitizeHistory(messages: HistoryMessageLike[]): ChatTextMessage[] {
  const clean: ChatTextMessage[] = [];
  for (const m of messages || []) {
    if (m?.role !== "user" && m?.role !== "assistant") continue;
    const content = typeof m.content === "string"
      ? m.content
      : Array.isArray(m.content)
        ? (m.content as Array<{ text?: string }>).map((p) => p?.text || "").join(" ")
        : "";
    const trimmed = content.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, "[imagem]").slice(0, 8000);
    if (!trimmed.trim()) continue;
    clean.push({ role: m.role, content: trimmed });
  }
  return clean.slice(-MAX_RADIOLOGY_HISTORY);
}

export type MultimodalPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface RadiologyChatMessage {
  role: "system" | "user" | "assistant";
  content: string | MultimodalPart[];
}

export const DEFAULT_RADIOLOGY_PROMPT = "Interprete esta radiografia de tórax.";

/**
 * Monta as mensagens para o gateway: system, histórico textual e última mensagem
 * do usuário em formato multimodal com as imagens anexadas (data URLs).
 */
export function buildRadiologyMessages(params: {
  systemPrompt: string;
  history: HistoryMessageLike[];
  imageDataUrls: string[];
  outputMode: RadiologyOutputMode;
}): RadiologyChatMessage[] {
  const history = sanitizeHistory(params.history);
  const lastIdx = [...history].map((m) => m.role).lastIndexOf("user");
  const lastUser = lastIdx >= 0 ? history[lastIdx] : null;
  const previous = lastIdx >= 0 ? history.slice(0, lastIdx) : history;

  const userText = (lastUser?.content || "").trim() || DEFAULT_RADIOLOGY_PROMPT;
  const modeLine = params.outputMode === "quick"
    ? "FORMATO SOLICITADO: AVALIAÇÃO RÁPIDA."
    : params.outputMode === "report"
      ? "FORMATO SOLICITADO: LAUDO ESTRUTURADO COMPLETO."
      : "FORMATO SOLICITADO: AUTOMÁTICO (equilíbrio entre objetividade e completude).";

  const parts: MultimodalPart[] = [
    {
      type: "text",
      text: `${modeLine}\nIMAGENS ANEXADAS: ${params.imageDataUrls.length} (numeradas na ordem em que aparecem).\n\nMENSAGEM DO MÉDICO:\n${userText}`,
    },
    ...params.imageDataUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
  ];

  return [
    { role: "system", content: params.systemPrompt },
    ...previous.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: parts },
  ];
}

const CRITICAL_FINDINGS = [
  "pneumotórax (qualquer volume; hipertensivo com desvio mediastinal é emergência)",
  "pneumomediastino ou enfisema subcutâneo extenso",
  "pneumoperitônio / ar livre subdiafragmático",
  "derrame pleural volumoso ou hemitórax opaco (velamento total) com desvio mediastinal",
  "alargamento mediastinal suspeito de dissecção ou lesão aórtica em contexto agudo",
  "tubo orotraqueal mal posicionado (seletivo, muito alto ou fora da traqueia)",
  "cateter venoso central, dreno, sonda ou marca-passo em posição anômala",
  "corpo estranho radiopaco em via aérea",
  "consolidação extensa/multilobar em paciente instável",
  "edema pulmonar franco de instalação aguda",
  "fratura de múltiplos arcos costais com tórax instável ou fratura de esterno/coluna",
];

export function buildRadiologySystemPrompt(outputMode: RadiologyOutputMode): string {
  const formatBlock = outputMode === "quick"
    ? `ESTRUTURA DA RESPOSTA (AVALIAÇÃO RÁPIDA — no máximo 5 linhas, sem títulos de bloco):
Linha 1: qualidade técnica em uma frase.
Linhas seguintes: até 3 achados relevantes, um por linha, iniciados por "- ".
Uma linha declarando se há emergência radiográfica (ex.: "Emergência radiográfica: não identificada" ou o achado emergencial).
Última linha: impressão objetiva terminando com "Confiança: ALTA/MODERADA/BAIXA".`
    : outputMode === "report"
      ? `ESTRUTURA DA RESPOSTA (LAUDO ESTRUTURADO) — use exatamente estes blocos, nesta ordem, sem acrescentar outros:
EXAME
INDICAÇÃO
TÉCNICA
COMPARAÇÃO
ACHADOS
CONCLUSÃO`
      : `ESTRUTURA DA RESPOSTA (AUTOMÁTICO) — use exatamente estes blocos, nesta ordem, sem acrescentar outros:
TÉCNICA E QUALIDADE
ACHADOS
IMPRESSÃO (itens numerados 1., 2., 3. ...)
ACHADOS CRÍTICOS (declare "Presente", "Suspeito" ou "Não identificado"; se presente ou suspeito, especifique qual)
LIMITAÇÕES
CONFIANÇA (ALTA, MODERADA ou BAIXA seguida de uma justificativa curta)
CORRELAÇÃO CLÍNICA (inclua este bloco somente se for pertinente aos achados; caso contrário, omita-o por completo)`;

  return `EXAMINUS — MODO INTERPRETADOR DE RADIOGRAFIA DE TÓRAX

IDENTIDADE
Você é um assistente de segunda leitura de radiografia de tórax para médicos. Atua como um radiologista experiente e conservador: descreve o que a imagem mostra, sinaliza o que não pode passar despercebido e deixa claro o que não é possível afirmar. A decisão clínica é sempre do médico responsável.

ESCOPO DESTA VERSÃO
Interpreta APENAS radiografia de tórax (PA, AP, perfil, portátil, decúbito).
Se a imagem não for uma radiografia de tórax (TC, RM, USG, ECG, foto clínica, documento, outra região), responda apenas: "Nesta versão interpreto apenas radiografia de tórax. A imagem enviada parece ser [descrição breve]. Envie a radiografia de tórax para prosseguir." e não interprete a imagem.
Se a imagem for uma foto de tela/negatoscópio ou tiver qualidade insuficiente, diga isso explicitamente em LIMITAÇÕES e ajuste a confiança.

PRINCÍPIOS INVIOLÁVEIS — ANTI-ALUCINAÇÃO
Descreva apenas o que é visível na imagem. Não invente idade, sexo, indicação clínica, história, sintomas, exames anteriores, medidas em milímetros ou laudos prévios.
Se o médico não informou contexto clínico, não presuma um. Use "contexto clínico não informado".
Não estime medidas numéricas precisas (mm, cm, ICT em número). Use descrições qualitativas (discreto, moderado, acentuado).
Em incidência AP ou portátil, seja explicitamente cauteloso: a silhueta cardíaca e o mediastino podem parecer aumentados; a inspiração costuma ser limitada; não afirme cardiomegalia sem ressalva.
Diferencie sempre "achado" (o que está na imagem) de "hipótese" (o que ele pode significar). Nunca converta hipótese em diagnóstico.
Nunca conclua "sem alterações" sem ter revisado explicitamente as áreas de segunda olhada.
Se houver dúvida real entre achado e artefato/sobreposição, diga que há dúvida e indique como resolver (incidência adicional, comparação com exame prévio, TC).
Quando o médico fornecer contexto clínico, use-o apenas para priorizar a busca e ordenar a impressão; jamais para "ver" o que a imagem não mostra.

MÉTODO OBRIGATÓRIO (execute mentalmente antes de responder)
1. Qualidade técnica: identificação de incidência, rotação (clavículas x processos espinhosos), inspiração (arcos costais posteriores visíveis), penetração (corpos vertebrais atrás do coração), portátil quando houver marcadores, artefatos e cortes de campo.
2. Revisão sistemática A-F: A (vias aéreas: traqueia, carina, brônquios principais), B (respiração: parênquima, pleura, seios costofrênicos, ápices), C (circulação: coração, mediastino, hilos, aorta, vasos), D (diafragma: cúpulas, ar livre, contornos), E (esqueleto e partes moles), F (dispositivos, tubos, linhas e corpos estranhos).
3. Segunda olhada obrigatória (INTERNA, nunca impressa) nas áreas de erro frequente: ápices (atrás das clavículas), região retrocardíaca, abaixo das cúpulas, seios costofrênicos, hilos, ossos, e trajeto de cada dispositivo. Este passo é sempre executado, mas NUNCA aparece como seção, título, checklist ou frase na resposta.
4. Somente então formule a impressão.

ACHADOS CRÍTICOS — TRIAGEM PRIORITÁRIA
Considere críticos, entre outros: ${CRITICAL_FINDINGS.join("; ")}.
Achados críticos identificados ou suspeitos são reportados dentro da estrutura definida abaixo (bloco ACHADOS CRÍTICOS no modo automático, linha de emergência radiográfica no modo rápido, CONCLUSÃO no laudo). Não crie blocos de alerta fora da estrutura.

GRAU DE CONFIANÇA
Use somente: ALTA, MODERADA ou BAIXA. Nunca porcentagens.
ALTA: achado claro, sem alternativa plausível.
MODERADA: achado provável, mas com sobreposição, qualidade limitada ou alternativa razoável.
BAIXA: achado sutil ou duvidoso; exige confirmação.

${formatBlock}

REGRAS DE FORMATAÇÃO (OBRIGATÓRIAS)
Títulos de bloco em CAIXA ALTA, em linha própria, sem símbolos de markdown.
Nunca use #, ##, asteriscos, negrito, itálico, tabelas ou emojis.
Bullets iniciados por "- " com uma ideia por linha.
Corpo em caixa normal, português médico claro e direto.
Linha em branco apenas entre blocos.
Não escreva introduções ("Aqui está a análise...") nem despedidas.
Use somente os blocos previstos na estrutura. Não crie seções extras, não imprima checklist, não imprima "SEGUNDA OLHADA" nem qualquer variação dela, e não repita aviso genérico de responsabilidade ao final das respostas.
Quando houver mais de uma imagem, identifique-as como IMAGEM 1, IMAGEM 2, etc. e, se forem incidências complementares (PA + perfil) ou evolução temporal, compare-as explicitamente.
Em perguntas de seguimento sobre a mesma radiografia, responda de forma direta à pergunta sem repetir todo o laudo nem a estrutura completa, mantendo as ressalvas de confiança.
Encerre na última linha da estrutura. Não acrescente rodapé, assinatura nem aviso de responsabilidade.`;
}
