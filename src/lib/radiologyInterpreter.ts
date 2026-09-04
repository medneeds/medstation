// Regras puras do Modo Interpretador (Examinus) no cliente.
// Reexporta constantes do núcleo compartilhado para manter cliente e Edge Function alinhados.
import {
  DEFAULT_RADIOLOGY_PROMPT,
  MAX_RADIOLOGY_IMAGES,
  MAX_RADIOLOGY_IMAGE_BYTES,
  RADIOLOGY_ALLOWED_MIME,
  RADIOLOGY_BODY_REGION,
  RADIOLOGY_MODALITY,
  RADIOLOGY_MODE,
  RADIOLOGY_ORIGIN,
  isAllowedRadiologyMime,
  mimeFromFilename,
  type RadiologyMime,
  type RadiologyOutputMode,
} from "../../supabase/functions/_shared/radiology-interpreter";

export {
  DEFAULT_RADIOLOGY_PROMPT,
  MAX_RADIOLOGY_IMAGES,
  MAX_RADIOLOGY_IMAGE_BYTES,
  RADIOLOGY_ALLOWED_MIME,
  RADIOLOGY_MODE,
  RADIOLOGY_ORIGIN,
  isAllowedRadiologyMime,
};
export type { RadiologyMime, RadiologyOutputMode };

/** Valor do atributo `accept` do input de arquivo enquanto o Interpretador está ativo. */
export const RADIOLOGY_ACCEPT_ATTR = RADIOLOGY_ALLOWED_MIME.join(",");

export interface ExaminusModes {
  examSuggestMode: boolean;
  radiologyInterpretMode: boolean;
}

/**
 * Consultor e Interpretador são mutuamente exclusivos.
 * Ligar um desliga o outro; desligar não toca no outro.
 */
export function resolveExaminusModes(
  current: ExaminusModes,
  change: { consultor?: boolean; interpretador?: boolean },
): ExaminusModes {
  let next = { ...current };
  if (typeof change.consultor === "boolean") {
    next = { examSuggestMode: change.consultor, radiologyInterpretMode: change.consultor ? false : next.radiologyInterpretMode };
  }
  if (typeof change.interpretador === "boolean") {
    next = { radiologyInterpretMode: change.interpretador, examSuggestMode: change.interpretador ? false : next.examSuggestMode };
  }
  return next;
}

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

export type RadiologyFileValidation = { ok: true; mime: RadiologyMime } | { ok: false; reason: string };

/** Aceita apenas JPEG/PNG/WebP até 10 MB. PDF, DICOM, HEIC, GIF etc. são rejeitados. */
export function validateRadiologyFile(file: FileLike): RadiologyFileValidation {
  const declared = (file.type || "").toLowerCase();
  const mime: RadiologyMime | null = isAllowedRadiologyMime(declared)
    ? (declared as RadiologyMime)
    : declared === "" || declared === "application/octet-stream"
      ? mimeFromFilename(file.name)
      : null;

  if (!mime) {
    return { ok: false, reason: `"${file.name}" não é suportado. Envie a radiografia em JPEG, PNG ou WebP (sem PDF ou DICOM nesta versão).` };
  }
  if (file.size <= 0) {
    return { ok: false, reason: `"${file.name}" está vazio.` };
  }
  if (file.size > MAX_RADIOLOGY_IMAGE_BYTES) {
    return { ok: false, reason: `"${file.name}" excede 10 MB.` };
  }
  return { ok: true, mime };
}

/**
 * Decide para onde vão os arquivos soltos/selecionados no Examinus.
 * Com o Interpretador ativo, NENHUM arquivo vai para OCR.
 */
export function routeExaminusFiles<T extends FileLike>(
  files: T[],
  modes: { radiologyInterpretMode: boolean },
): { radiology: T[]; ocr: T[] } {
  if (modes.radiologyInterpretMode) return { radiology: files, ocr: [] };
  return { radiology: [], ocr: files };
}

/** Valida os arquivos recebidos e limita a fila de anexos pendentes a 4; devolve o que ficou de fora e por quê. */
export function appendRadiologyFiles<T extends FileLike>(
  pendingCount: number,
  incoming: T[],
): { accepted: { file: T; mime: RadiologyMime }[]; rejected: { file: T; reason: string }[] } {
  const accepted: { file: T; mime: RadiologyMime }[] = [];
  const rejected: { file: T; reason: string }[] = [];
  let slots = Math.max(0, MAX_RADIOLOGY_IMAGES - pendingCount);
  for (const file of incoming) {
    const validation = validateRadiologyFile(file);
    if (validation.ok === false) {
      rejected.push({ file, reason: validation.reason });
      continue;
    }
    if (slots <= 0) {
      rejected.push({ file, reason: `Máximo de ${MAX_RADIOLOGY_IMAGES} imagens por interpretação.` });
      continue;
    }
    slots -= 1;
    accepted.push({ file, mime: validation.mime });
  }
  return { accepted, rejected };
}

/** Pode enviar sem texto quando há imagem pendente ou radiografia já anexada na conversa. */
export function canSendRadiologyMessage(input: { text: string; pendingCount: number; historicalCount: number }): boolean {
  if (input.pendingCount > 0) return true;
  return input.text.trim().length > 0 && input.historicalCount > 0;
}

export function normalizeRadiologyPrompt(text: string): string {
  const trimmed = (text || "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_RADIOLOGY_PROMPT;
}

export interface MessageWithMetadata {
  role: string;
  metadata?: unknown;
}

/** IDs de radiografias já anexadas na conversa, em ordem cronológica (mais antiga primeiro), sem repetição. */
export function collectRadiologyEvidenceIds(messages: MessageWithMetadata[]): string[] {
  const ids: string[] = [];
  for (const m of messages || []) {
    if (m.role !== "user") continue;
    const meta = m.metadata && typeof m.metadata === "object" ? (m.metadata as Record<string, unknown>) : null;
    if (!meta || meta.mode !== RADIOLOGY_MODE) continue;
    const list = Array.isArray(meta.radiology_evidence_ids) ? (meta.radiology_evidence_ids as unknown[]) : [];
    for (const id of list) {
      if (typeof id === "string" && id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

export function hasRadiologyContext(messages: MessageWithMetadata[]): boolean {
  return collectRadiologyEvidenceIds(messages).length > 0;
}

/**
 * Seleciona os IDs enviados ao backend: os novos primeiro, depois os mais recentes do
 * histórico, respeitando o limite de 4 imagens por chamada.
 */
export function selectEvidenceIdsForRequest(newIds: string[], historicalIds: string[], max = MAX_RADIOLOGY_IMAGES): string[] {
  const selected: string[] = [];
  for (const id of newIds) {
    if (selected.length >= max) break;
    if (!selected.includes(id)) selected.push(id);
  }
  for (const id of [...historicalIds].reverse()) {
    if (selected.length >= max) break;
    if (!selected.includes(id)) selected.push(id);
  }
  return selected;
}

/**
 * Metadados persistidos na mensagem do usuário — nunca contém base64.
 * `radiology_evidence_ids`: imagens em contexto nesta mensagem (novas + reaproveitadas).
 * `attached_count`: quantas foram anexadas nesta mensagem específica (0 em perguntas de seguimento).
 */
export function radiologyUserMessageMetadata(evidenceIds: string[], attachedCount = evidenceIds.length) {
  return { mode: RADIOLOGY_MODE, radiology_evidence_ids: evidenceIds, attached_count: attachedCount };
}

export function radiologyAssistantMessageMetadata(evidenceIds: string[], outputMode: RadiologyOutputMode) {
  return { mode: RADIOLOGY_MODE, radiology_evidence_ids: evidenceIds, output_mode: outputMode };
}

/** Descreve uma mensagem do Interpretador para exibição (chip de contexto). Null se não for do modo. */
export function describeRadiologyMessage(metadata: unknown): { total: number; attached: number } | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, unknown>;
  if (meta.mode !== RADIOLOGY_MODE) return null;
  const total = Array.isArray(meta.radiology_evidence_ids) ? meta.radiology_evidence_ids.length : 0;
  const attached = typeof meta.attached_count === "number" ? meta.attached_count : total;
  return { total, attached };
}

export function radiologyChipLabel(info: { total: number; attached: number }): string {
  const plural = (n: number) => (n === 1 ? "radiografia" : "radiografias");
  if (info.attached > 0) return `${info.attached} ${plural(info.attached)} anexada${info.attached === 1 ? "" : "s"}`;
  if (info.total > 0) return `Sobre ${info.total} ${plural(info.total)}`;
  return "Interpretador";
}

/** Metadados gravados na evidência (bucket privado `evidences`). */
export function radiologyEvidenceMetadata(mime: RadiologyMime) {
  return { mode: RADIOLOGY_MODE, modality: RADIOLOGY_MODALITY, body_region: RADIOLOGY_BODY_REGION, mime_type: mime };
}

/** Caminho no bucket privado: sempre prefixado pela pasta do usuário (exigido pelas policies). */
export function radiologyStoragePath(userId: string, mime: RadiologyMime, index: number, now = Date.now()): string {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return `${userId}/rx/${now}-${index}.${ext}`;
}

export interface RadiologyRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  evidenceIds: string[];
  caseId?: string;
  outputMode: RadiologyOutputMode;
}

/** Corpo enviado à função `radiograph-interpret`: só texto no histórico, IDs das imagens, nunca base64. */
export function buildRadiologyRequestBody(params: {
  messages: { role: string; content: string }[];
  evidenceIds: string[];
  caseId?: string;
  outputMode?: RadiologyOutputMode;
}): RadiologyRequestBody {
  const messages = params.messages
    .filter((m): m is { role: "user" | "assistant"; content: string } => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));
  const body: RadiologyRequestBody = {
    messages,
    evidenceIds: [...params.evidenceIds],
    outputMode: params.outputMode ?? "auto",
  };
  if (params.caseId) body.caseId = params.caseId;
  return body;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
