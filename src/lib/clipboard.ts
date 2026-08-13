/**
 * Cópia robusta para a área de transferência.
 *
 * O `navigator.clipboard.writeText` falha silenciosamente em vários cenários
 * reais (documento sem foco, iframe, permissão negada, Safari/iOS fora de um
 * gesto direto). Aqui a Promise é sempre aguardada e existe um fallback via
 * textarea + execCommand, para que o retorno reflita o resultado verdadeiro.
 */
export async function copyText(text: string): Promise<boolean> {
  const value = (text ?? "").toString();
  if (!value.trim()) return false;

  // Caminho moderno
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        // Alguns navegadores rejeitam se o documento não estiver focado
        window.focus?.();
      } catch {
        /* ignore */
      }
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (err) {
    console.warn("[clipboard] writeText falhou, usando fallback:", err);
  }

  // Fallback legado
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }
    return ok;
  } catch (err) {
    console.error("[clipboard] fallback falhou:", err);
    return false;
  }
}
