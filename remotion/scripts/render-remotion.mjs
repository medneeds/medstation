import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stillsMode = process.argv.includes("--stills");

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });

if (stillsMode) {
  const frames = [120, 400, 700, 1010, 1300, 1650, 2000, 2380, 2700, 2900, 3250, 3450, 3720, 4100, 4400];
  for (const frame of frames) {
    await renderStill({
      composition,
      serveUrl: bundled,
      frame,
      output: `/tmp/qa/frame-${frame}.png`,
      puppeteerInstance: browser,
      overwrite: true,
    });
    console.log("still", frame);
  }
} else {
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    crf: 18,
    outputLocation: "/mnt/documents/medstation-video-vendas.mp4",
    puppeteerInstance: browser,
    muted: true,
    concurrency: 2,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 10 === 0) console.log("progress", Math.round(progress * 100));
    },
  });
}

await browser.close({ silent: false });
console.log("done");
