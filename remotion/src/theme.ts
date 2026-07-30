export const COLORS = {
  bg: "#080B09",
  bgSoft: "#0C1210",
  panel: "#111815",
  green: "#8FE3B5",
  greenDeep: "#3E8F68",
  cream: "#EEF4EF",
  muted: "#7C8B83",
  line: "rgba(143,227,181,0.18)",
  alert: "#E8B27A",
};

export const FPS = 30;

const seq = (durations: [string, number][]) => {
  let cursor = 0;
  const out: Record<string, { from: number; dur: number }> = {};
  for (const [key, dur] of durations) {
    out[key] = { from: cursor, dur };
    cursor += dur;
  }
  return { blocks: out, total: cursor };
};

const { blocks, total } = seq([
  ["abertura", 240],
  ["dor", 360],
  ["custo", 300],
  ["virada", 240],
  ["plantao", 360],
  ["consultorio", 360],
  ["assistentes", 390],
  ["examinus", 300],
  ["depoimentos", 480],
  ["ancoragem", 540],
  ["planos", 390],
  ["garantia", 330],
  ["fecho", 300],
]);

export const T = blocks as Record<
  | "abertura"
  | "dor"
  | "custo"
  | "virada"
  | "plantao"
  | "consultorio"
  | "assistentes"
  | "examinus"
  | "depoimentos"
  | "ancoragem"
  | "planos"
  | "garantia"
  | "fecho",
  { from: number; dur: number }
>;

export const TOTAL = total;
