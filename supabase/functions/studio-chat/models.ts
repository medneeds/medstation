// Modelos oferecidos no MedStation Studio (Beta). Espelhado em src/lib/studio.ts (um teste mantém iguais).
export type StudioSurface = "responses" | "chat-completions" | "messages";

export const STUDIO_MODELS = [
  { id: "openai/gpt-6-astra", label: "GPT (OpenAI)", surface: "responses" },
  { id: "anthropic/claude-sonnet-5", label: "Claude (Anthropic)", surface: "messages" },
  { id: "google/gemini-3.5-flash", label: "Gemini (Google)", surface: "chat-completions" },
] as const satisfies ReadonlyArray<{ id: string; label: string; surface: StudioSurface }>;

export type StudioModelId = (typeof STUDIO_MODELS)[number]["id"];
export const DEFAULT_STUDIO_MODEL: StudioModelId = "openai/gpt-6-astra";
export const MAX_STUDIO_MESSAGES = 40;
export const MAX_STUDIO_CHARS = 10000;
export const MAX_STUDIO_INSTRUCTIONS = 8000;

export function isStudioModel(id: unknown): id is StudioModelId {
  return typeof id === "string" && STUDIO_MODELS.some((m) => m.id === id);
}
