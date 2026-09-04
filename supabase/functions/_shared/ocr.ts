// OCR compartilhado — leitura de imagens/PDFs clínicos com modelo multimodal forte
// e reprocessamento automático quando a primeira leitura vem pobre.

export const OCR_PRIMARY_MODEL = "google/gemini-3.7-flash";
export const OCR_FALLBACK_MODEL = "google/gemini-3.1-pro-preview";

const SYSTEM_PROMPT = `Você é um sistema de OCR clínico de alta precisão. Sua função é transcrever, não interpretar.

REGRAS:
- Transcreva TODO o conteúdo visível: cabeçalhos, tabelas, rodapés, carimbos, anotações à mão, valores de referência.
- Preserve a estrutura: uma linha por item, tabelas em formato "Exame: valor (unidade) [referência]".
- Copie números, unidades, datas e horários exatamente como aparecem. Nunca arredonde, converta ou complete valores.
- Se um trecho estiver ilegível, escreva [ilegível] no lugar — jamais adivinhe.
- Não resuma, não comente, não adicione conclusões.
- Se a imagem estiver girada, leia na orientação correta.
- Se houver mais de uma coluna, leia coluna por coluna, na ordem de leitura.
- Se a imagem não tiver texto algum, responda exatamente: SEM_TEXTO_LEGIVEL

Saída: apenas o texto transcrito, em português quando o original estiver em português.`;

const USER_PROMPT =
  "Transcreva integralmente este documento clínico, mantendo todos os valores, unidades e a estrutura original.";

export interface OcrResult {
  text: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export class OcrHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function callOcr(
  apiKey: string,
  model: string,
  dataUrl: string,
): Promise<{ text: string; usage?: OcrResult["usage"] }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new OcrHttpError(res.status, body);
  }

  const json = await res.json();
  return {
    text: (json.choices?.[0]?.message?.content ?? "").trim(),
    usage: json.usage,
  };
}

/** Considera pobre uma leitura vazia, muito curta ou marcada como ilegível. */
export function isPoorOcr(text: string): boolean {
  const clean = text.replace(/\[ilegível\]/gi, "").trim();
  if (!clean) return true;
  if (/^SEM_TEXTO_LEGIVEL$/i.test(clean)) return true;
  return clean.length < 24;
}

/**
 * Extrai texto de uma imagem/página. Tenta o modelo rápido de alta qualidade e,
 * se o resultado vier pobre, reprocessa com o modelo mais forte.
 */
export async function extractTextFromImage(
  apiKey: string,
  base64: string,
  mimeType: string,
): Promise<OcrResult> {
  const dataUrl = base64.startsWith("data:") ? base64 : `data:${mimeType};base64,${base64}`;

  const first = await callOcr(apiKey, OCR_PRIMARY_MODEL, dataUrl);
  if (!isPoorOcr(first.text)) {
    return { text: first.text, model: OCR_PRIMARY_MODEL, usage: first.usage };
  }

  try {
    const second = await callOcr(apiKey, OCR_FALLBACK_MODEL, dataUrl);
    if (!isPoorOcr(second.text)) {
      return { text: second.text, model: OCR_FALLBACK_MODEL, usage: second.usage };
    }
    return { text: "", model: OCR_FALLBACK_MODEL, usage: second.usage };
  } catch (_err) {
    return { text: isPoorOcr(first.text) ? "" : first.text, model: OCR_PRIMARY_MODEL, usage: first.usage };
  }
}
