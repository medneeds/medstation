// Áudio gravado no Modo Escuta: regras puras (sem navegador) para cortar,
// converter e remontar a transcrição de um arquivo enviado pelo médico.

import type { SpeakerType } from "@/hooks/useConsultation";

/** Mesmo limite da gravação ao vivo. */
export const MAX_IMPORT_SECONDS = 60 * 60;
/** Arquivo grande demais pesa no aparelho ao abrir. */
export const MAX_IMPORT_BYTES = 200 * 1024 * 1024;
/** Taxa usada na conversão: suficiente para fala, leve para enviar. */
export const IMPORT_SAMPLE_RATE = 16_000;
/** Cada parte tem ~3 min (~6 MB em WAV de 16 kHz), cortada num momento de silêncio. */
export const IMPORT_PART_SECONDS = 180;
export const IMPORT_SEARCH_SECONDS = 15;
/** Sem conversão possível, só envia direto arquivos pequenos e de formato aceito. */
export const DIRECT_SEND_MAX_BYTES = 6 * 1024 * 1024;
/** A organização das falas aceita até ~40 mil caracteres por pedido. */
export const LABEL_BATCH_CHARS = 36_000;

export const AUDIO_ACCEPT = "audio/*,video/mp4,.m4a,.mp3,.ogg,.oga,.opus,.wav,.webm,.aac,.flac,.mp4";

const DIRECT_TYPES: { re: RegExp; mime: string }[] = [
  { re: /(mpeg|mp3|mpga)/, mime: "audio/mpeg" },
  { re: /(mp4|m4a)/, mime: "audio/mp4" },
  { re: /(ogg|oga|opus)/, mime: "audio/ogg" },
  { re: /wav/, mime: "audio/wav" },
  { re: /webm/, mime: "audio/webm" },
  { re: /flac/, mime: "audio/flac" },
];

/** Tipo aceito pela transcrição quando o arquivo vai sem conversão; null = não aceito. */
export function directSendMime(name: string, type: string): string | null {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const hay = `${(type || "").toLowerCase()} ${ext}`;
  for (const t of DIRECT_TYPES) if (t.re.test(hay)) return t.mime;
  return null;
}

/** Mensagem para o médico quando o arquivo não pode ser usado; null = ok. */
export function validateImportFile(name: string, type: string, size: number): string | null {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const looksAudio = (type || "").startsWith("audio/") || type === "video/mp4" ||
    ["m4a", "mp3", "ogg", "oga", "opus", "wav", "webm", "aac", "flac", "mp4", "amr", "3gp"].includes(ext);
  if (!looksAudio) return "Esse arquivo não parece ser um áudio. Envie MP3, M4A, OGG, WAV ou WEBM.";
  if (size < 2000) return "O arquivo de áudio está vazio.";
  if (size > MAX_IMPORT_BYTES) return "O áudio passa de 200 MB. Envie um arquivo menor (até 60 minutos).";
  return null;
}

export function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m <= 1 ? "1 minuto" : `${m} minutos`;
}

/**
 * Pontos de corte (em amostras) a cada ~partSeconds, escolhendo o trecho mais
 * silencioso dos últimos searchSeconds antes de cada alvo, para não cortar palavras.
 * A sobra final curta (< 20 s) fica junto da última parte.
 */
export function findSplitPoints(
  samples: Float32Array,
  sampleRate: number,
  partSeconds = IMPORT_PART_SECONDS,
  searchSeconds = IMPORT_SEARCH_SECONDS,
): number[] {
  const total = samples.length;
  const part = Math.floor(partSeconds * sampleRate);
  const search = Math.min(Math.floor(searchSeconds * sampleRate), Math.floor(part / 2));
  const minTail = Math.floor(20 * sampleRate);
  const frame = Math.max(1, Math.round(sampleRate * 0.02));
  const points: number[] = [];
  let start = 0;
  while (start + part + minTail < total) {
    const target = start + part;
    let best = target;
    let bestEnergy = Infinity;
    for (let f = target - search; f + frame <= target; f += frame) {
      let sum = 0;
      for (let i = f; i < f + frame; i++) sum += samples[i] * samples[i];
      if (sum < bestEnergy) {
        bestEnergy = sum;
        best = f + Math.floor(frame / 2);
      }
    }
    points.push(best);
    start = best;
  }
  return points;
}

/** WAV PCM 16 bits, mono. */
export function encodeWavPcm16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

/** Junta partes consecutivas em lotes que cabem num pedido de organização das falas. */
export function batchParts(parts: string[], maxChars = LABEL_BATCH_CHARS): string[] {
  const batches: string[] = [];
  let current = "";
  for (const p of parts) {
    const next = current ? `${current}\n\n${p}` : p;
    if (current && next.length > maxChars) {
      batches.push(current);
      current = p;
    } else {
      current = next;
    }
  }
  if (current) batches.push(current);
  return batches;
}

const LABEL_RE = /^\s*(M[ée]dico|Paciente|Acompanhante)\s*:\s*/i;

export interface ImportedSegment {
  speaker: SpeakerType;
  text: string;
  labeled: boolean;
}

/** Quebra texto sem rótulo em blocos legíveis (~350 caracteres, sem cortar frases). */
function chunkSentences(text: string, max = 350): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?…])\s+/);
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (!s) continue;
    if (cur && (cur + " " + s).length > max) {
      out.push(cur);
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Converte a transcrição (com ou sem "Médico:/Paciente:/Acompanhante:") em trechos. */
export function transcriptToSegments(text: string): ImportedSegment[] {
  const out: ImportedSegment[] = [];
  for (const block of text.split(/\n+/)) {
    const line = block.trim();
    if (!line) continue;
    const m = line.match(LABEL_RE);
    if (m) {
      const raw = m[1].toLowerCase();
      const speaker: SpeakerType = raw.startsWith("m") ? "doctor" : raw === "paciente" ? "patient" : "companion";
      const body = line.replace(LABEL_RE, "").trim();
      if (body) out.push({ speaker, text: body, labeled: true });
    } else {
      for (const piece of chunkSentences(line)) out.push({ speaker: "doctor", text: piece, labeled: false });
    }
  }
  return out;
}
