// Regras puras do Interpretador de ECG (Clínicus) no cliente.
// Reexporta constantes do núcleo compartilhado para manter cliente e Edge Function alinhados.
// Totalmente independente do Interpretador de radiografia (Examinus).
import {
  DEFAULT_ECG_PROMPT,
  ECG_ALLOWED_MIME,
  ECG_BODY_REGION,
  ECG_MODALITY,
  ECG_MODE,
  ECG_MODEL,
  ECG_ORIGIN,
  MAX_ECG_IMAGES,
  MAX_ECG_IMAGE_BYTES,
  ecgMimeFromFilename,
  isAllowedEcgMime,
  type EcgMime,
  type EcgOutputMode,
} from "../../supabase/functions/_shared/ecg-interpreter";

export {
  DEFAULT_ECG_PROMPT,
  ECG_ALLOWED_MIME,
  ECG_MODE,
  ECG_MODEL,
  ECG_ORIGIN,
  MAX_ECG_IMAGES,
  MAX_ECG_IMAGE_BYTES,
  isAllowedEcgMime,
};
export type { EcgMime, EcgOutputMode };

/** Valor do atributo `accept` do input de arquivo enquanto o Interpretador de ECG está ativo. */
export const ECG_ACCEPT_ATTR = ECG_ALLOWED_MIME.join(",");

/** Nome da Edge Function do motor de ECG (nunca agent-chat, nunca radiograph-interpret). */
export const ECG_FUNCTION_NAME = "ecg-interpret";

export interface ClinicusModes {
  directAHEMode: boolean;
  reportMode: boolean;
  ecgInterpretMode: boolean;
}

/**
 * Anamnese, Relatório e Interpretador são mutuamente exclusivos.
 * Ligar um desliga os outros dois; desligar não toca nos demais.
 * Com `interpretador` ausente, reproduz exatamente o comportamento legado Anamnese/Relatório.
 */
export function resolveClinicusModes(
  current: ClinicusModes,
  change: { anamnese?: boolean; relatorio?: boolean; interpretador?: boolean },
): ClinicusModes {
  let next: ClinicusModes = { ...current };
  if (typeof change.anamnese === "boolean") {
    next = {
      directAHEMode: change.anamnese,
      reportMode: change.anamnese ? false : next.reportMode,
      ecgInterpretMode: change.anamnese ? false : next.ecgInterpretMode,
    };
  }
  if (typeof change.relatorio === "boolean") {
    next = {
      reportMode: change.relatorio,
      directAHEMode: change.relatorio ? false : next.directAHEMode,
      ecgInterpretMode: change.relatorio ? false : next.ecgInterpretMode,
    };
  }
  if (typeof change.interpretador === "boolean") {
    next = {
      ecgInterpretMode: change.interpretador,
      directAHEMode: change.interpretador ? false : next.directAHEMode,
      reportMode: change.interpretador ? false : next.reportMode,
    };
  }
  return next;
}

export interface EcgFileLike {
  name: string;
  type: string;
  size: number;
}

export type EcgFileValidation = { ok: true; mime: EcgMime } | { ok: false; reason: string };

/** Aceita apenas JPEG/PNG/WebP até 10 MB. PDF, DICOM, HEIC, GIF etc. são rejeitados nesta V1. */
export function validateEcgFile(file: EcgFileLike): EcgFileValidation {
  const declared = (file.type || "").toLowerCase();
  const mime: EcgMime | null = isAllowedEcgMime(declared)
    ? (declared as EcgMime)
    : declared === "" || declared === "application/octet-stream"
      ? ecgMimeFromFilename(file.name)
      : null;

  if (!mime) {
    return { ok: false, reason: `"${file.name}" não é suportado. Envie o ECG em JPEG, PNG ou WebP (sem PDF, DICOM, HEIC ou GIF nesta versão).` };
  }
  if (file.size <= 0) {
    return { ok: false, reason: `"${file.name}" está vazio.` };
  }
  if (file.size > MAX_ECG_IMAGE_BYTES) {
    return { ok: false, reason: `"${file.name}" excede 10 MB.` };
  }
  return { ok: true, mime };
}

/**
 * Decide para onde vão os arquivos soltos/selecionados no Clínicus.
 * Com o Interpretador ativo, NENHUM arquivo vai para OCR/extract-file-text.
 */
export function routeClinicusFiles<T extends EcgFileLike>(
  files: T[],
  modes: { ecgInterpretMode: boolean },
): { ecg: T[]; ocr: T[] } {
  if (modes.ecgInterpretMode) return { ecg: files, ocr: [] };
  return { ecg: [], ocr: files };
}

/** Valida os arquivos recebidos e limita a fila de anexos pendentes a 4; devolve o que ficou de fora e por quê. */
export function appendEcgFiles<T extends EcgFileLike>(
  pendingCount: number,
  incoming: T[],
): { accepted: { file: T; mime: EcgMime }[]; rejected: { file: T; reason: string }[] } {
  const accepted: { file: T; mime: EcgMime }[] = [];
  const rejected: { file: T; reason: string }[] = [];
  let slots = Math.max(0, MAX_ECG_IMAGES - pendingCount);
  for (const file of incoming) {
    const validation = validateEcgFile(file);
    if (validation.ok === false) {
      rejected.push({ file, reason: validation.reason });
      continue;
    }
    if (slots <= 0) {
      rejected.push({ file, reason: `Máximo de ${MAX_ECG_IMAGES} traçados por interpretação.` });
      continue;
    }
    slots -= 1;
    accepted.push({ file, mime: validation.mime });
  }
  return { accepted, rejected };
}

/** Pode enviar sem texto quando há imagem pendente; pergunta de seguimento exige ECG já anexado na conversa. */
export function canSendEcgMessage(input: { text: string; pendingCount: number; historicalCount: number }): boolean {
  if (input.pendingCount > 0) return true;
  return input.text.trim().length > 0 && input.historicalCount > 0;
}

export function normalizeEcgPrompt(text: string): string {
  const trimmed = (text || "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_ECG_PROMPT;
}

export interface EcgMessageWithMetadata {
  role: string;
  metadata?: unknown;
}

/** IDs de ECGs já anexados na conversa, em ordem cronológica (mais antigo primeiro), sem repetição. */
export function collectEcgEvidenceIds(messages: EcgMessageWithMetadata[]): string[] {
  const ids: string[] = [];
  for (const m of messages || []) {
    if (m.role !== "user") continue;
    const meta = m.metadata && typeof m.metadata === "object" ? (m.metadata as Record<string, unknown>) : null;
    if (!meta || meta.mode !== ECG_MODE) continue;
    const list = Array.isArray(meta.ecg_evidence_ids) ? (meta.ecg_evidence_ids as unknown[]) : [];
    for (const id of list) {
      if (typeof id === "string" && id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

export function hasEcgContext(messages: EcgMessageWithMetadata[]): boolean {
  return collectEcgEvidenceIds(messages).length > 0;
}

/**
 * Seleciona os IDs enviados ao backend: os novos primeiro, depois os mais recentes do
 * histórico, respeitando o limite de 4 imagens por chamada.
 */
export function selectEcgEvidenceIdsForRequest(newIds: string[], historicalIds: string[], max = MAX_ECG_IMAGES): string[] {
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
 * `ecg_evidence_ids`: traçados em contexto nesta mensagem (novos + reaproveitados).
 * `attached_count`: quantos foram anexados nesta mensagem específica (0 em perguntas de seguimento).
 */
export function ecgUserMessageMetadata(evidenceIds: string[], attachedCount = evidenceIds.length) {
  return { mode: ECG_MODE, ecg_evidence_ids: evidenceIds, attached_count: attachedCount };
}

export function ecgAssistantMessageMetadata(evidenceIds: string[], outputMode: EcgOutputMode) {
  return { mode: ECG_MODE, ecg_evidence_ids: evidenceIds, output_mode: outputMode };
}

/** Descreve uma mensagem do Interpretador de ECG para exibição (chip de contexto). Null se não for do modo. */
export function describeEcgMessage(metadata: unknown): { total: number; attached: number } | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, unknown>;
  if (meta.mode !== ECG_MODE) return null;
  const total = Array.isArray(meta.ecg_evidence_ids) ? meta.ecg_evidence_ids.length : 0;
  const attached = typeof meta.attached_count === "number" ? meta.attached_count : total;
  return { total, attached };
}

export function ecgChipLabel(info: { total: number; attached: number }): string {
  const plural = (n: number) => (n === 1 ? "ECG" : "ECGs");
  if (info.attached > 0) return `${info.attached} ${plural(info.attached)} anexado${info.attached === 1 ? "" : "s"}`;
  if (info.total > 0) return `Sobre ${info.total} ${plural(info.total)}`;
  return "Interpretador de ECG";
}

/** Metadados gravados na evidência (bucket privado `evidences`). */
export function ecgEvidenceMetadata(mime: EcgMime) {
  return { mode: ECG_MODE, modality: ECG_MODALITY, body_region: ECG_BODY_REGION, mime_type: mime };
}

/** Caminho no bucket privado: sempre prefixado pela pasta do usuário (exigido pelas policies), subpasta `ecg`. */
export function ecgStoragePath(userId: string, mime: EcgMime, index: number, now = Date.now()): string {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return `${userId}/ecg/${now}-${index}.${ext}`;
}

export interface EcgRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  evidenceIds: string[];
  caseId?: string;
  outputMode: EcgOutputMode;
}

/** Corpo enviado à função `ecg-interpret`: só texto no histórico, IDs das imagens, nunca base64. */
export function buildEcgRequestBody(params: {
  messages: { role: string; content: string }[];
  evidenceIds: string[];
  caseId?: string;
  outputMode?: EcgOutputMode;
}): EcgRequestBody {
  const messages = params.messages
    .filter((m): m is { role: "user" | "assistant"; content: string } => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));
  const body: EcgRequestBody = {
    messages,
    evidenceIds: [...params.evidenceIds],
    outputMode: params.outputMode ?? "auto",
  };
  if (params.caseId) body.caseId = params.caseId;
  return body;
}

/** Sugestões de seguimento exibidas após a primeira resposta. */
export const ECG_FOLLOW_UPS = [
  "Faça o laudo",
  "Qual o ritmo?",
  "Há sinais de isquemia aguda?",
  "Meça os intervalos",
] as const;

/**
 * Executa um "thenable" (ex.: builder do PostgREST) exatamente uma vez.
 * Evita o bug já corrigido no RX em que o mesmo builder era aguardado duas vezes,
 * gerando dois INSERTs para uma única mensagem do usuário.
 */
export function executeOnce<T>(thenable: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    thenable.then(resolve, reject);
  });
}

export type EcgWorkspaceLayout = "empty" | "workspace";

/**
 * Estado sem ECG = cabeçalho compacto + dropzone central.
 * Com qualquer traçado pendente ou já anexado na conversa (ou histórico de mensagens),
 * vira o workspace de interpretação (2 painéis no desktop, card + conversa no mobile).
 */
export function resolveEcgWorkspaceLayout(input: { pendingCount: number; historicalCount: number; messageCount: number }): EcgWorkspaceLayout {
  if (input.pendingCount > 0 || input.historicalCount > 0 || input.messageCount > 0) return "workspace";
  return "empty";
}

export function formatEcgBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
