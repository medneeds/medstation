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
import { trackCtaClick } from "@/lib/analytics";

interface LeadFormProps {
  /** Identificador da origem gravado junto do lead. */
  source?: string;
  /** Rótulo do botão principal do primeiro passo. */
  ctaLabel?: string;
  className?: string;
}

const phoneMask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, "($1");
  if (d.length <= 6) return d.replace(/^(\d{2})(\d{0,4})/, "($1) $2");
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};

const isPhoneValid = (v: string) => v.replace(/\D/g, "").length >= 10;

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
 * Captação de lead em dois passos curtos:
 * 1) nome + telefone + e-mail (gravado no backend antes de qualquer navegação)
 * 2) senha para concluir a conta e liberar os 7 dias de teste
 */
export function LeadForm({ source = "lp3", ctaLabel = "Quero testar 7 dias grátis", className = "" }: LeadFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [crm, setCrm] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const saveLead = async () => {
    await supabase.from("leads").insert({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      crm: crm.trim() || null,
      source,
      utm: collectUtm(),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!fullName.trim() || fullName.trim().length < 3) {
      toast({ variant: "destructive", title: "Informe seu nome completo" });
      return;
    }
    if (!isPhoneValid(phone)) {
      toast({ variant: "destructive", title: "Telefone inválido", description: "Use o formato (00) 00000-0000." });
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

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: { full_name: validated.fullName, phone: phone.trim(), crm: crm.trim() || null },
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
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "welcome-lead",
              recipientEmail: validated.email,
              idempotencyKey: `welcome-lead-${data.user.id}`,
              templateData: {
                name: validated.fullName,
                appUrl: window.location.origin,
                referralUrl: `${window.location.origin}/indicar`,
              },
            },
          });
        } catch (err) {
          console.error("Welcome email failed", err);
        }
      }

      if (data.session) {
        try {
          await supabase.from("profiles").update({ phone: phone.trim(), crm: crm.trim() || null }).eq("id", data.user!.id);
        } catch (err) {
          console.error("Profile update failed", err);
        }
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
        Acesso completo aos 12 assistentes. Sem cartão de crédito.
      </p>

      {step === 1 ? (
        <form onSubmit={handleStep1} className="mt-5 space-y-3">
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
            <Label htmlFor="lead-phone" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Telefone (WhatsApp)
            </Label>
            <Input
              id="lead-phone"
              value={phone}
              onChange={(e) => setPhone(phoneMask(e.target.value))}
              placeholder="(11) 90000-0000"
              inputMode="tel"
              autoComplete="tel"
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
            <Label htmlFor="lead-crm" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              CRM <span className="normal-case tracking-normal">(opcional)</span>
            </Label>
            <Input
              id="lead-crm"
              value={crm}
              onChange={(e) => setCrm(e.target.value)}
              placeholder="123456/SP"
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
        <form onSubmit={handleStep2} className="mt-5 space-y-3">
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

          <GoogleAuthButton label="Continuar com Google" redirectTo="/dashboard" hideDivider />
        </form>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        Seus dados ficam protegidos e são usados só para liberar seu acesso.
      </p>
    </div>
  );
}
