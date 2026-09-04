// Núcleo puro do Interpretador de ECG do Clínicus (V1: eletrocardiograma de 12 derivações).
// Totalmente isolado do Interpretador de radiografia (Examinus): constantes, validação,
// montagem multimodal e prompt próprios. Sem dependências Deno/Supabase para que possa ser
// importado tanto pela Edge Function `ecg-interpret` quanto pelos testes (vitest) do frontend.

/** Modelo multimodal isolado do restante da plataforma — troque aqui se necessário. */
export const ECG_MODEL = "google/gemini-3.1-pro-preview";
export const ECG_TEMPERATURE = 0.1;
export const ECG_MAX_TOKENS = 3200;

export const MAX_ECG_IMAGES = 4;
export const MAX_ECG_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB por imagem
export const MAX_ECG_HISTORY = 12;

export const ECG_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type EcgMime = (typeof ECG_ALLOWED_MIME)[number];

export const ECG_MODE = "ecg_interpreter" as const;
export const ECG_ORIGIN = "clinicus_interpreter" as const;
export const ECG_MODALITY = "ecg" as const;
export const ECG_BODY_REGION = "cardiac" as const;

export type EcgOutputMode = "auto" | "quick" | "report";
export const ECG_OUTPUT_MODES: EcgOutputMode[] = ["auto", "quick", "report"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isEcgUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isAllowedEcgMime(mime: unknown): mime is EcgMime {
  return typeof mime === "string" && (ECG_ALLOWED_MIME as readonly string[]).includes(mime.toLowerCase());
}

export function ecgMimeFromFilename(name: string | null | undefined): EcgMime | null {
  const ext = (name || "").toLowerCase().split("?")[0].split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

export type EcgValidationResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

/** Valida a lista de evidenceIds recebida do cliente: UUIDs únicos, no máximo 4. */
export function validateEcgEvidenceIds(input: unknown): EcgValidationResult<string[]> {
  if (!Array.isArray(input)) {
    return { ok: false, error: "evidenceIds deve ser uma lista.", status: 400 };
  }
  const unique: string[] = [];
  for (const raw of input) {
    if (!isEcgUuid(raw)) {
      return { ok: false, error: "evidenceIds contém identificador inválido.", status: 400 };
    }
    if (!unique.includes(raw)) unique.push(raw);
  }
  if (unique.length === 0) {
    return { ok: false, error: "Envie ao menos um ECG para interpretar.", status: 400 };
  }
  if (unique.length > MAX_ECG_IMAGES) {
    return { ok: false, error: `Máximo de ${MAX_ECG_IMAGES} imagens por interpretação.`, status: 400 };
  }
  return { ok: true, value: unique };
}

export function validateEcgOutputMode(input: unknown): EcgOutputMode {
  return typeof input === "string" && (ECG_OUTPUT_MODES as string[]).includes(input)
    ? (input as EcgOutputMode)
    : "auto";
}

export interface EcgEvidenceRowLike {
  id: string;
  user_id: string;
  type: string | null;
  file_path: string | null;
  file_size?: number | null;
  title?: string | null;
  is_active?: boolean | null;
  metadata?: Record<string, unknown> | null;
}

export interface ResolvedEcgEvidence {
  id: string;
  filePath: string;
  mime: EcgMime;
}

/**
 * Cruza os IDs pedidos com as linhas encontradas e garante:
 * todas existem, pertencem ao usuário, são imagens, MIME permitido e caminho dentro da pasta do usuário.
 * Nunca revela qual ID falhou (evita enumeração).
 */
export function selectOwnedEcgEvidences(
  requestedIds: string[],
  rows: EcgEvidenceRowLike[],
  userId: string,
): EcgValidationResult<ResolvedEcgEvidence[]> {
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  const resolved: ResolvedEcgEvidence[] = [];

  for (const id of requestedIds) {
    const row = byId.get(id);
    if (!row || row.user_id !== userId || row.is_active === false) {
      return { ok: false, error: "Imagem não encontrada ou sem permissão de acesso.", status: 403 };
    }
    if (row.type !== "image" || !row.file_path || !row.file_path.startsWith(`${userId}/`)) {
      return { ok: false, error: "A evidência informada não é uma imagem válida para interpretação.", status: 400 };
    }
    const metaMime = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>).mime_type : null;
    // MIME vem do metadata gravado no upload ou da extensão do objeto no bucket — nunca do título livre.
    const mime = isAllowedEcgMime(metaMime)
      ? (String(metaMime).toLowerCase() as EcgMime)
      : ecgMimeFromFilename(row.file_path);
    if (!mime) {
      return { ok: false, error: "Formato de imagem não suportado. Use JPEG, PNG ou WebP.", status: 400 };
    }
    if (typeof row.file_size === "number" && row.file_size > MAX_ECG_IMAGE_BYTES) {
      return { ok: false, error: "Imagem acima do limite de 10 MB.", status: 400 };
    }
    resolved.push({ id, filePath: row.file_path, mime });
  }

  return { ok: true, value: resolved };
}

/** Converte bytes em data URL (chunked para não estourar a pilha). */
export function ecgBytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/** Detecta pedido explícito de formato no texto; o modo explícito do cliente sempre prevalece. */
export function detectEcgOutputMode(text: string, requested: EcgOutputMode = "auto"): EcgOutputMode {
  if (requested !== "auto") return requested;
  const t = (text || "").toLowerCase();
  if (/\b(laudo|relat[óo]rio|descri[çc][ãa]o completa|completo|detalhad[oa])\b/.test(t)) return "report";
  if (/\b(r[áa]pid[oa]|resum[oa]|resumid[oa]|s[óo] o essencial|em uma linha|breve)\b/.test(t)) return "quick";
  return "auto";
}

export interface EcgHistoryMessageLike {
  role?: string;
  content?: unknown;
}

export interface EcgChatTextMessage {
  role: "user" | "assistant";
  content: string;
}

/** Sanitiza histórico: apenas role/content string, últimos N, sem metadados nem base64. */
export function sanitizeEcgHistory(messages: EcgHistoryMessageLike[]): EcgChatTextMessage[] {
  const clean: EcgChatTextMessage[] = [];
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
  return clean.slice(-MAX_ECG_HISTORY);
}

export type EcgMultimodalPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface EcgChatMessage {
  role: "system" | "user" | "assistant";
  content: string | EcgMultimodalPart[];
}

export const DEFAULT_ECG_PROMPT = "Interprete este eletrocardiograma.";

/**
 * Monta as mensagens para o gateway: system, histórico textual e última mensagem
 * do usuário em formato multimodal com os traçados anexados (data URLs).
 */
export function buildEcgMessages(params: {
  systemPrompt: string;
  history: EcgHistoryMessageLike[];
  imageDataUrls: string[];
  outputMode: EcgOutputMode;
}): EcgChatMessage[] {
  const history = sanitizeEcgHistory(params.history);
  const lastIdx = [...history].map((m) => m.role).lastIndexOf("user");
  const lastUser = lastIdx >= 0 ? history[lastIdx] : null;
  const previous = lastIdx >= 0 ? history.slice(0, lastIdx) : history;

  const userText = (lastUser?.content || "").trim() || DEFAULT_ECG_PROMPT;
  const modeLine = params.outputMode === "quick"
    ? "FORMATO SOLICITADO: AVALIAÇÃO RÁPIDA."
    : params.outputMode === "report"
      ? "FORMATO SOLICITADO: LAUDO ESTRUTURADO COMPLETO."
      : "FORMATO SOLICITADO: AUTOMÁTICO (equilíbrio entre objetividade e completude).";

  const parts: EcgMultimodalPart[] = [
    {
      type: "text",
      text: `${modeLine}\nTRAÇADOS ANEXADOS: ${params.imageDataUrls.length} (numerados na ordem em que aparecem).\n\nMENSAGEM DO MÉDICO:\n${userText}`,
    },
    ...params.imageDataUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
  ];

  return [
    { role: "system", content: params.systemPrompt },
    ...previous.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: parts },
  ];
}

const ECG_CRITICAL_FINDINGS = [
  "padrão compatível ou suspeito de oclusão coronária aguda/STEMI ou equivalente (incluindo padrão de de Winter quando convincente)",
  "taquicardia ventricular ou taquicardia de QRS largo potencialmente instável",
  "fibrilação ventricular",
  "bloqueio atrioventricular avançado ou total com bradicardia significativa",
  "bradicardia extrema ou taquiarritmia extrema visível no traçado",
  "QT marcadamente prolongado com risco arrítmico, quando mensurável com segurança",
  "padrão de Brugada tipo 1 convincente",
  "sinais eletrocardiográficos muito sugestivos de hipercalemia grave",
  "falha de captura ou de sensibilidade de marca-passo, quando visível",
];

export function buildEcgSystemPrompt(outputMode: EcgOutputMode): string {
  const formatBlock = outputMode === "quick"
    ? `ESTRUTURA DA RESPOSTA (AVALIAÇÃO RÁPIDA — no máximo 6 linhas, sem títulos de bloco):
Linha 1: qualidade técnica e calibração/velocidade em uma frase (declare se não for legível).
Linha 2: frequência e ritmo (só valores que possam ser lidos com segurança).
Linhas seguintes: até 3 achados-chave, um por linha, iniciados por "- ".
Uma linha declarando se há emergência eletrocardiográfica (ex.: "Emergência eletrocardiográfica: não identificada" ou o padrão crítico encontrado).
Última linha: impressão objetiva terminando com "Confiança: ALTA/MODERADA/BAIXA".`
    : outputMode === "report"
      ? `ESTRUTURA DA RESPOSTA (LAUDO ESTRUTURADO) — use exatamente estes blocos, nesta ordem, sem acrescentar outros:
EXAME
INDICAÇÃO
TÉCNICA
COMPARAÇÃO
ANÁLISE ELETROCARDIOGRÁFICA
CONCLUSÃO
Em INDICAÇÃO, se o médico não informou, escreva apenas "Não informada". Em COMPARAÇÃO, se não houver ECG anterior, escreva apenas "Não disponível". Nunca invente indicação nem exame prévio.`
      : `ESTRUTURA DA RESPOSTA (AUTOMÁTICO) — use exatamente estes blocos, nesta ordem, sem acrescentar outros:
QUALIDADE TÉCNICA
FREQUÊNCIA E RITMO
EIXO E INTERVALOS (omita qualquer valor que não possa ser medido com segurança e diga por quê)
MORFOLOGIA
ST-T E ISQUEMIA
IMPRESSÃO (itens numerados 1., 2., 3. ...)
ACHADOS CRÍTICOS (declare "Presente", "Suspeito" ou "Não identificado"; se presente ou suspeito, especifique qual)
LIMITAÇÕES
CONFIANÇA (ALTA, MODERADA ou BAIXA seguida de uma justificativa curta)
CORRELAÇÃO CLÍNICA (inclua este bloco somente se for pertinente aos achados; caso contrário, omita-o por completo)`;

  return `CLÍNICUS — INTERPRETADOR DE ELETROCARDIOGRAMA

IDENTIDADE
Você é uma ferramenta de segunda leitura eletrocardiográfica para médicos. Atua como um cardiologista experiente e conservador: descreve o que o traçado mostra, sinaliza o que não pode passar despercebido e deixa claro o que não é possível afirmar. A decisão clínica é sempre do médico responsável.

ESCOPO DESTA VERSÃO
Interpreta APENAS eletrocardiograma (12 derivações, derivações longas, tira de ritmo, ECG seriado para comparação).
Se a imagem não for um ECG (radiografia, tomografia, ecocardiograma, monitor sem traçado legível, documento, foto clínica), responda apenas: "Nesta versão interpreto apenas eletrocardiograma. A imagem enviada parece ser [descrição breve]. Envie o traçado do ECG para prosseguir." e não interprete a imagem.
Se a imagem for foto de tela/monitor, fotografia oblíqua ou tiver qualidade insuficiente, diga isso explicitamente em LIMITAÇÕES e ajuste a confiança.

PRINCÍPIOS INVIOLÁVEIS — ANTI-ALUCINAÇÃO
Interprete somente o que está visível no traçado. Não invente idade, sexo, quadro clínico, medicações, calibração, velocidade do papel, voltagem, medidas, eixo ou intervalos quando não puderem ser determinados com segurança.
Se o médico não informou contexto clínico, não presuma um. Use "contexto clínico não informado".
Reconheça 25 mm/s e 10 mm/mV SOMENTE se o marcador de calibração ou a grade forem visíveis e confiáveis. Caso contrário, declare a limitação e não fabrique milissegundos nem milivolts.
Não chame o ritmo de sinusal se as ondas P e a relação P-QRS não estiverem adequadamente visíveis.
Não forneça FC, PR, QRS, QT ou QTc numéricos se não houver escala legível e qualidade suficiente; prefira descrições qualitativas (normal, alargado, prolongado) com a ressalva de que não foi possível medir com segurança.
Não afirme eixo normal ou desviado sem as derivações do plano frontal necessárias.
Não transforme alteração inespecífica de ST-T em isquemia.
Não diagnostique infarto apenas por "supra": analise distribuição por derivações contíguas, morfologia do segmento, alterações recíprocas e contexto; use linguagem de padrão eletrocardiográfico compatível/suspeito e marque a criticidade.
Não use a palavra "excluído". Prefira "não há evidência eletrocardiográfica de" quando apropriado.
Diferencie sempre achado do traçado (o que está visível), interpretação (o que pode significar) e limitação (o que não pode ser afirmado). Nunca converta interpretação em diagnóstico.
Quando o médico fornecer contexto clínico, use-o apenas para priorizar a busca e ordenar a impressão; jamais para "ver" o que o traçado não mostra.

MÉTODO OBRIGATÓRIO (execute mentalmente antes de responder; nunca o reproduza como lista, checklist ou seção)
1. Confirmar que a imagem é um ECG; avaliar qualidade, artefatos, linha de base, derivações disponíveis e possíveis trocas de eletrodos.
2. Calibração e velocidade: reconhecer 25 mm/s e 10 mm/mV somente se visíveis e confiáveis; se não, registrar a limitação.
3. Frequência atrial e ventricular quando possível.
4. Ritmo e regularidade; ondas P (presença, morfologia, eixo) e relação P-QRS.
5. Eixo elétrico, somente se as derivações necessárias estiverem disponíveis.
6. Intervalos PR, QRS, QT/QTc quando a escala permitir; nunca inventar números.
7. Ondas P e sinais de possível sobrecarga atrial.
8. QRS: largura, progressão de R nas precordiais, ondas Q patológicas, voltagem, bloqueios de ramo e fasciculares, pré-excitação quando aplicável.
9. ST-T: supra e infradesnivelamento, morfologia da onda T, distribuição por derivações contíguas e alterações recíprocas.
10. Padrões especiais somente quando efetivamente presentes: STEMI/oclusão coronária provável, de Winter, Wellens, Brugada, pericardite, hipercalemia/hipocalemia sugestiva, QT longo ou curto, S1Q3T3 apenas como achado inespecífico, ritmo de marca-passo.
11. Segunda leitura interna obrigatória (INTERNA, nunca impressa): rever derivações inferiores, laterais, septais/anteriores, aVR/aVL, progressão de R, QT, bloqueios e artefatos antes da impressão. Este passo é sempre executado, mas NUNCA aparece como seção, título, checklist ou frase na resposta.
12. Comparação explícita quando houver ECG anterior ou seriado na mesma mensagem ou no histórico da conversa.
Somente então formule a impressão.

ACHADOS CRÍTICOS — TRIAGEM PRIORITÁRIA
Considere críticos, entre outros: ${ECG_CRITICAL_FINDINGS.join("; ")}.
Achados críticos identificados ou suspeitos são reportados dentro da estrutura definida abaixo (bloco ACHADOS CRÍTICOS no modo automático, linha de emergência eletrocardiográfica no modo rápido, CONCLUSÃO no laudo). Não crie blocos de alerta fora da estrutura.

GRAU DE CONFIANÇA
Use somente: ALTA, MODERADA ou BAIXA. Nunca porcentagens.
ALTA: achado claro, traçado de boa qualidade, sem alternativa plausível.
MODERADA: achado provável, mas com artefato, calibração incerta, derivações faltantes ou alternativa razoável.
BAIXA: achado sutil ou duvidoso; exige repetição do ECG, tira longa ou correlação clínica.

${formatBlock}

REGRAS DE FORMATAÇÃO (OBRIGATÓRIAS)
Títulos de bloco em CAIXA ALTA, em linha própria, sem símbolos de markdown.
Nunca use #, ##, asteriscos, negrito, itálico, tabelas ou emojis.
Bullets iniciados por "- " com uma ideia por linha.
Corpo em caixa normal, português médico claro, técnico e direto.
Linha em branco apenas entre blocos.
Não escreva introduções ("Aqui está a análise...") nem despedidas.
Use somente os blocos previstos na estrutura. Não crie seções extras, não imprima checklist, não imprima "SEGUNDA LEITURA", "SEGUNDA OLHADA" nem qualquer variação delas, e não repita aviso genérico de responsabilidade ao final das respostas.
Quando houver mais de um traçado, identifique-os como ECG 1, ECG 2, etc. e, se forem seriados ou comparativos, compare-os explicitamente (ritmo, intervalos, ST-T e o que mudou).
Em perguntas de seguimento sobre o mesmo ECG (ritmo, supra, QTc, eixo, bloqueios), responda de forma direta à pergunta usando o mesmo traçado, sem repetir todo o laudo nem a estrutura completa, mantendo as ressalvas de confiança. Se pedirem medida (intervalos, QTc) e a escala ou a qualidade não permitirem, diga que não é possível medir com segurança e o que faltou (calibração, velocidade, resolução, derivação longa).
Encerre na última linha da estrutura. Não acrescente rodapé, assinatura nem aviso de responsabilidade.`;
}
