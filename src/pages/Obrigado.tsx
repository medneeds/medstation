import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackPurchaseConversion } from "@/lib/conversion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  Mail,
  Sparkles,
  Mic,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type Status = "processing" | "confirmed" | "login" | "set-password" | "error";

const NEXT_STEPS = [
  {
    icon: Mic,
    title: "Modo Escuta",
    desc: "Grave a consulta e receba a anamnese estruturada em segundos.",
    to: "/consultorio",
  },
  {
    icon: Stethoscope,
    title: "12 assistentes clínicos",
    desc: "Clínicus, Examinus, Prescriptus, Gasometrus e mais — liberados agora.",
    to: "/dashboard",
  },
  {
    icon: ClipboardList,
    title: "Modo Rotineiro",
    desc: "Organize leitos e evoluções de enfermaria e UTI sem retrabalho.",
    to: "/rotina",
  },
];

export default function Obrigado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>("processing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [message, setMessage] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const ran = useRef(false);

  const sessionId = searchParams.get("session_id");
  const planParam = searchParams.get("plan");
  const successParam = searchParams.get("success") === "true";

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootstrap = async () => {
    // Sessão de login é apenas complementar: a confirmação vem do Stripe.
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const isLogged = !!authSession;
    if (isLogged) {
      setAuthenticated(true);
      setEmail(authSession!.user.email ?? "");
    }

    // Fluxo 1 — temos session_id do Stripe: a confirmação não depende de login.
    if (sessionId) {
      try {
        const { data, error } = await supabase.functions.invoke("complete-checkout", {
          body: { sessionId },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Erro ao processar pagamento");

        trackPurchaseConversion({
          transactionId: sessionId,
          value: typeof data.amountTotal === "number" ? data.amountTotal / 100 : undefined,
          currency: data.currency,
          plan: data.plan ?? planParam,
          extra: { user_exists: !!data.userExists, flow: isLogged ? "authenticated" : "guest" },
        });

        setEmail(data.email ?? authSession?.user.email ?? "");
        setUserExists(!!data.userExists);

        if (isLogged) {
          // Revalida a assinatura em segundo plano, sem bloquear a confirmação.
          void supabase.functions.invoke("check-subscription");
        }

        if (data.passwordWasSkipped && !data.userExists && !isLogged) {
          setStatus("set-password");
          return;
        }
        setStatus("confirmed");
        setMessage(
          isLogged
            ? "Sua assinatura está ativa e o acesso completo já foi liberado."
            : data.userExists
              ? "Sua assinatura está ativa. Entre para continuar de onde parou."
              : "Sua conta foi criada e sua assinatura está ativa.",
        );
        return;
      } catch (err: any) {
        console.error("[obrigado] checkout error", err);
        setStatus("error");
        setMessage(err.message || "Não conseguimos confirmar seu pagamento.");
        return;
      }
    }

    // Fluxo 2 — retorno do Stripe sem session_id (ex.: links antigos).
    try {
      if (!isLogged) {
        if (successParam) {
          trackPurchaseConversion({
            transactionId: `guest_${planParam ?? "plan"}_${new Date().toISOString().slice(0, 16)}`,
            plan: planParam,
            currency: "BRL",
            extra: { flow: "guest_no_session" },
          });
          setStatus("confirmed");
          setMessage(
            "Pagamento confirmado. Faça login com o email usado no checkout para liberar o acesso.",
          );
          return;
        }
        setStatus("error");
        setMessage("Não encontramos uma sessão de pagamento. Faça login para verificar sua assinatura.");
        return;
      }

      setAuthenticated(true);
      setEmail(session.user.email ?? "");

      // Revalida a assinatura imediatamente (o Stripe já confirmou o pagamento).
      let subscribed = false;
      for (let attempt = 0; attempt < 3 && !subscribed; attempt++) {
        const { data } = await supabase.functions.invoke("check-subscription");
        subscribed = data?.subscribed === true;
        if (!subscribed) await new Promise((r) => setTimeout(r, 2000));
      }

      trackPurchaseConversion({
        transactionId: `${session.user.id}_${planParam ?? "plan"}_${new Date().toISOString().slice(0, 10)}`,
        plan: planParam,
        currency: "BRL",
        extra: { flow: "authenticated", confirmed: subscribed },
      });

      setStatus("confirmed");
      setMessage(
        subscribed
          ? "Tudo pronto: sua assinatura está ativa e o acesso completo já foi liberado."
          : "Pagamento recebido. A liberação total pode levar alguns segundos — já pode entrar no painel.",
      );
    } catch (err: any) {
      console.error("[obrigado] auth flow error", err);
      setStatus("error");
      setMessage(err.message || "Erro ao confirmar sua assinatura.");
    }
  };

  const handleSendPasswordEmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast({ title: "Link enviado", description: `Verifique ${email} para definir sua senha.` });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Não foi possível enviar o link",
        description: error.message || "Tente novamente em instantes.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Acesso liberado", description: "Bem-vindo à MedStation." });
      navigate("/onboarding");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error.message || "Verifique suas credenciais",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4 py-12">
      {/* Ambiente de marca */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/3 w-[36rem] h-[36rem] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-[32rem] h-[32rem] bg-accent/30 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl"
      >
        <Card className="p-8 md:p-10 border border-hairline bg-card/80 backdrop-blur-md shadow-xl">
          <div className="flex justify-center mb-8">
            <LogoMark className="w-14 h-14" />
          </div>

          {status === "processing" && (
            <div className="text-center space-y-4 py-6">
              <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
              <h1 className="text-2xl font-semibold tracking-tight">Confirmando seu acesso</h1>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Estamos validando o pagamento e preparando sua estação clínica.
              </p>
            </div>
          )}

          {status === "confirmed" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="relative inline-flex">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                  <div className="relative w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-primary" strokeWidth={1.6} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium">
                    Pagamento confirmado
                  </p>
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
                    Obrigado pela confiança
                  </h1>
                  <p className="text-muted-foreground mt-3 text-sm md:text-base max-w-lg mx-auto">
                    {message} A partir de agora, a burocracia da consulta passa a ser trabalho nosso —
                    você volta a olhar para o paciente.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {NEXT_STEPS.map((step) => (
                  <button
                    key={step.title}
                    onClick={() => (authenticated ? navigate(step.to) : setStatus("login"))}
                    className="text-left rounded-xl border border-hairline bg-background/60 p-4 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <step.icon className="w-5 h-5 text-primary mb-2" strokeWidth={1.7} />
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 h-12 shadow-md"
                  onClick={() => (authenticated ? navigate("/dashboard") : setStatus("login"))}
                >
                  {authenticated ? "Ir para minha estação" : "Entrar e começar"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="h-12" onClick={() => navigate("/tour")}>
                  Ver o tour guiado
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-hairline">
                <div className="flex items-start gap-2 pt-4">
                  <ShieldCheck className="w-4 h-4 text-primary mt-0.5" strokeWidth={1.7} />
                  <p className="text-xs text-muted-foreground">
                    Garantia incondicional de 7 dias. Cancelamento em um clique, sem burocracia.
                  </p>
                </div>
                <div className="flex items-start gap-2 sm:pt-4">
                  <HeartHandshake className="w-4 h-4 text-primary mt-0.5" strokeWidth={1.7} />
                  <p className="text-xs text-muted-foreground">
                    Suporte direto pelo Concierge dentro da plataforma sempre que precisar.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {status === "set-password" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
              <div className="inline-flex w-14 h-14 rounded-full bg-primary/10 border border-primary/30 items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-primary" strokeWidth={1.7} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Obrigado pela confiança</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Sua conta foi criada com {email}. Como o pagamento veio por carteira digital,
                  enviamos um link seguro para você definir a senha de acesso.
                </p>
              </div>
              {!resetSent ? (
                <Button onClick={handleSendPasswordEmail} disabled={loading} className="w-full h-12 shadow-md">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>Receber link por email <ArrowRight className="w-4 h-4 ml-2" /></>)}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg border text-sm">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>Link enviado para {email}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Não chegou? Verifique o spam ou{" "}
                    <Button variant="link" className="h-auto p-0 text-xs" onClick={handleSendPasswordEmail} disabled={loading}>
                      reenviar
                    </Button>.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {status === "login" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-sm mx-auto">
              <div className="text-center">
                <div className="inline-flex w-12 h-12 rounded-full bg-primary/10 border border-primary/30 items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.7} />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {userExists ? "Bem-vindo de volta" : "Falta só entrar"}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  {userExists
                    ? "Faça login para acessar sua assinatura."
                    : "Entre com a senha que você definiu no checkout."}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{email}</span>
                </div>
                <Input
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  required
                  autoFocus
                />
                <Button type="submit" className="w-full h-12 shadow-md" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>Entrar e começar <ArrowRight className="w-4 h-4 ml-2" /></>)}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground">
                Esqueceu a senha?{" "}
                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/auth")}>
                  Recuperar acesso
                </Button>
              </p>
            </motion.div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4 max-w-sm mx-auto">
              <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                <span className="text-destructive text-2xl font-light">!</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-destructive">Algo deu errado</h1>
              <p className="text-muted-foreground text-sm">{message}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/auth")}>Fazer login</Button>
                <Button variant="outline" onClick={() => navigate("/")}>Voltar ao início</Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
