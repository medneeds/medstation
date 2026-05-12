import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";

interface GoogleAuthButtonProps {
  label?: string;
  /** Path to send the user to after a successful sign-in. Defaults to /dashboard or location.state.from */
  redirectTo?: string;
  /** Hide the divider rendered below the button */
  hideDivider?: boolean;
}

/**
 * Botão de login com Google.
 * - Preserva a rota de origem (state.from) para retomar após o callback
 * - Usa prompt=select_account para permitir trocar de conta facilmente
 * - Tratamento de erro humanizado e estado de carregamento acessível
 */
export function GoogleAuthButton({
  label = "Continuar com Google",
  redirectTo,
  hideDivider = false,
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const resolveDestination = () => {
    if (redirectTo) return redirectTo;
    const fromState = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return fromState && fromState !== "/auth" ? fromState : "/dashboard";
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);

    // Constrói o redirect_uri preservando o destino pretendido após o callback OAuth.
    const destination = resolveDestination();
    const redirectUri = `${window.location.origin}${destination}`;

    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
        extraParams: {
          // Sempre mostra o seletor de contas — evita logar com a conta errada por engano.
          prompt: "select_account",
        },
      });

      if (result.error) {
        const message = result.error.message ?? "Não foi possível continuar com o Google.";
        toast({
          title: "Erro ao entrar com Google",
          description: /popup|blocked/i.test(message)
            ? "Permita pop-ups para este site e tente novamente."
            : message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (result.redirected) {
        // Navegador será redirecionado para o Google; mantém o estado de loading.
        return;
      }

      // Sessão já estabelecida sem redirect — navega via SPA, sem full reload.
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Google sign-in error", err);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível iniciar o login com Google. Tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={loading}
        aria-busy={loading}
        aria-label={label}
        className="w-full h-11 gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.7 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.7 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.6 5.6C41.9 36.5 44 30.7 44 24c0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
        )}
        {loading ? "Conectando ao Google..." : label}
      </Button>
      {!hideDivider && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou com email</span>
          </div>
        </div>
      )}
    </div>
  );
}
