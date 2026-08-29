import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { signUpSchema } from "@/lib/validations";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { trackCtaClick } from "@/lib/analytics";

const benefits = [
  "Examinus liberado de graça, sem limite de demonstração",
  "Até 30.000 caracteres por mensagem (a demonstração vai até 8.000)",
  "Histórico das suas consultas salvo na sua conta",
  "Sem espera entre uma mensagem e outra",
];

/**
 * Cadastro inline da landing page.
 * Mantém o visitante na mesma página: sem cartão, sem redirecionamento antes de concluir.
 */
export function InlineSignup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const validated = signUpSchema.parse({ email, password, fullName });
      trackCtaClick({ cta: "cadastro_inline", section: "cadastro", plan: "free", destination: "/confirmar-email" });

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

        // O e-mail de boas-vindas/teste de 7 dias é disparado uma única vez
        // pelo WelcomeEmailTrigger, com idempotência no servidor.
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 items-center rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5 md:p-8 lg:p-10">
      <div className="space-y-4 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-primary text-[11px] font-semibold uppercase tracking-wider">
            Cadastro grátis · R$ 0 · sem cartão
          </span>
        </div>
        <h3 className="font-display text-2xl md:text-3xl tracking-tight leading-tight">
          Criar conta não custa nada.{" "}
          <span className="italic text-primary">E libera mais coisa.</span>
        </h3>
        <p className="text-sm text-muted-foreground">
          Você não paga nada para se cadastrar e não precisa informar cartão em momento nenhum. A assinatura é
          opcional e só entra se você quiser o acesso completo à MedStation.
        </p>
        <ul className="space-y-2">
          {benefits.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-left">
        <div className="space-y-1.5">
          <Label htmlFor="inline-name" className="text-xs uppercase tracking-wider text-muted-foreground">
            Nome completo
          </Label>
          <Input
            id="inline-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Dra. Maria Souza"
            autoComplete="name"
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inline-email" className="text-xs uppercase tracking-wider text-muted-foreground">
            E-mail
          </Label>
          <Input
            id="inline-email"
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
          <Label htmlFor="inline-password" className="text-xs uppercase tracking-wider text-muted-foreground">
            Senha
          </Label>
          <Input
            id="inline-password"
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
              Criar minha conta grátis <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        <GoogleAuthButton label="Criar conta com Google" redirectTo="/dashboard" hideDivider />

        <p className="text-[11px] text-center text-muted-foreground">
          Você recebe um e-mail para confirmar o cadastro. Já tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="text-primary underline underline-offset-2"
          >
            Entrar
          </button>
        </p>
      </form>
    </div>
  );
}
