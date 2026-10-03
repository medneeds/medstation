/** Microfone dos assistentes: liberado para quem tem acesso ativo (pago, teste grátis, cortesia, admin). */
export function canUseVoice(opts: { accessActive: boolean; subscribed: boolean; loading: boolean }): "allowed" | "locked" | "checking" {
  if (opts.accessActive || opts.subscribed) return "allowed";
  if (opts.loading) return "checking";
  return "locked";
}

/** Junta um trecho novo ao texto já existente, sem espaços duplicados. */
export function appendSpoken(prev: string, next: string): string {
  const a = (prev || "").trimEnd();
  const b = (next || "").trim();
  if (!b) return prev || "";
  return a ? `${a} ${b}` : b;
}

/** Aplica uma transcrição: substitui o trecho ao vivo pela versão completa, ou acrescenta. */
export function applySpoken(prev: string, text: string, replace?: string): string {
  if (replace && prev.includes(replace)) return prev.replace(replace, text.trim());
  return appendSpoken(prev, text);
}
