// MedStation Studio (Beta): chave liga/desliga (padrão desligado, guardada neste navegador),
// assistentes próprios e conversas salvos na conta do médico (studio_threads / studio_assistants).
// Modelos espelham supabase/functions/studio-chat/models.ts.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export { STUDIO_MODELS, DEFAULT_STUDIO_MODEL, isStudioModel, MAX_STUDIO_CHARS } from "../../supabase/functions/studio-chat/models";
export type { StudioModelId } from "../../supabase/functions/studio-chat/models";
import { DEFAULT_STUDIO_MODEL, isStudioModel, type StudioModelId } from "../../supabase/functions/studio-chat/models";

export const STUDIO_ENABLED_KEY = "ms_studio_enabled";
/** Chaves antigas (conversas só no navegador); importadas para a conta uma vez e apagadas. */
const LEGACY_THREADS_KEY = "ms_studio_threads";
const LEGACY_ASSISTANTS_KEY = "ms_studio_assistants";
/** Cópia local do que ainda não chegou ao servidor (por usuário), reenviada ao abrir. */
const pendingKey = (userId: string) => `ms_studio_pending:${userId}`;
const EVENT = "ms:studio-change";
const RETRY_MS = 15000;

export interface StudioMessage { role: "user" | "assistant"; content: string; model?: string }
export interface StudioThread { id: string; title: string; assistantId?: string; model: StudioModelId; updatedAt: number; messages: StudioMessage[] }
export interface StudioAssistant { id: string; name: string; instructions: string; model: StudioModelId; createdAt: number }
export type StudioSaveStatus = "saved" | "saving" | "error";

/** Studio só fica ligado quando o médico ligou explicitamente. */
export function isStudioEnabled(stored: string | null): boolean {
  return stored === "1";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

/** Linha do tempo: só conversas com mensagem, da mais recente para a mais antiga. */
export function timelineThreads(threads: StudioThread[]): StudioThread[] {
  return threads.filter((t) => t.messages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Conversas antigas guardadas no navegador que valem a pena levar para a conta. */
export function legacyThreadsToImport(raw: unknown): StudioThread[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is StudioThread =>
    !!t && isUuid(t.id) && Array.isArray(t.messages) && t.messages.length > 0,
  ).map((t) => ({ ...t, model: isStudioModel(t.model) ? t.model : DEFAULT_STUDIO_MODEL, title: String(t.title || "Conversa").slice(0, 200) }));
}

/** Agrupa a linha do tempo: Hoje, Ontem, Últimos 7 dias, Anteriores. */
export function timelineGroup(updatedAt: number, now = Date.now()): string {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const day = 86400000;
  if (updatedAt >= start.getTime()) return "Hoje";
  if (updatedAt >= start.getTime() - day) return "Ontem";
  if (updatedAt >= start.getTime() - 6 * day) return "Últimos 7 dias";
  return "Anteriores";
}

// ---------------------------------------------------------------------------
// Store em memória sincronizado com a conta.

interface Pending { threads: Record<string, StudioThread>; assistants: Record<string, StudioAssistant> }
const state = {
  userId: null as string | null,
  loaded: false,
  threads: [] as StudioThread[],
  assistants: [] as StudioAssistant[],
  pending: { threads: {}, assistants: {} } as Pending,
  status: "saved" as StudioSaveStatus,
};
let retryTimer: number | undefined;
let started = false;

const emit = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT)); };
const readLocal = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const writePending = () => {
  if (!state.userId) return;
  try {
    const empty = !Object.keys(state.pending.threads).length && !Object.keys(state.pending.assistants).length;
    if (empty) localStorage.removeItem(pendingKey(state.userId));
    else localStorage.setItem(pendingKey(state.userId), JSON.stringify(state.pending));
  } catch { /* sem espaço: segue tentando pelo servidor */ }
};

type ThreadRow = { id: string; title: string; model: string; assistant_id: string | null; messages: unknown; updated_at: string };
type AssistantRow = { id: string; name: string; instructions: string; model: string; created_at: string };
const fromThreadRow = (r: ThreadRow): StudioThread => ({
  id: r.id, title: r.title, model: isStudioModel(r.model) ? r.model : DEFAULT_STUDIO_MODEL,
  assistantId: r.assistant_id ?? undefined, updatedAt: new Date(r.updated_at).getTime(),
  messages: Array.isArray(r.messages) ? (r.messages as StudioMessage[]) : [],
});
const toThreadRow = (t: StudioThread, userId: string) => ({
  id: t.id, user_id: userId, title: t.title.slice(0, 200), model: t.model,
  assistant_id: isUuid(t.assistantId) ? t.assistantId : null,
  messages: t.messages as unknown as never, updated_at: new Date(t.updatedAt).toISOString(),
});
const fromAssistantRow = (r: AssistantRow): StudioAssistant => ({
  id: r.id, name: r.name, instructions: r.instructions, model: isStudioModel(r.model) ? r.model : DEFAULT_STUDIO_MODEL,
  createdAt: new Date(r.created_at).getTime(),
});
const toAssistantRow = (a: StudioAssistant, userId: string) => ({
  id: a.id, user_id: userId, name: a.name.slice(0, 120), instructions: a.instructions.slice(0, 10000),
  model: a.model, created_at: new Date(a.createdAt).toISOString(), updated_at: new Date().toISOString(),
});

async function flush(): Promise<void> {
  const userId = state.userId;
  if (!userId) return;
  const threads = Object.values(state.pending.threads);
  const assistants = Object.values(state.pending.assistants);
  if (!threads.length && !assistants.length) { state.status = "saved"; emit(); return; }
  state.status = "saving"; emit();
  try {
    if (assistants.length) {
      const { error } = await supabase.from("studio_assistants").upsert(assistants.map((a) => toAssistantRow(a, userId)));
      if (error) throw error;
      for (const a of assistants) if (state.pending.assistants[a.id] === a) delete state.pending.assistants[a.id];
    }
    if (threads.length) {
      const { error } = await supabase.from("studio_threads").upsert(threads.map((t) => toThreadRow(t, userId)));
      if (error) throw error;
      for (const t of threads) if (state.pending.threads[t.id] === t) delete state.pending.threads[t.id];
    }
    if (state.userId !== userId) return;
    writePending();
    const more = Object.keys(state.pending.threads).length + Object.keys(state.pending.assistants).length;
    if (more) return flush();
    state.status = "saved";
  } catch {
    if (state.userId !== userId) return;
    writePending();
    state.status = "error";
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => { void flush(); }, RETRY_MS);
  }
  emit();
}

let flushing: Promise<void> | null = null;
const scheduleFlush = () => {
  if (flushing) { void flushing.then(() => scheduleFlush()); return; }
  flushing = flush().finally(() => { flushing = null; });
};

const reload = (userId: string) => load(userId, false);

async function load(userId: string, reset = true) {
  if (reset) {
  state.userId = userId; state.loaded = false; state.threads = []; state.assistants = [];
  state.pending = readLocal<Pending>(pendingKey(userId), { threads: {}, assistants: {} });
  state.pending.threads ??= {}; state.pending.assistants ??= {};
  emit();

  // Primeira vez com conta: leva as conversas antigas deste navegador e apaga a cópia local.
  const legacyThreads = legacyThreadsToImport(readLocal<unknown>(LEGACY_THREADS_KEY, []));
  const legacyAssistants = readLocal<StudioAssistant[]>(LEGACY_ASSISTANTS_KEY, []).filter((a) => a && isUuid(a.id) && a.name);
  for (const t of legacyThreads) state.pending.threads[t.id] ??= t;
  for (const a of legacyAssistants) state.pending.assistants[a.id] ??= { ...a, model: isStudioModel(a.model) ? a.model : DEFAULT_STUDIO_MODEL };
  writePending();
  try { localStorage.removeItem(LEGACY_THREADS_KEY); localStorage.removeItem(LEGACY_ASSISTANTS_KEY); } catch { /* ignore */ }
  }

  const [threadsRes, assistantsRes] = await Promise.all([
    supabase.from("studio_threads").select("id,title,model,assistant_id,messages,updated_at").order("updated_at", { ascending: false }).limit(500),
    supabase.from("studio_assistants").select("id,name,instructions,model,created_at").order("created_at", { ascending: true }),
  ]);
  if (state.userId !== userId) return;
  const remoteThreads = (threadsRes.data ?? []).map((r) => fromThreadRow(r as ThreadRow));
  const remoteAssistants = (assistantsRes.data ?? []).map((r) => fromAssistantRow(r as AssistantRow));
  // O que ficou pendente aqui vence o que está no servidor (é mais novo).
  const byId = new Map(remoteThreads.map((t) => [t.id, t]));
  for (const t of Object.values(state.pending.threads)) byId.set(t.id, t);
  const aById = new Map(remoteAssistants.map((a) => [a.id, a]));
  for (const a of Object.values(state.pending.assistants)) aById.set(a.id, a);
  // Mantém rascunhos (conversa nova ainda sem mensagem) criados enquanto carregava.
  for (const t of state.threads) if (!byId.has(t.id)) byId.set(t.id, t);
  for (const a of state.assistants) if (!aById.has(a.id)) aById.set(a.id, a);
  state.threads = [...byId.values()];
  state.assistants = [...aById.values()].sort((a, b) => a.createdAt - b.createdAt);
  state.loaded = true;
  emit();
  if (threadsRes.error || assistantsRes.error) {
    // Sem conexão agora: mostra o que há aqui e tenta buscar a linha do tempo de novo.
    state.status = "error"; emit();
    window.setTimeout(() => { if (state.userId === userId) void reload(userId); }, RETRY_MS);
    return;
  }
  scheduleFlush();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const apply = (userId: string | null) => {
    if (userId === state.userId) return;
    if (!userId) {
      state.userId = null; state.loaded = false; state.threads = []; state.assistants = [];
      state.pending = { threads: {}, assistants: {} }; state.status = "saved"; emit();
      return;
    }
    void load(userId);
  };
  void supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
  supabase.auth.onAuthStateChange((_e, session) => apply(session?.user.id ?? null));
  window.addEventListener("online", () => scheduleFlush());
}

export function useStudioStore() {
  start();
  const snapshot = () => ({
    enabled: typeof window !== "undefined" && isStudioEnabled(localStorage.getItem(STUDIO_ENABLED_KEY)),
    loaded: state.loaded,
    threads: timelineThreads(state.threads),
    assistants: state.assistants,
    saveStatus: state.status,
  });
  const [snap, setSnap] = useState(snapshot);
  useEffect(() => {
    const sync = () => setSnap(snapshot());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return snap;
}

export const setStudioEnabled = (on: boolean) => {
  try { localStorage.setItem(STUDIO_ENABLED_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  emit();
};

const uid = () => (crypto.randomUUID?.() ?? "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
  (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16)));

/** Conversa nova fica só na memória até a primeira mensagem (não polui a linha do tempo). */
export function createThread(assistant?: StudioAssistant): StudioThread {
  start();
  const t: StudioThread = {
    id: uid(), title: assistant ? assistant.name : "Nova conversa", assistantId: assistant?.id,
    model: assistant?.model ?? DEFAULT_STUDIO_MODEL, updatedAt: Date.now(), messages: [],
  };
  state.threads = [t, ...state.threads];
  emit();
  return t;
}
export function getThread(id: string) { return state.threads.find((t) => t.id === id); }
export function saveThread(t: StudioThread) {
  state.threads = state.threads.some((x) => x.id === t.id) ? state.threads.map((x) => (x.id === t.id ? t : x)) : [t, ...state.threads];
  if (t.messages.length > 0) {
    state.pending.threads[t.id] = t;
    writePending();
    scheduleFlush();
  }
  emit();
}
export function deleteThread(id: string) {
  state.threads = state.threads.filter((t) => t.id !== id);
  delete state.pending.threads[id];
  writePending();
  emit();
  void supabase.from("studio_threads").delete().eq("id", id);
}

export function saveAssistant(a: Omit<StudioAssistant, "id" | "createdAt"> & { id?: string }): StudioAssistant {
  start();
  const model = isStudioModel(a.model) ? a.model : DEFAULT_STUDIO_MODEL;
  const existing = a.id ? state.assistants.find((x) => x.id === a.id) : undefined;
  const saved: StudioAssistant = existing
    ? { ...existing, name: a.name, instructions: a.instructions, model }
    : { id: uid(), name: a.name, instructions: a.instructions, model, createdAt: Date.now() };
  state.assistants = existing ? state.assistants.map((x) => (x.id === saved.id ? saved : x)) : [...state.assistants, saved];
  state.pending.assistants[saved.id] = saved;
  writePending();
  scheduleFlush();
  emit();
  return saved;
}
export function deleteAssistant(id: string) {
  state.assistants = state.assistants.filter((a) => a.id !== id);
  delete state.pending.assistants[id];
  writePending();
  emit();
  void supabase.from("studio_assistants").delete().eq("id", id);
}
export function getAssistant(id?: string) { return id ? state.assistants.find((a) => a.id === id) : undefined; }
