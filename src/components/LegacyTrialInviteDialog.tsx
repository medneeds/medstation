import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, Stethoscope, Mic, ClipboardList, ShieldCheck, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";

const DISMISS_KEY = "legacy_trial_invite_dismissed_at";

const BENEFITS = [
  {
    icon: Stethoscope,
    title: "12 assistentes clínicos",
    desc: "Anamnese, exames, gasometria, prescrição, parecer, alta e mais.",
  },
  {
    icon: Mic,
    title: "Modo Escuta",
    desc: "A consulta acontece e a anamnese sai pronta para copiar.",
  },
  {
    icon: ClipboardList,
    title: "Modo Rotineiro",
    desc: "A visita de enfermaria e UTI evoluída leito a leito.",
  },
];

export function LegacyTrialInviteDialog() {
  const { checkSubscription, subscribed, isTrial, loading } = useSubscription();
  const { search } = useLocation();
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedUntil, setClaimedUntil] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Nunca oferecer para quem já assina ou já está com acesso completo liberado
    if (loading || subscribed || isTrial) return;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("legacy_trial_invites")
        .select("claimed_at, dismissed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled || !data || data.claimed_at || data.dismissed_at) return;

      const forced = new URLSearchParams(search).get("convite") === "7dias";
      const snoozed = sessionStorage.getItem(DISMISS_KEY) === "1";
      if (forced || !snoozed) setOpen(true);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [search, loading, subscribed, isTrial]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-legacy-trial", {
        body: { action: "claim" },
      });
      if (error) throw error;
      if (data?.expires_at) setClaimedUntil(data.expires_at);
      await checkSubscription();
    } catch (e) {
      console.error("[LegacyTrialInvite] erro ao ativar", e);
    } finally {
      setClaiming(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
    supabase.functions
      .invoke("claim-legacy-trial", { body: { action: "dismiss" } })
      .catch(() => undefined);
  };

  const untilLabel = claimedUntil
    ? new Date(claimedUntil).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleDismiss())}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-primary/25">
        {claimedUntil ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Liberado até {untilLabel}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              A plataforma inteira está aberta na sua conta. Comece pelo Modo Escuta na
              próxima consulta — o resto sai pronto.
            </p>
            <Button className="mt-6 w-full" onClick={() => setOpen(false)}>
              Começar agora
            </Button>
          </div>
        ) : (
          <div>
            <div className="bg-primary/5 border-b border-primary/15 px-7 pt-7 pb-6">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background px-2.5 py-1 font-mono text-2xs uppercase tracking-mono text-primary">
                <Sparkles className="h-3 w-3" />
                Convite exclusivo
              </div>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight leading-snug">
                Sua chave da MedStation inteira, por 7 dias
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Você já usa a plataforma. Agora queremos te mostrar o que ela faz num
                plantão inteiro — sem custo e sem compromisso.
              </p>
            </div>

            <div className="px-7 py-6 space-y-4">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <b.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{b.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-2.5 rounded-lg border border-hairline bg-muted/40 px-3 py-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">
                    Sem cartão. Sem cobrança. Sem cancelamento para fazer depois.
                  </span>{" "}
                  Ao fim dos 7 dias sua conta volta ao que era — nada é debitado.
                </p>
              </div>
            </div>

            <div className="px-7 pb-7 space-y-3">
              <Button className="w-full" size="lg" onClick={handleClaim} disabled={claiming}>
                {claiming ? "Liberando..." : "Ativar meus 7 dias"}
              </Button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
