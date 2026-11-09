// MedStation Studio (Beta): chave liga/desliga (padrão desligado), assistentes próprios
// e conversas salvos neste navegador. Modelos espelham supabase/functions/studio-chat/models.ts.
import { useEffect, useState } from "react";
export { STUDIO_MODELS, DEFAULT_STUDIO_MODEL, isStudioModel, MAX_STUDIO_CHARS } from "../../supabase/functions/studio-chat/models";
export type { StudioModelId } from "../../supabase/functions/studio-chat/models";
import { DEFAULT_STUDIO_MODEL, isStudioModel, type StudioModelId } from "../../supabase/functions/studio-chat/models";

export const STUDIO_ENABLED_KEY = "ms_studio_enabled";
const THREADS_KEY = "ms_studio_threads";
const ASSISTANTS_KEY = "ms_studio_assistants";
const EVENT = "ms:studio-change";

export interface StudioMessage { role: "user" | "assistant"; content: string; model?: string }
export interface StudioThread { id: string; title: string; assistantId?: string; model: StudioModelId; updatedAt: number; messages: StudioMessage[] }
export interface StudioAssistant { id: string; name: string; instructions: string; model: StudioModelId; createdAt: number }

/** Studio só fica ligado quando o médico ligou explicitamente. */
export function isStudioEnabled(stored: string | null): boolean {
  return stored === "1";
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useStudioStore() {
  const snapshot = () => ({
    enabled: typeof window !== "undefined" && isStudioEnabled(localStorage.getItem(STUDIO_ENABLED_KEY)),
    threads: read<StudioThread[]>(THREADS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt),
    assistants: read<StudioAssistant[]>(ASSISTANTS_KEY, []),
  });
  const [state, setState] = useState(snapshot);
  useEffect(() => {
    const sync = () => setState(snapshot());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return state;
}

export const setStudioEnabled = (on: boolean) => write(STUDIO_ENABLED_KEY, on ? "1" : "0");

const uid = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function createThread(assistant?: StudioAssistant): StudioThread {
  const t: StudioThread = {
    id: uid(), title: assistant ? assistant.name : "Nova conversa", assistantId: assistant?.id,
    model: assistant?.model ?? DEFAULT_STUDIO_MODEL, updatedAt: Date.now(), messages: [],
  };
  write(THREADS_KEY, [t, ...read<StudioThread[]>(THREADS_KEY, [])]);
  return t;
}
export function getThread(id: string) { return read<StudioThread[]>(THREADS_KEY, []).find((t) => t.id === id); }
export function saveThread(t: StudioThread) {
  write(THREADS_KEY, read<StudioThread[]>(THREADS_KEY, []).map((x) => (x.id === t.id ? t : x)));
}
export function deleteThread(id: string) { write(THREADS_KEY, read<StudioThread[]>(THREADS_KEY, []).filter((t) => t.id !== id)); }

export function saveAssistant(a: Omit<StudioAssistant, "id" | "createdAt"> & { id?: string }): StudioAssistant {
  const list = read<StudioAssistant[]>(ASSISTANTS_KEY, []);
  const model = isStudioModel(a.model) ? a.model : DEFAULT_STUDIO_MODEL;
  if (a.id) {
    const updated = list.map((x) => (x.id === a.id ? { ...x, name: a.name, instructions: a.instructions, model } : x));
    write(ASSISTANTS_KEY, updated);
    return updated.find((x) => x.id === a.id)!;
  }
  const created: StudioAssistant = { id: uid(), name: a.name, instructions: a.instructions, model, createdAt: Date.now() };
  write(ASSISTANTS_KEY, [...list, created]);
  return created;
}
export function deleteAssistant(id: string) { write(ASSISTANTS_KEY, read<StudioAssistant[]>(ASSISTANTS_KEY, []).filter((a) => a.id !== id)); }
export function getAssistant(id?: string) { return id ? read<StudioAssistant[]>(ASSISTANTS_KEY, []).find((a) => a.id === id) : undefined; }

/** Agrupa a linha do tempo: Hoje, Ontem, Últimos 7 dias, Anteriores. */
export function timelineGroup(updatedAt: number, now = Date.now()): string {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const day = 86400000;
  if (updatedAt >= start.getTime()) return "Hoje";
  if (updatedAt >= start.getTime() - day) return "Ontem";
  if (updatedAt >= start.getTime() - 6 * day) return "Últimos 7 dias";
  return "Anteriores";
}
