/**
 * Ponte entre o topo instantâneo da landing (HTML estático em index.html) e o app.
 * O script do index.html registra em window.__msShell o que o visitante fez antes
 * do app carregar; aqui o app lê e repete cada ação uma única vez.
 */
export type LandingShellAction = "submitted" | "subscribe" | "google";

interface LandingShellState {
  email: string;
  focused: boolean;
  submitted: boolean;
  subscribe: boolean;
  google: boolean;
}

function state(): LandingShellState | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { __msShell?: LandingShellState }).__msShell;
}

/** E-mail digitado no topo instantâneo e se o campo estava em foco (sem consumir). */
export function peekLandingShellEmail(): { email: string; focused: boolean } {
  const s = state();
  return { email: s?.email ?? "", focused: Boolean(s?.focused) };
}

/** Retorna true uma única vez se o visitante fez essa ação antes do app montar. */
export function consumeLandingShellAction(action: LandingShellAction): boolean {
  const s = state();
  if (!s || !s[action]) return false;
  s[action] = false;
  return true;
}

/** Limpa o e-mail guardado, para não reaparecer em outro formulário depois. */
export function clearLandingShellEmail(): void {
  const s = state();
  if (s) {
    s.email = "";
    s.focused = false;
  }
}
