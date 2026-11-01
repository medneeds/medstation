// Texto da transcrição do Modo Escuta, no mesmo formato usado para copiar e para ver.

export type TranscriptSpeaker = "doctor" | "patient" | string;

export interface TranscriptSegmentLike {
  text: string;
  speaker?: TranscriptSpeaker | null;
}

const SPEAKER_LABEL: Record<string, string> = {
  doctor: "Médico",
  patient: "Paciente",
};

/**
 * Junta os trechos em parágrafos. No modo unificado (sem separar falantes) sai só o
 * texto; senão cada trecho leva o nome de quem falou. Trechos vazios são ignorados.
 */
export function buildTranscriptText(segments: TranscriptSegmentLike[], unifiedMode: boolean): string {
  return segments
    .map((s) => {
      const t = (s.text ?? "").trim();
      if (!t) return "";
      if (unifiedMode) return t;
      const who = (s.speaker && SPEAKER_LABEL[s.speaker]) || "Acompanhante";
      return `${who}: ${t}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
