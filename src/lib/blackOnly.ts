// Novembro só com a Black (Artur, 01/11/2026): durante a Black MedStation as
// páginas públicas de venda levam direto para /black, preservando a query
// (UTM do anúncio) e o hash (retorno do login). Quem já está logado continua
// vendo as páginas normais, e as páginas do app, do login e legais não mudam.
//
// O mesmo redirecionamento roda antes do app carregar, no index.html (script
// "Novembro só com a Black"); um teste mantém a lista de caminhos igual.

import { isBlackActive } from "@/lib/pricingSchedule";

/** Páginas públicas de venda que viram /black enquanto a oferta está no ar. */
export const BLACK_ONLY_PATHS = ["/", "/pricing", "/comecar"] as const;

function normalize(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

/** Há sessão do Supabase salva neste navegador (chave padrão sb-<projeto>-auth-token)? */
export function hasStoredSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && /^sb-.+-auth-token$/.test(key)) return true;
    }
  } catch {
    /* sem storage: trata como visitante */
  }
  return false;
}

/**
 * Para onde mandar o visitante, ou null quando a página deve abrir normalmente.
 */
export function blackOnlyRedirect(
  location: { pathname: string; search?: string; hash?: string },
  options: { loggedIn?: boolean; now?: Date | number } = {},
): string | null {
  if (options.loggedIn) return null;
  if (!isBlackActive(options.now ?? Date.now())) return null;
  if (!(BLACK_ONLY_PATHS as readonly string[]).includes(normalize(location.pathname))) return null;
  return `/black${location.search ?? ""}${location.hash ?? ""}`;
}
