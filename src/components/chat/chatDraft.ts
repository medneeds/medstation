/**
 * Rascunho do campo de mensagem por assistente (sessionStorage).
 * Protege o texto do médico contra recarga da página ou troca de tela no plantão.
 * Toda leitura/escrita é tolerante a falhas: sem storage, o chat funciona igual.
 */

export const chatDraftKey = (agentType: string) => `${agentType}_draft`;

/** O rascunho só entra se o campo estiver vazio (ex.: o agent-prefill tem prioridade). */
export function draftToRestore(current: string, saved: string | null | undefined): string | null {
  if (current.length > 0) return null;
  if (!saved || !saved.trim()) return null;
  return saved;
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const defaultStorage = (): DraftStorage | null => {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

export function readChatDraft(agentType: string, storage: DraftStorage | null = defaultStorage()): string | null {
  try {
    return storage?.getItem(chatDraftKey(agentType)) ?? null;
  } catch {
    return null;
  }
}

/** Texto vazio (ou só espaços) apaga o rascunho em vez de gravar. */
export function writeChatDraft(agentType: string, text: string, storage: DraftStorage | null = defaultStorage()): void {
  try {
    if (text.trim()) storage?.setItem(chatDraftKey(agentType), text);
    else storage?.removeItem(chatDraftKey(agentType));
  } catch {
    /* storage cheio ou bloqueado: segue sem rascunho */
  }
}

export function clearChatDraft(agentType: string, storage: DraftStorage | null = defaultStorage()): void {
  try {
    storage?.removeItem(chatDraftKey(agentType));
  } catch {
    /* sem storage disponível */
  }
}
