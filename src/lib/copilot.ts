// Copiloto MedStation — conversa compartilhada entre o card do painel e o painel lateral
// (as duas telas mostram a mesma conversa). Fica só na memória da aba: nada é salvo no
// aparelho nem no banco, e a conversa some ao recarregar ou sair.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  COPILOT_FEATURES,
  COPILOT_MAX_ACTIONS,
  type CopilotFeature,
} from "../../supabase/functions/copilot-chat/catalog";

export type { CopilotFeature };

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** destinos validados do catálogo, na ordem sugerida */
  actions?: CopilotFeature[];
  error?: boolean;
}

interface CopilotState {
  messages: CopilotMessage[];
  loading: boolean;
}

const FEATURE_BY_ID = new Map(COPILOT_FEATURES.map((f) => [f.id, f]));

/** Só ids do catálogo viram botão; o resto é ignorado, na ordem e no limite certos. */
export function resolveCopilotActions(ids: unknown): CopilotFeature[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: CopilotFeature[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || seen.has(id)) continue;
    const feature = FEATURE_BY_ID.get(id);
    if (!feature) continue;
    seen.add(id);
    out.push(feature);
    if (out.length >= COPILOT_MAX_ACTIONS) break;
  }
  return out;
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

export async function sendCopilotMessage(text: string): Promise<void> {
  const message = text.trim().slice(0, 1500);
  if (!message || state.loading) return;

  const history = state.messages
    .filter((m) => !m.error)
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));

  const myGeneration = generation;
  setState({
    messages: [...state.messages, { id: nextId(), role: "user", content: message }],
    loading: true,
  });

  try {
    const { data, error } = await supabase.functions.invoke("copilot-chat", { body: { message, history } });
    if (myGeneration !== generation) return;
    if (error) {
      const msg = await readFunctionError(error);
      throw msg ? new CopilotFunctionError(msg) : error;
    }
    if (myGeneration !== generation) return;
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
    setState({
      messages: [
        ...state.messages,
        {
          id: nextId(),
          role: "assistant",
          content: known ?? "Não consegui responder agora. Tente de novo em instantes.",
          error: true,
        },
      ],
      loading: false,
    });
  }
}

export function resetCopilot() {
  generation += 1;
  setState({ messages: [], loading: false });
}

export function useCopilot(): CopilotState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
