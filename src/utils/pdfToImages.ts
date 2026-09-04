import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite handles ?url
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PageImage {
  pageNumber: number;
  dataUrl: string; // data:image/jpeg;base64,...
  base64: string; // base64 only (no prefix)
  mimeType: string;
}

/**
 * Render every page of a PDF to a JPEG data URL.
 * `scale` controls resolution; 2 ≈ 144 DPI (good for OCR).
 */
export async function pdfToImages(
  file: File,
  opts: { scale?: number; quality?: number; maxPages?: number } = {}
): Promise<PageImage[]> {
  const { scale = 2, quality = 0.85, maxPages = 30 } = opts;
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = Math.min(pdf.numPages, maxPages);
  const pages: PageImage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D não disponível");

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.split(",")[1];
    pages.push({
      pageNumber: pageNum,
      dataUrl,
      base64,
      mimeType: "image/jpeg",
    });

    canvas.width = 0;
    canvas.height = 0;
  }

  return pages;
}

/**
 * Converte um PDF em arquivos de imagem JPEG (uma imagem por página), preservando a
 * imagem renderizada original para modelos multimodais — NUNCA passa por OCR.
 * Usado pelos Interpretadores (radiografia e ECG) quando o médico anexa um PDF.
 */
export async function pdfToImageFiles(
  file: File,
  opts: { maxPages?: number; scale?: number; quality?: number } = {}
): Promise<File[]> {
  const { maxPages = 4, scale = 2.5, quality = 0.92 } = opts;
  const pages = await pdfToImages(file, { scale, quality, maxPages });
  const baseName = file.name.replace(/\.pdf$/i, "") || "documento";
  return pages.map((page) => {
    const binary = atob(page.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], `${baseName}-p${page.pageNumber}.jpg`, { type: "image/jpeg" });
  });
}
