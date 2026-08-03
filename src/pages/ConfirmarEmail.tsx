import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MailCheck, RefreshCw, ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";

const RESEND_COOLDOWN = 45;

export default function ConfirmarEmail() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const email = useMemo(() => {
    const fromState = (location.state as { email?: string } | null)?.email;
    return fromState || params.get("email") || "";
  }, [location.state, params]);

  const [seconds, setSeconds] = useState(RESEND_COOLDOWN);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const handleResend = async () => {
    if (!email) {
      navigate("/auth", { replace: true });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth?confirmed=1` },
      });
      if (error) throw error;
      toast({ title: "E-mail reenviado", description: "Confira sua caixa de entrada e o spam." });
      setSeconds(RESEND_COOLDOWN);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Não foi possível reenviar", description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center px-5 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg text-center space-y-7"
      >
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Confirme seu e-mail
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enviamos um link de confirmação
            {email ? (
              <>
                {" "}para <span className="font-medium text-foreground">{email}</span>
              </>
            ) : null}
            . Abra o e-mail e clique no link para ativar sua conta — depois você volta para a tela de
            entrada.
          </p>
        </div>

        <div className="rounded-2xl border border-hairline bg-card/50 p-5 text-left space-y-3">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>
              Enquanto o e-mail não é confirmado, o acesso fica bloqueado por segurança — por isso o
              login ainda não funciona.
            </span>
          </div>
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>Não chegou? Confira a caixa de spam ou reenvie o link abaixo.</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleResend}
            disabled={sending || seconds > 0}
            className="h-12 rounded-xl px-6"
          >
            {sending
              ? "Reenviando..."
              : seconds > 0
                ? `Reenviar em ${seconds}s`
                : "Reenviar link de confirmação"}
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl px-6">
            <Link to="/auth">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ir para o login
            </Link>
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} MedStation AI · LGPD
        </p>
      </motion.div>
    </div>
  );
}
