import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { signUpSchema } from "@/lib/validations";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { trackCtaClick, trackLifecycleEvent } from "@/lib/analytics";

interface LeadFormProps {
  /** Identificador da origem gravado junto do lead. */
  source?: string;
  /** Rótulo do botão principal do primeiro passo. */
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
 * - Fluxo por e-mail em dois passos curtos: (1) nome + e-mail, (2) senha.
 * Telefone e CRM/UF não são pedidos antes da ativação (coletados depois no perfil).
 */
export function LeadForm({ source = "lp3", ctaLabel = "Quero testar 7 dias grátis", className = "" }: LeadFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const saveLead = async () => {
    const { error } = await supabase.from("leads").insert({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      // A coluna phone é NOT NULL no banco; mantemos string vazia por
      // compatibilidade enquanto o telefone deixa de bloquear o cadastro.
      phone: "",
      source,
      utm: collectUtm(),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
    if (error) throw error;

    // Um evento para cada linha de lead que o backend confirmou.
    // Nenhum identificador pessoal é enviado ao analytics.
    trackLifecycleEvent("lead_created", { source });
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!fullName.trim() || fullName.trim().length < 3) {
      toast({ variant: "destructive", title: "Informe seu nome completo" });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast({ variant: "destructive", title: "E-mail inválido" });
      return;
    }
    setLoading(true);
    trackCtaClick({ cta: "lead_form_dados", section: source, plan: "trial", destination: "senha" });
    try {
      await saveLead();
    } catch (err) {
      console.error("Lead insert failed", err);
    } finally {
      setLoading(false);
      setStep(2);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const validated = signUpSchema.parse({ email: email.trim(), password, fullName: fullName.trim() });
      trackCtaClick({ cta: "lead_form_conta", section: source, plan: "trial", destination: "/confirmar-email" });
      // signup_started mede tentativas reais. Não deduplicar permanentemente: após
      // uma falha válida o usuário pode tentar novamente e isso é informação útil.
      trackLifecycleEvent("signup_started", { source, auth_method: "email" });

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            full_name: validated.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
        },
      });

      if (error) {
        const msg = /already registered|already been registered|User already/i.test(error.message)
          ? "Este e-mail já possui cadastro. Tente entrar ou recuperar a senha."
          : error.message;
        toast({ variant: "destructive", title: "Erro no cadastro", description: msg });
        setLoading(false);
        return;
      }

      if (data.user) {
        trackLifecycleEvent("signup_completed", { source, auth_method: "email" }, data.user.id);
        try {
          const refCode = localStorage.getItem("medstation_ref_code");
          if (refCode) {
            await supabase.functions.invoke("referral-track", { body: { code: refCode } });
            localStorage.removeItem("medstation_ref_code");
            localStorage.removeItem("medstation_ref_expiry");
          }
        } catch (err) {
          console.error("Referral tracking failed", err);
        }

        try {
          await supabase.functions.invoke("send-welcome-lead", {
            body: { userId: data.user.id },
          });
        } catch (err) {
          console.error("Welcome email failed", err);
        }
      }

      if (data.session) {
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate(`/confirmar-email?email=${encodeURIComponent(validated.email)}`, {
        state: { email: validated.email },
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: error.errors?.[0]?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border border-border/70 bg-card/90 backdrop-blur-sm p-5 md:p-7 shadow-[0_24px_60px_-32px_hsl(var(--primary)/0.45)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {step === 1 ? "Comece seu teste de 7 dias" : "Crie sua senha"}
        </p>
        <span className="text-[11px] text-muted-foreground">Passo {step} de 2</span>
      </div>
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
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">ou por e-mail</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={handleStep1} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Nome completo
            </Label>
            <Input
              id="lead-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dra. Maria Souza"
              autoComplete="name"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-email" className="text-[11px] uppercase tracking-wider text-muted-foreground">
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
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                {ctaLabel} <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleStep2} className="mt-4 space-y-3">
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{email}</span>
            <button
              type="button"
              className="ml-auto underline shrink-0"
              onClick={() => setStep(1)}
            >
              alterar
            </button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-password" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Senha
            </Label>
            <Input
              id="lead-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
              required
              autoFocus
              className="h-11"
            />
          </div>

          <Button type="submit" className="w-full h-12 text-sm md:text-base" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Liberando seu acesso...
              </>
            ) : (
              <>
                Liberar meus 7 dias <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        Seus dados ficam protegidos e são usados só para liberar seu acesso.
      </p>
    </div>
  );
}
