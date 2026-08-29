import { useState } from "react";
import { ArrowRight, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { trackCtaClick, trackLifecycleEvent } from "@/lib/analytics";

interface LeadFormProps {
  /** Identificador da origem gravado junto do lead. */
  source?: string;
  /** Rótulo do botão principal. */
  ctaLabel?: string;
  className?: string;
}

function collectUtm() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
    const v = p.get(k);
    if (v) out[k] = v;
  });
  return out;
}

/**
 * Cadastro de menor fricção possível:
 * - Google como primeira opção visível.
 * - Fluxo por e-mail sem senha: um único campo e link seguro de acesso.
 * Nome, telefone e CRM/UF são coletados depois, já dentro do produto.
 */
export function LeadForm({
  source = "lp3",
  ctaLabel = "Começar teste grátis",
  className = "",
}: LeadFormProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const saveLead = async (normalizedEmail: string) => {
    // Colunas legadas NOT NULL: mantidas vazias enquanto o cadastro não as pede.
    const { error } = await supabase.from("leads").insert({
      full_name: "",
      email: normalizedEmail,
      phone: "",
      source,
      utm: collectUtm(),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
    if (error) throw error;
    trackLifecycleEvent("lead_created", { source });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      toast({ variant: "destructive", title: "E-mail inválido" });
      return;
    }

    setLoading(true);
    trackCtaClick({ cta: "lead_form_email", section: source, plan: "trial", destination: "/auth" });
    trackLifecycleEvent("signup_started", { source, auth_method: "email_magic_link" });

    // A gravação do lead nunca pode bloquear o acesso.
    try {
      await saveLead(normalized);
    } catch (err) {
      console.error("Lead insert failed", err);
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
        },
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Não conseguimos enviar o link",
          description: error.message,
        });
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border border-border/70 bg-card/90 backdrop-blur-sm p-5 md:p-7 shadow-[0_24px_60px_-32px_hsl(var(--primary)/0.45)] ${className}`}
    >
      {sent ? (
        <div>
          <div className="flex items-center gap-2">
            <MailCheck className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm font-semibold">Confira seu e-mail</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Enviamos um link seguro para entrar na MedStation. Ele foi enviado para{" "}
            <span className="text-foreground">{email.trim().toLowerCase()}</span>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => {
                setSent(false);
              }}
            >
              Alterar e-mail
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              disabled={loading}
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Reenviar link
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold">Comece seu teste de 7 dias</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Acesso completo à MedStation. Sem cartão de crédito.
          </p>

          <div className="mt-4 space-y-3">
            <GoogleAuthButton
              label="Continuar com Google"
              redirectTo="/dashboard"
              hideDivider
              trackAsSignup
              source={source}
            />
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                ou por e-mail
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="lead-email"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                E-mail
              </Label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-sm md:text-base" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando link...
                </>
              ) : (
                <>
                  {ctaLabel} <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Sem senha: enviamos um link seguro de acesso para o seu e-mail.
            </p>
          </form>
        </>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        Seus dados ficam protegidos e são usados só para liberar seu acesso.
      </p>
    </div>
  );
}
