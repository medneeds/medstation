// Copiloto MedStation — conversa compartilhada entre o card do painel e o painel lateral
// (as duas telas mostram a mesma conversa). Fica só na memória da aba: nada é salvo no
// aparelho nem no banco, e a conversa some ao recarregar ou sair.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isBlackActive } from "@/lib/pricingSchedule";
import {
  COPILOT_FEATURES,
  COPILOT_MAX_ACTIONS,
  COPILOT_MAX_CHARS,
  COPILOT_MAX_HISTORY,
  availableCopilotFeatures,
  normalizeCopilotPage,
  suggestCopilotFeatures,
  type CopilotFeature,
} from "../../supabase/functions/copilot-chat/catalog";

export type { CopilotFeature };
export { COPILOT_FEATURES };

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** destinos validados do catálogo, na ordem sugerida */
  actions?: CopilotFeature[];
  error?: boolean;
  /** pergunta que falhou, para o botão "Tentar de novo" */
  retryText?: string;
}

interface CopilotState {
  messages: CopilotMessage[];
  loading: boolean;
}

/** Tempo máximo de espera no app (a função tem 25 s para a IA). */
export const COPILOT_CLIENT_TIMEOUT_MS = 35_000;

function copilotContext(now: number = Date.now()) {
  return { blackActive: isBlackActive(now) };
}

/** Recursos que existem agora (a Black só aparece dentro da janela). */
export function currentCopilotFeatures(now: number = Date.now()): CopilotFeature[] {
  return availableCopilotFeatures(copilotContext(now));
}

/** Só ids do catálogo viram botão; o resto é ignorado, na ordem e no limite certos. */
export function resolveCopilotActions(ids: unknown, now: number = Date.now()): CopilotFeature[] {
  if (!Array.isArray(ids)) return [];
  const byId = new Map(currentCopilotFeatures(now).map((f) => [f.id, f]));
  const seen = new Set<string>();
  const out: CopilotFeature[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || seen.has(id)) continue;
    const feature = byId.get(id);
    if (!feature) continue;
    seen.add(id);
    out.push(feature);
    if (out.length >= COPILOT_MAX_ACTIONS) break;
  }
  return out;
}

/** Atalhos quando a IA não respondeu: busca local no catálogo, ou suporte. */
export function fallbackCopilotActions(question: string, now: number = Date.now()): CopilotFeature[] {
  const found = suggestCopilotFeatures(question, copilotContext(now));
  if (found.length > 0) return found;
  const support = COPILOT_FEATURES.find((f) => f.id === "suporte");
  return support ? [support] : [];
}

export const COPILOT_SUGGESTIONS = [
  "Por onde eu começo hoje?",
  "Qual assistente escreve a anamnese?",
  "Como salvo um atendimento do Modo Escuta?",
  "Como faço uma receita com duas vias?",
];

let state: CopilotState = { messages: [], loading: false };
const listeners = new Set<() => void>();

function setState(next: Partial<CopilotState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let counter = 0;
const nextId = () => `cp-${Date.now()}-${counter++}`;
/** Sobe a cada "Nova conversa": resposta de uma conversa antiga é descartada. */
let generation = 0;
/** Última pergunta vinda do guia já enviada — evita reenviar ao remontar o chat. */
let lastAskNonce: number | null = null;

/** true se esta pergunta do guia ainda não foi enviada (e a marca como enviada). */
export function claimCopilotAsk(nonce: number): boolean {
  if (lastAskNonce === nonce) return false;
  lastAskNonce = nonce;
  return true;
}

/** Erro com mensagem em português vinda da função — a única que mostramos ao médico. */
class CopilotFunctionError extends Error {}

/** Lê a mensagem de erro que a função devolveu (429, 401...), quando houver. */
async function readFunctionError(error: unknown): Promise<string | null> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
    const body = ctx?.json ? ((await ctx.json()) as { error?: unknown }) : null;
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

function isAbort(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name ?? "";
  const ctxName = (e as { context?: { name?: string } } | null)?.context?.name ?? "";
  return name === "AbortError" || ctxName === "AbortError" || name === "TimeoutError";
}

export interface SendCopilotOptions {
  /** location.pathname da tela atual; só o caminho (ids viram :id) vai para a função */
  pathname?: string;
}

export async function sendCopilotMessage(text: string, options: SendCopilotOptions = {}): Promise<void> {
  const message = text.trim().slice(0, COPILOT_MAX_CHARS);
  if (!message || state.loading) return;

  // Respostas de erro não voltam para a IA; as ações seguem como ids, para dar contexto.
  const history = state.messages
    .filter((m) => !m.error)
    .slice(-COPILOT_MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content, actions: m.actions?.map((a) => a.id) ?? [] }));

  const myGeneration = generation;
  setState({
    messages: [...state.messages, { id: nextId(), role: "user", content: message }],
    loading: true,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COPILOT_CLIENT_TIMEOUT_MS);
  try {
    const page = options.pathname ? normalizeCopilotPage(options.pathname) : undefined;
    const { data, error } = await supabase.functions.invoke("copilot-chat", {
      body: { message, history, page },
      signal: controller.signal,
    });
    if (myGeneration !== generation) return;
    if (error) {
      const msg = await readFunctionError(error);
      throw msg ? new CopilotFunctionError(msg) : error;
    }
    const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
    if (!reply) throw typeof data?.error === "string" ? new CopilotFunctionError(data.error) : new Error("empty");
    setState({
      messages: [
        ...state.messages,
        { id: nextId(), role: "assistant", content: reply, actions: resolveCopilotActions(data?.actions) },
      ],
      loading: false,
    });
  } catch (e) {
    if (myGeneration !== generation) return;
    const known = e instanceof CopilotFunctionError ? e.message : null;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const content =
      known ??
      (offline
        ? "Parece que você está sem internet. Confira a conexão e tente de novo."
        : isAbort(e)
          ? "O Copiloto demorou para responder. Tente de novo em instantes."
          : "Não consegui responder agora. Tente de novo em instantes.");
    setState({
      messages: [
        ...state.messages,
        {
          id: nextId(),
          role: "assistant",
          content: `${content} Enquanto isso, estes atalhos podem ajudar:`,
          error: true,
          retryText: message,
          actions: fallbackCopilotActions(message),
        },
      ],
      loading: false,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Reenvia a pergunta que falhou (tira a pergunta e o erro antigos da conversa). */
export async function retryCopilotMessage(messageId: string, options: SendCopilotOptions = {}): Promise<void> {
  const idx = state.messages.findIndex((m) => m.id === messageId);
  const failed = state.messages[idx];
  if (!failed?.retryText || state.loading) return;
  const prev = state.messages[idx - 1];
  const drop = new Set([failed.id, prev?.role === "user" && prev.content === failed.retryText ? prev.id : ""]);
  setState({ messages: state.messages.filter((m) => !drop.has(m.id)) });
  await sendCopilotMessage(failed.retryText, options);
}

export function resetCopilot() {
  generation += 1;
  setState({ messages: [], loading: false });
}

/** Estado atual da conversa (o mesmo que useCopilot entrega). */
export function getCopilotSnapshot(): CopilotState {
  return state;
}

export function useCopilot(): CopilotState {
  return useSyncExternalStore(subscribe, getCopilotSnapshot, getCopilotSnapshot);
}
