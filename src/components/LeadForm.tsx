import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { signUpSchema } from "@/lib/validations";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { trackCtaClick, trackLifecycleEvent } from "@/lib/analytics";

interface LeadFormProps {
  source?: string;
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
 * Low-friction acquisition entry point.
 * Google is intentionally first because production data shows materially faster
 * time-to-first-value than the email confirmation path.
 * Professional profile data is collected only after the user has reached value.
 */
export function LeadForm({
  source = "lp3",
  ctaLabel = "Quero testar 7 dias grátis",
  className = "",
}: LeadFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const saveLead = async (validatedEmail: string) => {
    const { error } = await supabase.from("leads").insert({
      full_name: fullName.trim(),
      email: validatedEmail.toLowerCase(),
      // `phone` is currently NOT NULL in production. Keep an empty value for
      // compatibility instead of forcing a high-friction field before activation.
      phone: "",
      crm: null,
      crm_state: null,
      source,
      utm: collectUtm(),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
    if (error) throw error;
    trackLifecycleEvent("lead_created", { source }, `${source}:${validatedEmail.toLowerCase()}`);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const validated = signUpSchema.parse({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });

      trackCtaClick({
        cta: "lead_form_email_signup",
        section: source,
        plan: "trial",
        destination: "/confirmar-email",
      });
      trackLifecycleEvent(
        "signup_started",
        { source, auth_method: "email" },
        `email:${validated.email.toLowerCase()}`,
      );

      try {
        await saveLead(validated.email);
      } catch (leadError) {
        // Acquisition telemetry must never prevent account creation.
        console.error("Lead insert failed", leadError);
      }

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: { full_name: validated.fullName },
          emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
        },
      });

      if (error) {
        const msg = /already registered|already been registered|User already/i.test(error.message)
          ? "Este e-mail já possui cadastro. Tente entrar ou recuperar a senha."
          : error.message;
        toast({ variant: "destructive", title: "Erro no cadastro", description: msg });
        return;
      }

      if (data.user) {
        trackLifecycleEvent(
          "signup_completed",
          { source, auth_method: "email" },
          data.user.id,
        );

        try {
          const refCode = localStorage.getItem("medstation_ref_code");
          if (refCode) {
            await supabase.functions.invoke("referral-track", { body: { code: refCode } });
            localStorage.removeItem("medstation_ref_code");
            localStorage.removeItem("medstation_ref_expiry");
          }
        } catch (referralError) {
          console.error("Referral tracking failed", referralError);
        }

        try {
          await supabase.functions.invoke("send-welcome-lead", {
            body: { userId: data.user.id },
          });
        } catch (welcomeError) {
          console.error("Welcome email failed", welcomeError);
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
      <p className="text-sm font-semibold">Comece seu teste de 7 dias</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Acesso completo. Sem cartão de crédito.
      </p>

      <div className="mt-5">
        <GoogleAuthButton
          label="Continuar com Google"
          redirectTo="/dashboard"
          trackAsSignup
          source={source}
        />
      </div>

      <form onSubmit={handleEmailSignup} className="mt-4 space-y-3">
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
            className="h-11"
          />
        </div>

        <Button type="submit" className="w-full h-12 text-sm md:text-base" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando sua conta...
            </>
          ) : (
            <>
              {ctaLabel} <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        Dados profissionais podem ser adicionados depois. Primeiro, teste a plataforma.
      </p>
    </div>
  );
}
