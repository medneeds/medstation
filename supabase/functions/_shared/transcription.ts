// Transcrição de áudio completo pela IA da plataforma (Lovable AI Gateway).
// Serve de cópia de seguranca do ditado: não depende do saldo da ElevenLabs,
// que fica reservado para a legenda ao vivo. Sem dependências externas para
// poder ser testado pelo vitest.

export const GATEWAY_STT_MODEL = "openai/gpt-transcribe";
export const GATEWAY_STT_URL = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
/** O endpoint aceita até 25 MiB por pedido; deixa folga para o envelope. */
export const MAX_STT_BYTES = 24 * 1024 * 1024;

export const MEDICAL_STT_PROMPT =
  "Ditado médico em português do Brasil: anamnese, exame físico, evolução clínica, " +
  "prescrição e exames. Transcreva apenas o que foi dito, sem completar nem inventar.";

/** Normaliza o tipo do áudio do navegador ("audio/webm;codecs=opus", "video/webm"...). */
export function audioFileInfo(mime: string | null | undefined): { mime: string; ext: string } {
  const m = (mime || "").toLowerCase();
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return { mime: "audio/mp4", ext: "m4a" };
  if (m.includes("ogg") || m.includes("oga")) return { mime: "audio/ogg", ext: "ogg" };
  if (m.includes("wav")) return { mime: "audio/wav", ext: "wav" };
  if (m.includes("mpeg") || m.includes("mp3") || m.includes("mpga")) return { mime: "audio/mpeg", ext: "mp3" };
  if (m.includes("flac")) return { mime: "audio/flac", ext: "flac" };
  return { mime: "audio/webm", ext: "webm" };
}

/**
 * Só falhas passageiras (fila cheia, instabilidade, rede) podem tentar outro
 * serviço. Falta de créditos, bloqueio ou áudio inválido param aqui.
 */
export function canUseFallbackAfter(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

/** Junta o texto de um stream SSE de transcrição (delta + done). */
export function collectTranscriptFromSSE(raw: string): { text: string; seconds: number | null; error: string | null } {
  let deltas = "";
  let done: string | null = null;
  let seconds: number | null = null;
  let error: string | null = null;
  for (const block of raw.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") continue;
    try {
      const ev = JSON.parse(data);
      if (ev?.type === "transcript.text.delta" && typeof ev.delta === "string") deltas += ev.delta;
      else if (ev?.type === "transcript.text.done") {
        if (typeof ev.text === "string") done = ev.text;
        if (typeof ev?.usage?.seconds === "number") seconds = ev.usage.seconds;
      } else if (ev?.type === "error" || ev?.error) {
        error = ev?.error?.message || ev?.message || "Erro na transcrição";
      }
    } catch {
      /* bloco incompleto: ignora */
    }
  }
  return { text: (done ?? deltas).trim(), seconds, error };
}

export type GatewaySTTResult =
  | { ok: true; text: string; seconds: number | null }
  | { ok: false; status: number; message: string };

export async function transcribeWithGateway(
  bytes: Uint8Array,
  clientMime: string | null | undefined,
  apiKey: string,
): Promise<GatewaySTTResult> {
  const { mime, ext } = audioFileInfo(clientMime);
  const form = new FormData();
  form.append("model", GATEWAY_STT_MODEL);
  form.append("file", new File([bytes as BlobPart], `audio.${ext}`, { type: mime }));
  form.append("response_format", "json");
  form.append("stream", "true");
  form.append("prompt", MEDICAL_STT_PROMPT);
  form.append("languages", "pt");

  let resp: Response;
  try {
    resp = await fetch(GATEWAY_STT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (e) {
    return { ok: false, status: 0, message: (e as Error).message || "Falha de rede" };
  }

  const body = await resp.text();
  if (!resp.ok) {
    let message = body.slice(0, 500);
    try {
      const parsed = JSON.parse(body);
      message = parsed?.error?.message || parsed?.message || parsed?.error || message;
    } catch {
      /* mantém texto */
    }
    return { ok: false, status: resp.status, message: String(message) };
  }

  const isSSE = (resp.headers.get("content-type") || "").includes("text/event-stream") || body.startsWith("data:") || body.startsWith("event:");
  if (isSSE) {
    const r = collectTranscriptFromSSE(body);
    if (r.error && !r.text) return { ok: false, status: 502, message: r.error };
    return { ok: true, text: r.text, seconds: r.seconds };
  }
  try {
    const parsed = JSON.parse(body);
    return { ok: true, text: String(parsed?.text || "").trim(), seconds: parsed?.usage?.seconds ?? null };
  } catch {
    return { ok: true, text: body.trim(), seconds: null };
  }
}
