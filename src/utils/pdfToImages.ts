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
