import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Captura erros de renderização para evitar "tela preta" total.
 * Se a app quebrar em runtime, mostra um fallback amigável com opção de
 * recarregar limpando caches (mitiga versão desatualizada / propagação).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log para diagnóstico (aparece nos logs do navegador).
    console.error("App crash capturado pelo ErrorBoundary:", error, info);
  }

  private handleReload = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* ignore */
    }
    const u = new URL(window.location.href);
    u.searchParams.set("_v", Date.now().toString(36));
    window.location.replace(u.toString());
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="mx-auto h-12 w-12 rounded-full border border-border flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-semibold">Algo não carregou corretamente</h1>
          <p className="text-sm text-muted-foreground">
            Pode ter sido uma atualização recente da plataforma. Recarregue a
            página para carregar a versão mais nova.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Recarregar plataforma
          </button>
        </div>
      </div>
    );
  }
}
