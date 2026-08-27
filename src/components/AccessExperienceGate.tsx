import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarClock, CheckCircle2, Crown, LockKeyhole, Settings2, Sparkles } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackLifecycleEvent } from "@/lib/analytics";
import { hasSeenWelcomeTour } from "@/pages/WelcomeTour";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function TrialWelcomeDialog() {
  const { isTrial, trialSource, trialStartedAt, trialEndsAt, loading } = useSubscription();
  const [open, setOpen] = useState(false);

  const storageKey = useMemo(() => {
    if (!trialStartedAt) return null;
    return `medstation:trial-welcome:${trialStartedAt}`;
  }, [trialStartedAt]);

  useEffect(() => {
    if (loading || !isTrial || trialSource !== "signup" || !storageKey) return;
    // O tour de primeiro acesso (/welcome-tour) é a única introdução automática.
    // O aviso de trial só aparece depois que ele foi concluído ou pulado.
    if (!hasSeenWelcomeTour()) return;
    try {
      const pendingGoogleSignup = localStorage.getItem("ms_google_signup_pending");
      if (pendingGoogleSignup) {
        const pending = JSON.parse(pendingGoogleSignup) as { source?: string; destination?: string };
        trackLifecycleEvent("signup_completed", {
          source: pending.source ?? "oauth",
          auth_method: "google",
          destination: pending.destination ?? "/dashboard",
          trial_started_at: trialStartedAt,
        }, `google:${trialStartedAt ?? "signup"}`);
        localStorage.removeItem("ms_google_signup_pending");
      }
    } catch {
      /* acquisition attribution is best-effort */
    }

    trackLifecycleEvent("trial_started", {
      trial_source: trialSource,
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
    }, trialStartedAt ?? undefined);
    trackLifecycleEvent("first_login", {
      trial_source: trialSource,
      trial_started_at: trialStartedAt,
    }, trialStartedAt ?? undefined);

    try {
      if (localStorage.getItem(storageKey) !== "seen") {
        setOpen(true);
        trackLifecycleEvent("trial_welcome_viewed", {
          trial_source: trialSource,
          trial_ends_at: trialEndsAt,
        }, trialStartedAt ?? undefined);
      }
    } catch {
      setOpen(true);
    }
  }, [isTrial, loading, storageKey, trialSource, trialStartedAt, trialEndsAt]);

  const close = () => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "seen");
      } catch {
        /* localStorage is best-effort only */
      }
    }
    setOpen(false);
  };

  if (!isTrial || trialSource !== "signup") return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <DialogTitle className="font-display text-2xl">Seus 7 dias começaram.</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Toda a MedStation está liberada durante o teste: assistentes clínicos, Modo Escuta e Modo Rotineiro. Sem cartão de crédito.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarClock className="h-4 w-4 text-primary" />
            Acesso completo até {formatDate(trialEndsAt) ?? "o fim do período de teste"}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Você decide se quer assinar quando o teste terminar.
          </div>
        </div>

        <Button className="w-full" onClick={close}>Começar a usar</Button>
      </DialogContent>
    </Dialog>
  );
}

const ALWAYS_ACCESSIBLE_PATHS = new Set(["/settings", "/pricing", "/precos", "/planos"]);

export function AccessContentGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { accessActive, accessStatus, trialEndsAt, loading } = useSubscription();
  const alwaysAccessible = ALWAYS_ACCESSIBLE_PATHS.has(pathname);

  useEffect(() => {
    if (loading || accessActive || alwaysAccessible) return;
    const dedupe = `${accessStatus}:${trialEndsAt ?? "none"}`;
    if (accessStatus === "trial_expired") {
      trackLifecycleEvent("trial_expired", {
        access_status: accessStatus,
        trial_ends_at: trialEndsAt,
      }, dedupe);
    }
    trackLifecycleEvent("paywall_viewed", {
      access_status: accessStatus,
      trial_ends_at: trialEndsAt,
      blocked_path: pathname,
    });
  }, [loading, accessActive, accessStatus, trialEndsAt, pathname, alwaysAccessible]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Verificando seu acesso...</div>;
  }

  if (accessActive || alwaysAccessible) return <>{children}</>;

  // Falha temporária na verificação de cobrança NÃO deve virar paywall.
  if (accessStatus === "verification_error") {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Não conseguimos confirmar seu acesso agora. Atualize a página em instantes — nada foi alterado na sua conta.
      </div>
    );
  }

  const expired = accessStatus === "trial_expired";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center py-8">
      <Card className="w-full border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <CardTitle className="font-display text-2xl">
            {expired ? "Seu teste de 7 dias terminou" : "Assine para continuar usando a MedStation"}
          </CardTitle>
          <CardDescription className="mx-auto max-w-lg leading-relaxed">
            {expired
              ? `Seu período gratuito terminou${trialEndsAt ? ` em ${formatDate(trialEndsAt)}` : ""}. Sua conta permanece ativa e seus dados continuam preservados.`
              : "Sua conta está ativa, mas é necessário ter um acesso válido para usar as ferramentas da plataforma."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted/45 p-4 text-sm text-muted-foreground">
            Ao assinar, os assistentes, o Modo Escuta, o Modo Rotineiro, voz, OCR e geração de documentos são liberados novamente na sua conta.
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link to="/pricing">
                <Crown className="mr-2 h-4 w-4" />
                Assinar MedStation
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/settings">
                <Settings2 className="mr-2 h-4 w-4" />
                Minha conta
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
