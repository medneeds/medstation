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

const composition = await selectComposition({
  serveUrl: bundled,
  id: "story-logo",
  puppeteerInstance: browser,
});

if (stillsMode) {
  for (const frame of [10, 30, 45, 56, 70, 88, 112, 125, 140]) {
    await renderStill({
      composition,
      serveUrl: bundled,
      frame,
      output: `/tmp/story-qa/frame-${frame}.png`,
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
    crf: 17,
    outputLocation: "/mnt/documents/medstation-story-logo-9x16.mp4",
    puppeteerInstance: browser,
    muted: true,
    concurrency: 2,
  });
}

await browser.close({ silent: false });
console.log("done");
