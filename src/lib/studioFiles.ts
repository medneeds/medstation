// Leitura de fotos, PDFs e documentos para o Studio, usando as mesmas funções de leitura dos assistentes.
import { supabase } from "@/integrations/supabase/client";
import { pdfToImages } from "@/utils/pdfToImages";

export const STUDIO_FILE_ACCEPT = "image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md";
const DOC_EXT = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];

const toBase64 = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

async function invokeText(fn: string, body: Record<string, unknown>, name: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error || !data?.text) throw new Error(data?.error || `Não consegui ler ${name}`);
  return String(data.text);
}

/** Devolve o texto lido do arquivo. Lança erro com mensagem para o médico. */
export async function readStudioFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type.startsWith("image/")) {
    return invokeText("extract-file-text", { file: await toBase64(file), fileName: file.name, mimeType: file.type || "image/jpeg" }, file.name);
  }
  if (file.type === "application/pdf" || ext === "pdf") {
    const pages = await pdfToImages(file, { scale: 2.5, quality: 0.92, maxPages: 30 });
    const out: string[] = new Array(pages.length).fill("");
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(4, pages.length) }, async () => {
      while (cursor < pages.length) {
        const i = cursor++;
        const p = pages[i];
        try { out[i] = await invokeText("extract-file-text", { file: p.base64, fileName: `${file.name}-p${p.pageNumber}.jpg`, mimeType: p.mimeType }, file.name); }
        catch { out[i] = `[Não consegui ler a página ${p.pageNumber}]`; }
      }
    }));
    return pages.map((p, i) => `PÁGINA ${p.pageNumber}\n${out[i].trim()}`).join("\n\n");
  }
  if (DOC_EXT.includes(ext)) {
    return invokeText("process-document", { file: await toBase64(file), fileName: file.name, mimeType: file.type }, file.name);
  }
  if (ext === "txt" || ext === "md") return file.text();
  throw new Error(`.${ext} não é aceito. Use foto, PDF, Word, PowerPoint, Excel ou texto.`);
}

/** Junta a mensagem e os anexos lidos, respeitando o limite de caracteres. */
export function composeStudioMessage(text: string, attachments: { name: string; text: string }[], max: number): string {
  const parts = [text.trim(), ...attachments.map((a) => `ANEXO: ${a.name}\n\n${a.text.trim()}`)].filter(Boolean);
  const joined = parts.join("\n\n---\n\n");
  return joined.length > max ? `${joined.slice(0, max - 40)}\n\n[Anexo cortado pelo tamanho]` : joined;
}
