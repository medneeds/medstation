// Espelho no app das regras do round multiprofissional
// (supabase/functions/round-structure/topics.ts). Um teste mantém os dois iguais.

export const ROUND_MAX_SECONDS = 90 * 60;
export const ROUND_PART_SECONDS = 10 * 60;
export const ROUND_COUNTDOWN_SECONDS = 10 * 60;

export const ROUND_TOPICS = [
  { key: "intervencoes", title: "INTERVENÇÕES CLÍNICAS" },
  { key: "dispositivos", title: "REVISÃO DE DISPOSITIVOS" },
  { key: "culturas", title: "CHECAGEM DE CULTURAS" },
  { key: "antibioticos", title: "ANTIBIÓTICOS E CONTAGEM DE DIAS" },
  { key: "enfermagem_fisio", title: "ENFERMAGEM E FISIOTERAPIA" },
  { key: "alta_transferencia", title: "ALTA E TRANSFERÊNCIA" },
  { key: "familia_metas", title: "FAMÍLIA E METAS DE CUIDADO" },
  { key: "pendencias", title: "PENDÊNCIAS E PROGRAMAÇÕES" },
  { key: "outros", title: "OUTROS PONTOS DISCUTIDOS" },
] as const;

export type RoundTopicKey = typeof ROUND_TOPICS[number]["key"];
export type RoundTopics = Partial<Record<RoundTopicKey, string[]>>;

export interface WardRoundSession {
  id: string;
  unit_id: string | null;
  unit_name: string | null;
  round_date: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  status: string;
  transcript: string;
  audio_paths: string[];
}

export interface WardRoundItem {
  id: string;
  session_id: string;
  admission_id: string | null;
  bed_label: string | null;
  patient_label: string | null;
  round_date: string;
  topics: RoundTopics;
  content: string;
  applied_to_round_at: string | null;
  created_at: string;
}

export function formatRoundTopics(topics: RoundTopics): string {
  return ROUND_TOPICS
    .filter((t) => topics[t.key]?.length)
    .map((t) => `${t.title}\n${(topics[t.key] ?? []).map((l) => `- ${l}`).join("\n")}`)
    .join("\n\n");
}

/** mm:ss ou h:mm:ss */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** Hora de fechar a parte atual e abrir a próxima (só conta tempo gravado, não pausado). */
export function shouldRotatePart(secondsInPart: number): boolean {
  return secondsInPart >= ROUND_PART_SECONDS;
}

/** Hora de encerrar o round automaticamente. */
export function reachedRoundLimit(totalSeconds: number): boolean {
  return totalSeconds >= ROUND_MAX_SECONDS;
}

/** Segundos restantes para mostrar a contagem regressiva, ou null antes dos últimos 10 min. */
export function countdownSeconds(totalSeconds: number): number | null {
  const left = ROUND_MAX_SECONDS - totalSeconds;
  return left <= ROUND_COUNTDOWN_SECONDS ? Math.max(0, left) : null;
}

/** Caminho no armazenamento: a primeira pasta é sempre o usuário (regra de acesso). */
export function roundPartPath(userId: string, sessionId: string, index: number, ext: string): string {
  return `${userId}/${sessionId}/part-${String(index + 1).padStart(2, "0")}.${ext}`;
}

/** Junta as partes na ordem da gravação, ignorando partes vazias. */
export function joinPartTranscripts(parts: Array<{ index: number; text: string }>): string {
  return [...parts]
    .sort((a, b) => a.index - b.index)
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Escolhe o formato de gravação suportado pelo navegador (Safari usa mp4). */
export function pickRecorderMime(isSupported: (mime: string) => boolean): { mime: string; ext: string } {
  const options = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  ];
  return options.find((o) => isSupported(o.mime)) ?? { mime: "", ext: "webm" };
}
