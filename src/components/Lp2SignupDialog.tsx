import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { signUpSchema } from "@/lib/validations";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { trackCtaClick } from "@/lib/analytics";

interface Lp2SignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const points = [
  "7 dias de uso gratuito dentro da plataforma",
  "Sem cadastrar cartão de crédito",
  "Cancelamento a qualquer momento",
];

/**
 * Cadastro compacto em pop-up para a LP2 — captura o lead sem sair da página.
 */
export function Lp2SignupDialog({ open, onOpenChange }: Lp2SignupDialogProps) {
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
      trackCtaClick({ cta: "cadastro_popup_lp2", section: "lp2", plan: "free", destination: "/confirmar-email" });

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar conta</DialogTitle>
          <DialogDescription>
            Você usa a plataforma por 7 dias gratuitamente, sem cadastrar cartão de crédito.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-1.5">
          {points.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lp2-name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Nome completo
            </Label>
            <Input
              id="lp2-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dra. Maria Souza"
              autoComplete="name"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lp2-email" className="text-xs uppercase tracking-wider text-muted-foreground">
              E-mail
            </Label>
            <Input
              id="lp2-email"
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
            <Label htmlFor="lp2-password" className="text-xs uppercase tracking-wider text-muted-foreground">
              Senha
            </Label>
            <Input
              id="lp2-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
              required
              className="h-11"
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando sua conta...
              </>
            ) : (
              <>
                Criar conta <ArrowRight className="w-4 h-4 ml-2" />
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
      </DialogContent>
    </Dialog>
  );
}
